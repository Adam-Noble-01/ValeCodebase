# New Feature: Add Full Screen Button
- Add a new button to the end of the toolbar (At the bottom)
- When the button is clicked the dropdown arrow will be toggled on and off.
- When the dropdown arrow is toggled on, the button will be replaced with an "Exit Full Screen" button.
- Ensure there is a script exclusively for the full screen mode code with different browsers support.
---
### Create Files In 
`60__Feature__FullScreenMode`
  - `NewFeature__Fud`
  - `

Ensures the browser supports the full screen mode and uses the correct API for the browser.
`Na__Feature__FullScreenMode__BrowserSupportLogic__.js`

Captures events from the UI and and passes events to main app logic.
`Na__Feature__FullScreenMode__UiInteractionLogic__.js`
