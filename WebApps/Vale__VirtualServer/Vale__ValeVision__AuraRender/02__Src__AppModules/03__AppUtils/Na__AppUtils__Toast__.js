// =============================================================================
// VALEVISION AURA - APP UTILS - TOAST
// =============================================================================
//
// FILE       : Na__AppUtils__Toast__.js
// NAMESPACE  : Na__Toast
// MODULE     : App Utils - Toast
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : A short message at the bottom of the screen, with an optional action
// CREATED    : 30-Oct-2026
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0
// - Initial build, from ValeVision Theia's toast.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Toast
// -----------------------------------------------------------------------------

    import { Na__Dom__El } from './Na__AppUtils__Dom__.js';

    let Na__Toast__Host = null;


    // FUNCTION | Show a Toast: { error, ms, action: { label, onClick } }
    // ------------------------------------------------------------
    function Na__Toast__Show(message, options) {
        const opts = options || {};
        if (!Na__Toast__Host) {
            Na__Toast__Host = Na__Dom__El('div', 'aura-toasts', null, { role: 'status', 'aria-live': 'polite' });
            document.body.appendChild(Na__Toast__Host);
        }
        const toast = Na__Dom__El('div', `aura-toast${opts.error ? ' aura-toast--error' : ''}`);
        toast.appendChild(Na__Dom__El('span', 'aura-toast__text', message));
        if (opts.action) {
            const button = Na__Dom__El('button', 'aura-toast__action', opts.action.label, { type: 'button' });
            button.addEventListener('click', () => { opts.action.onClick(); toast.remove(); });
            toast.appendChild(button);
        }
        Na__Toast__Host.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('is-visible'));
        setTimeout(() => {
            toast.classList.remove('is-visible');
            setTimeout(() => toast.remove(), 400);
        }, opts.ms || (opts.error ? 6000 : 3200));
        return toast;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export { Na__Toast__Show };

// endregion -------------------------------------------------------------------
