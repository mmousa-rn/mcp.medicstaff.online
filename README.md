# MedicStaff MCP branded-URL proxy (Vercel)

Makes the MCP ("Connect to your AI assistant") endpoint reachable at
**`https://mcp.medicstaff.online`** instead of the raw Supabase function URL
(`https://yuplruwfirkfhipekkup.supabase.co/functions/v1/mcp`).

This runs on a **separate subdomain** on **Vercel**, not on medicstaff.online
itself — it never touches Lovable's DNS records, SSL, or hosting for the main
site. The only change to the existing domain is one new DNS record for the
`mcp` subdomain.

## 1. Deploy to Vercel

1. Push this folder to a new GitHub repo (or use the Vercel CLI directly —
   see step 1b).
2. In the [Vercel dashboard](https://vercel.com/new), import that repo as a
   new project. No build settings are needed — it's just the one Edge
   Function in `api/proxy.js` plus `vercel.json`.
3. Deploy. Vercel gives you a `*.vercel.app` URL — confirm it works before
   moving on:
   ```
   curl -i -X POST https://<your-project>.vercel.app \
     -H 'content-type: application/json' \
     -H 'accept: application/json, text/event-stream' \
     -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"probe","version":"1"}}}'
   ```
   You should get a `401` with a `www-authenticate` header. At this stage it
   will still point at the `.vercel.app` URL — that's expected; it gets
   rewritten to the branded URL once the custom domain is attached (step 3).

### 1b. Or deploy via CLI (no GitHub repo needed)

```
npm i -g vercel
cd mcp-vercel-proxy
vercel --prod
```

## 2. Add the DNS record at Name.com

In your Name.com DNS management for `medicstaff.online`, add:

| Type  | Host | Value                     |
|-------|------|---------------------------|
| CNAME | mcp  | `cname.vercel-dns.com`    |

This is additive — it does not modify or remove the existing record that
points the apex domain at Lovable. The main site is unaffected.

## 3. Attach the custom domain in Vercel

In the Vercel project → Settings → Domains, add `mcp.medicstaff.online`.
Vercel will detect the CNAME from step 2 and issue its own TLS certificate
for that subdomain automatically (again, independent of Lovable's
certificate for the apex).

## 4. Verify the real thing

Once the domain shows "Valid Configuration" in Vercel:

```
curl -i -X POST https://mcp.medicstaff.online \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"probe","version":"1"}}}'
```

Expect: `401` status, with a `www-authenticate` header whose value now reads
`https://mcp.medicstaff.online/.well-known/oauth-protected-resource` (i.e.
rewritten from the Supabase URL — this confirms the proxy is genuinely
round-tripping traffic, not just returning a generic page).

## 5. Flip the switch in the app

Once step 4 checks out, tell Claude (or edit directly) to set in
`src/lib/mcpPublicUrl.ts`:

```ts
export const BRANDED_MCP_URL: string | null = "https://mcp.medicstaff.online";
```

Then deploy the Lovable project. The Connect page will show the branded URL.
