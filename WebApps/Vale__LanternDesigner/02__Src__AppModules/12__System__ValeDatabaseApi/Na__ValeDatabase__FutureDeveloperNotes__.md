# Vale Database API - Future Developer Notes
# =========================================================

- FILE       : Na__ValeDatabase__FutureDeveloperNotes__.md
- MODULE     : 12__System__ValeDatabaseApi
- AUTHOR     : Adam Noble - Noble Architecture
- CREATED    : 06-Aug-2026
- STATUS     : PLACEHOLDER FEATURE - read this before extending it


## What this folder is

This folder is a stand-in for the future integration with the Vale Garden
Houses SQL client database. The Lantern Designer's preferred new-project flow
asks the user for a Vale standard job number (a plain 4 or 5 digit integer
with no leading zero, e.g. 1256, 2456, 15134 or 94756), fetches the client
record behind that number, shows the details for confirmation, and builds the
project from them - client name, site address, document name and account
manager all land in the project file without being typed.

Nothing in this folder talks to a real database yet. The "database" is
`Na__ValeDatabase__ClientRecords__.json`, a phoney table of hand-authored
client records shaped like the result set the real SELECT would return.
A valid job number that matches one of the records resolves that record;
any other well-formed number reports not found. The list of numbers that
resolve lives in `Na__ValeDatabase__ValidTestCodes__.md` beside this file.


## How the placeholder is wired

- `VghLantern__ValeDatabase__ClientLookup__.js` is the only API surface.
  Its `FetchClientRecord(jobNumberText)` is async by contract and resolves
  `{ Ok, Record }` or `{ Ok, Error }` after a simulated latency, so every
  caller is already written for a real network round trip.
- `Na__ValeDatabase__Config.json` is a ConfigLoader overlay (registered in
  `SYSTEM_CONFIG_OVERLAYS` in `VghLantern__AppCore__ConfigLoader__.js`)
  holding the table path, the simulated latency and the job number digit
  rules. It is merged into the app config at boot like every other system
  config.
- The consumer is the new-project database modal in
  `10__System__DocumentManagementMode/VghLantern__DocManagement__ProjectActions__.js`,
  which validates the entry in real time via `ValidateJobNumber`, renders
  the preview from `GetColumns()` so the UI mirrors whatever the table
  declares, and composes the project file's single SiteAddress line through
  `ComposeSiteAddress`.
- On accept, the record flows into the paperwork in two places: the
  composed address and account manager ride into the project metadata on
  the create call itself (`ProjectFileManager` CreateProject's trailing
  siteAddress and author parameters), and the record's structured address
  fields are seeded into the welcome letter's recipient block through the
  ClientDoc LetterModel, replacing the literal `{{ClientAddress__*}}`
  placeholder tokens the letter otherwise prints.


## What the real integration replaces

1. `FetchClientRecord` swaps its JSON read for the SQL-backed request
   (expected shape: `SELECT ... FROM ValeClients WHERE JobNumber = ?`,
   see the SourceQueryNote in the client records file). Keep the resolved
   object shape identical and nothing upstream changes.
2. `ClientTablePath` in the config becomes the request URL or API route;
   `SimulatedLatencyMs` is set to 0 or retired.
3. The not-found and unavailable branches already exist in the modal -
   the real endpoint only needs to map its failures onto those two states.
4. `Na__ValeDatabase__ClientRecords__.json` and
   `Na__ValeDatabase__ValidTestCodes__.md` are deleted once real data flows.

The manual entry path (the "Not in the Database? Click Here" link in the
modal) is deliberately retained regardless - it covers ad hoc projects and
testing without touching client data, and is the fallback if the database
is ever unreachable.
