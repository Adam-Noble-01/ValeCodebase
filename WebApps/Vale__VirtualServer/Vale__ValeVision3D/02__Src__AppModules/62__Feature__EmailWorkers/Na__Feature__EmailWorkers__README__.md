# 62__Feature__EmailWorkers — Architecture Guide

## What It Does

Sends ValeVision3D project share emails directly from the browser to internal Vale staff via Microsoft Graph. Recipients are selected from an encrypted internal address book with Outlook-style autocomplete.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  BROWSER (ValeVision3D on GitHub Pages)                     │
│                                                             │
│  ┌─────────────────┐    ┌──────────────────────────────┐    │
│  │ Tools Menu      │───>│ Send Email Overlay            │    │
│  │ "Send project   │    │  - Recipient chips + search   │    │
│  │  email"         │    │  - Greeting names              │    │
│  └─────────────────┘    │  - Special notes               │    │
│                         │  - Cancel / Download / Send    │    │
│                         └──────┬────────────┬────────────┘    │
│                                │            │                 │
│                    ┌───────────┘            └──────────┐      │
│                    ▼                                   ▼      │
│  ┌──────────────────────────┐   ┌──────────────────────────┐ │
│  │ AddressBook Decryptor    │   │ PayloadBuilder           │ │
│  │ fetch CDN → AES-GCM     │   │ recipients + HTML body   │ │
│  │ decrypt → contact list   │   │ from Share template      │ │
│  └────────────┬─────────────┘   └──────────┬───────────────┘ │
│               │                            │                 │
│               ▼                            ▼                 │
│  ┌──────────────────┐          ┌──────────────────────────┐  │
│  │ R2 CDN           │          │ Cloudflare Worker        │  │
│  │ cdn.noble-       │          │ /api/email/send          │  │
│  │ architecture.com │          │ /api/email/verify-auth   │  │
│  └──────────────────┘          └──────────┬───────────────┘  │
└───────────────────────────────────────────┼──────────────────┘
                                            │
                                            ▼
                              ┌──────────────────────────┐
                              │ Microsoft Graph API      │
                              │ sendMail (OAuth2 client  │
                              │ credentials flow)        │
                              └──────────────────────────┘
