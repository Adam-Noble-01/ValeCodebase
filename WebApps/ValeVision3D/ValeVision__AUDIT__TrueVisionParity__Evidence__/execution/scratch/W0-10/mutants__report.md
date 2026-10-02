# W0-10 mutation check of the worker node tests

Each mutant puts one deliberate fault into one staged worker file (assembled in the post-patch layout in %TEMP%); a mutant is CAUGHT when at least one test exits non-zero.

## Baseline (no mutation)

- Na__Test__EditorWorker__ProjectFiles__.test.mjs: exit 0, 263/263 checks passed
- Na__Test__EditorWorker__MergeKeys__.test.mjs: exit 0, 95/95 checks passed

| Mutant | File | Fault | ProjectFiles | MergeKeys | Caught |
|---|---|---|---|---|---|
| M01 | index.js | no folderId check | exit 1, 245/263 checks passed - first: FAIL  POST /api/editor/projects/2026/delete is refused (400), never a delete of every 2026 project  -> [200,{"success":true,"folderId":"2026 | exit 1, 93/95 checks passed - first: FAIL  a bad folderId ("2026") answers 400  -> 404 | yes |
| M02 | index.js | key checked before the route (1.5.0 order: unknown paths answer 401) | exit 1, 251/263 checks passed - first: FAIL  GET /api/editor/unknown without the key answers a JSON 404  -> [401,"{\"error\":\"Unauthorized\"}"] | exit 0, 95/95 checks passed | yes |
| M03 | index.js | health route list without 'files' | exit 1, 262/263 checks passed - first: FAIL  health lists the routes save, assets, drawing-notes, project, merge-keys, files  -> {"ok":true,"worker":"whitecardopedia-editor-api"," | exit 0, 95/95 checks passed | yes |
| M04 | CloudflareHelper__PathGuards__.js | 00__Archive accepted as a sheet-picture folder | exit 1, 262/263 checks passed - first: FAIL  refused: a sheet picture in 00__Archive (read, write and upload all 400)  -> [200,400,400] | exit 0, 95/95 checks passed | yes |
| M05 | CloudflareHelper__PathGuards__.js | "." and ".." segments accepted | exit 1, 260/263 checks passed - first: FAIL  refused: ".." inside a statement path (read, write and upload all 400)  -> [404,200,200] | exit 0, 95/95 checks passed | yes |
| M06 | CloudflareHelper__PathGuards__.js | merge guard by prefix family instead of the list | exit 0, 263/263 checks passed | exit 1, 92/95 checks passed - first: FAIL  every unlisted key inside a listed prefix family is refused, set and remove, with nothing written (15 keys)  -> [["LayoutEditor__Foo", | yes |
| M07 | CloudflareHelper__PathGuards__.js | a list naming a pipeline key accepted (fails open) | exit 0, 263/263 checks passed | exit 1, 94/95 checks passed - first: FAIL  a list that is naming a pipeline key refuses every merge (500, fails closed), nothing written  -> [200,{"ok":true,"success":true,"fold | yes |
| M08 | CloudflareHelper__PathGuards__.js | sheet-picture hash not checked | exit 1, 261/263 checks passed - first: FAIL  refused: bytes that do not hash to the name  -> [200,{"ok":true,"path":"05__Layout__DrawingDocs__Images/RB05_D01/Pic__0123456789.webp" | exit 0, 95/95 checks passed | yes |
| M09 | handlers/CloudflareHandler__ProjectFiles__.js | published deletes across document folders | exit 1, 261/263 checks passed - first: FAIL  refused: delete of two document folders in one call  -> [200,{"ok":true,"deleted":2,"paths":["06__Layout__PublishedDocuments/RB05_D01/ | exit 0, 95/95 checks passed | yes |
| M10 | handlers/CloudflareHandler__ProjectFiles__.js | unmanaged sheet-picture deletes allowed | exit 1, 256/263 checks passed - first: FAIL  refused: unmanaged name "photo.webp" (write, upload, delete and copy all 400)  -> [400,400,200,400] | exit 0, 95/95 checks passed | yes |
| M11 | handlers/CloudflareHandler__ProjectFiles__.js | cross-family copies allowed | exit 1, 260/263 checks passed - first: FAIL  refused: published -> sheet picture  -> [200,{"ok":true,"path":"05__Layout__DrawingDocs__Images/RB05_D02/Pic__ff13dacda8.webp","key":" | exit 0, 95/95 checks passed | yes |
| M12 | handlers/CloudflareHandler__ProjectFiles__.js | no 25 MB cap on files/write | exit 1, 262/263 checks passed - first: FAIL  refused (413): a write over 25 MB  -> 200 | exit 0, 95/95 checks passed | yes |
| M13 | handlers/CloudflareHandler__ProjectMerge__.js | the build manifest always bumped | exit 0, 263/263 checks passed | exit 1, 90/95 checks passed - first: FAIL  the build manifest was not written (no bumpBuild) | yes |
| M14 | handlers/CloudflareHandler__ProjectMerge__.js | drawingsBase ignored | exit 0, 263/263 checks passed | exit 1, 91/95 checks passed - first: FAIL  409 { conflict: true } when the window loaded another stamp, nothing written  -> [200,{"ok":true,"success":true,"folderId":"2026/3047_ | yes |
| M15 | handlers/CloudflareHandler__ProjectMerge__.js | unconditional write (a concurrent write is lost) | exit 0, 263/263 checks passed | exit 1, 90/95 checks passed - first: FAIL  the other writer's change is kept  -> ["IMG01__Front.png"] | yes |
| M16 | handlers/CloudflareHandler__ProjectMerge__.js | a missing project.json not answered 409 | exit 0, 263/263 checks passed | exit 1, 94/95 checks passed - first: FAIL  answers 409 { missing: true } when R2 holds no project.json  -> [500,{"error":"Merge failed: Cannot read properties of undefined (read | yes |

Baseline green: yes. Every mutant caught: yes.
