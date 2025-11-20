=========================================================
# ValeVision3D - Version Notes
=========================================================

---
7
Date    :  ??-Nov-2025
Status  :  Under Development
Goal    :  Dynamic Camera position loading based on Whitecardopedia project selection.
- Need to add camera config to each project.json file.

---

---
Product :  Whitecardopedia & ValeVision3D
Version :  0.2.6
Date    :  20-Nov-2025
Status  :  Under Development
Added   :  Dynamic Model Loading based on Whitecardopedia project selection.
- Updated gallery to include a 'Load Model' button overlay over the image in the viewer.
- `project.json` file now includes a `valeVision_ModelUrl` field that contains the URL of the model to load.
- Cloudflare Bucket Builder Automation Script to sync .glb model files to Cloudflare R2.
- ValeVision3D Application is now launched in a new tab when the 'Load Model' button is clicked.
- The corresponding project model is loaded into the application seamlessly.
New Cloudflare Bucket Builder Automation Script
`Tools__DevUtils/AutomationUtil__BuildCloudflareBucket__WhitecardopediaProjects__Main__.py`
- Automates incremental syncing of .glb model files from local Whitecard project folders to Cloudflare R2, 
Updated project builder script to include the new 'valeVison_ModelUrl' field in the project.json files.
`AutomationUtil__FetchLocalProjects__BuildWhitecardopediaProject__Main__.py`

---

Version :  0.2.5
Date    :  20-Nov-2025
Status  :  Pushed to GitHub Pages
- Added a loading overlay to the application.
- Added user instructions panel to the application.
- Add better camera position overlay to the application and Json Download button.

---

Version :  0.2.4
Date    :  20-Nov-2025
Status  :  Pushed to GitHub Pages
- Added rudimentary Ambient Occlusion (SSAO) to the application.

---

=========================================================
### End of Version Notes