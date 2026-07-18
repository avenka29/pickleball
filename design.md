# Pickleball App Visual Design Guide

## 1. Design Intent

The app should feel like a casual clubhouse scoreboard for a private pickleball group: retro, cartoony, warm, and playful, while still clean enough for quick match entry and leaderboard scanning.

The first impression should be Wimbledon-inspired sports energy with a pickleball twist:

- Deep tennis greens.
- Warm cream and off-white court-club backgrounds.
- Vibrant pickleball yellow accents.
- Bold retro typography.
- Thick outlined components.
- Friendly rounded controls.
- Playful but restrained motion.

The app should not feel like a generic SaaS dashboard, a fantasy sports betting app, or a corporate analytics tool. It should feel social, tactile, and lightweight.

## 2. Visual Personality

Brand adjectives:

- Retro
- Sporty
- Friendly
- Cartoony
- Clean
- Competitive but casual
- Clubhouse-like

Avoid:

- Dark esports styling.
- Heavy neon gradients.
- Minimal monochrome SaaS styling.
- Overly serious analytics layouts.
- Thin borders and delicate controls.
- Decorative bokeh/orb backgrounds.

## 3. Color Palette

### 3.1 Core Colors

| Token | Hex | Usage |
| --- | --- | --- |
| `court-green` | `#0F5D3B` | Primary navigation, major headers, primary buttons |
| `deep-green` | `#073B2A` | High-contrast text, page titles, button text on yellow |
| `grass-green` | `#2E8B57` | Success states, positive rating movement, secondary actions |
| `cream` | `#FFF4D8` | Main app background |
| `warm-white` | `#FFFBF0` | Panels, cards, forms, table surfaces |
| `pickle-yellow` | `#C8D94E` | CTAs, active states, highlights, badges |
| `clay-red` | `#C95C3B` | Losses, warnings, destructive admin actions |
| `sky-blue` | `#8ED6E8` | Informational accents and empty states |
| `ink` | `#1D241F` | Main body text |
| `net-line` | `#E4D6A7` | Borders, dividers, court-line details |

### 3.2 Color Ratios

Recommended visual balance:

- 45% cream and warm-white.
- 30% tennis greens.
- 15% net-line and neutral structure.
- 7% pickle-yellow accents.
- 3% clay-red or sky-blue states.

Pickle-yellow should feel special. Use it for emphasis, not as a full-page dominant color.

### 3.3 Semantic Mapping

| Meaning | Color Treatment |
| --- | --- |
| Win | Grass green badge, cream text |
| Loss | Clay red badge, cream text |
| Active theme | Pickle-yellow badge with deep-green text |
| Provisional player | Sky-blue accent with green border |
| Top rank | Pickle-yellow chip with thick green outline |
| Disabled state | Cream fill, net-line border, muted ink |
| Focus state | Pickle-yellow outline or shadow |

## 4. Typography

### 4.1 Font Direction

Use two type families:

- Display font: bold, retro, rounded, and expressive.
- Body/UI font: rounded, highly readable, and friendly.

Recommended display options:

- `Cooper Black`
- `Baloo 2`
- `Bungee`
- `Luckiest Guy`
- `Fredoka`

Recommended body/UI options:

- `Nunito`
- `Fredoka`
- `Inter`
- `Inter Rounded`

### 4.2 Type Scale

Suggested scale:

| Token | Size | Usage |
| --- | --- | --- |
| Display XL | 40-56px | Main dashboard greeting or tournament title |
| Display LG | 30-36px | Page titles |
| Heading | 22-26px | Section headings |
| Subheading | 17-19px | Card headings |
| Body | 15-16px | Normal UI text |
| Small | 12-13px | Metadata, badges, helper text |
| Score | 42-64px | Match score and rating numerals |

Rules:

- Keep letter spacing at `0`.
- Do not scale font size directly with viewport width.
- Use big display type only for page-level moments.
- Use chunky numerals for ratings, scores, ranks, and streaks.

## 5. Shape Language

### 5.1 Borders

Borders should be visible and tactile:

- Standard border: `2px solid net-line`.
- Prominent border: `3px solid deep-green`.
- Scoreboard or tournament border: `4px solid deep-green`.

### 5.2 Radius

Recommended radius values:

- Small controls: `8px`.
- Cards and panels: `12px`.
- Large scoreboard panels: `14px`.
- Circular avatar/rank markers: `999px`.

Avoid excessive pill shapes for table rows and dense list items. Buttons may be pill-like only when they are compact action chips.

### 5.3 Shadows

Use offset shadows that feel printed or cartoon-like:

```css
box-shadow: 4px 4px 0 #073B2A;
```

Interaction:

- Hover: move shadow to `5px 5px 0`.
- Pressed: translate component by `2px 2px` and reduce shadow.

## 6. Layout Principles

