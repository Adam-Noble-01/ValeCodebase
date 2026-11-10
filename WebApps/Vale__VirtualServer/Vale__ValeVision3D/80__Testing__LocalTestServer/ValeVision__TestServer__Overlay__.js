/* =============================================================================
   VALEVISION3D - TESTING SERVER OVERLAY
   =============================================================================

   FILE       : ValeVision__TestServer__Overlay__.js
   NAMESPACE  : ValeVision__TestServer
   MODULE     : TestServer - Overlay
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Mark a page served by the ValeVision 3D testing server beyond any
                doubt, sign in as any fake user in one click, and list the
                problems found while testing on it
   CREATED    : 04-Nov-2026

   DESCRIPTION:
   - NEVER PART OF THE APP. ValeVision__TestServer__LocalServer__.py injects this
     script and its stylesheet into index.html as it serves the page. Nothing in
     index.html refers to them and this folder (80__Testing__*) never syncs, so
     the live server cannot show them. After the Lantern Designer's, 1.0.2.
   - Injected first in <head>, before every app script, so the problems it
     collects start with the first line of the app: script errors, files that
     failed to load, rejected promises and console.error.
   - Draws a frame round the window that never takes a click (amber: sandbox
     data; red: the real mirror), a label in the empty centre of the app header,
     and a badge in a bottom corner: TESTING SERVER, the data mode, who is signed
     in and a count of problems. The badge opens the panel: the fake users, the
     projects in the sandbox, the server, app and git details, and every problem
     list.
   - Asks the server for its lists (files a push would not send, missing files,
     API errors) every few seconds while the tab is visible; says so plainly when
     the server stops answering.
   - SANDBOX SIGN-IN, AT THE CARD. While the shared sign-in card is on screen on
     sandbox data, a box beside the badge says that only the test accounts exist
     there and signs in as any of them in one click (it fills the card and
     presses its own Sign In). On the Lantern Designer's, 20-Oct-2026, Adam's real
     password was refused seven times: "I just validated and its 100% the correct
     password". It was: that account is just not in the sandbox.
   - FAKE USERS (Adam, 04-Nov-2026: "Create a dev mode like the lantern designer
     with fake users"). The panel signs in as any of them at any time, and signs
     out. A client has no account, so "Open as a client" makes a real client link
     to this project through the API, as staff do, and opens it in a new tab: the
     real thing, down to the API's own checks.
   - Never throws into the app: every handler is guarded, and a problem in the
     overlay's own drawing is never recorded as one of the app's.
   - TESTS (10-Nov-2026). The panel also opens trials that are not part of the
     app, each a module of its own beside this file, fetched only when its button
     is pressed: the linework density test (ValeVision__TestServer__LineworkDensity__*).
     A test changes the page it is on and nothing else.

   ============================================================================= */


// =============================================================================
// REGION | Testing Server Overlay
// =============================================================================

