# ValeVision AURA's Own Scenes

Scenes that belong to AURA rather than to a project (AURA 0.5.8, 30-Oct-2026). Adam asked for "a ValeVision Aura Scene I can access but that isnt visible to anyone else", and for scenes shown "like TheiaVideo". They sit beside the year folders, so ValeVision Gallery, ValeVision 3D and Theia never list them. Only AURA's API reads this folder (`AuraRender__Api__Core__`).

| Scene | Who sees it | What it is |
|---|---|---|
| `AuraScene__ExampleCottage` | Everyone AURA lets in: managers, directors and App Admins | The engine's demo cottage, for trying AURA's tools |
| `AuraScene__Test` | Adam alone (`USR00000001`) | Adam's destructive scene for experiments. Also starts from the demo cottage |

## How a scene works

- Each folder is laid out as a project: `ProjectData__<id>__.json`, then AURA's own bucket `ValeVision__AuraRender/` (its drawing set in `UserData__AuraDrawings/`, made on the first save on the server).
- The record says who it opens for. `auraSceneAudience` is `Management` (everyone who can open AURA) or `Owner` (one account: `auraSceneOwner`, a USR code from the user register). `auraEnabled` must be true. `auraSceneNote` is the line on its card.
- A scene with no ValeVision 3D whitecard draws the engine's demo cottage, as both do today.
- A scene someone else owns answers 404 to them, as if it did not exist, and never appears on their landing page.
- Opened at `/aura/?project=<id>`, or from its card on `/aura/`.

## Adding one

1. Make `AuraScene__<Name>/` here (letters and digits after `AuraScene__`).
2. Add its `ProjectData__AuraScene__<Name>__.json` with the keys above.
3. Push the `projects` mapping. The record travels both ways (project data); its drawing set is user data, collected from the server.
