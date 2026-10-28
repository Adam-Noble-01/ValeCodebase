// =============================================================================
// VALEVISION3D - CLIENT LINKS - HELPERS (API, ADDRESSES, COPY, ICONS, DATES)
// =============================================================================
//
// FILE       : Na__ClientLinks__Helpers__.js
// NAMESPACE  : Na__ClientLinks
// MODULE     : Feature - Client Links
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The small pieces the client links share: the API, the two kinds
//              of address, copying a link, the icons and the date format
// CREATED    : 28-Oct-2026
//
// DESCRIPTION:
// - ValeVision Theia's helpers (Na__AppUtils__ApiClient__, Na__AppUtils__Dom__,
//   Na__AppUtils__Format__, Na__Share__Copy), for ValeVision 3D: the Share
//   tab, the client viewer and its tour all draw on them.
// - TWO ADDRESSES, AS THEIA'S:
//     Na__ClientLinks__PageUrl         this page's own address: the Share tab's
//                                      Copy, so a link made on a local copy
//                                      opens on that copy.
//     Na__ClientLinks__ProductionUrl   always https://app.valegardenhouses.com:
//                                      the client email, which leaves the site.
// - The API answers JSON; an error is thrown as an Error with .status and .data.
// - EMAIL ADDRESSES (1.1.0): the client email's To box is read and checked by
//   the server's own rule (ValeVision3D__Api__Email__._valid_address), so the
//   page refuses what the server would.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 28-Oct-2026 - Version 1.1.0 (ValeVision3D v2.79.0, client emails sent)
// - Na__ClientLinks__IsEmailAddress and Na__ClientLinks__ParseAddresses; the
//   send, eye and alert icons.
//
// 28-Oct-2026 - Version 1.0.0
// - Initial build (ValeVision3D v2.77.0).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Addresses (the production one NEVER relative, never window.location)
    // ------------------------------------------------------------
    const Na__ClientLinks__API_BASE  = new URL('../../api/', import.meta.url).href;   // <-- <app>/api/ wherever the app is served
    const Na__ClientLinks__APP_BASE  = new URL('../../', import.meta.url).href;       // <-- The app's own page (…/valevision/)
    const Na__ClientLinks__APP_URL   = 'https://app.valegardenhouses.com/valevision/';   // <-- Where a client's emailed link opens
    const Na__ClientLinks__HOST      = 'app.valegardenhouses.com';                  // <-- The only host whose client links the server knows
    const Na__ClientLinks__MONTHS    = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Icons (24 x 24, stroked; Theia's set plus the tour's)
    // ------------------------------------------------------------
    const Na__ClientLinks__ICONS = {
        client      : '<circle cx="12" cy="8" r="3.6"/><path d="M4.8 20.5c0-4 3.2-6.8 7.2-6.8s7.2 2.8 7.2 6.8"/>',
        staff       : '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7"/><path d="M12 14.5v2.5"/>',
        mail        : '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>',
        copy        : '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/>',
        down        : '<path d="M6 9.5l6 6 6-6"/>',
        check       : '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
        close       : '<path d="M6 6l12 12M18 6L6 18"/>',
        link        : '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/>',
        mouseLeft   : '<rect x="6.5" y="3" width="11" height="18" rx="5.5"/><path d="M12 3v6.5"/><path d="M6.6 9.5H12V3.1a5.5 5.5 0 0 0-5.4 5.6z" fill="currentColor" stroke="none"/>',
        mouseRight  : '<rect x="6.5" y="3" width="11" height="18" rx="5.5"/><path d="M12 3v6.5"/><path d="M17.4 9.5H12V3.1a5.5 5.5 0 0 1 5.4 5.6z" fill="currentColor" stroke="none"/>',
        mouseWheel  : '<rect x="6.5" y="3" width="11" height="18" rx="5.5"/><path d="M12 6.5v4" stroke-width="2.6"/><path d="M9.5 15.5l2.5 2 2.5-2"/>',
        oneFinger   : '<path d="M10 12V5.5a1.5 1.5 0 0 1 3 0V11l3.8.9a2 2 0 0 1 1.5 2.3l-.9 4.3a2.5 2.5 0 0 1-2.4 2H11a2.5 2.5 0 0 1-2-1l-3-4a1.5 1.5 0 0 1 2.3-1.9z"/><path d="M3 4.5h4M3 4.5l1.5-1.5M3 4.5L4.5 6"/>',
        twoFingers  : '<path d="M8 12V5.5a1.4 1.4 0 0 1 2.8 0V11"/><path d="M10.8 11V4.5a1.4 1.4 0 0 1 2.8 0V11l3.2.8a2 2 0 0 1 1.5 2.3l-.9 4.4a2.5 2.5 0 0 1-2.4 2H11a2.5 2.5 0 0 1-2-1l-2.7-3.7a1.4 1.4 0 0 1 2.2-1.8L8 12"/>',
        pinch       : '<path d="M5 5l5 5M19 5l-5 5M5 19l5-5M19 19l-5-5"/><path d="M5 9V5h4M19 9V5h-4M5 15v4h4M19 15v4h-4"/>',
        image       : '<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M4 17.5l5-5 4 4 2.5-2.5 4.5 4.5"/>',
        replay      : '<path d="M4.6 12a7.4 7.4 0 1 0 2.2-5.3"/><path d="M4.4 4.6v3.9h3.9"/>',
        help        : '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.7"/><circle cx="12" cy="16.9" r="0.6" fill="currentColor"/>',
        send        : '<path d="M20.5 3.5L10.8 13.2"/><path d="M20.5 3.5l-6.2 17-3.5-7.3-7.3-3.5 17-6.2z"/>',
        eye         : '<path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
        alert       : '<path d="M12 3.8l9 15.7H3l9-15.7z"/><path d="M12 9.8v4.4"/><circle cx="12" cy="16.9" r="0.6" fill="currentColor"/>'
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Elements
// -----------------------------------------------------------------------------

    // FUNCTION | An Element: (tag, class, text, { attribute: value })
    // ------------------------------------------------------------
    function Na__ClientLinks__El(tag, className, text, attrs) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text !== null && text !== undefined) el.textContent = String(text);
        Object.entries(attrs || {}).forEach(([key, value]) => {
            if (value === false || value === null || value === undefined) return;
            if (value === true) el.setAttribute(key, '');
            else el.setAttribute(key, String(value));
        });
        return el;
    }
    // ------------------------------------------------------------


    // FUNCTION | An Icon (inline SVG, drawn in the text colour)
    // ------------------------------------------------------------
    function Na__ClientLinks__Icon(name, className) {
        const holder = document.createElement('span');
        holder.innerHTML = `<svg class="na-client-icon${className ? ' ' + className : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" `
                         + `stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">`
                         + `${Na__ClientLinks__ICONS[name] || ''}</svg>`;
        return holder.firstChild;
    }
    // ------------------------------------------------------------


    // FUNCTION | An Icon Button: (icon, class, words, title)
    // ------------------------------------------------------------
    function Na__ClientLinks__IconButton(icon, className, label, title) {
        const button = Na__ClientLinks__El('button', className, null, { type: 'button', title: title || label || '' });
        button.appendChild(Na__ClientLinks__Icon(icon));
        if (label) button.appendChild(Na__ClientLinks__El('span', null, label));
        else button.setAttribute('aria-label', title || '');
        return button;
    }
    // ------------------------------------------------------------


    // FUNCTION | Empty an Element (returns it, to chain)
    // ------------------------------------------------------------
    function Na__ClientLinks__Clear(el) {
        while (el && el.firstChild) el.removeChild(el.firstChild);
        return el;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Words and Dates
// -----------------------------------------------------------------------------

    // FUNCTION | A Date as Vale Writes It ("28-Oct-2026"), or ''
    // ------------------------------------------------------------
    function Na__ClientLinks__FormatDate(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '';
        return `${String(d.getDate()).padStart(2, '0')}-${Na__ClientLinks__MONTHS[d.getMonth()]}-${d.getFullYear()}`;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Short Message at the Foot of the Screen (the app's toast, through its event bridge)
    // ------------------------------------------------------------
    function Na__ClientLinks__Toast(message, isError) {
        window.dispatchEvent(new CustomEvent('na-show-toast', { detail : { message, isError : isError === true } }));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Email Addresses (the client email's To box)
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | One Plain Address, Part by Part (the server's own rule)
    // ------------------------------------------------------------
    const Na__ClientLinks__ADDRESS_LOCAL = /^[A-Za-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+\/=?^_`{|}~-]+)*$/;
    const Na__ClientLinks__ADDRESS_LABEL = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;
    // ------------------------------------------------------------


    // FUNCTION | Is This One Plain Email Address? (holt@example.co.uk: no name, no spaces, a domain with a dot)
    // ------------------------------------------------------------
    function Na__ClientLinks__IsEmailAddress(text) {
        const addr = String(text || '');
        const parts = addr.split('@');
        if (!addr || addr.length > 254 || parts.length !== 2) return false;
        const [local, domain] = parts;
        if (!local || local.length > 64 || !Na__ClientLinks__ADDRESS_LOCAL.test(local)) return false;
        const labels = domain.split('.');
        if (labels.length < 2 || domain.length > 253 || !labels.every((label) => Na__ClientLinks__ADDRESS_LABEL.test(label))) return false;
        const top = labels[labels.length - 1];
        return top.length >= 2 && !/^\d+$/.test(top);
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a To Box: "Holt@Example.com; b@x.co.uk" -> { list: ['holt@example.com', 'b@x.co.uk'], bad: [] }
    // ------------------------------------------------------------
    // Commas, semicolons and spaces separate; each address once, in the order
    // typed, in lower case (as the server sends them). Anything that is not a
    // whole address (a name, "holt@example") is in bad, as typed.
    // ------------------------------------------------------------
    function Na__ClientLinks__ParseAddresses(text) {
        const list = [];
        const bad = [];
        String(text || '').split(/[\s,;]+/).map((part) => part.replace(/^<+|>+$/g, '')).filter(Boolean).forEach((part) => {
            const addr = part.toLowerCase();
            if (!Na__ClientLinks__IsEmailAddress(addr)) {
                if (!bad.includes(part)) bad.push(part);
                return;
            }
            if (!list.includes(addr)) list.push(addr);
        });
        return { list, bad };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Addresses
// -----------------------------------------------------------------------------

    // FUNCTION | This Page's Own Address With a Query (the Share tab's Copy, as Theia's)
    // ------------------------------------------------------------
    function Na__ClientLinks__PageUrl(query) {
        const url = new URL(Na__ClientLinks__APP_BASE);
        url.search = new URLSearchParams(query || {}).toString();
        return url.href;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Client Link on the Production Address (the email)
    // ------------------------------------------------------------
    function Na__ClientLinks__ProductionUrl(projectId, token) {
        const url = new URL(Na__ClientLinks__APP_URL);
        url.search = new URLSearchParams({ project : projectId, share : token }).toString();
        return url.href;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is This Page the Live Site? (a client link made anywhere else exists only there)
    // ------------------------------------------------------------
    function Na__ClientLinks__IsLiveSite() {
        return window.location.hostname === Na__ClientLinks__HOST;
    }
    // ------------------------------------------------------------


    // FUNCTION | The API's Own Path ("/valevision/api/"): where the server keeps the client's cookie
    // ------------------------------------------------------------
    function Na__ClientLinks__ApiPath() {
        return new URL(Na__ClientLinks__API_BASE).pathname;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The API
// -----------------------------------------------------------------------------

    // FUNCTION | Call the API: (method, path, body) -> the JSON answer, or throws (error.status, error.data)
    // ------------------------------------------------------------
    async function Na__ClientLinks__Api(method, path, body) {
        const init = { method, credentials : 'same-origin', cache : 'no-store', headers : {} };
        if (body !== undefined) {
            init.headers['Content-Type'] = 'application/json';
            init.body = JSON.stringify(body);
        }
        let response;
        try {
            response = await fetch(Na__ClientLinks__API_BASE + String(path).replace(/^\/+/, ''), init);
        } catch (error) {
            const offline = new Error('The server could not be reached. Check the internet connection and try again.');
            offline.status = 0;
            offline.data = {};
            throw offline;
        }
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.ok === false) {
            const error = new Error(data.error || `The server answered ${response.status}.`);
            error.status = response.status;
            error.data = data;
            throw error;
        }
        return data;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Copy
// -----------------------------------------------------------------------------

    // FUNCTION | Copy, With a Fallback the Person Can Copy By Hand (Theia's Na__Share__Copy)
    // ------------------------------------------------------------
    async function Na__ClientLinks__Copy(text, copiedMessage) {
        const done = copiedMessage || 'Link copied';
        try {
            await navigator.clipboard.writeText(text);
            Na__ClientLinks__Toast(done);
            return true;
        } catch (error) { /* no clipboard permission, or not a secure page: the older way next */ }
        try {
            const area = Na__ClientLinks__El('textarea', null, null, { readonly: true, 'aria-hidden': 'true' });
            area.value = text;
            area.style.cssText = 'position: fixed; left: -9999px; top: 0; opacity: 0;';
            document.body.appendChild(area);
            area.select();
            const copied = document.execCommand('copy');
            area.remove();
            if (copied) { Na__ClientLinks__Toast(done); return true; }
        } catch (error) { /* then show it to copy by hand */ }
        Na__ClientLinks__Toast(`Copy this link: ${text}`, true);                 // <-- Never a prompt(): some browsers and app windows refuse it
        return false;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__ClientLinks__Api,
        Na__ClientLinks__ApiPath,
        Na__ClientLinks__Clear,
        Na__ClientLinks__Copy,
        Na__ClientLinks__El,
        Na__ClientLinks__FormatDate,
        Na__ClientLinks__Icon,
        Na__ClientLinks__IconButton,
        Na__ClientLinks__IsEmailAddress,
        Na__ClientLinks__IsLiveSite,
        Na__ClientLinks__PageUrl,
        Na__ClientLinks__ParseAddresses,
        Na__ClientLinks__ProductionUrl,
        Na__ClientLinks__Toast
    };

// endregion -------------------------------------------------------------------
