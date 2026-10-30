# 62__Feature__EmailWorkers - Architecture Guide

## What It Does

**Share Project Link** (Tools menu, Send project email): ValeVision 3D's emails, sent from the browser through the
app's own server, which sends them with Microsoft Graph from Vale's apps mailbox on behalf of whoever is signed in
(Employee and up: designers, managers, developers).

- **Internal Vale Company Sharing** (this folder): the share-link email and the app notification email to Vale staff,
  with an address book of every active Vale user. Vale addresses only.
- **External Client Sharing** (built into the same form by `93__Feature__ClientLinks`): client links, and the
  **client email**, which goes to clients (since v2.79.0, 28-Oct-2026).

The folder keeps its old name: until 06-Oct-2026 (v2.72.0) the sending was a Cloudflare Worker with its own password,
token and encrypted address book on R2. All of that is gone: the Vale sign-in is the authorisation and the users
register is the address book.

## System Architecture

```
BROWSER  app.valegardenhouses.com/valevision/
  Tools menu "Send project email"  ->  Share Project Link form (FormOverlay, two tabs)

    Internal tab (this folder)                        External tab (93__Feature__ClientLinks)
      recipients from the address book                  Client email: client address(es),
      greeting names, special notes                     Dear ..., client link, special notes
      PayloadBuilder (61 Share template)                ClientEmail Builder (+ the sender's sign-off)
      ApiClient                                         SendCheck modal: check, tick, send, "Email sent"
            |                                                     |
            +---------------------+-------------------------------+
                                  v
SERVER  Server__Api/Api__ValeVision3D/ValeVision3D__Api__Email__.py  (Flask, systemd vale@ValeVision3D)
  GET  api/email/contacts   the users register: active users in Vale's domains
  POST api/email/send       signed in (Employee+), every address checked, outside addresses only
                            with the client email's live client link, hourly limits, the copies
                                  |
                                  v
Microsoft Graph sendMail (client credentials) from MICROSOFT_SENDER_USER (no-reply-apps@valegardenhouses.com),
Reply-To the sender
```

## File Map

### This folder (the Internal tab and the form)

| File | Purpose |
|------|---------|
| `Na__Feature__EmailWorkers__UiInteractionLogic__.js` | Main entry: the menu item, the form, the address book, the Internal tab's sends; builds the External tab on first use |
| `Na__Feature__EmailWorkers__FormOverlay__.js` | The form: the two tabs; the Internal tab's recipients, greeting, notes and buttons |
| `Na__Feature__EmailWorkers__FormOverlay__Stylesheet__.css` | The form and its tabs |
| `Na__Feature__EmailWorkers__AddressBook__Autocomplete__.js` | Recipient chips with address book suggestions |
| `Na__Feature__EmailWorkers__ApiClient__.js` | `api/email/contacts` and `api/email/send` |
| `Na__Feature__EmailWorkers__PayloadBuilder__.js` | The share-link email, from the Share Project Link template (`61__Feature__ShareProjectLink`) |
| `Na__Feature__EmailWorkers__Config.json` | The request timeout |

### The client email (`93__Feature__ClientLinks/`)

| File | Purpose |
|------|---------|
| `Na__ClientLinks__ShareTab__.js` | The External tab: client links, and the Client email panel (addresses, Download Email, Send email) |
| `Na__ClientLinks__SendCheck__.js` | The modal: "This email is going outside Vale", the checklist, the tick box, the send, "Email sent to ..." |
| `Na__ClientLinks__ClientEmail__Builder__.js` | Fills the template; a sent email gets the sender's sign-off (Kind regards, name, role) |
| `Na__ClientLinks__ClientEmail__Template__.html` | The client email card |
| `Na__ClientLinks__Helpers__.js` | The API call, the email address rule (the server's own) |

### The server

| File | Purpose |
|------|---------|
| `Server__Api/Api__ValeVision3D/ValeVision3D__Api__Email__.py` | Contacts, the send, the rules below |
| `Server__Api/Api__ValeVision3D/ValeVision3D__Api__Activity__.py` | Each send in the activity ledger (`email.send`; a client email is `email.client`, with its link) |

## The Rules (the server decides)

| | Internal | Client email |
|---|---|---|
| **Addresses** | Vale's own domains (`ALLOWED_SEND_DOMAINS`, default `valegardenhouses.com`) | any, with the project and a live client link of it, carried in the email; up to 10 a send |
| **Who** | Employee and up | Employee and up |
| **An hour, per sender** | 30 sends | 10 sends; Management and App Admins 20 |
| **Copies** | blind: the sender, the admin (`VALE_EMAIL_BCC`) | the sender in **CC** (the client sees who sent it); the admin blind |

- An address outside Vale without a client link is refused (403), and the refusal is recorded in the ledger.
- Every address is checked first: one plain address, no name, no spaces, a domain with a dot.
- Each send counts once, whatever number of addresses. The hour is one small file in the server's temp folder,
  shared by both gunicorn workers under a cross-process lock; a send Graph refuses gives its place back.
- The answer names where it went (`sentTo`, `cc`) and what is left (`limitPerHour`, `remainingQuota`); the page says
  "Email sent to ..." only from that answer.

## Send Flow

**Internal:** choose the email on its two picture cards (**Project link email**, or **New project notice**: no link, it
points to the install guide), pick recipients, fill greeting and notes, then **Send email** (v2.79.4). The toast says
where it went: "Email successfully sent to derek@..., roger@... and 2 more."

**Client email:**
1. External Client Sharing, Client email: the client's address(es), Addressed to (Dear ...), the client link (a new
   never-expiring one by default), special notes.
2. **Send email**: the link is made if new, the email is built with the sender's sign-off, the send check opens.
3. The send check: To in large type, CC (you), subject, greeting, project, link, notes; the checklist; **Preview
   email**; tick "I have checked this email, and it is ready to go to the client"; **Send email**.
4. "Email sent": successfully sent to the address(es), who was copied in, the client emails left this hour. The panel
   keeps a record and the form clears.

**Download Email** (both tabs) still makes the HTML to paste into Outlook; a downloaded client email has no
sign-off (the sender's own Outlook signature follows it).

## Server Settings

Read from the environment (`/etc/vale/apps/ValeVision3D.env`, the secret in `/etc/vale/secrets/ValeVision3D.env`):

| Setting | Default | |
|---|---|---|
| `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_SENDER_USER` | none | without them a send answers 503 |
| `ALLOWED_SEND_DOMAINS` | `valegardenhouses.com` | Vale's own domains: internal |
| `VALE_EMAIL_BCC` | none | the admin's blind copy of every send (comma-separated) |
| `EMAIL_LIMIT_INTERNAL_PER_HOUR` | 30 | |
| `EMAIL_LIMIT_CLIENT_PER_HOUR` | 10 | |
| `EMAIL_LIMIT_CLIENT_MANAGEMENT_PER_HOUR` | 20 | Management and App Admins |

`RATE_LIMIT_MAX_PER_HOUR` (the one limit before v2.79.0) is no longer read. `GET /valevision/api/email/health`
answers `configured`, `adminBcc` and the `limits` in force.

A change to the server code needs a `server-api` push **and** a restart of `vale@ValeVision3D`: a push never restarts
it.