### 6.1 Mobile First

Mobile should be the primary design constraint:

- Bottom navigation for main app sections.
- Single-column dashboard.
- Match entry optimized for one-handed scoring.
- Tournament bracket shown by round tabs.
- Large tap targets of at least 44px.

Desktop enhancements:

- Left sidebar navigation.
- Wider dashboard grid.
- Horizontal bracket view.
- Leaderboard and recent matches side by side.

### 6.2 Page Composition

Use full-width page bands and clean constrained content areas. Do not place cards inside other cards.

Preferred structure:

- App shell.
- Page title row.
- Theme/status strip.
- Primary task area.
- Secondary supporting area.

Common max widths:

- Forms: 640px.
- Dashboard content: 1180px.
- Bracket view: full available width with horizontal scroll.

## 7. Core Components

### 7.1 App Shell

Desktop:

- Left sidebar in `court-green`.
- Cream main content area.
- Top row with current theme badge and user avatar.

Mobile:

- Header with compact logo and avatar.
- Bottom tab navigation with icons.

Navigation items:

- Dashboard
- Leaderboard
- Matches
- Tournaments
- Admin, visible only for admins

Active state:

- Pickle-yellow background.
- Deep-green text/icon.
- Thick dark-green outline.

### 7.2 Buttons

Primary button:

- Background: `court-green`.
- Text: `warm-white`.
- Shadow: deep-green offset.
- Accent: small pickle-yellow icon or underline.

Secondary button:

- Background: `warm-white`.
- Text: `deep-green`.
- Border: deep-green.

Highlight button:

- Background: `pickle-yellow`.
- Text: `deep-green`.
- Border: deep-green.

Destructive button:

- Background: `clay-red`.
- Text: `warm-white`.
- Border: deep-green or darker red.

Use Lucide icons for common actions:

- Add match: `Plus`
- Save: `Save`
- Tournament: `Trophy`
- Shuffle seed: `Shuffle`
- Admin/security: `Shield`
- Leaderboard: `Medal`
- Calendar/theme: `CalendarDays`

### 7.3 Cards And Panels

Use cards for repeated items and functional panels only:

- Player card.
- Match summary card.
- Tournament match card.
- Admin list row.

Panel style:

- Background: `warm-white`.
- Border: `2px solid net-line` or `3px solid deep-green`.
- Radius: `12px`.
- Padding: 16px mobile, 20-24px desktop.

Do not nest cards inside cards. If related content needs grouping, use dividers, bands, or simple spacing.

### 7.4 Badges

Badge types:

- `Theme`: pickle-yellow with deep-green border.
- `Provisional`: sky-blue with deep-green text.
- `Win`: grass-green with cream text.
- `Loss`: clay-red with cream text.
- `Rank`: cream fill with deep-green outline.

Badges should have chunky borders and compact text.

## 8. Screen Designs

### 8.1 Dashboard

Purpose:

Show the player what matters now: their rating state, current theme, recent matches, and quick match entry.

Mobile wireframe:

1. Header with app logo, theme badge, avatar.
2. Rating/status panel.
3. Quick “Record Match” panel.
4. Recent matches.
5. Leaderboard preview.
6. Tournament prompt if an event is open.

Desktop wireframe:

- Left sidebar navigation.
- Top theme strip.
- Two-column content:
  - Left: rating panel, match entry, recent matches.
  - Right: leaderboard preview, tournament status.

Rating panel:

- Ranked player: large rating numeral in pickle-yellow on deep-green.
- Provisional player: “Provisional” headline with 3 pickleball markers showing progress.
- Recent delta appears as a small green or red badge.

Theme strip:

- Pickle-yellow background.
- Deep-green text.
- Calendar icon.
- Example text: `Revenge Week: 2x bonus when you beat someone who beat you before`.

### 8.2 Leaderboard

Purpose:

Make rankings easy to scan without making provisional players feel excluded.

Layout:

- Page title with medal icon.
- Segmented control: Ranked, Provisional, All.
- Ranked table/list.
- Provisional shelf below or as its own tab.

Ranked row:

- Rank chip.
- Avatar.
- Display name.
- Rating.
- Record.
- Last delta.
- Streak.

Mobile behavior:

- Use stacked list rows instead of dense table columns.
- Rating and rank remain visually dominant.

Color treatment:

- Top 3 rank chips: pickle-yellow fill.
- Positive delta: grass-green.
- Negative delta: clay-red.
- Row hover on desktop: yellow left rail and warm-white lift.

### 8.3 Match Entry

Purpose:

Fast, low-friction post-game reporting.

Layout:

- Two player selectors.
- Score steppers for both sides.
- Winner selector.
- Submit button.
- Optional active-theme eligibility badge.

Mobile wireframe:

