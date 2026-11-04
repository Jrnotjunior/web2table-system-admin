import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = new Set(["https://admin.web2table.io", "https://jrnotjunior.github.io"]);
function headersFor(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://admin.web2table.io",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json",
  };
}
function respond(req: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: headersFor(req) });
}
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: headersFor(req) });
  if (req.method !== "POST") return respond(req, 405, { error: "Method not allowed." });

  const token = (req.headers.get("Authorization") ?? "").match(/^Bearer\\s+(.+)$/i)?.[1];
  if (!token) return respond(req, 401, { error: "Sign in as an authorized System Admin first." });

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return respond(req, 500, { error: "Administrator cleanup is temporarily unavailable." });

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    const claims = claimsData?.claims;
    if (claimsError || !claims || typeof claims.sub !== "string") return respond(req, 401, { error: "Your session is invalid or expired. Sign in again." });
    if (claims.aal !== "aal2") return respond(req, 403, { error: "Complete MFA before deleting an administrator account." });

    const actorId = claims.sub;
    const { data: actor, error: actorError } = await service.from("platform_admins")
      .select("access_level,is_active").eq("user_id", actorId).maybeSingle();
    if (actorError || !actor || !actor.is_active || !["owner", "administrator"].includes(actor.access_level)) {
      return respond(req, 403, { error: "Owner or Administrator access is required." });
    }

    const body = await req.json().catch(() => null);
    const targetId = typeof body?.admin_user_id === "string" ? body.admin_user_id.trim() : "";
    if (!uuidPattern.test(targetId) || targetId === actorId) return respond(req, 400, { error: "A valid different administrator account is required." });

    const { data: target, error: targetError } = await service.from("platform_admins")
      .select("user_id,access_level,is_active").eq("user_id", targetId).maybeSingle();
    if (targetError) throw targetError;
    if (!target) return respond(req, 404, { error: "Administrator record was not found." });
    if (target.access_level === "owner") return respond(req, 403, { error: "The Owner account cannot be deleted." });
    if (target.is_active) return respond(req, 409, { error: "Revoke this administrator before deleting the account." });

    const { data: targetAuth, error: targetAuthError } = await service.auth.admin.getUserById(targetId);
    if (targetAuthError || !targetAuth.user) return respond(req, 404, { error: "The administrator Auth account was not found. No records were removed." });
    const targetEmail = targetAuth.user.email ?? "";

    // Permanently remove the Auth identity first. Service credentials never leave this function.
    const { error: deleteAuthError } = await service.auth.admin.deleteUser(targetId, false);
    if (deleteAuthError) {
      console.error("Auth account deletion failed:", deleteAuthError.message);
      return respond(req, 500, { error: "The Auth account could not be deleted. No administrator records were removed." });
    }

    const { error: cleanupError } = await service.rpc("system_admin_finalize_auth_user_deletion", {
      p_actor_user_id: actorId,
      p_target_user_id: targetId,
      p_target_email: targetEmail,
      p_access_level: target.access_level,
    });
    if (cleanupError) {
      console.error("Administrator cleanup failed after Auth deletion:", cleanupError.message);
      return respond(req, 500, { error: "The Auth account was deleted, but administrator-record cleanup needs support attention." });
    }
    return respond(req, 200, { success: true, message: "Administrator Auth account and System Admin records permanently deleted." });
  } catch (error) {
    console.error("Administrator account deletion failed:", error instanceof Error ? error.message : "unknown error");
    return respond(req, 500, { error: "The administrator account could not be fully deleted. Please contact support." });
  }
});
