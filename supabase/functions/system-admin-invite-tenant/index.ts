import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const APP_URL = "https://admin.web2table.io";
const TENANT_SETUP_URL = Deno.env.get("TENANT_SETUP_URL") ?? "";
const allowedOrigins = new Set([APP_URL, "https://jrnotjunior.github.io"]);

function headersFor(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : APP_URL,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json",
  };
}
function respond(req: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: headersFor(req) });
}
function slugify(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: headersFor(req) });
  if (req.method !== "POST") return respond(req, 405, { error: "Method not allowed." });

  const token = (req.headers.get("Authorization") ?? "").match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return respond(req, 401, { error: "Sign in as an authorized System Admin first." });

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  let tenantSetupUrl: URL | null = null;
  try {
    const parsed = new URL(TENANT_SETUP_URL);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash || !parsed.pathname.endsWith("/restaurant")) throw new Error();
    tenantSetupUrl = parsed;
  } catch {
    return respond(req, 503, { error: "Tenant password and MFA setup URL is not configured. Set TENANT_SETUP_URL to the deployed restaurant app URL ending in /restaurant and allow it in Supabase Auth redirect URLs." });
  }

  if (!url || !anonKey || !serviceRoleKey) {
    console.error("Missing Supabase function environment configuration.");
    return respond(req, 500, { error: "Tenant invitations are temporarily unavailable." });
  }

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let createdTenantId: string | null = null;
  let createdUserId: string | null = null;
  let invitationId: string | null = null;
  try {
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    const claims = claimsData?.claims;
    if (claimsError || !claims || typeof claims.sub !== "string") {
      return respond(req, 401, { error: "Your session is invalid or expired. Sign in again." });
    }
    if (claims.aal !== "aal2") {
      return respond(req, 403, { error: "Complete MFA before inviting a restaurant owner." });
    }
    const { data: identity, error: identityError } = await userClient.auth.getUser(token);
    if (identityError || !identity.user || identity.user.id !== claims.sub) {
      return respond(req, 401, { error: "Your session could not be verified. Sign in again." });
    }

    const { data: admin, error: adminError } = await adminClient.from("platform_admins")
      .select("user_id, access_level").eq("user_id", identity.user.id).eq("is_active", true).maybeSingle();
    if (adminError) {
      console.error("System Admin permission lookup failed:", adminError.message);
      return respond(req, 500, { error: "Unable to verify tenant-invitation permissions." });
    }
    if (!admin || !["owner", "administrator"].includes(admin.access_level)) {
      return respond(req, 403, { error: "Your System Admin role cannot invite restaurant tenants." });
    }

    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const ownerName = typeof body?.owner_name === "string" ? body.owner_name.trim() : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const suppliedSlug = typeof body?.slug === "string" ? body.slug.trim().toLowerCase() : "";
    const slug = suppliedSlug || slugify(name);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return respond(req, 400, { error: "Enter a valid owner email address." });
    }
    if (ownerName.length < 1 || ownerName.length > 120) {
      return respond(req, 400, { error: "Owner full name must be between 1 and 120 characters." });
    }
    if (name.length < 2 || name.length > 160) {
      return respond(req, 400, { error: "Restaurant name must be between 2 and 160 characters." });
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length < 3 || slug.length > 64) {
      return respond(req, 400, { error: "Use a URL slug of 3–64 lowercase letters, numbers, and hyphens." });
    }

    const { data: existingUser, error: existingUserError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (existingUserError) {
      console.error("Could not check existing Auth users:", existingUserError.message);
      return respond(req, 500, { error: "Unable to verify whether the owner email is already registered." });
    }
    if (existingUser.users.some((user) => user.email?.trim().toLowerCase() === email)) {
      return respond(req, 409, { error: "An account already exists for this email. Use the existing account's tenant invitation flow or choose a new owner email." });
    }

    const { data: tenant, error: tenantError } = await adminClient.from("tenants")
      .insert({ name, slug, status: "provisioning" }).select("id").single();
    if (tenantError || !tenant?.id) {
      if (tenantError?.code === "23505") return respond(req, 409, { error: "That restaurant URL slug is already in use. Choose another slug." });
      console.error("Tenant creation failed:", tenantError?.message);
      return respond(req, 500, { error: "Could not create the restaurant tenant." });
    }
    createdTenantId = tenant.id;

    const { data: branch, error: branchError } = await adminClient.from("branches")
      .insert({ tenant_id: tenant.id, slug: "main", name: "Main Branch", timezone: "Asia/Manila", is_active: false })
      .select("id").single();
    if (branchError || !branch?.id) {
      console.error("Default branch creation failed:", branchError?.message);
      await adminClient.from("tenants").delete().eq("id", tenant.id);
      createdTenantId = null;
      return respond(req, 500, { error: "The tenant was not completed because its default branch could not be created." });
    }

    const { error: storefrontError } = await adminClient.from("tenant_storefronts").insert({
      tenant_id: tenant.id, default_branch_id: branch.id, display_name: name,
      status: "draft", accepting_orders: false,
    });
    if (storefrontError) {
      console.error("Storefront initialization failed:", storefrontError.message);
      await adminClient.from("tenants").delete().eq("id", tenant.id);
      createdTenantId = null;
      return respond(req, 500, { error: "The tenant was not completed because its storefront could not be initialized." });
    }

    const { data: invitation, error: invitationError } = await adminClient.from("privileged_invitations")
      .insert({
        tenant_id: tenant.id, email, role: "restaurant_owner", branch_id: null,
        invited_by: identity.user.id, status: "pending", expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      }).select("id").single();
    if (invitationError || !invitation?.id) {
      console.error("Owner invitation record creation failed:", invitationError?.message);
      await adminClient.from("tenants").delete().eq("id", tenant.id);
      createdTenantId = null;
      return respond(req, 500, { error: "The tenant was not completed because its owner invitation could not be prepared." });
    }
    invitationId = invitation.id;

    const { data: inviteResult, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${tenantSetupUrl!.toString()}?type=invite`,
      data: {
        name: ownerName,
        full_name: ownerName,
        invitation_type: "tenant_owner",
        tenant_id: tenant.id,
        tenant_slug: slug,
        tenant_invitation_id: invitation.id,
        tenant_role: "restaurant_owner",
      },
    });
    if (inviteError || !inviteResult?.user?.id) {
      console.error("Owner invitation email failed:", inviteError?.message);
      await adminClient.from("privileged_invitations").delete().eq("id", invitation.id);
      await adminClient.from("tenants").delete().eq("id", tenant.id);
      createdTenantId = null;
      invitationId = null;
      return respond(req, 502, { error: "The owner invitation email could not be sent. No tenant was kept; check Supabase Auth email delivery and try again." });
    }
    createdUserId = inviteResult.user.id;

    const { error: updateInvitationError } = await adminClient.from("privileged_invitations")
      .update({ invited_user_id: createdUserId, status: "sent", sent_at: new Date().toISOString() })
      .eq("id", invitation.id);
    if (updateInvitationError) {
      console.error("Could not finalize owner invitation:", updateInvitationError.message);
      return respond(req, 500, { error: "The invitation may have been emailed, but its status could not be finalized. Do not retry; inspect the invitation record first." });
    }

    return respond(req, 200, {
      success: true, tenant_id: tenant.id, slug, email,
      message: `Restaurant "${name}" was created and the owner invitation was sent to ${email}.`,
    });
  } catch (error) {
    console.error("Unexpected tenant invitation failure:", error instanceof Error ? error.message : "unknown error");
    if (invitationId) await adminClient.from("privileged_invitations").delete().eq("id", invitationId);
    if (createdTenantId) await adminClient.from("tenants").delete().eq("id", createdTenantId);
    if (createdUserId) await adminClient.auth.admin.deleteUser(createdUserId);
    return respond(req, 500, { error: "The tenant invitation could not be completed. Please try again." });
  }
});
