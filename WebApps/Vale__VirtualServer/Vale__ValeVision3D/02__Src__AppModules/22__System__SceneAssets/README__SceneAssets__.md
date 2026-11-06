# 22__System__SceneAssets

What people and plants share since staff can place them: the page's side of who did what, the Changes section, and the panel on the left as dropdown sections (v2.91.0). Adam, 05-Nov-2026: "Employees should be able to create entourage and foliage. So we need a system and way of tracking ownership of those assets and changes, so who inserted what etc".

## How It Stands

**Built, v2.89.0.** The sums are on the server, in `Server__Api/Api__ValeVision3D/ValeVision3D__Api__SceneAssets__Logic__.py`, whose header is the place to start. This folder only carries the words and draws the tab.

- **The record is what is approved, and it is all a client ever reads.** What is waiting sits beside it, in `<project>/ValeVision3D/UserData__SceneAssets/ValeVision__SceneAssets__Changes__.json`. Staff work on the two laid together.
- **The item is the unit:** a figure, a plop, a path or a palette, by its Uid.
- **An admin's change is approved as it is made. Anyone else's waits.**
- **Removing someone's changes** puts each item back as it stood just before they first touched it, except one somebody else has changed since.

## Who Gets What

| Who | Page asks | Server asks | What |
|---|---|---|---|
| A client link, an Affiliate | Neither below | Refused | Reads the record. The section shows only with something approved |
| Staff on a phone | `Na__DevGate__IsStaff` | Employee | Sees what is waiting too. No rows to place with |
| Staff on a computer or tablet | `Na__DevGate__CanCreateAssets` | Employee | Places, saves, removes their own |
| An AppAdmin | `Na__DevGate__IsAuthoringEnabled` | `AUTHOR_LEVEL` | Approves, removes anyone's, line rules, the off switch |

## Files

| File | Namespace | What |
|---|---|---|
| `Na__SceneAssets__Api__.js` | `Na__SceneApi` | The four routes. Never rejects: every call resolves to `{ ok, error, ... }` |
| `Na__SceneAssets__ChangesPanel__.js` | `Na__SceneChanges` | The Changes section each panel draws, the who line on a row, the icons |
| `Na__SceneAssets__Hub__.js` | `Na__SceneHub` | The Vegetation and Entourage panels' dropdown sections, in the manner of Tools & Settings: one open at a time, each made when it opens and taken down when it folds (v2.91.0) |
| `Na__SceneAssets__Styles__.css` | | Icons on rows, who did what, the panel's dropdown sections (the old tab and fold rules stay, unused) |

Each system's data module (`Na__EntData`, `Na__VegData`) calls the routes and keeps the object, and each system's shell brings the picture, the undo steps and the panels into line when the server's answer changes it (`AfterReplaced`).

## Rules That Bite

- **`scene-assets` must never join `CLIENT_READ_ENDPOINTS`.** Its answers hold staff names.
- **A route's last segment is fixed,** and it resolves through `resolve_project_exact`: note 14, section 3.
- **It stays the one object.** Everything holds the same object, so `TakeAnswer` replaces its contents and never the object.
- **A key outside the item lists is an admin's.** Add a new setting freely: an Employee's is ignored. Add a new list of items to `NA_SYSTEMS` in the Logic file, or an Employee's work in it is not saved.
