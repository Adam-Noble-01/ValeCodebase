// =============================================================================
// VALEVISION THEIA - FEATURE - CLIENT EMAIL - BUILD THE EMAIL HTML
// =============================================================================
//
// FILE       : Na__ClientEmail__Builder__.js
// NAMESPACE  : Na__ClientEmail
// MODULE     : Feature - Client Email
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Fill the delivery email template: the greeting, the project's
//              code and name, the special notes and the client link; and name
//              its subject line and file
// CREATED    : 22-Oct-2026
//
// DESCRIPTION:
// - ValeVision 3D's email builders, for Theia (61__Feature__ShareProjectLink and
//   63__Feature__AppNotificationEmail there): the template is fetched once,
//   every value is escaped, and the tokens are replaced.
// - THE LINK IS ALWAYS THE PRODUCTION ONE (Na__ClientEmail__THEIA_URL), never
//   built from the page's own address: an email made on this PC must still send
//   the client to app.valegardenhouses.com.
// - ONE VIDEO OR SEVERAL: the words follow ("Your project video is ready",
//   "View Your Project Video", "It opens").
// - THE GREETING: "Dear " and the names as typed. Names separated by commas are
//   joined with "and" ("Derek, Roger, Sally" -> "Derek, Roger and Sally").
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 22-Oct-2026 - Version 1.0.0
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__Format__Date } from '../03__AppUtils/Na__AppUtils__Format__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Production Address (NEVER relative, never window.location)
    // ------------------------------------------------------------
    const Na__ClientEmail__THEIA_URL = 'https://app.valegardenhouses.com/theia/';   // <-- Where the client's link opens
    const Na__ClientEmail__HOST      = 'app.valegardenhouses.com';                  // <-- The only host whose client links the server knows
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Template Cache
// -----------------------------------------------------------------------------

    let Na__ClientEmail__TemplatePromise = null;

    // HELPER FUNCTION | Load the Raw Template Text (Once; a failure is tried again next time)
    // ------------------------------------------------------------
    function Na__ClientEmail__LoadTemplate() {
        if (!Na__ClientEmail__TemplatePromise) {
            const templateUrl = new URL('./Na__ClientEmail__Template__.html', import.meta.url);
            Na__ClientEmail__TemplatePromise = fetch(templateUrl, { cache: 'no-cache' }).then((response) => {
                if (!response.ok) throw new Error(`The email template could not be loaded (HTTP ${response.status}).`);
                return response.text();
            }).catch((error) => {
                Na__ClientEmail__TemplatePromise = null;
                throw error;
            });
        }
        return Na__ClientEmail__TemplatePromise;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Escaping and Words
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Escape Text for the HTML Body
    // ------------------------------------------------------------
    function Na__ClientEmail__EscapeHtml(text) {
        if (text === null || text === undefined) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Escape a URL for an href Attribute
    // ------------------------------------------------------------
    function Na__ClientEmail__EscapeHref(url) {
        return Na__ClientEmail__EscapeHtml(url).replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Names as Typed, Commas Joined With "and" ("Derek, Roger and Sally")
    // ------------------------------------------------------------
    function Na__ClientEmail__JoinNames(raw) {
        const parts = String(raw || '').split(',').map((s) => s.trim()).filter(Boolean);
        if (parts.length < 2) return parts.join('');
        return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Project's Code and Name, as the Client's Page Shows Them ("64135", "Holt")
    // ------------------------------------------------------------
    // The name is the project's Theia title (what the client's page shows over
    // the video); the library folder id ("64135__Holt") fills any gap.
    // ------------------------------------------------------------
    function Na__ClientEmail__ProjectFacts(project) {
        const p = project || {};
        const segments = String(p.id || '').split('__');
        const code = String(p.code || segments[0] || '').trim();
        const name = String(p.title || p.name || segments.slice(1).join(' ') || '').trim();
        return { code: code || '-', name: name || '-' };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Client's Link: the Production Address, the Project and the Token
    // ------------------------------------------------------------
    function Na__ClientEmail__ClientUrl(projectId, token) {
        const url = new URL(Na__ClientEmail__THEIA_URL);
        url.search = new URLSearchParams({ project: projectId, share: token }).toString();
        return url.href;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is This Page the Live Theia? (a client link made anywhere else exists only there)
    // ------------------------------------------------------------
    function Na__ClientEmail__IsLiveSite() {
        return window.location.hostname === Na__ClientEmail__HOST;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Suggested Subject Line ("Your Project Videos | Holt - 64135")
    // ------------------------------------------------------------
    function Na__ClientEmail__Subject(project, videoCount) {
        const { code, name } = Na__ClientEmail__ProjectFacts(project);
        return `Your Project ${videoCount === 1 ? 'Video' : 'Videos'} | ${name} - ${code}`;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Download's File Name (ValeVisionTheia__ClientEmail__64135__Holt__22-Oct-2026__.html)
    // ------------------------------------------------------------
    function Na__ClientEmail__FileName(project, when) {
        const safeId = String((project && project.id) || 'Project')
            .replace(/[^\w-]+/g, '_')
            .replace(/_{3,}/g, '__')
            .replace(/^_+|_+$/g, '')
            .slice(0, 80) || 'Project';
        return `ValeVisionTheia__ClientEmail__${safeId}__${Na__Format__Date((when || new Date()).toISOString())}__.html`;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Email's Blocks
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Project Code / Project Name (ValeVision 3D's two lines)
    // ------------------------------------------------------------
    function Na__ClientEmail__BuildProjectMetaHtml(project) {
        const { code, name } = Na__ClientEmail__ProjectFacts(project);
        return `
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 14px; color: #172b3a; font-size: 15px; line-height: 1.55; font-family: Arial, sans-serif;">
                                            <tr>
                                                <td style="font-weight: 700; padding: 0 0 5px 0; vertical-align: baseline; white-space: nowrap;">Project Code</td>
                                                <td style="padding: 0 0 5px 0; vertical-align: baseline; white-space: nowrap;">&nbsp;&nbsp;:&nbsp;&nbsp;</td>
                                                <td style="padding: 0 0 5px 0; vertical-align: baseline;">${Na__ClientEmail__EscapeHtml(code)}</td>
                                            </tr>
                                            <tr>
                                                <td style="font-weight: 700; padding: 0; vertical-align: baseline; white-space: nowrap;">Project Name</td>
                                                <td style="padding: 0; vertical-align: baseline; white-space: nowrap;">&nbsp;&nbsp;:&nbsp;&nbsp;</td>
                                                <td style="padding: 0; vertical-align: baseline;">${Na__ClientEmail__EscapeHtml(name)}</td>
                                            </tr>
                                        </table>`;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Optional Special Notes Card (ValeVision 3D's navy-edged card)
    // ------------------------------------------------------------
    function Na__ClientEmail__BuildSpecialNotesBlock(notesRaw) {
        const trimmed = String(notesRaw || '').trim();
        if (!trimmed) return '';
        const bodyHtml = Na__ClientEmail__EscapeHtml(trimmed).replace(/\r\n|\n|\r/g, '<br>');
        return `
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width: 100%; margin: 0 0 20px;">
                                            <tr>
                                                <td style="border-left: 4px solid #172b3a; padding: 12px 16px 12px 18px; background-color: #f8fafb; font-family: Arial, sans-serif;">
                                                    <p style="margin: 0 0 8px; padding: 0; color: #172b3a; font-size: 13px; font-weight: 700; line-height: 1.4;">
                                                        Special notes
                                                    </p>
                                                    <p style="margin: 0; padding: 0; color: #172b3a; font-size: 14px; line-height: 1.55;">
                                                        ${bodyHtml}
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>`;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Link's End Date, When It Has One (the guest bubble's words)
    // ------------------------------------------------------------
    function Na__ClientEmail__BuildExpiryHtml(expiresIso) {
        const date = Na__Format__Date(expiresIso);
        if (!date) return '';
        return `
                                        <p style="margin: 8px 0 0; padding: 0; color: #656565; font-size: 12px; line-height: 1.5; font-family: Arial, sans-serif;">
                                            This link works until ${Na__ClientEmail__EscapeHtml(date)}.
                                        </p>`;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Email: { project, addressee, notes, token, videoCount, expiresIso } -> HTML
    // ------------------------------------------------------------
    async function Na__ClientEmail__BuildHtml(options) {
        const { project, addressee, notes, token, videoCount, expiresIso } = options;
        const one = videoCount === 1;
        const template = await Na__ClientEmail__LoadTemplate();
        const values = {
            __EMAIL_SUBJECT__       : Na__ClientEmail__EscapeHtml(Na__ClientEmail__Subject(project, videoCount)),
            __PROJECT_META_HTML__   : Na__ClientEmail__BuildProjectMetaHtml(project),
            __GREETING_HTML__       : `Dear ${Na__ClientEmail__EscapeHtml(Na__ClientEmail__JoinNames(addressee))},`,
            __VIDEOS_READY_TEXT__   : one ? 'Your project video is ready to watch in full quality.'
                                          : 'Your project videos are ready to watch in full quality.',
            __SPECIAL_NOTES_BLOCK__ : Na__ClientEmail__BuildSpecialNotesBlock(notes),
            __THEIA_URL__           : Na__ClientEmail__EscapeHref(Na__ClientEmail__ClientUrl(project.id, token)),
            __BUTTON_LABEL__        : one ? 'View Your Project Video' : 'View Your Project Videos',
            __VIDEOS_OPEN_TEXT__    : `${one ? 'It opens' : 'They open'} in any web browser, with nothing to install and no account needed.`,
            __LINK_EXPIRY_HTML__    : Na__ClientEmail__BuildExpiryHtml(expiresIso),
            __YEAR__                : String(new Date().getFullYear())
        };
        return template.replace(/__[A-Z_]+__/g, (key) => (key in values ? values[key] : key));   // <-- One pass: a token typed into the notes stays as typed
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__ClientEmail__BuildHtml,
        Na__ClientEmail__ClientUrl,
        Na__ClientEmail__FileName,
        Na__ClientEmail__IsLiveSite,
        Na__ClientEmail__JoinNames,
        Na__ClientEmail__ProjectFacts,
        Na__ClientEmail__Subject
    };

// endregion -------------------------------------------------------------------
