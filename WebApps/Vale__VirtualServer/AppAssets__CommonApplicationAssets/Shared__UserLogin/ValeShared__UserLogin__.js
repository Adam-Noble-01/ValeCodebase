/* =============================================================================
   VALE SHARED - USER LOGIN (SIGN-IN GATE + INITIALS AVATAR MENU)
   =============================================================================

   FILE       : ValeShared__UserLogin__.js
   NAMESPACE  : window.ValeUserLogin
   MODULE     : Shared User Login (every Vale app)
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : One sign-in for every Vale app, against the users register,
                in the Lantern Designer login style
   CREATED    : 06-Oct-2026

   DESCRIPTION:
   - Sign in with your Vale email address and password. The session is one
     cookie for the whole site, so signing in on one app signs you in on all.
   - A first sign-in with a temporary password must choose a new one before
     the app opens (the APIs refuse everything else until then).
   - A circular initials avatar sits top-right (or inside the app's own
     toolbar, via mountEl). Its menu shows who you are, the app's own items,
     Change password and Sign out.
   - Talks to the app's API, relative to the page: <apiBase>accounts/me,
     /login, /logout, /change-password (ValeShared__Accounts__.py).

   USAGE:
     <link rel="stylesheet" href="/AppAssets__CommonApplicationAssets/Shared__UserLogin/ValeShared__UserLogin__.css">
     <script src="/AppAssets__CommonApplicationAssets/Shared__UserLogin/ValeShared__UserLogin__.js"></script>
     ValeUserLogin.Init({
         appName  : 'ValeVision Gallery',
         logoUrl  : '/AppAssets__CommonApplicationAssets/AppLogo__ValeHeaderImage_ValeLogo_HorizontalFormat__.png',
         apiBase  : 'api/',                       // relative to the page (default)
         mountEl  : null,                          // element or selector: avatar inline there
         menuItems: [{ id, label, onClick, adminOnly, minLevel, section }],
         required : true,                          // false: no sign-in wall; a "Sign in" pill instead
         onReady  : function(user) { ...start the app... }   // null when required:false and nobody is signed in
     });
     ValeUserLogin.User() / .IsAppAdmin() / .HasLevel('Management') / .OnChange(fn)
     ValeUserLogin.Fetch(url, init)   // same-origin fetch; a 401 re-opens the sign-in gate
     ValeUserLogin.SignOut() / .ShowChangePassword()

   =============================================================================

   DEVELOPMENT LOG:
   06-Oct-2026 - Version 1.1.1
   - Sign-in card: "You stay signed in on this device until you sign out" (the
     session no longer ends after a month; the Server Manager can sign people out).

   06-Oct-2026 - Version 1.1.0
   - required:false (asked for by ValeVision 3D: client links open without an
     account). No wall: onReady(null) at once, a "Sign in" pill opens a closable
     card (Cancel, Esc, backdrop); sign-in and sign-out then only fire OnChange,
     with no page reload. Temporary passwords still force the new-password card.

   06-Oct-2026 - Version 1.0.0
   - Initial build (ValeVision Gallery and ValeVision 3D).

   ============================================================================= */

