// =============================================================================
// VALEVISION3D - EMAIL WORKERS - AUTH MANAGER
// =============================================================================
//
// FILE       : Na__Feature__EmailWorkers__AuthManager__.js
// NAMESPACE  : Na__Feature__EmailWorkers
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : localStorage token management and auth overlay orchestration
// CREATED    : 09-Apr-2026
//
// DESCRIPTION:
// - Persists HMAC auth tokens in localStorage with 30-day expiry
// - Orchestrates the auth overlay: show, verify via Worker, save token
// - Provides ensureAuthorized() as the single entry point for the send flow
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__Feature__EmailWorkers__CreateAuthOverlay } from './Na__Feature__EmailWorkers__AuthOverlay__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Token Storage Constants
// -----------------------------------------------------------------------------

    const Na__EmailAuth__TokenKey  = 'valevision3d_email_auth_token';            // <-- localStorage key for HMAC token
    const Na__EmailAuth__ExpiryKey = 'valevision3d_email_auth_expiry';           // <-- localStorage key for expiry timestamp

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Token Persistence Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Check if a Valid Auth Token Exists in Storage
    // ------------------------------------------------------------
    function Na__Feature__EmailWorkers__HasValidAuthToken() {
        const token  = localStorage.getItem(Na__EmailAuth__TokenKey);
        const expiry = localStorage.getItem(Na__EmailAuth__ExpiryKey);

        if (!token || !expiry) {
            return false;
        }

        const expiryMs = parseInt(expiry, 10);
        if (isNaN(expiryMs) || Date.now() > expiryMs) {
            Na__Feature__EmailWorkers__ClearAuthToken();
            return false;
        }

        return true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get the Stored Auth Token String
    // ------------------------------------------------------------
    function Na__Feature__EmailWorkers__GetAuthToken() {
        return localStorage.getItem(Na__EmailAuth__TokenKey) || '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Save Auth Token and Expiry to Storage
    // ------------------------------------------------------------
    function Na__Feature__EmailWorkers__SaveAuthToken(token, expiresAtMs) {
        localStorage.setItem(Na__EmailAuth__TokenKey, token);
        localStorage.setItem(Na__EmailAuth__ExpiryKey, String(expiresAtMs));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Clear Auth Token from Storage
    // ------------------------------------------------------------
    function Na__Feature__EmailWorkers__ClearAuthToken() {
        localStorage.removeItem(Na__EmailAuth__TokenKey);
        localStorage.removeItem(Na__EmailAuth__ExpiryKey);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Auth Orchestrator
// -----------------------------------------------------------------------------

    // FUNCTION | Ensure the User is Authorized Before Sending
    // ------------------------------------------------------------
    function Na__Feature__EmailWorkers__EnsureAuthorized(apiClient, rootElement, showToast) {
        if (Na__Feature__EmailWorkers__HasValidAuthToken()) {
            return Promise.resolve(Na__Feature__EmailWorkers__GetAuthToken());
        }

        return new Promise((resolve, reject) => {
            const authOverlay = Na__Feature__EmailWorkers__CreateAuthOverlay(rootElement);

            const cleanup = () => {
                authOverlay.hide();
                authOverlay.destroy();
            };

            authOverlay.onCancel(() => {
                cleanup();
                reject(new Error('Authorization cancelled.'));
            });

            authOverlay.onSubmit(async (password) => {
                try {
                    authOverlay.setLoading(true);
                    const result = await apiClient.verifyAuth(password);

                    if (!result?.ok || !result?.token) {
                        throw new Error(result?.error || 'Verification failed.');
                    }

                    Na__Feature__EmailWorkers__SaveAuthToken(result.token, result.expiresAt);
                    cleanup();
                    resolve(result.token);
                } catch (error) {
                    authOverlay.setLoading(false);
                    const message = error?.message || 'Verification failed. Please try again.';
                    authOverlay.showError(message);
                }
            });

            authOverlay.show();
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Feature__EmailWorkers__HasValidAuthToken,
        Na__Feature__EmailWorkers__GetAuthToken,
        Na__Feature__EmailWorkers__SaveAuthToken,
        Na__Feature__EmailWorkers__ClearAuthToken,
        Na__Feature__EmailWorkers__EnsureAuthorized
    };

// endregion -------------------------------------------------------------------
