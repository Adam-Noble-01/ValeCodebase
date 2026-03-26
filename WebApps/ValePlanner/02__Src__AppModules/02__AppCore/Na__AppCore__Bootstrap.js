import '../04__AppTypes/Na__AppTypes__Schema.js';
import { Na__AppCore__InitializeValePlannerApp } from './Na__AppCore__ValePlannerApp.js';

// -----------------------------------------------------------------------------
// REGION | ValePlanner Bootstrap
// -----------------------------------------------------------------------------

 // FUNCTION | Initialize App From Root Element
 // ------------------------------------------------------------
 async function Na__AppCore__Bootstrap() {
     const appRootElement = document.getElementById('naValePlannerAppRoot');
     if (!appRootElement) {
         throw new Error('ValePlanner root element not found');
     }

    await Na__AppCore__InitializeValePlannerApp(appRootElement);
 }
 // ------------------------------------------------------------


Na__AppCore__Bootstrap().catch((errorValue) => {
    console.error('ValePlanner bootstrap failed:', errorValue);
});

// endregion ----------------------------------------------------
