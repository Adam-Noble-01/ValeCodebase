import '../04__AppTypes/Na__AppTypes__Schema.js';
import { Na__AppCore__InitializeValePlannerApp } from './Na__AppCore__ValePlannerApp.js';
import { Na__AppInstallability__RegisterServiceWorkerAsync } from '../62__Feature__AppInstallability/Na__Feature__AppInstallability__ServiceWorkerRegistration__.js';
import { Na__ServerConnection__InitializeMonitor } from '../70__System__DevTools/Na__System__ServerConnectionStatus__Monitor.js';
import { Na__ServerStatusBanner__Initialize } from '../70__System__DevTools/Na__System__ServerConnectionStatus__Banner.js';

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

    Na__ServerConnection__InitializeMonitor();
    Na__ServerStatusBanner__Initialize();
    void Na__AppInstallability__RegisterServiceWorkerAsync();

    await Na__AppCore__InitializeValePlannerApp(appRootElement);
 }
 // ------------------------------------------------------------


Na__AppCore__Bootstrap().catch((errorValue) => {
    console.error('ValePlanner bootstrap failed:', errorValue);
});

// endregion ----------------------------------------------------
