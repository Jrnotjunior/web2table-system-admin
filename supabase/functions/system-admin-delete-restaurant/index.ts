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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: headersFor(req) });
  if (req.method !== "POST") return respond(req, 405, { error: "Method not allowed." });

  const token = (req.headers.get("Authorization") ?? "").match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return respond(req, 401, { error: "Sign in as an authorized System Admin first." });

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) return respond(req, 500, { error: "Restaurant deletion is temporarily unavailable." });

  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: claimsData, error: claimsError } = await client.auth.getClaims(token);
    const claims = claimsData?.claims;
    if (claimsError || !claims || typeof claims.sub !== "string") {
      return respond(req, 401, { error: "Your session is invalid or expired. Sign in again." });
    }
    if (claims.aal !== "aal2") return respond(req, 403, { error: "Complete MFA before deleting a restaurant." });

    const body = await req.json().catch(() => null);
    const tenantId = typeof body?.restaurant_id === "string" ? body.restaurant_id.trim() : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tenantId)) {
      return respond(req, 400, { error: "A valid restaurant ID is required." });
    }

    const { data, error } = await client.rpc("system_admin_delete_empty_tenant", { p_tenant_id: tenantId });
    if (error) {
      const message = error.message ?? "";
      if (message.includes("MFA-verified") || message.includes("cannot delete restaurants")) return respond(req, 403, { error: message });
      if (message.includes("order history")) return respond(req, 409, { error: message });
      if (message.includes("was not found")) return respond(req, 404, { error: message });
      console.error("Tenant deletion RPC failed:", message);
      return respond(req, 500, { error: "The restaurant could not be deleted. No partial deletion was committed." });
    }
    return respond(req, 200, { success: true, message: "Restaurant deleted successfully.", tenant_id: tenantId, result: data });
  } catch (error) {
    console.error("Unexpected tenant deletion failure:", error instanceof Error ? error.message : "unknown error");
    return respond(req, 500, { error: "The restaurant could not be deleted. Please try again." });
  }
});