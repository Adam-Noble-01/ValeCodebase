// =============================================================================
// VALEVISION3D - CLIENT LINKS - CLIENT EMAIL - BUILD THE EMAIL HTML
// =============================================================================
//
// FILE       : Na__ClientLinks__ClientEmail__Builder__.js
// NAMESPACE  : Na__ClientLinks
// MODULE     : Feature - Client Links
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Fill the client email template: the greeting, the project's code
//              and name, the special notes and the client link; and name its
//              subject line and file
// CREATED    : 28-Oct-2026
//
// DESCRIPTION:
// - ValeVision Theia's client email builder (Na__ClientEmail__Builder__.js), for
//   ValeVision 3D: the template is fetched once, every value is escaped, and the
//   tokens are replaced in one pass (a token typed into the notes stays as typed).
// - THE LINK IS ALWAYS THE PRODUCTION ONE (Na__ClientLinks__ProductionUrl), never
//   built from the page's own address: an email made on this PC must still send
//   the client to app.valegardenhouses.com.
// - THE GREETING: "Dear " and the names as typed. Names separated by commas are
//   joined with "and" ("Derek, Roger, Sally" -> "Derek, Roger and Sally").
// - THE SIGN-OFF (1.1.0): an email the server SENDS has no Outlook signature to
//   follow it, so { signOff: { name, role } } puts "Kind regards," and the
//   sender's name and role under the card (Adam, 28-Oct-2026). A download
//   passes none and is as it was.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 28-Oct-2026 - Version 1.1.0 (ValeVision3D v2.79.0, client emails sent)
// - signOff: the sender's sign-off under the card (__SIGN_OFF_HTML__), for an
//   email sent from the app.
//
// 28-Oct-2026 - Version 1.0.0
// - Initial build (ValeVision3D v2.77.0).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__ClientLinks__FormatDate, Na__ClientLinks__ProductionUrl } from './Na__ClientLinks__Helpers__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Template Cache
// -----------------------------------------------------------------------------

    let Na__ClientLinks__EmailTemplatePromise = null;

    // HELPER FUNCTION | Load the Raw Template Text (Once; a failure is tried again next time)
    // ------------------------------------------------------------
    function Na__ClientLinks__LoadEmailTemplate() {
        if (!Na__ClientLinks__EmailTemplatePromise) {
            const templateUrl = new URL('./Na__ClientLinks__ClientEmail__Template__.html', import.meta.url);
            Na__ClientLinks__EmailTemplatePromise = fetch(templateUrl, { cache : 'no-cache' }).then((response) => {
                if (!response.ok) throw new Error(`The email template could not be loaded (HTTP ${response.status}).`);
                return response.text();
            }).catch((error) => {
                Na__ClientLinks__EmailTemplatePromise = null;
                throw error;
            });
        }
        return Na__ClientLinks__EmailTemplatePromise;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Escaping and Words
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Escape Text for the HTML Body
    // ------------------------------------------------------------
    function Na__ClientLinks__EscapeHtml(text) {
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
    function Na__ClientLinks__EscapeHref(url) {
        return Na__ClientLinks__EscapeHtml(url).replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------


    // FUNCTION | The Names as Typed, Commas Joined With "and" ("Derek, Roger and Sally")
    // ------------------------------------------------------------
    function Na__ClientLinks__JoinNames(raw) {
        const parts = String(raw || '').split(',').map((s) => s.trim()).filter(Boolean);
        if (parts.length < 2) return parts.join('');
        return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Project's Code and Name ({ id, code, title } from the API: "64135", "Holt")
    // ------------------------------------------------------------
    // The name is the one ValeVision Gallery shows (its Display Name Alias,
    // else its Project Name); the library folder id fills any gap.
    // ------------------------------------------------------------
    function Na__ClientLinks__ProjectFacts(project) {
        const p = project || {};
        const segments = String(p.id || '').split('__');
        const code = String(p.code || segments[0] || '').trim();
        const name = String(p.title || segments.slice(1).join(' ') || '').trim();
        return { code : code || '-', name : name || '-' };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Suggested Subject Line ("Your Project in 3D | Holt - 64135")
    // ------------------------------------------------------------
    function Na__ClientLinks__EmailSubject(project) {
        const { code, name } = Na__ClientLinks__ProjectFacts(project);
        return `Your Project in 3D | ${name} - ${code}`;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Download's File Name (ValeVision3D__ClientEmail__64135__Holt__28-Oct-2026__.html)
    // ------------------------------------------------------------
    function Na__ClientLinks__EmailFileName(project, when) {
        const safeId = String((project && project.id) || 'Project')
            .replace(/[^\w-]+/g, '_')
            .replace(/_{3,}/g, '__')
            .replace(/^_+|_+$/g, '')
            .slice(0, 80) || 'Project';
        return `ValeVision3D__ClientEmail__${safeId}__${Na__ClientLinks__FormatDate((when || new Date()).toISOString())}__.html`;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Email's Blocks
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Project Code / Project Name (ValeVision 3D's two lines)
    // ------------------------------------------------------------
    function Na__ClientLinks__BuildProjectMetaHtml(project) {
        const { code, name } = Na__ClientLinks__ProjectFacts(project);
        return `
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 14px; color: #172b3a; font-size: 15px; line-height: 1.55; font-family: Arial, sans-serif;">
                                            <tr>
                                                <td style="font-weight: 700; padding: 0 0 5px 0; vertical-align: baseline; white-space: nowrap;">Project Code</td>
                                                <td style="padding: 0 0 5px 0; vertical-align: baseline; white-space: nowrap;">&nbsp;&nbsp;:&nbsp;&nbsp;</td>
                                                <td style="padding: 0 0 5px 0; vertical-align: baseline;">${Na__ClientLinks__EscapeHtml(code)}</td>
                                            </tr>
                                            <tr>
                                                <td style="font-weight: 700; padding: 0; vertical-align: baseline; white-space: nowrap;">Project Name</td>
                                                <td style="padding: 0; vertical-align: baseline; white-space: nowrap;">&nbsp;&nbsp;:&nbsp;&nbsp;</td>
                                                <td style="padding: 0; vertical-align: baseline;">${Na__ClientLinks__EscapeHtml(name)}</td>
                                            </tr>
                                        </table>`;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Optional Special Notes Card (ValeVision 3D's navy-edged card)
    // ------------------------------------------------------------
    function Na__ClientLinks__BuildSpecialNotesBlock(notesRaw) {
        const trimmed = String(notesRaw || '').trim();
        if (!trimmed) return '';
        const bodyHtml = Na__ClientLinks__EscapeHtml(trimmed).replace(/\r\n|\n|\r/g, '<br>');
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
    function Na__ClientLinks__BuildExpiryHtml(expiresIso) {
        const date = Na__ClientLinks__FormatDate(expiresIso);
        if (!date) return '';
        return `
                                        <p style="margin: 8px 0 0; padding: 0; color: #656565; font-size: 12px; line-height: 1.5; font-family: Arial, sans-serif;">
                                            This link works until ${Na__ClientLinks__EscapeHtml(date)}.
                                        </p>`;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Sent Email's Sign-Off Under the Card ("Kind regards," name, role), or ''
    // ------------------------------------------------------------
    // As wide as the card and lined up with it; outside its frame, where the
    // sender's own close would follow a pasted card.
    // ------------------------------------------------------------
    function Na__ClientLinks__BuildSignOffHtml(signOff) {
        const name = String((signOff && signOff.name) || '').trim();
        if (!name) return '';
        const role = String((signOff && signOff.role) || '').trim();
        const roleHtml = role ? `
                            <p style="margin: 0; padding: 0; color: #656565; font-size: 14px; line-height: 1.5; font-family: Arial, sans-serif;">${Na__ClientLinks__EscapeHtml(role)}</p>` : '';
        return `
                <table class="vv3d-email-signoff" role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, sans-serif; max-width: 440px; width: 100%; margin: 0 auto 20px;">
                    <tr>
                        <td style="padding: 4px 2px 0; color: #172b3a; font-family: Arial, sans-serif;">
                            <p style="margin: 0 0 16px; padding: 0; color: #172b3a; font-size: 14px; line-height: 1.6; font-family: Arial, sans-serif;">Kind regards,</p>
                            <p style="margin: 0; padding: 0; color: #172b3a; font-size: 14px; font-weight: 700; line-height: 1.5; font-family: Arial, sans-serif;">${Na__ClientLinks__EscapeHtml(name)}</p>${roleHtml}
                        </td>
                    </tr>
                </table>`;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Email: { project, addressee, notes, token, expiresIso, signOff } -> HTML
    // ------------------------------------------------------------
    // signOff { name, role }: only for an email the app sends (a download has none).
    // ------------------------------------------------------------
    async function Na__ClientLinks__BuildEmailHtml(options) {
        const { project, addressee, notes, token, expiresIso, signOff } = options;
        const template = await Na__ClientLinks__LoadEmailTemplate();
        const values = {
            __EMAIL_SUBJECT__       : Na__ClientLinks__EscapeHtml(Na__ClientLinks__EmailSubject(project)),
            __PROJECT_META_HTML__   : Na__ClientLinks__BuildProjectMetaHtml(project),
            __GREETING_HTML__       : `Dear ${Na__ClientLinks__EscapeHtml(Na__ClientLinks__JoinNames(addressee))},`,
            __SPECIAL_NOTES_BLOCK__ : Na__ClientLinks__BuildSpecialNotesBlock(notes),
            __PROJECT_URL__         : Na__ClientLinks__EscapeHref(Na__ClientLinks__ProductionUrl(project.id, token)),
            __LINK_EXPIRY_HTML__    : Na__ClientLinks__BuildExpiryHtml(expiresIso),
            __YEAR__                : String(new Date().getFullYear()),
            __SIGN_OFF_HTML__       : Na__ClientLinks__BuildSignOffHtml(signOff)
        };
        return template.replace(/__[A-Z_]+__/g, (key) => (key in values ? values[key] : key));   // <-- One pass: a token typed into the notes stays as typed
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__ClientLinks__BuildEmailHtml,
        Na__ClientLinks__EmailFileName,
        Na__ClientLinks__EmailSubject,
        Na__ClientLinks__JoinNames,
        Na__ClientLinks__ProjectFacts
    };

// endregion -------------------------------------------------------------------