1. Side A player selector.
2. Side A score stepper.
3. Center `VS` badge.
4. Side B player selector.
5. Side B score stepper.
6. Winner toggle.
7. Record Match button.

Desktop wireframe:

- Side A panel and Side B panel side by side.
- Scoreboard-style score controls in the center or top.
- Submit action fixed to the bottom of the form panel.

Interaction details:

- Score steppers should use plus/minus icon buttons.
- Winner selection should be a segmented control.
- Duplicate player selection should show an inline clay-red validation message.
- Successful submission should show a short result summary with rating changes.

### 8.4 Match History

Purpose:

Show recent play in a social, readable feed.

Match card contents:

- Winner and loser names.
- Score.
- Rating deltas.
- Theme badge if a multiplier applied.
- Date played.
- Tournament label if relevant.

Visual treatment:

- Winner side has a green accent rail.
- Loser side uses muted text.
- Theme-applied matches have a pickle-yellow badge.

### 8.5 Tournament Bracket

Purpose:

Make single-elimination tournaments feel exciting and understandable.

Desktop layout:

- Horizontal bracket columns by round.
- Thick green connector lines.
- Sticky round headers.
- Match cards arranged vertically.

Mobile layout:

- Round tabs.
- One round visible at a time.
- “Next match” callout for the signed-in player.

Match card:

- Two player slots.
- Scores after completion.
- Winner highlighted in pickle-yellow.
- Pending slot shown with net-line dashed style.
- Bye slot labeled `BYE` in muted styling.

Admin controls:

- Shuffle button with `Shuffle` icon.
- Lock bracket button.
- Report/adjust result action.

Champion state:

- Final winner card uses deep-green background, pickle-yellow trophy icon, and cream text.

### 8.6 Admin Whitelist

Purpose:

Let admins quickly invite or revoke players while making the private nature of the app clear.

Layout:

- Email input.
- Role selector.
- Optional note field.
- Add button.
- Whitelist table/list.
- Revoke action.
- Curl utility snippet.

Visual treatment:

- Admin areas should still use the same playful style, but with tighter spacing and clear confirmation states.
- Dangerous actions use clay-red and require confirmation.

### 8.7 Theme Configuration

Purpose:

Allow admins to schedule themed weeks without exposing technical complexity to players.

Layout:

- Theme name.
- Date range.
- Rule type selector.
- Structured config fields.
- Preview card showing how the theme will appear on the dashboard.

Revenge Week preview:

- Pickle-yellow badge.
- Small scorecard illustration treatment using borders, not custom SVG art.
- Copy should be short and plain.

## 9. Motion And Feedback

Use small motion to make the app feel tactile:

- Button press: 2px downward translation.
- Rating change: number ticks or slides briefly.
- Match recorded: quick success banner with ball-yellow accent.
- Bracket advancement: winner row highlights before moving forward.
- Tab changes: simple fade or slide, under 180ms.

Avoid:

- Long animations.
- Confetti on every routine action.
- Motion that delays match entry.

## 10. Empty And Error States

Empty leaderboard:

- Cream panel with green border.
- Pickle-yellow icon badge.
- Text: `No ranked players yet`.
- Supporting text: `Players appear here after 3 matches.`

Not invited:

- Friendly private-club tone.
- Deep-green title.
- Cream background.
- No technical auth details.

Match submission error:

- Clay-red border around invalid section.
- Short explanation.
- Keep entered data intact.

Tournament empty:

- Trophy icon.
- Prompt to join or wait for admin setup.

## 11. Tailwind Theme Tokens

Recommended Tailwind color extension:

```ts
colors: {
  court: {
    green: '#0F5D3B',
    deep: '#073B2A',
    grass: '#2E8B57'
  },
  club: {
    cream: '#FFF4D8',
    white: '#FFFBF0',
    line: '#E4D6A7'
  },
  ball: {
    yellow: '#C8D94E'
  },
  clay: {
    red: '#C95C3B'
  },
  sky: {
    blue: '#8ED6E8'
  },
  ink: '#1D241F'
}
```

Recommended reusable utility classes:

```css
.retro-border {
  border: 3px solid #073B2A;
  box-shadow: 4px 4px 0 #073B2A;
}

.retro-press {
  transition: transform 120ms ease, box-shadow 120ms ease;
}

.retro-press:active {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 #073B2A;
}
```

## 12. Design Acceptance Checklist

- The main screen is useful immediately after login.
- Match entry is reachable in one tap from the dashboard.
- The current weekly theme is visible without reading documentation.
- Provisional players clearly understand how many matches remain before ranking.
- The leaderboard separates ranked and provisional players.
- Tournament brackets are readable on mobile and desktop.
- Pickle-yellow is used as an accent, not a dominant background.
- UI controls have thick borders and tactile press states.
- Text does not overlap or overflow on mobile.
- The app feels playful without sacrificing fast data entry.