(function() {

// -----------------------------------------------------------------------------
// REGION | State and Helpers
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Session and Options
    // ------------------------------------------------------------
    var Na__Opts      = null;                                                   // <-- Init options
    var Na__User      = null;                                                   // <-- Signed-in user (no hash, ever)
    var Na__Ready     = false;                                                  // <-- onReady has run
    var Na__Listeners = [];
    var Na__PendingPw = '';                                                     // <-- Sign-in password, held only until a forced change
    var Na__Ranks     = { AppAdmin: 1, Management: 2, Employee: 3, Affiliate: 4 };
    var Na__Ids       = { root: 'ValeUserLogin__Root', mount: 'ValeUserLogin__Mount' };
    // ------------------------------------------------------------


    // HELPER FUNCTION | Escape, Element, API URL
    // ------------------------------------------------------------
    function Na__Esc(v) {
        return String(v == null ? '' : v).replace(/[&<>"']/g, function(c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function Na__El(id) { return document.getElementById(id); }

    function Na__Api(path) { return (Na__Opts.apiBase || 'api/') + 'accounts/' + path; }

    function Na__Initials(user) {
        var a = (user.first || '').trim().charAt(0), b = (user.last || '').trim().charAt(0);
        return ((a + b) || (user.email || '?').charAt(0)).toUpperCase();
    }

    function Na__Call(path, body) {                                            // <-- Always resolves {status, data}
        return fetch(Na__Api(path), {
            method      : body ? 'POST' : 'GET',
            credentials : 'same-origin',
            cache       : 'no-store',
            headers     : body ? { 'Content-Type': 'application/json' } : {},
            body        : body ? JSON.stringify(body) : undefined
        }).then(function(r) {
            return r.json().catch(function() { return {}; }).then(function(d) { return { status: r.status, data: d }; });
        }).catch(function(err) {
            return { status: 0, data: { ok: false, error: 'Cannot reach the server (' + err.message + ').' } };
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Gate (sign in, choose a new password)
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Overlay Once
    // ------------------------------------------------------------
    function Na__EnsureRoot() {
        var root = Na__El(Na__Ids.root);
        if (root) return root;
        root = document.createElement('div');
        root.id = Na__Ids.root;
        root.className = 'ValeUserLogin__Overlay';
        document.body.appendChild(root);
        return root;
    }

    function Na__CardHead() {
        return (Na__Opts.logoUrl ? '<img class="ValeUserLogin__Logo" src="' + Na__Esc(Na__Opts.logoUrl) + '" alt="Vale Garden Houses">' : '') +
               (Na__Opts.appName ? '<div class="ValeUserLogin__AppName">' + Na__Esc(Na__Opts.appName) + '</div>' : '');
    }

    function Na__Field(id, label, type, placeholder, autocomplete) {
        return '<label class="ValeUserLogin__Label" for="' + id + '">' + Na__Esc(label) + '</label>' +
               '<input id="' + id + '" class="ValeUserLogin__Input" type="' + type + '" placeholder="' + Na__Esc(placeholder) + '"' +
               ' autocomplete="' + autocomplete + '" spellcheck="false">';
    }

    function Na__Required() { return !Na__Opts || Na__Opts.required !== false; }

    function Na__Show(html, focusId, onSubmit, closable) {
        var root = Na__EnsureRoot();
        root.innerHTML = '<div class="ValeUserLogin__Dialog" role="dialog" aria-modal="true">' + html + '</div>';
        root.classList.add('ValeUserLogin__Overlay--visible');
        root.dataset.closable = closable ? '1' : '';
        root.querySelectorAll('input').forEach(function(inp) {
            inp.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); onSubmit(); } });
        });
        var btn = root.querySelector('[data-vul="submit"]');
        if (btn) btn.addEventListener('click', onSubmit);
        var cancel = root.querySelector('[data-vul="cancel"]');
        if (cancel) cancel.addEventListener('click', Na__HideGate);
        if (focusId && Na__El(focusId)) Na__El(focusId).focus();
    }

    function Na__InstallCloseHandlers() {                                       // <-- Esc and backdrop close a closable card only
        if (Na__InstallCloseHandlers.done) return;
        Na__InstallCloseHandlers.done = true;
        document.addEventListener('keydown', function(e) {
            var root = Na__El(Na__Ids.root);
            if (e.key === 'Escape' && root && root.dataset.closable === '1') Na__HideGate();
        });
        document.addEventListener('mousedown', function(e) {
            var root = Na__El(Na__Ids.root);
            if (root && e.target === root && root.dataset.closable === '1') Na__HideGate();
        });
    }

    function Na__HideGate() {
        var root = Na__El(Na__Ids.root);
        if (root) { root.classList.remove('ValeUserLogin__Overlay--visible'); root.innerHTML = ''; }
    }

    function Na__Message(text, isInfo) {
        var m = document.querySelector('#' + Na__Ids.root + ' .ValeUserLogin__Message');
        if (m) { m.textContent = text || ''; m.classList.toggle('ValeUserLogin__Message--info', !!isInfo); }
    }

    function Na__Busy(isBusy, label) {
        var b = document.querySelector('#' + Na__Ids.root + ' [data-vul="submit"]');
        if (b) { b.disabled = isBusy; b.textContent = label; }
    }
    // ------------------------------------------------------------


    // FUNCTION | Sign-In Card
    // ------------------------------------------------------------
    function Na__ShowSignIn(note, closable) {
        Na__InstallCloseHandlers();
        Na__Show(Na__CardHead() +
            '<h3 class="ValeUserLogin__Title">Sign in to continue</h3>' +
            '<p class="ValeUserLogin__Subtitle">Use your Vale email address and password. You stay signed in on this device until you sign out.</p>' +
            Na__Field('ValeUserLogin__Email', 'Email address', 'email', 'name@valegardenhouses.com', 'username') +
            Na__Field('ValeUserLogin__Password', 'Password', 'password', 'Enter your password', 'current-password') +
            '<div class="ValeUserLogin__Message"></div>' +
            '<button type="button" class="ValeUserLogin__Button" data-vul="submit">Sign In</button>' +
            (closable ? '<button type="button" class="ValeUserLogin__ButtonGhost" data-vul="cancel">Cancel</button>' : ''),
            'ValeUserLogin__Email', Na__SubmitSignIn, closable);
        if (note) Na__Message(note, true);
    }

    function Na__SubmitSignIn() {
        var email = (Na__El('ValeUserLogin__Email').value || '').trim();
        var pass = Na__El('ValeUserLogin__Password').value || '';
        if (!email || !pass) { Na__Message('Enter your email address and password.'); return; }
        Na__Message('');
        Na__Busy(true, 'Signing in…');
        Na__Call('login', { email: email, password: pass }).then(function(res) {
            Na__Busy(false, 'Sign In');
            if (!res.data.ok) {
                Na__Message(res.data.error || 'Email address or password not recognised.');
                Na__El('ValeUserLogin__Password').value = '';
                Na__El('ValeUserLogin__Password').focus();
                return;
            }
            if (res.data.user.mustChangePassword) { Na__PendingPw = pass; Na__ShowNewPassword(true); return; }
            Na__SignedIn(res.data.user);
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | New-Password Card (forced on first sign-in, or from the menu)
    // ------------------------------------------------------------
    function Na__ShowNewPassword(isForced) {
        Na__Show(Na__CardHead() +
            '<h3 class="ValeUserLogin__Title">' + (isForced ? 'Choose your own password' : 'Change password') + '</h3>' +
            '<p class="ValeUserLogin__Subtitle">' + (isForced
                ? 'You signed in with a temporary password. Choose your own to continue: at least 8 characters, with letters and a number.'
                : 'At least 8 characters, with letters and a number.') + '</p>' +
            (isForced && Na__PendingPw ? '' : Na__Field('ValeUserLogin__Current', 'Current password', 'password', '', 'current-password')) +
            Na__Field('ValeUserLogin__New', 'New password', 'password', '', 'new-password') +
            Na__Field('ValeUserLogin__Confirm', 'Repeat the new password', 'password', '', 'new-password') +
            '<div class="ValeUserLogin__Message"></div>' +
            '<button type="button" class="ValeUserLogin__Button" data-vul="submit">Save password</button>' +
            (isForced ? '' : '<button type="button" class="ValeUserLogin__ButtonGhost" data-vul="cancel">Cancel</button>'),
            Na__El('ValeUserLogin__Current') ? 'ValeUserLogin__Current' : 'ValeUserLogin__New',
            function() { Na__SubmitNewPassword(isForced); }, !isForced);
        var first = Na__El('ValeUserLogin__Current') || Na__El('ValeUserLogin__New');
        if (first) first.focus();
    }

    function Na__SubmitNewPassword(isForced) {
        var cur = Na__El('ValeUserLogin__Current') ? Na__El('ValeUserLogin__Current').value : Na__PendingPw;
        var nw = Na__El('ValeUserLogin__New').value, again = Na__El('ValeUserLogin__Confirm').value;
        if (!cur || !nw) { Na__Message('Fill in every field.'); return; }
        if (nw !== again) { Na__Message('The two new passwords do not match.'); return; }
        Na__Busy(true, 'Saving…');
        Na__Call('change-password', { current: cur, new: nw }).then(function(res) {
            Na__Busy(false, 'Save password');
            if (!res.data.ok) { Na__Message(res.data.error || 'Could not save the password.'); return; }
            Na__PendingPw = '';
            if (isForced) { Na__SignedIn(res.data.user); return; }
            Na__User = res.data.user;
            Na__HideGate();
            Na__Notify();
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Avatar Menu
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | May This User See a Menu Item?
    // ------------------------------------------------------------
    function Na__Allowed(item) {
        if (item.adminOnly && !Api.IsAppAdmin()) return false;
        if (item.minLevel && !Api.HasLevel(item.minLevel)) return false;
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Render the Avatar (rebuilt on every sign-in change)
    // ------------------------------------------------------------
    function Na__RenderMenu() {
        var host = Na__Opts.mountEl ? (typeof Na__Opts.mountEl === 'string' ? document.querySelector(Na__Opts.mountEl) : Na__Opts.mountEl) : null;
        var mount = Na__El(Na__Ids.mount);
        if (!mount) {
            mount = document.createElement('div');
            mount.id = Na__Ids.mount;
            (host || document.body).appendChild(mount);
        }
        mount.className = 'ValeUserLogin__Mount' + (host ? ' ValeUserLogin__Mount--Inline' : '');
        if (!Na__User) {
            mount.innerHTML = Na__Required() ? '' : '<button type="button" class="ValeUserLogin__SignInPill">Sign in</button>';
            var pill = mount.querySelector('.ValeUserLogin__SignInPill');
            if (pill) pill.addEventListener('click', function() { Na__ShowSignIn('', true); });
            return;
        }
        var u = Na__User, ini = Na__Initials(u);
        var items = (Na__Opts.menuItems || []).filter(Na__Allowed);
        var html = '', section = null;
        items.forEach(function(it, i) {
            if (it.section && it.section !== section) {
                html += '<div class="ValeUserLogin__Rule"></div><div class="ValeUserLogin__SectionLabel">' + Na__Esc(it.section) + '</div>';
                section = it.section;
            } else if (!it.section && section) {
                html += '<div class="ValeUserLogin__Rule"></div>';
                section = null;
            }
            html += '<button type="button" role="menuitem" class="ValeUserLogin__Item' + (it.section ? ' ValeUserLogin__Item--nested' : '') +
                    '" data-vul-item="' + i + '">' + Na__Esc(it.label) + '</button>';
        });
        mount.innerHTML =
            '<div class="ValeUserLogin__Menu">' +
                '<button type="button" class="ValeUserLogin__Avatar" title="' + Na__Esc(u.name) + '" aria-haspopup="true" aria-expanded="false">' + Na__Esc(ini) + '</button>' +
                '<div class="ValeUserLogin__Panel" role="menu">' +
                    '<div class="ValeUserLogin__Identity"><span class="ValeUserLogin__IdentityAvatar">' + Na__Esc(ini) + '</span>' +
                        '<span class="ValeUserLogin__IdentityText"><span class="ValeUserLogin__IdentityName">' + Na__Esc(u.name) + '</span>' +
                        '<span class="ValeUserLogin__IdentityRole">' + Na__Esc([u.role, u.department].filter(Boolean).join(' · ')) + '</span></span></div>' +
                    '<div class="ValeUserLogin__Rule"></div>' + html +
                    (html ? '<div class="ValeUserLogin__Rule"></div>' : '') +
                    '<button type="button" role="menuitem" class="ValeUserLogin__Item" data-vul-act="password">Change password</button>' +
                    '<div class="ValeUserLogin__Rule"></div>' +
                    '<button type="button" role="menuitem" class="ValeUserLogin__Item ValeUserLogin__Item--danger" data-vul-act="signout">Sign out</button>' +
                '</div>' +
            '</div>';
        var menu = mount.querySelector('.ValeUserLogin__Menu');
        var setOpen = function(open) {
            menu.classList.toggle('ValeUserLogin__Menu--open', open);
            menu.querySelector('.ValeUserLogin__Avatar').setAttribute('aria-expanded', open ? 'true' : 'false');
        };
        menu.querySelector('.ValeUserLogin__Avatar').addEventListener('click', function(e) {
            e.stopPropagation();
            setOpen(!menu.classList.contains('ValeUserLogin__Menu--open'));
        });
        menu.querySelector('.ValeUserLogin__Panel').addEventListener('click', function(e) {
            var b = e.target.closest('button');
            if (!b) return;
            setOpen(false);
            if (b.dataset.vulAct === 'signout') Api.SignOut();
            else if (b.dataset.vulAct === 'password') Api.ShowChangePassword();
            else if (b.dataset.vulItem != null) {
                var it = items[Number(b.dataset.vulItem)];
                if (it && typeof it.onClick === 'function') it.onClick(Na__User);
            }
        });
        document.addEventListener('click', function(e) { if (!menu.contains(e.target)) setOpen(false); });
        document.addEventListener('keydown', function(e) { if (e.key === 'Escape') setOpen(false); });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Session Flow and Public API
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Signed In: hide the gate, draw the avatar, start the app once
    // ------------------------------------------------------------
    function Na__SignedIn(user) {
        Na__User = user;
        Na__HideGate();
        Na__RenderMenu();
        Na__Notify();
        if (!Na__Ready) {
            Na__Ready = true;
            if (typeof Na__Opts.onReady === 'function') Na__Opts.onReady(user);
        }
    }

    function Na__Notify() {
        Na__Listeners.forEach(function(fn) { try { fn(Na__User); } catch (e) { console.error(e); } });
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    var Api = window.ValeUserLogin = {
        Init: function(opts) {
            Na__Opts = opts || {};
            return Na__Call('me').then(function(res) {
                if (res.status === 200 && res.data.ok) {
                    if (res.data.user.mustChangePassword) { Na__User = res.data.user; Na__ShowNewPassword(false); Na__ForceCurrent(); return; }
                    Na__SignedIn(res.data.user);
                    return;
                }
                if (!Na__Required()) {                                          // <-- Open app: no wall, a Sign in pill
                    Na__User = null;
                    Na__RenderMenu();
                    Na__Ready = true;
                    if (typeof Na__Opts.onReady === 'function') Na__Opts.onReady(null);
                    return;
                }
                Na__ShowSignIn(res.status === 0 ? res.data.error : '');
            });
        },
        User       : function() { return Na__User; },
        IsAppAdmin : function() { return !!Na__User && Na__User.level === 'AppAdmin'; },
        HasLevel   : function(code) {
            return !!Na__User && (Na__User.levelRank || 99) <= (Na__Ranks[code] || 0);
        },
        OnChange   : function(fn) { Na__Listeners.push(fn); },
        SignOut    : function() {
            return Na__Call('logout', {}).then(function() {
                if (Na__Required()) { window.location.reload(); return; }
                Na__User = null;                                                // <-- Open app: back to the Sign in pill
                Na__RenderMenu();
                Na__Notify();
            });
        },
        ShowChangePassword: function() { Na__ShowNewPassword(false); },
        Fetch      : function(url, init) {
            init = init || {};
            init.credentials = init.credentials || 'same-origin';
            return fetch(url, init).then(function(r) {
                if (r.status === 401) {
                    var wasSignedIn = !!Na__User;
                    Na__User = null;
                    Na__RenderMenu();
                    if (wasSignedIn) Na__Notify();
                    Na__ShowSignIn(wasSignedIn ? 'Your session ended. Sign in again to carry on.' : '', !Na__Required());
                }
                return r;
            });
        }
    };

    function Na__ForceCurrent() {                                               // <-- A restored session still on a temporary password
        var root = Na__El(Na__Ids.root);
        var cancel = root && root.querySelector('[data-vul="cancel"]');
        if (cancel) cancel.remove();
        var title = root && root.querySelector('.ValeUserLogin__Title');
        if (title) title.textContent = 'Choose your own password';
        var sub = root && root.querySelector('.ValeUserLogin__Subtitle');
        if (sub) sub.textContent = 'You are still on a temporary password. Enter it, then choose your own to continue.';
        if (root) root.querySelector('[data-vul="submit"]').onclick = null;
        if (root) root.querySelectorAll('input').forEach(function(inp) { inp.onkeydown = null; });
        Na__Show(root.querySelector('.ValeUserLogin__Dialog').innerHTML, 'ValeUserLogin__Current', function() { Na__SubmitNewPassword(true); });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

})();