var ValeVision__TestServer__Overlay = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | From the Script Tag the Server Injected
    // ------------------------------------------------------------
    var SCRIPT_TAG       =  document.currentScript;
    var MODE             =  ValeVision__TestServer__Attr('data-mode') === 'real' ? 'real' : 'sandbox';
    var STATUS_URL       =  ValeVision__TestServer__Attr('data-status-url');
    var CLEAR_URL        =  ValeVision__TestServer__Attr('data-clear-url');
    var POLL_MS          =  parseInt(ValeVision__TestServer__Attr('data-poll-ms'), 10);
    var KEEP             =  parseInt(ValeVision__TestServer__Attr('data-keep'), 10);
    var API_BASE         =  ValeVision__TestServer__Attr('data-api-base');
    var CLS              =  'ValeVision__TestServer__';                    // <-- Every id and class: the triple token
    var SIDE_KEY         =  'ValeVision__TestServer__Side';                 // <-- localStorage: a per-browser UI preference only
    var MAX_TEXT         =  600;
    // ------------------------------------------------------------

    // MODULE VARIABLES | Overlay State
    // ------------------------------------------------------------
    var ValeVision__TestServer__State  =  {
        Browser          : [],                                              // <-- { Kind, Text, Count, Last }, newest first
        Server           : null,                                            // <-- The last /_testserver/api/status answer
        ServerDown       : false,
        Open             : false,
        Side             : ValeVision__TestServer__LoadSide(),
        Dom              : null,
        Drawing          : false,                                           // <-- True while the overlay draws itself
        RenderQueued     : false,
        PanelSignature   : '',                                              // <-- What the open panel last drew
        SignInVisible    : false,                                           // <-- The shared sign-in card is on screen
        Me               : undefined,                                       // <-- Who is signed in: undefined until asked, null for nobody
        ActionNote       : '',                                              // <-- What the last fake-user action said
        Busy             : false
    };
    var OriginalConsoleError  =  console.error;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read an Attribute of the Injected Script Tag
    // ------------------------------------------------------------
    function ValeVision__TestServer__Attr(name) {
        return SCRIPT_TAG ? (SCRIPT_TAG.getAttribute(name) || '') : '';
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | The Remembered Corner (left unless this browser chose right)
    // ------------------------------------------------------------
    function ValeVision__TestServer__LoadSide() {
        try { return window.localStorage.getItem(SIDE_KEY) === 'right' ? 'right' : 'left'; }
        catch (e) { return 'left'; }                                        // <-- Storage blocked: the default corner
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Make an Element (text always as text, never as HTML)
    // ------------------------------------------------------------
    function ValeVision__TestServer__El(tag, className, text) {
        var el = document.createElement(tag);
        if (className) { el.className = className; }
        if (text !== undefined && text !== null) { el.textContent = String(text); }
        return el;
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | A Value as Readable Text (errors with their first stack line)
    // ------------------------------------------------------------
    function ValeVision__TestServer__Describe(value) {
        var text;
        if (value === undefined) { return 'undefined'; }
        if (value === null) { return 'null'; }
        if (value instanceof Error) {
            text = (value.name || 'Error') + ': ' + value.message;
            var stack = String(value.stack || '').split('\n');
            for (var i = 0; i < stack.length; i++) {
                if (stack[i].indexOf(' at ') >= 0 || stack[i].indexOf('@') >= 0) { text += '  ' + stack[i].trim(); break; }
            }
            return text;
        }
        if (typeof value === 'string') { return value; }
        try { text = JSON.stringify(value); } catch (e) { text = String(value); }
        return text === undefined ? String(value) : text;
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | A URL Without This Origin (shorter in the list)
    // ------------------------------------------------------------
    function ValeVision__TestServer__ShortUrl(url) {
        var text = String(url || '');
        return text.indexOf(location.origin) === 0 ? text.slice(location.origin.length) : text;
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Copy Text to the Clipboard (localhost is a secure context)
    // ------------------------------------------------------------
    function ValeVision__TestServer__Copy(text, button) {
        if (!navigator.clipboard) { return; }
        navigator.clipboard.writeText(text).then(function() {
            var label = button.textContent;
            button.textContent = 'Copied';
            setTimeout(function() { button.textContent = label; }, 1200);
        }, function() { });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Collecting What the Browser Sees
// -----------------------------------------------------------------------------

    // FUNCTION | Record One Browser Problem (repeats are counted, not listed again)
    // ------------------------------------------------------------
    function ValeVision__TestServer__AddBrowser(kind, text) {
        var State = ValeVision__TestServer__State;
        if (State.Drawing) { return; }                                      // <-- The overlay's own failure is not the app's
        text = String(text).slice(0, MAX_TEXT);
        var now = new Date().toTimeString().slice(0, 8);
        for (var i = 0; i < State.Browser.length; i++) {
            if (State.Browser[i].Kind === kind && State.Browser[i].Text === text) {
                var hit = State.Browser.splice(i, 1)[0];
                hit.Count += 1;
                hit.Last = now;
                State.Browser.unshift(hit);
                ValeVision__TestServer__QueueRender();
                return;
            }
        }
        State.Browser.unshift({ Kind: kind, Text: text, Count: 1, Last: now });
        if (KEEP > 0 && State.Browser.length > KEEP) { State.Browser.length = KEEP; }
        ValeVision__TestServer__QueueRender();
    }
    // ------------------------------------------------------------

    // BOOT | Listen From the First Line of the App
    // ------------------------------------------------------------
    window.addEventListener('error', function(event) {
        try {
            var target = event.target;
            if (target && target !== window && target.tagName) {            // <-- A script, stylesheet or image that failed to load
                var url = target.src || target.href || target.currentSrc || '';
                ValeVision__TestServer__AddBrowser('Failed to load', target.tagName.toLowerCase() + ' ' + ValeVision__TestServer__ShortUrl(url));
                return;
            }
            var where = event.filename
                ? '  (' + ValeVision__TestServer__ShortUrl(event.filename) + ':' + event.lineno + ':' + event.colno + ')' : '';
            var message = event.error ? ValeVision__TestServer__Describe(event.error) : (event.message || 'Error');
            ValeVision__TestServer__AddBrowser('Script error', message + where);
        } catch (e) { }
    }, true);                                                               // <-- Capture phase: load errors do not bubble

    window.addEventListener('unhandledrejection', function(event) {
        try { ValeVision__TestServer__AddBrowser('Unhandled promise rejection', ValeVision__TestServer__Describe(event.reason)); }
        catch (e) { }
    });

    console.error = function() {
        try {
            var parts = [];
            for (var i = 0; i < arguments.length; i++) { parts.push(ValeVision__TestServer__Describe(arguments[i])); }
            ValeVision__TestServer__AddBrowser('console.error', parts.join(' '));
        } catch (e) { }
        return OriginalConsoleError.apply(console, arguments);              // <-- The console still shows it, unchanged
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Talking to the Testing Server
// -----------------------------------------------------------------------------

    // FUNCTION | Fetch the Server's Status and Lists
    // ------------------------------------------------------------
    function ValeVision__TestServer__Poll() {
        var State = ValeVision__TestServer__State;
        if (!STATUS_URL || document.hidden) { return; }
        fetch(STATUS_URL, { cache: 'no-store' }).then(function(res) {
            if (!res.ok) { throw new Error('HTTP ' + res.status); }
            return res.json();
        }).then(function(data) {
            State.Server = data;
            State.ServerDown = false;
            ValeVision__TestServer__QueueRender();
        }, function() {
            State.ServerDown = true;                                        // <-- Stopped, or restarting after a .py change
            ValeVision__TestServer__QueueRender();
        });
    }
    // ------------------------------------------------------------

    // FUNCTION | Clear Every List (the browser's here, the server's there)
    // ------------------------------------------------------------
    function ValeVision__TestServer__ClearLists() {
        ValeVision__TestServer__State.Browser = [];
        ValeVision__TestServer__QueueRender();
        if (!CLEAR_URL) { return; }
        fetch(CLEAR_URL, { method: 'POST', cache: 'no-store' }).then(ValeVision__TestServer__Poll, function() { });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Sandbox Sign-In (the shared card: Shared__UserLogin/ValeShared__UserLogin__.js)
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Is the Shared Sign-In Card on Screen (not the change-password card: it has no email field)
    // ------------------------------------------------------------
    function ValeVision__TestServer__SignInCardShown() {
        var email = document.getElementById('ValeUserLogin__Email');
        return !!(email && email.getClientRects().length);                  // <-- Not offsetParent: the card sits in a fixed overlay
    }
    // ------------------------------------------------------------

    // FUNCTION | Sign In as a Test Account Through the Card Itself (its own Sign In, so the real flow is what runs)
    // ------------------------------------------------------------
    function ValeVision__TestServer__SignInAs(email, password) {
        var emailInput     =  document.getElementById('ValeUserLogin__Email');
        var passwordInput  =  document.getElementById('ValeUserLogin__Password');
        if (!emailInput || !passwordInput) { return; }
        emailInput.value     =  email;
        passwordInput.value  =  password;
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
        var dialog = emailInput.closest('.ValeUserLogin__Dialog') || document;
        var submit = dialog.querySelector('[data-vul="submit"]');
        if (submit) { submit.click(); }
    }
    // ------------------------------------------------------------

    // FUNCTION | Ask the API Who Is Signed In (the badge and the panel say)
    // ------------------------------------------------------------
    function ValeVision__TestServer__AskWhoIsSignedIn() {
        var State = ValeVision__TestServer__State;
        if (!API_BASE) { return; }
        fetch(API_BASE + 'accounts/me', { cache: 'no-store' }).then(function(res) {
            return res.ok ? res.json() : null;                              // <-- 401 only means nobody yet
        }).then(function(data) {
            State.Me = (data && data.user) ? data.user : null;
            ValeVision__TestServer__QueueRender();
        }, function() { });
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Is This Page a Client Link?
    // ------------------------------------------------------------
    function ValeVision__TestServer__IsClientLink() {
        try { return !!new URLSearchParams(location.search).get('share'); }
        catch (e) { return false; }
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Show This Project Again as Whoever Is Now Signed In (a client link's token goes)
    // ------------------------------------------------------------
    function ValeVision__TestServer__ReloadPlain() {
        var params = new URLSearchParams(location.search);
        if (params.get('share')) {
            params.delete('share');
            location.search = params.toString();
            return;
        }
        location.reload();
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Say What an Action Came To
    // ------------------------------------------------------------
    function ValeVision__TestServer__SayAction(note) {
        var State = ValeVision__TestServer__State;
        State.Busy = false;
        State.ActionNote = note;
        ValeVision__TestServer__QueueRender();
    }
    // ------------------------------------------------------------

    // FUNCTION | Be a Different Fake User (through the API's own sign-in, then the page loads as them)
    // ------------------------------------------------------------
    function ValeVision__TestServer__SwitchUser(email, password) {
        var State = ValeVision__TestServer__State;
        State.Busy = true;
        State.ActionNote = 'Signing in...';
        ValeVision__TestServer__QueueRender();
        fetch(API_BASE + 'accounts/login', {
            method  : 'POST',
            headers : { 'Content-Type': 'application/json' },
            body    : JSON.stringify({ email: email, password: password })
        }).then(function(res) {
            if (!res.ok) { throw new Error('the sign-in answered ' + res.status); }
            ValeVision__TestServer__ReloadPlain();
        }).catch(function(error) {
            ValeVision__TestServer__SayAction('Could not sign in: ' + error.message);
        });
    }
    // ------------------------------------------------------------

    // FUNCTION | Sign Out, to See the Sign-In Card
    // ------------------------------------------------------------
    function ValeVision__TestServer__SignOut() {
        var State = ValeVision__TestServer__State;
        State.Busy = true;
        ValeVision__TestServer__QueueRender();
        fetch(API_BASE + 'accounts/logout', { method: 'POST' }).then(function() {
            ValeVision__TestServer__ReloadPlain();
        }).catch(function(error) {
            ValeVision__TestServer__SayAction('Could not sign out: ' + error.message);
        });
    }
    // ------------------------------------------------------------

    // FUNCTION | Make a Real Client Link to This Project and Open It in a New Tab
    // ------------------------------------------------------------
    // The tab is opened first, in the click, or a popup blocker takes it. A page opened
    // from a client link is the client's view whoever is signed in (Na__DevGate__IsClientLink),
    // and the API answers it by the link, not the session.
    // ------------------------------------------------------------
    function ValeVision__TestServer__OpenAsClient() {
        var project = new URLSearchParams(location.search).get('project');
        if (!project) { ValeVision__TestServer__SayAction('Open a project first.'); return; }
        var tab = window.open('about:blank', '_blank');
        var State = ValeVision__TestServer__State;
        State.Busy = true;
        State.ActionNote = 'Making a client link...';
        ValeVision__TestServer__QueueRender();
        fetch(API_BASE + 'projects/' + encodeURIComponent(project) + '/shares', {
            method  : 'POST',
            headers : { 'Content-Type': 'application/json' },
            body    : JSON.stringify({ label: 'Testing server', expiresDays: 7 })
        }).then(function(res) {
            if (!res.ok) { throw new Error(res.status === 401 || res.status === 403 ? 'sign in as an Employee or above first' : 'the API answered ' + res.status); }
            return res.json();
        }).then(function(body) {
            var link  = body.link || {};
            var token = body.token || link.ValeVision3DShare__Link__Token || link.token;
            if (!token) { throw new Error('the answer held no token'); }
            var url = location.pathname + '?project=' + encodeURIComponent(project) + '&share=' + encodeURIComponent(token);
            if (tab) { tab.location.href = url; } else { window.open(url, '_blank'); }
            ValeVision__TestServer__SayAction('Client link opened in a new tab.');
        }).catch(function(error) {
            if (tab) { tab.close(); }
            ValeVision__TestServer__SayAction('No client link: ' + error.message + '.');
        });
    }
    // ------------------------------------------------------------

    // SUB FUNCTION | The Box Beside the Badge While the Card Shows on Sandbox Data
    // ------------------------------------------------------------
    function ValeVision__TestServer__RenderSignInHelp(box, S, mode) {
        var El = ValeVision__TestServer__El;
        var show = mode === 'sandbox' && ValeVision__TestServer__State.SignInVisible && !!(S && S.Sandbox);
        box.hidden = !show;
        if (!show) { box.textContent = ''; box.removeAttribute('data-drawn'); return; }
        if (box.getAttribute('data-drawn') === S.Sandbox.Password) { return; } // <-- Drawn already: keep it still under the pointer
        box.textContent = '';
        box.setAttribute('data-drawn', S.Sandbox.Password);
        box.appendChild(El('h2', CLS + 'SignInTitle', 'Sandbox: fake users only'));
        box.appendChild(El('p', CLS + 'SignInText', 'Your own Vale account is not in the sandbox, so its password is refused here, however correct. Sign in as a fake user:'));
        var row = El('div', CLS + 'SignInButtons');
        for (var i = 0; i < S.Sandbox.Accounts.length; i++) {
            var acc = S.Sandbox.Accounts[i];
            var btn = El('button', CLS + 'SignInButton', acc.Level);
            btn.type = 'button';
            btn.title = 'Sign in as ' + acc.Email;
            (function(email, button) {
                button.addEventListener('click', function() { ValeVision__TestServer__SignInAs(email, S.Sandbox.Password); });
            })(acc.Email, btn);
            row.appendChild(btn);
        }
        box.appendChild(row);
        box.appendChild(El('p', CLS + 'SignInFoot', 'Password ' + S.Sandbox.Password + ' for all four. Your own account and the real projects: start the server with --real.'));
    }
    // ------------------------------------------------------------

    // BOOT | Watch for the Card (it appears after the app's config and the me call; cheap: one lookup)
    // ------------------------------------------------------------
    setInterval(function() {
        var shown = ValeVision__TestServer__SignInCardShown();
        if (shown !== ValeVision__TestServer__State.SignInVisible) {
            ValeVision__TestServer__State.SignInVisible = shown;
            ValeVision__TestServer__AskWhoIsSignedIn();                     // <-- The card came or went: someone signed in or out
            ValeVision__TestServer__QueueRender();
        }
    }, 500);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Drawing the Overlay
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Server's Lists, in the Order the Panel Shows Them
    // ------------------------------------------------------------
    function ValeVision__TestServer__Groups() {
        var S = ValeVision__TestServer__State.Server || {};
        var browser = ValeVision__TestServer__State.Browser.map(function(b) {
            return { Path: b.Kind, Detail: b.Text, Count: b.Count, Last: b.Last };
        });
        return [
            { Title: 'Would not work on the server', Note: 'A push would not send these files, or nginx would not serve them. Here they answer 404, as they would there.', Items: S.NotDeployed || [] },
            { Title: 'Missing files',                Note: 'Static files the page asked for that do not exist.',                                                         Items: S.Missing || [] },
            { Title: 'API errors',                   Note: 'Answers of 500 and over. The traceback is in the testing server window.',                                    Items: S.ServerErrors || [] },
            { Title: 'In the browser',               Note: 'Script errors, failed loads, rejected promises and console.error, since this page loaded.',                 Items: browser }
        ];
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Who the Badge Says Is Looking
    // ------------------------------------------------------------
    function ValeVision__TestServer__WhoText() {
        var Me = ValeVision__TestServer__State.Me;
        if (ValeVision__TestServer__IsClientLink()) { return 'Client link'; }
        if (Me === undefined) { return ''; }
        return Me ? (Me.level || Me.name || 'Signed in') : 'Signed out';
    }
    // ------------------------------------------------------------

    // FUNCTION | Open One of the Tests Kept Beside the Overlay
    // ------------------------------------------------------------
    // A test is a module of its own in this folder, fetched only when asked
    // for, so the overlay stays as small as it was and a test that fails to
    // load is one more line in the browser's list, never a broken overlay.
    // ------------------------------------------------------------
    function ValeVision__TestServer__OpenTest(fileStem, openName) {
        var State  = ValeVision__TestServer__State;
        var folder = SCRIPT_TAG && SCRIPT_TAG.src ? SCRIPT_TAG.src.replace(/[^\/]+$/, '') : '/_testserver/';
        State.Open = false;                                                 // <-- The model is what a test is looked at on
        ValeVision__TestServer__QueueRender();
        import(folder + 'ValeVision__TestServer__' + fileStem + '__.js')
            .then(function(module) { module[openName](); })
            .catch(function(error) { ValeVision__TestServer__AddBrowser('test', 'The test could not be opened: ' + ValeVision__TestServer__Describe(error)); });
    }
    // ------------------------------------------------------------

    // FUNCTION | Build the Overlay Once (frame, header label, dock with badge and panel)
    // ------------------------------------------------------------
    function ValeVision__TestServer__Build() {
        var State  =  ValeVision__TestServer__State;
        var root   =  ValeVision__TestServer__El('div', CLS + 'Root');
        root.id    =  CLS + 'Root';

        var frame  =  ValeVision__TestServer__El('div', CLS + 'Frame');
        frame.setAttribute('aria-hidden', 'true');
        var label  =  ValeVision__TestServer__El('div', CLS + 'HeaderLabel');
        label.setAttribute('aria-hidden', 'true');

        var dock   =  ValeVision__TestServer__El('div', CLS + 'Dock');
        var panel  =  ValeVision__TestServer__El('section', CLS + 'Panel');
        panel.id   =  CLS + 'Panel';
        panel.setAttribute('aria-label', 'Testing server');
        panel.hidden = true;

        var badge  =  ValeVision__TestServer__El('button', CLS + 'Badge');
        badge.type =  'button';
        badge.setAttribute('aria-controls', panel.id);
        badge.setAttribute('aria-expanded', 'false');
        badge.appendChild(ValeVision__TestServer__El('span', CLS + 'BadgeTitle', 'Testing Server'));
        var mode   =  ValeVision__TestServer__El('span', CLS + 'BadgeMode');
        var user   =  ValeVision__TestServer__El('span', CLS + 'BadgeUser');
        var count  =  ValeVision__TestServer__El('span', CLS + 'BadgeCount');
        badge.appendChild(mode);
        badge.appendChild(user);
        badge.appendChild(count);
        badge.addEventListener('click', function() {
            State.Open = !State.Open;
            ValeVision__TestServer__QueueRender();
        });

        var help   =  ValeVision__TestServer__El('section', CLS + 'SignInHelp');
        help.setAttribute('aria-label', 'Sandbox fake users');
        help.hidden = true;

        dock.appendChild(panel);
        dock.appendChild(help);
        dock.appendChild(badge);
        root.appendChild(frame);
        root.appendChild(label);
        root.appendChild(dock);
        document.body.appendChild(root);

        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && State.Open) { State.Open = false; ValeVision__TestServer__QueueRender(); }
        });

        State.Dom = { Root: root, Label: label, Panel: panel, Help: help, Badge: badge, Mode: mode, User: user, Count: count };
        ValeVision__TestServer__Render();
    }
    // ------------------------------------------------------------

    // FUNCTION | Draw on the Next Frame (many errors at boot are one redraw)
    // ------------------------------------------------------------
    function ValeVision__TestServer__QueueRender() {
        var State = ValeVision__TestServer__State;
        if (State.RenderQueued || !State.Dom) { return; }
        State.RenderQueued = true;
        setTimeout(function() {
            State.RenderQueued = false;
            ValeVision__TestServer__Render();
        }, 50);
    }
    // ------------------------------------------------------------

    // FUNCTION | Draw Everything From the State
    // ------------------------------------------------------------
    function ValeVision__TestServer__Render() {
        var State = ValeVision__TestServer__State;
        if (!State.Dom) { return; }
        State.Drawing = true;
        try {
            var S       =  State.Server;
            var mode    =  S && S.Server ? S.Server.Mode : MODE;
            var groups  =  ValeVision__TestServer__Groups();
            var total   =  0;
            for (var g = 0; g < groups.length; g++) { total += groups[g].Items.length; }

            State.Dom.Root.className = CLS + 'Root ' + CLS + 'Root--' + mode + ' ' + CLS + 'Root--' + State.Side
                + (State.ServerDown ? ' ' + CLS + 'Root--down' : '');
            State.Dom.Label.textContent = 'Testing Server  |  ' + (mode === 'real' ? 'Real data' : 'Sandbox data');
            State.Dom.Mode.textContent  = State.ServerDown ? 'Server not answering' : (mode === 'real' ? 'Real data' : 'Sandbox data');
            State.Dom.User.textContent  = ValeVision__TestServer__WhoText();
            State.Dom.Count.textContent = String(total);
            State.Dom.Count.className   = CLS + 'BadgeCount ' + CLS + 'BadgeCount--' + (total ? 'issues' : 'clear');
            State.Dom.Badge.title       = total ? total + ' problem' + (total === 1 ? '' : 's') + ' found: click to see them' : 'No problems found so far';
            State.Dom.Badge.setAttribute('aria-expanded', State.Open ? 'true' : 'false');
            State.Dom.Panel.hidden      = !State.Open;
            ValeVision__TestServer__RenderSignInHelp(State.Dom.Help, S, mode);
            var signature = State.Open ? JSON.stringify([S, State.Browser, State.ServerDown, State.Side, State.Me, State.ActionNote, State.Busy]) : '';
            if (State.Open && signature !== State.PanelSignature) {         // <-- Unchanged data: no redraw, so a selection survives the poll
                ValeVision__TestServer__RenderPanel(State.Dom.Panel, S, mode, groups);
            }
            State.PanelSignature = signature;
        } finally {
            State.Drawing = false;
        }
    }
    // ------------------------------------------------------------

    // SUB FUNCTION | The Panel's Contents
    // ------------------------------------------------------------
    function ValeVision__TestServer__RenderPanel(panel, S, mode, groups) {
        var State = ValeVision__TestServer__State;
        var El    = ValeVision__TestServer__El;
        var keepScroll = panel.scrollTop;
        panel.textContent = '';

        var head = El('div', CLS + 'PanelHead');
        head.appendChild(El('h2', CLS + 'PanelTitle', 'ValeVision 3D testing server'));
        var close = El('button', CLS + 'PanelClose', 'Close');
        close.type = 'button';
        close.addEventListener('click', function() { State.Open = false; ValeVision__TestServer__QueueRender(); });
        head.appendChild(close);
        panel.appendChild(head);

        if (State.ServerDown) {
            panel.appendChild(El('p', CLS + 'Warning', 'The testing server is not answering: it has stopped, or it is restarting after a .py file changed. Reload the page once it is back.'));
        }

        // Fake users (sandbox)
        if (S && S.Sandbox) {
            var users = El('div', CLS + 'Group');
            users.appendChild(El('h3', CLS + 'GroupTitle', 'Fake users'));
            users.appendChild(El('p', CLS + 'GroupNote', 'One per permission level. Click to be them: the page loads again as that user. They exist only in the sandbox.'));
            var userRow = El('div', CLS + 'SignInButtons');
            var who = State.Me ? State.Me.email : '';
            S.Sandbox.Accounts.forEach(function(acc) {
                var isCurrent = !ValeVision__TestServer__IsClientLink() && acc.Email === who;
                var button = El('button', CLS + 'SignInButton' + (isCurrent ? ' ' + CLS + 'SignInButton--current' : ''), acc.Level);
                button.type = 'button';
                button.title = isCurrent ? 'Signed in as ' + acc.Email : 'Sign in as ' + acc.Email;
                button.disabled = isCurrent || State.Busy;
                button.addEventListener('click', function() { ValeVision__TestServer__SwitchUser(acc.Email, S.Sandbox.Password); });
                userRow.appendChild(button);
            });
            var client = El('button', CLS + 'SignInButton' + (ValeVision__TestServer__IsClientLink() ? ' ' + CLS + 'SignInButton--current' : ''), 'Open as a client');
            client.type = 'button';
            client.title = 'Make a real client link to this project and open it in a new tab';
            client.disabled = State.Busy || ValeVision__TestServer__IsClientLink();
            client.addEventListener('click', ValeVision__TestServer__OpenAsClient);
            userRow.appendChild(client);
            var out = El('button', CLS + 'Small', 'Sign out');
            out.type = 'button';
            out.disabled = State.Busy || !State.Me;
            out.addEventListener('click', ValeVision__TestServer__SignOut);
            userRow.appendChild(out);
            users.appendChild(userRow);
            if (State.ActionNote) { users.appendChild(El('p', CLS + 'GroupNote', State.ActionNote)); }
            panel.appendChild(users);

            // The projects that open here
            var projects = El('div', CLS + 'Group');
            projects.appendChild(El('h3', CLS + 'GroupTitle', 'Projects in the sandbox'));
            projects.appendChild(El('p', CLS + 'GroupNote', 'Copies of their records: save anything, the real ones are not touched. Any other project answers not found here. --reset-sandbox starts them again.'));
            var projectRow = El('div', CLS + 'ProjectLinks');
            var current = new URLSearchParams(location.search).get('project');
            (S.Sandbox.Projects || []).forEach(function(id) {
                var link = El('a', CLS + 'ProjectLink' + (id === current ? ' ' + CLS + 'ProjectLink--current' : ''), id);
                link.href = location.pathname + '?project=' + encodeURIComponent(id);
                projectRow.appendChild(link);
            });
            projects.appendChild(projectRow);
            panel.appendChild(projects);
        }

        // Tests that are not part of the app
        var tests = El('div', CLS + 'Group');
        tests.appendChild(El('h3', CLS + 'GroupTitle', 'Tests'));
        tests.appendChild(El('p', CLS + 'GroupNote', 'Trials that are not part of the app. Each changes this page only, saves nothing, and is gone when the page is reloaded.'));
        var testRow = El('div', CLS + 'SignInButtons');
        var density = El('button', CLS + 'SignInButton', 'Linework density test');
        density.type = 'button';
        density.title = 'Draw ornament (a ridge cresting, its finials) with a lighter pen the further off it is. Try it on 60227__Thorpe.';
        density.addEventListener('click', function() { ValeVision__TestServer__OpenTest('LineworkDensity__Panel', 'Na__LineDensityPanel__Open'); });
        testRow.appendChild(density);
        tests.appendChild(testRow);
        panel.appendChild(tests);

        // Facts
        var facts = El('dl', CLS + 'Facts');
        function Fact(name, value) {
            facts.appendChild(El('dt', '', name));
            facts.appendChild(El('dd', '', value));
        }
        if (S && S.Server) {
            Fact('Data', mode === 'real'
                ? 'REAL MIRROR: your own account and the real projects. A save changes the PC mirror.'
                : 'Sandbox: fake users and copies of the records. Models and pictures are read from the mirror, which is never written.');
            Fact('Data folder', S.Server.DataRoot);
            Fact('App', 'v' + S.App.Version + ', service worker ' + S.App.ServiceWorker);
            if (S.Git) {
                Fact('Git', S.Git.Branch + ' @ ' + S.Git.Head + ', ' + S.Git.Uncommitted + ' uncommitted file' + (S.Git.Uncommitted === 1 ? '' : 's') + ' (app, its API, shared assets)');
            }
            Fact('Deploy check', S.Server.DeployCheck);
            Fact('Started', S.Server.Started + ' (testing server ' + S.Server.Version + ')');
        } else {
            Fact('Data', mode === 'real' ? 'REAL MIRROR' : 'Sandbox');
            Fact('Server', 'Waiting for the first status...');
        }
        panel.appendChild(facts);

        // The fake users' details, for typing them by hand (sandbox)
        if (S && S.Sandbox) {
            var accounts = El('div', CLS + 'Group');
            accounts.appendChild(El('h3', CLS + 'GroupTitle', 'Their details'));
            accounts.appendChild(El('p', CLS + 'GroupNote', 'All with the same password. They are the only accounts here: your own Vale account works with --real.'));
            var table = El('table', CLS + 'Accounts');
            var rows = [{ Email: S.Sandbox.Password, Level: 'Password' }].concat(S.Sandbox.Accounts);
            for (var r = 0; r < rows.length; r++) {
                var tr = El('tr', '');
                tr.appendChild(El('th', '', rows[r].Level));
                tr.appendChild(El('td', CLS + 'Mono', rows[r].Email));
                var cell = El('td', '');
                var copy = El('button', CLS + 'Small', 'Copy');
                copy.type = 'button';
                (function(text, button) {
                    button.addEventListener('click', function() { ValeVision__TestServer__Copy(text, button); });
                })(rows[r].Email, copy);
                cell.appendChild(copy);
                tr.appendChild(cell);
                table.appendChild(tr);
            }
            accounts.appendChild(table);
            panel.appendChild(accounts);
        }

        // Problem lists
        for (var g = 0; g < groups.length; g++) {
            var group = El('div', CLS + 'Group');
            group.appendChild(El('h3', CLS + 'GroupTitle', groups[g].Title + ' (' + groups[g].Items.length + ')'));
            group.appendChild(El('p', CLS + 'GroupNote', groups[g].Note));
            if (!groups[g].Items.length) {
                group.appendChild(El('p', CLS + 'Empty', 'None'));
            } else {
                var list = El('ul', CLS + 'List');
                for (var i = 0; i < groups[g].Items.length; i++) {
                    var item = groups[g].Items[i];
                    var li = El('li', CLS + 'Item');
                    li.appendChild(El('div', CLS + 'ItemPath ' + CLS + 'Mono', item.Path));
                    li.appendChild(El('div', CLS + 'ItemDetail', item.Detail));
                    li.appendChild(El('div', CLS + 'ItemMeta', (item.Count > 1 ? item.Count + ' times, last ' : '') + item.Last));
                    list.appendChild(li);
                }
                group.appendChild(list);
            }
            panel.appendChild(group);
        }

        // Actions
        var actions = El('div', CLS + 'Actions');
        var clear = El('button', CLS + 'Small', 'Clear the lists');
        clear.type = 'button';
        clear.addEventListener('click', ValeVision__TestServer__ClearLists);
        var move = El('button', CLS + 'Small', State.Side === 'left' ? 'Move to the right' : 'Move to the left');
        move.type = 'button';
        move.addEventListener('click', function() {
            State.Side = State.Side === 'left' ? 'right' : 'left';
            try { window.localStorage.setItem(SIDE_KEY, State.Side); } catch (e) { }
            ValeVision__TestServer__QueueRender();
        });
        actions.appendChild(clear);
        actions.appendChild(move);
        panel.appendChild(actions);

        panel.scrollTop = keepScroll;                                       // <-- A redraw while reading does not jump to the top
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Boot
// -----------------------------------------------------------------------------

    // BOOT | Build When the Body Exists, Then Poll
    // ------------------------------------------------------------
    function ValeVision__TestServer__Boot() {
        try { ValeVision__TestServer__Build(); }
        catch (e) { OriginalConsoleError.call(console, '[ValeVision__TestServer] Overlay failed to build:', e); }
        ValeVision__TestServer__Poll();
        ValeVision__TestServer__AskWhoIsSignedIn();
        if (POLL_MS > 0) { setInterval(ValeVision__TestServer__Poll, POLL_MS); }
        else { OriginalConsoleError.call(console, '[ValeVision__TestServer] data-poll-ms is missing: the server lists will not refresh'); }
        document.addEventListener('visibilitychange', function() { if (!document.hidden) { ValeVision__TestServer__Poll(); } });
    }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', ValeVision__TestServer__Boot); }
    else { ValeVision__TestServer__Boot(); }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeVision__TestServer__Poll       : ValeVision__TestServer__Poll,
        ValeVision__TestServer__ClearLists : ValeVision__TestServer__ClearLists,
        ValeVision__TestServer__State      : ValeVision__TestServer__State
    };
    // ------------------------------------------------------------

})();

// endregion ===================================================================

window.ValeVision__TestServer__Overlay  =  ValeVision__TestServer__Overlay;
