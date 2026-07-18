# Pickleball App Implementation Plan

## 1. Role And Objective

Act as a Senior Full-Stack Engineer. Implement the Pickleball application using the visual direction in `design.md` and the React/Vercel/Supabase stack described here.

The application must be treated as a cohesive full-stack product, not separate frontend mockups and backend stubs. Type safety, access control, database integrity, and usable UI should be implemented together.

## 2. Technical Stack

- Frontend: React with Vite.
- Styling: Tailwind CSS using the Wimbledon-inspired tokens from `design.md`.
- Icons: Lucide React.
- Backend/database: Supabase Auth, Postgres, RPC functions, and Edge Functions.
- Hosting: Vercel.
- Server state: TanStack Query.
- Global state: Avoid complex global state libraries unless a concrete need appears.

## 3. Required Project Structure

Recommended structure:

```text
.
├── src/
│   ├── components/
│   ├── features/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── leaderboard/
│   │   ├── matches/
│   │   └── tournaments/
│   ├── lib/
│   │   ├── supabase.ts
│   │   └── queryClient.ts
│   ├── types/
│   │   └── database.types.ts
│   ├── App.tsx
│   └── main.tsx
├── supabase/
│   ├── functions/
│   │   └── add-user/
│   │       └── index.ts
│   └── migrations/
│       ├── 0001_init.sql
│       └── 0002_elo_rpc.sql
├── .env.example
├── tailwind.config.js
└── vite.config.ts
```

## 4. Environment Variables

