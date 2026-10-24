import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://admin.web2table.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return respond(405, { error: "Method not allowed." });

  const authorization = req.headers.get("Authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return respond(401, { error: "A valid invitation session is required." });

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceRoleKey) {
    console.error("Required Supabase environment configuration is missing.");
    return respond(500, { error: "Password activation is temporarily unavailable." });
  }

  const token = match[1];
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    const claims = claimsData?.claims;
    if (claimsError || !claims || typeof claims.sub !== "string") {
      return respond(401, { error: "The invitation session is invalid or expired. Request a fresh invitation." });
    }

    // Only an email-link OTP session may activate a password. A regular
    // password-authenticated session cannot use this endpoint to bypass AAL2.
    const amr = Array.isArray(claims.amr) ? claims.amr : [];
    const emailOtpVerified = amr.some((item: unknown) =>
      !!item && typeof item === "object" &&
      ((item as Record<string, unknown>).method === "otp" ||
       (item as Record<string, unknown>).method === "email")
    );
    if (!emailOtpVerified) {
      return respond(403, { error: "Open the account setup link from your email before creating a password." });
    }

    const { data: identity, error: identityError } = await userClient.auth.getUser(token);
    if (identityError || !identity.user || identity.user.id !== claims.sub ||
        !identity.user.email || !identity.user.email_confirmed_at) {
      return respond(403, { error: "A verified invited email is required to create this password." });
    }

    const { data: adminRow, error: adminLookupError } = await adminClient
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", identity.user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (adminLookupError) {
      console.error("Unable to verify active System Admin membership:", adminLookupError.message);
      return respond(500, { error: "Unable to verify System Admin authorization." });
    }

    let authorized = !!adminRow;
    if (!authorized) {
      const { data: candidate, error: candidateError } =
        await userClient.rpc("is_initial_admin_bootstrap_candidate");
      if (candidateError) {
        console.error("Unable to verify bootstrap invitation:", candidateError.message);
        return respond(500, { error: "Unable to verify the account setup invitation." });
      }
      authorized = candidate === true;
    }
    if (!authorized) {
      return respond(403, { error: "This account is not authorized for System Admin setup." });
    }

    const body = await req.json().catch(() => null);
    const password = body && typeof body.password === "string" ? body.password : "";
    if (password.length < 8 || password.length > 128) {
      return respond(400, { error: "Choose a password between 8 and 128 characters." });
    }

    // Update only the password after validating the verified email session
    // and active admin/bootstrap status. Never delete the account or MFA.
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      identity.user.id,
      { password },
    );
    if (updateError) {
      console.error("System Admin invitation password update failed:", updateError.message);
      return respond(400, { error: "Unable to create the password. Request a fresh account setup link and try again." });
    }

    return respond(200, { success: true });
  } catch (error) {
    console.error("Unexpected password activation error:", error instanceof Error ? error.message : "unknown error");
    return respond(500, { error: "Password activation failed. Please try again." });
  }
});
