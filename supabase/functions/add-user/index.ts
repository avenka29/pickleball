type RoleOnSignup = "player" | "admin";

type AddUserRequest = {
  action?: unknown;
  email?: unknown;
  roleOnSignup?: unknown;
  note?: unknown;
  profileId?: unknown;
  singlesElo?: unknown;
  doublesElo?: unknown;
  slug?: unknown;
  name?: unknown;
  description?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  multiplierLogic?: unknown;
  isActive?: unknown;
  themeId?: unknown;
};

type WhitelistRow = {
  id: string;
  email: string;
  role_on_signup: RoleOnSignup;
  note: string | null;
  created_at: string;
  revoked_at: string | null;
};

const jsonHeaders = {
  "Content-Type": "application/json",
};

const respond = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const parseNullableInteger = (value: unknown, field: string): number | null => {
  if (value === undefined || value === null) {
    return null;
  }

  if (!Number.isInteger(value)) {
    throw new Error(`${field} must be an integer`);
  }

  return value;
};

const parseRole = (value: unknown): RoleOnSignup => {
  if (value === undefined || value === null) {
    return "player";
  }

  if (value === "player" || value === "admin") {
    return value;
  }

  throw new Error("roleOnSignup must be \"player\" or \"admin\"");
};

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return respond(405, { error: "Method not allowed" });
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceRoleKey) {
    return respond(500, { error: "SUPABASE_SERVICE_ROLE_KEY is not configured" });
  }

  const expectedAuth = `Bearer ${serviceRoleKey}`;
  if (request.headers.get("Authorization") !== expectedAuth) {
    return respond(401, { error: "Unauthorized" });
  }

  let body: AddUserRequest;
  try {
    body = await request.json();
  } catch {
    return respond(400, { error: "Request body must be valid JSON" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) {
    return respond(500, { error: "SUPABASE_URL is not configured" });
  }

  const action = typeof body.action === "string" ? body.action : "add_user";

  if (action === "override_elo") {
    if (typeof body.profileId !== "string" || !body.profileId.trim()) {
      return respond(400, { error: "profileId is required" });
    }

    let singlesElo: number | null;
    let doublesElo: number | null;
    try {
      singlesElo = parseNullableInteger(body.singlesElo, "singlesElo");
      doublesElo = parseNullableInteger(body.doublesElo, "doublesElo");
    } catch (error) {
      return respond(400, { error: error instanceof Error ? error.message : "Invalid Elo override" });
    }

    if (singlesElo === null && doublesElo === null) {
      return respond(400, { error: "At least one of singlesElo or doublesElo is required" });
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/admin_override_player_elo`, {
      method: "POST",
      headers: {
        Authorization: expectedAuth,
        apikey: serviceRoleKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        profile_id: body.profileId,
        singles_elo: singlesElo,
        doubles_elo: doublesElo,
      }),
    });

    const result = await response.json().catch(() => null);
    if (!response.ok) {
      return respond(response.status, { error: "Failed to override Elo", details: result });
    }

    return respond(200, { data: result });
  }

  if (action === "update_theme_config") {
    if (typeof body.slug !== "string" || !body.slug.trim()) {
      return respond(400, { error: "slug is required" });
    }

    if (typeof body.name !== "string" || !body.name.trim()) {
      return respond(400, { error: "name is required" });
    }

    if (body.description !== undefined && body.description !== null && typeof body.description !== "string") {
      return respond(400, { error: "description must be a string" });
    }

    if (body.startsAt !== undefined && body.startsAt !== null && typeof body.startsAt !== "string") {
      return respond(400, { error: "startsAt must be an ISO timestamp string" });
    }

    if (body.endsAt !== undefined && body.endsAt !== null && typeof body.endsAt !== "string") {
      return respond(400, { error: "endsAt must be an ISO timestamp string" });
    }

    if (body.isActive !== undefined && body.isActive !== null && typeof body.isActive !== "boolean") {
      return respond(400, { error: "isActive must be a boolean" });
    }

    if (body.themeId !== undefined && body.themeId !== null && typeof body.themeId !== "string") {
      return respond(400, { error: "themeId must be a string" });
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/admin_upsert_active_theme`, {
      method: "POST",
      headers: {
        Authorization: expectedAuth,
        apikey: serviceRoleKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        slug: body.slug,
        name: body.name,
        description: typeof body.description === "string" ? body.description : null,
        starts_at: typeof body.startsAt === "string" ? body.startsAt : new Date().toISOString(),
        ends_at: typeof body.endsAt === "string"
          ? body.endsAt
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        multiplier_logic: body.multiplierLogic && typeof body.multiplierLogic === "object"
          ? body.multiplierLogic
          : {},
        is_active: typeof body.isActive === "boolean" ? body.isActive : true,
        theme_id: typeof body.themeId === "string" ? body.themeId : null,
      }),
    });

    const result = await response.json().catch(() => null);
    if (!response.ok) {
      return respond(response.status, { error: "Failed to update active theme config", details: result });
    }

    return respond(200, { data: result });
  }

  if (action !== "add_user") {
    return respond(400, { error: "action must be add_user, override_elo, or update_theme_config" });
  }

  if (typeof body.email !== "string" || !body.email.trim()) {
    return respond(400, { error: "email is required" });
  }

  const email = normalizeEmail(body.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return respond(400, { error: "email must be a valid email address" });
  }

  let roleOnSignup: RoleOnSignup;
  try {
    roleOnSignup = parseRole(body.roleOnSignup);
  } catch (error) {
    return respond(400, { error: error instanceof Error ? error.message : "Invalid roleOnSignup" });
  }

  if (body.note !== undefined && body.note !== null && typeof body.note !== "string") {
    return respond(400, { error: "note must be a string" });
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/whitelist?on_conflict=email`, {
    method: "POST",
    headers: {
      Authorization: expectedAuth,
      apikey: serviceRoleKey,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify({
      email,
      role_on_signup: roleOnSignup,
      note: typeof body.note === "string" ? body.note : null,
      revoked_at: null,
    }),
  });

  const result = (await response.json().catch(() => null)) as WhitelistRow[] | { message?: string } | null;

  if (!response.ok) {
    return respond(response.status, {
      error: "Failed to upsert whitelist row",
      details: result,
    });
  }

  const row = Array.isArray(result) ? result[0] : result;
  return respond(200, { data: row });
});
