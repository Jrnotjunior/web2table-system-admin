import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const APP_URL = "https://admin.web2table.io";
const allowedOrigins = new Set([
  APP_URL,
  "https://jrnotjunior.github.io",
]);

function headersFor(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  const allowOrigin = allowedOrigins.has(origin) ? origin : APP_URL;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json",
  };
}

function respond(req: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: headersFor(req) });
}

function normalizedEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: headersFor(req) });
  if (req.method !== "POST") return respond(req, 405, { error: "Method not allowed." });

  const match = (req.headers.get("Authorization") ?? "").match(/^Bearer\s+(.+)$/i);
  if (!match) return respond(req, 401, { error: "Sign in as an active System Admin to send invitations." });

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceRoleKey) {
    console.error("Required Supabase environment configuration is missing.");
    return respond(req, 500, { error: "The invitation service is temporarily unavailable." });
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
      return respond(req, 401, { error: "The sign-in session is invalid or expired. Sign in again." });
    }
    if (claims.aal !== "aal2") {
      return respond(req, 403, { error: "Complete MFA before inviting another System Admin." });
    }

    const { data: identity, error: identityError } = await userClient.auth.getUser(token);
    if (identityError || !identity.user || identity.user.id !== claims.sub) {
      return respond(req, 401, { error: "The sign-in session is invalid. Sign in again." });
    }

    const { data: admin, error: adminError } = await adminClient
      .from("platform_admins")
      .select("user_id, access_level")
      .eq("user_id", identity.user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (adminError) {
      console.error("Failed to check System Admin role:", adminError.message);
      return respond(req, 500, { error: "Unable to verify System Admin invitation permissions." });
    }
    if (!admin || !["owner", "administrator"].includes(admin.access_level)) {
      return respond(req, 403, { error: "Your System Admin role cannot send invitations." });
    }

    const body = await req.json().catch(() => null);
    if (!body || body.invitation_type !== "system_admin") {
      return respond(req, 400, { error: "Unsupported invitation type." });
    }

    const email = normalizedEmail(body.email);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const accessLevel = body.access_level;
    if (!email) return respond(req, 400, { error: "Enter a valid email address." });
    if (!name || name.length > 120) {
      return respond(req, 400, { error: "Name must be between 1 and 120 characters." });
    }
    if (accessLevel !== "administrator" && accessLevel !== "view_only") {
      return respond(req, 400, { error: "Choose a valid System Admin access level." });
    }

    const { data: invitationId, error: prepareError } = await adminClient.rpc(
      "system_admin_invitation_prepare_for_service",
      {
        p_email: email,
        p_name: name,
        p_access_level: accessLevel,
        p_invited_by: identity.user.id,
      },
    );
    if (prepareError || typeof invitationId !== "string") {
      const message = prepareError?.message ?? "Could not prepare the invitation.";
      console.error("System Admin invite preparation failed:", message);
      return respond(req, 400, {
        error: message.includes("already exists")
          ? "An account already exists for this email. Use a different email for this new invitation."
          : message,
      });
    }

    const { data: inviteResult, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: APP_URL + "/",
        data: {
          name,
          invitation_type: "system_admin",
          system_admin_access_level: accessLevel,
          system_admin_invitation_id: invitationId,
        },
      },
    );

    if (inviteError || !inviteResult?.user?.id) {
      const message = inviteError?.message ?? "Supabase did not return the invited account.";
      console.error("Supabase could not send System Admin invitation:", message);
      return respond(req, 502, {
        error: "Supabase could not send the invitation email. Check Auth email delivery settings before retrying.",
      });
    }

    const { data: finalized, error: finalizeError } = await adminClient.rpc(
      "system_admin_invitation_finalize_for_service",
      { p_invitation_id: invitationId, p_user_id: inviteResult.user.id },
    );
    if (finalizeError || finalized !== true) {
      console.error("System Admin invitation was sent but database finalization failed:", finalizeError?.message ?? "no confirmation");
      return respond(req, 500, {
        error: "The invitation email may have been sent, but setup could not be finalized. Do not send repeated invitations; contact the System Admin owner.",
      });
    }

    return respond(req, 200, {
      success: true,
      email,
      invitation_id: invitationId,
      message: "System Admin invitation sent.",
    });
  } catch (error) {
    console.error("Unexpected System Admin invite failure:", error instanceof Error ? error.message : "unknown error");
    return respond(req, 500, { error: "The invitation could not be sent. Please try again." });
  }
});