```

## File Map

### Frontend Modules (browser-side)

| File | Purpose |
|------|---------|
| `Na__Feature__EmailWorkers__UiInteractionLogic__.js` | Main entry — wires menu, overlay, contacts, auth, send flow |
| `Na__Feature__EmailWorkers__FormOverlay__.js` | Builds the modal DOM (recipients, greeting, notes, buttons) |
| `Na__Feature__EmailWorkers__FormOverlay__Stylesheet__.css` | All overlay + auth overlay CSS |
| `Na__Feature__EmailWorkers__AddressBook__Autocomplete__.js` | Chip input with address book filtering and keyboard support |
| `Na__Feature__EmailWorkers__AddressBook__Decryptor__.js` | Fetches encrypted JSON from R2 CDN, decrypts client-side |
| `Na__Feature__EmailWorkers__ApiClient__.js` | HTTP client for Worker endpoints (send, verify-auth) |
| `Na__Feature__EmailWorkers__PayloadBuilder__.js` | Builds email payload using Share Project Link HTML template |
| `Na__Feature__EmailWorkers__AuthManager__.js` | localStorage token persistence + auth overlay orchestration |
| `Na__Feature__EmailWorkers__AuthOverlay__.js` | Password modal DOM for email send authorization |
| `Na__Feature__EmailWorkers__Config.json` | CDN URL, decrypt key, Worker API URL, timeouts |

### Cloudflare Worker (server-side)

| File | Purpose |
|------|---------|
| `CloudflareWorker/src/index.js` | Worker entry: auth verify, send mail, rate limit, BCC |
| `CloudflareWorker/wrangler.jsonc` | Worker config and non-secret env vars |
| `CloudflareWorker/package.json` | Dependencies (jose for JWT/HMAC) |
| `CloudflareWorker/.dev.vars` | Local dev secrets (gitignored) |
| `CloudflareWorker/.env.template` | Secret names reference (all values redacted) |
| `CloudflareWorker/Deploy__Worker.bat` | One-click deploy + set secrets |
| `CloudflareWorker/Dev__Worker.bat` | One-click local dev server |

### Address Book (offline tooling)

| File | Purpose |
|------|---------|
| `Na__Email__AddressBook__Source__.json.--HIDDEN` | Plaintext contacts (gitignored) |
| `Na__Email__AddressBook__EncryptionTool__.py.--HIDDEN` | Encrypts + uploads to R2 + patches keys (gitignored) |
| `CloudflareWorker/assets/Na__Email__AddressBook__Encrypted__.json` | Local encrypted copy (for dev) |

## Security Model

**Nothing sensitive is committed to git.** Here is where each secret lives:

| Secret | Where it lives | Accessible to |
|--------|---------------|---------------|
| Email addresses (plaintext) | `.json.--HIDDEN` file (gitignored) | Local machine only |
| Email addresses (encrypted) | R2 CDN (public but encrypted) | Anyone, but useless without key |
| AES-256-GCM decrypt key | Config JSON (committed) | Browser JS (obfuscation only) |
| Microsoft Graph client secret | Wrangler secret (Cloudflare) | Worker runtime only |
| Auth password | Wrangler secret (Cloudflare) | Worker runtime only |
| HMAC signing key | Wrangler secret (Cloudflare) | Worker runtime only |
| BCC admin email | Encrypted address book (first entry) | Resolved at runtime, not in code |
| Cloudflare API tokens | `Token__CloudflareAPI.env` (gitignored via `*.env`) | Local machine only |

**Key principle:** The frontend handles contact display (encrypted + obfuscated). The Worker handles email sending (real secrets never leave Cloudflare). The address book key in the config JSON is deliberate obfuscation, not true security — acceptable for internal company email addresses.

## Send Flow

1. User clicks "Send project email" in Tools menu
2. Overlay opens, contacts fetched from R2 CDN and decrypted client-side
3. User selects recipients, fills greeting + notes
4. User clicks "Send email"
5. Auth manager checks localStorage for valid HMAC token
6. If no token: password overlay appears, password sent to `/verify-auth`, HMAC token returned and stored (30-day expiry)
7. PayloadBuilder generates HTML email body using the Share Project Link template
8. ApiClient POSTs to `/api/email/send` with Bearer token + payload
9. Worker validates HMAC token, checks rate limit (10/hr), validates recipient domains
10. Worker fetches + decrypts address book from R2, uses first entry as BCC
11. Worker sends via Microsoft Graph `sendMail` (client-credentials OAuth2)
12. Success toast shown to user

## Adding a New Contact

```
1. Edit  Na__Email__AddressBook__Source__.json.--HIDDEN
2. Run   python "Na__Email__AddressBook__EncryptionTool__.py.--HIDDEN"
3. Done. Script encrypts → uploads to R2 → patches .dev.vars → patches Config.json
4. Commit and push (Config.json has the updated key)
```

No Worker redeployment needed for contact changes.

## Deploying the Worker

```
Double-click  CloudflareWorker/Deploy__Worker.bat
```

Or manually:
```
cd CloudflareWorker
set CLOUDFLARE_API_TOKEN=<from Token__CloudflareAPI.env>
npx wrangler deploy
npx wrangler secret put MICROSOFT_CLIENT_SECRET
npx wrangler secret put EMAIL_ADDRESSBOOK_KEY_B64
npx wrangler secret put EMAIL_AUTH_PASSWORD
npx wrangler secret put EMAIL_AUTH_TOKEN_SECRET
npx wrangler secret put ALLOWED_ORIGIN
npx wrangler secret put R2_SECRET_ACCESS_KEY
```

## Local Development

```
Double-click  CloudflareWorker/Dev__Worker.bat
```

Starts Worker at `http://127.0.0.1:8787` using `.dev.vars` for secrets. The frontend config has a localhost override that auto-switches when running from `127.0.0.1`.

## Dependencies on Module 61 (Share Project Link)

The email body is generated by reusing the Share Project Link HTML template system:
- `PayloadBuilder` imports `GetShareContext` and `BuildEmailHtml` from `61__Feature__ShareProjectLink`
- `UiInteractionLogic` imports `DownloadHtmlFile` for the "Generate & download" button
- The email template at `61__Feature__ShareProjectLink/Na__Feature__ShareProjectLink__ProjectEmail__Template__.html` is the single source of truth for email layout
