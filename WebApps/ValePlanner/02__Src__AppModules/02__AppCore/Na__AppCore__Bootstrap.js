import '../04__AppTypes/Na__AppTypes__Schema.js';
import { Na__AppCore__InitializeValePlannerApp } from './Na__AppCore__ValePlannerApp.js';

// -----------------------------------------------------------------------------
// REGION | ValePlanner Bootstrap
// -----------------------------------------------------------------------------

 // FUNCTION | Initialize App From Root Element
 // ------------------------------------------------------------
 function Na__AppCore__Bootstrap() {
     const appRootElement = document.getElementById('naValePlannerAppRoot');
     if (!appRootElement) {
         throw new Error('ValePlanner root element not found');
     }

     Na__AppCore__InitializeValePlannerApp(appRootElement);
 }
 // ------------------------------------------------------------


 Na__AppCore__Bootstrap();

// endregion ----------------------------------------------------
