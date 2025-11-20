=========================================================
# ValeVision3D - Version Notes
=========================================================

---

Version :  0.2.6
Date    :  ??-Nov-2025
Status  :  Under Development
Goal    :  Dynamic Model Loading based on Whitecardopedia project selection.
- Whitecardopedia Project View features a 'Load Model' button overlay over the image in the viewer.
  - use this image  `..\assets__CommonApplicationAssets\Logo__ValeVision3d\FeatureLogo__ValeVision3d__ClickHereVersion__50%-Opacity__1.0.0__.png` as the overlay image.
  - note use relative but its a level above the apps index.html file.
- Once clicked this then opens Whitecardopedia Project Viewer in a new tab and passes the project id to the ValeVision3D application.
- The ValeVision3D application then loads the model based on the project id.
- Reads the project.json file for the project id and loads the model based on the 'valeVision_ModelUrl' field.
- Load ValeVision3D Application and pass the project url to the application loader (A new dynamic url loader script should be added alongside the existing basic url loader script that already existis.)
- update the main valevision app to ensure that the app tries to launch the dynamic loader script but if it fails then it falls back to the basic url loader script.
- load the vale vision app relative from the whitecardopedia index.html file. i.e "../ValeVision3D/index.html"
- My Aim is to to the ValeVision3D Application already built but have it called by Whitecardopedia Project Viewer. and the respective project models loaded into the application seamlessly.


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