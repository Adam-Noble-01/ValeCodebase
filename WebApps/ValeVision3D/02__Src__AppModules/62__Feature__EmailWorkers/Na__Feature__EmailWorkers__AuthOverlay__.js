// =============================================================================
// VALEVISION3D - EMAIL WORKERS - AUTH OVERLAY
// =============================================================================
//
// FILE       : Na__Feature__EmailWorkers__AuthOverlay__.js
// NAMESPACE  : Na__Feature__EmailWorkers
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Password authentication overlay for email send authorization
// CREATED    : 09-Apr-2026
//
// DESCRIPTION:
// - Displays modal overlay with password entry form
// - Validates password server-side via Cloudflare Worker
// - Styled consistently with the existing email send overlay
// - Supports show/hide password toggle, keyboard shortcuts, error display
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Auth Overlay Factory
// -----------------------------------------------------------------------------

    // FUNCTION | Create Email Auth Overlay Under Root Element
    // ------------------------------------------------------------
    function Na__Feature__EmailWorkers__CreateAuthOverlay(rootElement) {
        const host = rootElement && rootElement.nodeType === Node.ELEMENT_NODE
            ? rootElement
            : document.body;

        let submitCallback   = null;                                             // <-- External submit handler
        let cancelCallback   = null;                                             // <-- External cancel handler

        const overlay = document.createElement('div');
        overlay.className = 'na-email-auth-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'naEmailAuthOverlayTitle');

        const backdrop = document.createElement('div');
        backdrop.className = 'na-email-auth-overlay__backdrop';
        backdrop.tabIndex = -1;

        const panel = document.createElement('div');
        panel.className = 'na-email-auth-overlay__panel';

        const title = document.createElement('h2');
        title.id = 'naEmailAuthOverlayTitle';
        title.className = 'na-email-auth-overlay__title';
        title.textContent = 'Enter Email Password';

        const subtitle = document.createElement('p');
        subtitle.className = 'na-email-auth-overlay__subtitle';
        subtitle.textContent = 'A password is required to send emails from ValeVision3D.';

        const form = document.createElement('form');
        form.className = 'na-email-auth-overlay__form';
        form.setAttribute('autocomplete', 'off');

        const inputWrapper = document.createElement('div');
        inputWrapper.className = 'na-email-auth-overlay__input-wrapper';

        const passwordInput = document.createElement('input');
        passwordInput.id = 'naEmailAuthPasswordInput';
        passwordInput.className = 'na-email-auth-overlay__input';
        passwordInput.type = 'password';
        passwordInput.placeholder = 'Enter password';
        passwordInput.setAttribute('autocomplete', 'new-password');
        passwordInput.setAttribute('autocorrect', 'off');
        passwordInput.setAttribute('autocapitalize', 'none');
        passwordInput.setAttribute('spellcheck', 'false');
        passwordInput.setAttribute('data-lpignore', 'true');
        passwordInput.setAttribute('data-1p-ignore', 'true');
        passwordInput.setAttribute('data-form-type', 'other');

        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'na-email-auth-overlay__toggle-btn';
        toggleBtn.setAttribute('aria-label', 'Show password');
        toggleBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';

        inputWrapper.appendChild(passwordInput);
        inputWrapper.appendChild(toggleBtn);

        const errorEl = document.createElement('div');
        errorEl.className = 'na-email-auth-overlay__error';
        errorEl.style.display = 'none';

        const actions = document.createElement('div');
        actions.className = 'na-email-auth-overlay__actions';

        const btnCancel = document.createElement('button');
        btnCancel.type = 'button';
        btnCancel.className = 'na-email-auth-overlay__btn na-email-auth-overlay__btn--secondary';
        btnCancel.textContent = 'Cancel';

        const btnSubmit = document.createElement('button');
        btnSubmit.type = 'submit';
        btnSubmit.className = 'na-email-auth-overlay__btn na-email-auth-overlay__btn--primary';
        btnSubmit.textContent = 'Submit';

        actions.appendChild(btnCancel);
        actions.appendChild(btnSubmit);

        form.appendChild(inputWrapper);
        form.appendChild(errorEl);
        form.appendChild(actions);

        panel.appendChild(title);
        panel.appendChild(subtitle);
        panel.appendChild(form);

        overlay.appendChild(backdrop);
        overlay.appendChild(panel);
        host.appendChild(overlay);

        panel.addEventListener('click', (event) => event.stopPropagation());


        // SUB FUNCTION | Toggle Password Visibility
        // ------------------------------------------------------------
        let passwordVisible = false;
        toggleBtn.addEventListener('click', () => {
            passwordVisible = !passwordVisible;
            passwordInput.type = passwordVisible ? 'text' : 'password';
            toggleBtn.setAttribute('aria-label', passwordVisible ? 'Hide password' : 'Show password');
        });
        // ------------------------------------------------------------


        // SUB FUNCTION | Show Error Message with Shake Animation
        // ------------------------------------------------------------
        function showError(message) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
            errorEl.classList.remove('is-shaking');
            void errorEl.offsetWidth;
            errorEl.classList.add('is-shaking');
        }
        // ------------------------------------------------------------


        // SUB FUNCTION | Clear Error Message
        // ------------------------------------------------------------
        function clearError() {
            errorEl.textContent = '';
            errorEl.style.display = 'none';
            errorEl.classList.remove('is-shaking');
        }
        // ------------------------------------------------------------


        // SUB FUNCTION | Handle Form Submit
        // ------------------------------------------------------------
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const password = passwordInput.value;
            if (!password.trim()) {
                showError('Please enter a password.');
                return;
            }
            clearError();
            if (typeof submitCallback === 'function') {
                submitCallback(password);
            }
        });
        // ------------------------------------------------------------


        // SUB FUNCTION | Handle Cancel / Backdrop Click
        // ------------------------------------------------------------
        const handleCancel = () => {
            if (typeof cancelCallback === 'function') {
                cancelCallback();
            }
        };

        btnCancel.addEventListener('click', handleCancel);
        backdrop.addEventListener('click', handleCancel);
        // ------------------------------------------------------------


        // SUB FUNCTION | Handle Keyboard Shortcuts
        // ------------------------------------------------------------
        overlay.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                handleCancel();
            }
        });
        // ------------------------------------------------------------


        // SUB FUNCTION | Set Loading State During Verification
        // ------------------------------------------------------------
        function setLoading(isLoading) {
            btnSubmit.disabled = isLoading;
            btnSubmit.textContent = isLoading ? 'Verifying...' : 'Submit';
            passwordInput.disabled = isLoading;
        }
        // ------------------------------------------------------------


        function show() {
            passwordInput.value = '';
            passwordVisible = false;
            passwordInput.type = 'password';
            toggleBtn.setAttribute('aria-label', 'Show password');
            clearError();
            setLoading(false);
            overlay.classList.add('is-visible');
            passwordInput.focus();
        }

        function hide() {
            overlay.classList.remove('is-visible');
            passwordInput.value = '';
            clearError();
        }

        function onSubmit(callback) {
            submitCallback = callback;
        }

        function onCancel(callback) {
            cancelCallback = callback;
        }

        function destroy() {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }

        return {
            overlay,
            show,
            hide,
            showError,
            clearError,
            setLoading,
            onSubmit,
            onCancel,
            destroy
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Feature__EmailWorkers__CreateAuthOverlay
    };

// endregion -------------------------------------------------------------------