Create `.env.example`:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Frontend code must only use `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

`SUPABASE_SERVICE_ROLE_KEY` is optional for local frontend development. It is only needed for the CLI-style `add-user` Edge Function. The core app uses Supabase Auth, RLS-backed admin screens, and the `bootstrap_current_profile()` RPC to create a profile automatically when a whitelisted Google user signs in.

## 5. Phase 1: SQL Schema And RLS

Create SQL migrations that initialize the database schema and row-level security policies.

### 5.1 Tables

Required tables:

- `profiles`
- `whitelist`
- `matches`
- `match_participants`
- `themes`
- `tournaments`
- `tournament_entries`
- `tournament_matches`

### 5.2 `profiles`

Purpose: App-level user profile linked to `auth.users`.

Required fields:

- `id uuid primary key references auth.users(id) on delete cascade`
- `email text not null unique`
- `display_name text`
- `avatar_url text`
- `role text not null default 'player'`
- `elo integer`
- `matches_played integer not null default 0`
- `wins integer not null default 0`
- `losses integer not null default 0`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Notes:

- `elo` is null until the player exits the provisional phase.
- Enforce role values with a check constraint: `role in ('player', 'admin')`.

### 5.3 `whitelist`

Purpose: Explicit allowlist for Google-authenticated emails.

Required fields:

- `id uuid primary key default gen_random_uuid()`
- `email text not null unique`
- `role_on_signup text not null default 'player'`
- `note text`
- `created_at timestamptz not null default now()`
- `revoked_at timestamptz`

Normalize emails to lowercase before insert.

### 5.4 `matches`

Purpose: Canonical match record.

Required fields:

- `id uuid primary key default gen_random_uuid()`
- `winner_id uuid not null references profiles(id)`
- `loser_id uuid not null references profiles(id)`
- `winner_score integer`
- `loser_score integer`
- `theme_id uuid references themes(id)`
- `multiplier numeric not null default 1`
- `created_by uuid references profiles(id)`
- `played_at timestamptz not null default now()`
- `created_at timestamptz not null default now()`

Add a check constraint so `winner_id <> loser_id`.

### 5.5 `match_participants`

Purpose: Rating audit per participant.

Required fields:

- `id uuid primary key default gen_random_uuid()`
- `match_id uuid not null references matches(id) on delete cascade`
- `profile_id uuid not null references profiles(id)`
- `result text not null check (result in ('win', 'loss'))`
- `elo_before integer`
- `elo_after integer`
- `elo_delta integer not null default 0`
- `created_at timestamptz not null default now()`

### 5.6 `themes`

Purpose: Active weekly rules such as Revenge Week.

Required fields:

- `id uuid primary key default gen_random_uuid()`
- `name text not null`
- `slug text not null unique`
- `description text`
- `starts_at timestamptz not null`
- `ends_at timestamptz not null`
- `rule_type text not null`
- `rule_config jsonb not null default '{}'::jsonb`
- `is_active boolean not null default true`
- `created_at timestamptz not null default now()`

### 5.7 Tournament Tables

Create:

- `tournaments`
- `tournament_entries`
- `tournament_matches`

Support single elimination, random seeding, byes, match advancement, and tournament winner assignment.

### 5.8 RLS Requirements

Enable RLS on all public tables.

Policy expectations:

- A user can read their own profile and other active public player profile fields needed for leaderboard and match entry.
- A user can insert match results only when authenticated and whitelisted.
- Admin-only writes require a profile with `role = 'admin'`.
- Whitelist reads/writes are admin-only except service role.
- Tournament joining requires authentication and whitelist presence.

Important Supabase constraint:

Postgres RLS cannot literally block Google OAuth account creation before `auth.users` receives a row. Enforce the whitelist gate immediately after login through a profile bootstrap trigger/function and application routing. Deny all app table access unless `auth.jwt()->>'email'` exists in active `whitelist`. If a user signs in before being whitelisted and is later approved, the frontend calls `bootstrap_current_profile()` on the next login to create the missing profile.

Use helper SQL functions:

```sql
is_whitelisted()
is_admin()
```

Then use them in policies.

## 6. Phase 2: Core API Logic

### 6.1 Shared Type Definitions

Create `src/types/database.types.ts`.

Define interfaces for:

- `Profile`
- `WhitelistEntry`
- `Match`
- `MatchParticipant`
- `Theme`
- `Tournament`
- `TournamentEntry`
- `TournamentMatch`

These types must be used by:

- Supabase query wrappers.
- React Query hooks.
- Feature components.
- Edge Function request/response payloads where applicable.

### 6.2 Elo RPC

Implement Elo calculation inside a Supabase database function to keep match creation and rating updates atomic.

Function name:

```sql
record_match(winner_id uuid, loser_id uuid, winner_score integer, loser_score integer, multiplier numeric)
```

Rules:

1. Load winner and loser profiles with row locks.
2. Insert a row into `matches`.
3. For each player:
   - If `matches_played < 2`, increment match count and win/loss count only.
   - If `matches_played = 2`, this completed match becomes their third match. Increment count, set `elo = 1200`, and record participant audit rows.
   - If `matches_played >= 3`, apply standard Elo.
4. Standard Elo uses:

```text
expected = 1 / (1 + 10 ^ ((opponent_elo - player_elo) / 400))
delta = round(32 * multiplier * (actual - expected))
```

5. Apply multiplier to the winner's positive gain. Apply normal loss to loser unless the selected theme explicitly says otherwise.
6. Insert `match_participants` rows with before/after Elo values.
7. Return the match id and rating deltas.

### 6.3 Themed Week Multiplier

Implement helper logic that determines the active theme and multiplier before calling the Elo RPC.

For Revenge Week:

- Query previous confirmed matches.
- If the winner previously lost to this loser, use multiplier `2`.
- Otherwise use multiplier `1`.

Store:

- `theme_id`
- `multiplier`
- participant Elo before/after

The RPC should accept multiplier as an argument. Theme lookup may live in frontend service code, an Edge Function, or a second SQL function, but the final match/rating mutation must remain atomic.

### 6.4 Whitelist Edge Function

Create Supabase Edge Function:

```text
supabase/functions/add-user/index.ts
```

Behavior:

1. Require `Authorization: Bearer <SERVICE_ROLE_KEY>`.
2. Reject all requests without the exact service role key.
3. Accept JSON body:

```json
{
  "email": "player@gmail.com",
  "roleOnSignup": "player",
  "note": "Tuesday night group"
}
```

4. Normalize email to lowercase.
5. Insert or reactivate the whitelist row.
6. Return JSON with the inserted/updated record.

Example curl:

```bash
curl -X POST "$SUPABASE_FUNCTION_URL/add-user" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"player@gmail.com","roleOnSignup":"player","note":"Tuesday night group"}'
```

## 7. Phase 3: Frontend Implementation

### 7.1 Supabase Client

Create a typed Supabase client in `src/lib/supabase.ts`.

Requirements:

- Use `VITE_SUPABASE_URL`.
- Use `VITE_SUPABASE_ANON_KEY`.
- Export a reusable client.
- Do not expose service role key.

### 7.2 React Query

Create query hooks for:

- Current user/profile.
- Leaderboard.
- Recent matches.
- Active theme.
- Tournaments.
- Tournament detail.

Create mutations for:

- Sign in with Google.
- Sign out.
- Record match.
- Join tournament.
- Report tournament match.

Invalidate affected queries after match recording:

- Current profile.
- Leaderboard.
- Recent matches.
- Tournament detail when relevant.

### 7.3 Main Dashboard Layout

Implement the dashboard using the visual guide in `design.md`.

Required dashboard sections:

- Auth state gate.
- Google sign-in button.
- Current profile/rating card.
- Provisional progress state.
- Active theme badge.
- Match-entry form.
- Recent matches list.
- Leaderboard preview.

### 7.4 Match Entry Form

Requirements:

- Player selector for winner.
- Player selector for loser.
- Score inputs.
- Duplicate player validation.
- Submit mutation that calls the Elo RPC.
- Success state showing rating changes.
- Error state preserving entered form data.

### 7.5 Tailwind Theme

Define the color tokens from `design.md` in `tailwind.config.js`.

Create reusable component classes or component variants for:

- Retro button.
- Retro panel.
- Badge.
- Score/rating display.
- Form input.
- Mobile bottom nav.

## 8. Deliverables Checklist

Phase 1:

- SQL migration scripts initialize schema.
- RLS enabled and policies created.
- Helper SQL functions `is_whitelisted()` and `is_admin()` exist.

Phase 2:

- Elo RPC implemented.
- Whitelist Edge Function implemented.
- Shared TypeScript database types created.

Phase 3:

- React/Vite app wired to Supabase Auth.
- Dashboard component implemented.
- Match-entry form calls backend logic.
- Tailwind theme matches `design.md`.
- React Query handles server-state synchronization.

## 9. Code Quality Constraints

- Keep modules small and feature-oriented.
- Prefer typed Supabase query wrappers over ad hoc calls spread through components.
- Keep service role keys out of frontend code.
- Comment only non-obvious security and rating logic.
- Make database mutations transactional where rating or bracket state changes.
- Prioritize type safety between frontend, Edge Functions, and database rows.

## 10. Feature Pass Addendum

The implementation now supports the expanded feature specification.

Backend additions:

- `profiles` stores separate `singles_elo` and `doubles_elo` values.
- `profiles` tracks separate provisional counts and records for singles and doubles.
- `matches.mode` supports `singles`, `doubles`, and `tournament`.
- Doubles matches store winner/loser partner IDs and team-average Elo snapshots.
- `active_themes` stores runtime theme configuration with `multiplier_logic` JSON.
- `record_singles_match`, `record_doubles_match`, and `record_tournament_match` keep Elo math in Postgres.
- `record_match` remains as a backward-compatible singles wrapper.
- `generate_single_elimination_bracket` creates random seeded single-elimination brackets.
- `admin_override_player_elo` supports manual singles/doubles Elo correction.
- `admin_upsert_active_theme` supports theme changes without a database redeploy.
- The `add-user` Edge Function also supports `override_elo` and `update_theme_config` actions for CLI-style admin workflows, but it is optional if you prefer to use the RLS-backed admin UI or Supabase SQL Editor.
- `bootstrap_current_profile()` creates or refreshes a profile when the signed-in Google email is present in `whitelist`, so the app does not depend on the Edge Function for first-login profile creation.

Frontend additions:

- Leaderboard toggle for Singles and Doubles rankings.
- Match entry mode selector for Singles, Doubles, and Tournament.
- Doubles teammate/opponent selectors with duplicate-player validation.
- Profile analytics panel with Singles/Doubles Elo, recent form, and a lightweight trend graph.
- Reverse-chronological match history feed with View Match expansion links.
- Admin panel shells for whitelist entry, Elo override, and theme configuration.

The core rating rule remains server-authoritative: frontend components collect intent, but all Elo calculations and tournament advancement happen through Supabase/Postgres functions.
