// MedicStaff MCP branded-URL proxy — runs on Vercel's Edge Runtime.
//
// Purpose: let the MCP ("Connect to your AI assistant") URL shown to users be
// https://mcp.medicstaff.online instead of the raw Supabase function URL.
// This subdomain is served entirely by Vercel — it never touches
// medicstaff.online itself, so it has zero effect on Lovable's SSL/hosting
// for the main site.
//
// What it does: forwards every request to the Supabase edge function, then
// rewrites any occurrence of the upstream URL back to the public URL in the
// `www-authenticate` header and in JSON response bodies (OAuth discovery
// documents embed absolute URLs that must match what the client actually
// connected to, or the OAuth flow breaks).

export const config = { runtime: "edge" };

const UPSTREAM = "https://yuplruwfirkfhipekkup.supabase.co/functions/v1/mcp";
const PUBLIC_BASE = "https://mcp.medicstaff.online";

export default async function handler(request) {
  const url = new URL(request.url);
  // Root of this subdomain IS the mcp endpoint; any extra path (e.g.
  // /.well-known/oauth-protected-resource) is appended after the upstream
  // function's base path.
  const suffix = url.pathname === "/" ? "" : url.pathname;
  const target = UPSTREAM + suffix + url.search;

  const upstream = await fetch(target, {
    method: request.method,
    headers: request.headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
    redirect: "manual",
  });

  const headers = new Headers(upstream.headers);
  const challenge = headers.get("www-authenticate");
  if (challenge) {
    headers.set("www-authenticate", challenge.split(UPSTREAM).join(PUBLIC_BASE));
  }

  const type = headers.get("content-type") || "";
  if (type.includes("application/json")) {
    const body = (await upstream.text()).split(UPSTREAM).join(PUBLIC_BASE);
    headers.delete("content-length");
    return new Response(body, { status: upstream.status, headers });
  }

  return new Response(upstream.body, { status: upstream.status, headers });
}
