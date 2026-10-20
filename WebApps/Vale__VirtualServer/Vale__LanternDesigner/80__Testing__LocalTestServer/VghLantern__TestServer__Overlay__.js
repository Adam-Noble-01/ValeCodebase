/* =============================================================================
   VGHLANTERN - TESTING SERVER OVERLAY
   =============================================================================

   FILE       : VghLantern__TestServer__Overlay__.js
   NAMESPACE  : VghLantern
   MODULE     : TestServer - Overlay
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Mark a page served by the Lantern testing server beyond any
                doubt, and list the problems found while testing on it
   CREATED    : 20-Oct-2026

   DESCRIPTION:
   - NEVER PART OF THE APP. VghLantern__TestServer__LocalServer__.py injects this
     script and its stylesheet into index.html as it serves the page. Nothing in
     index.html refers to them and this folder (80__Testing__*) never syncs, so
     the live server cannot show them.
   - Injected first in <head>, before every app script, so the problems it
     collects start with the first line of the app: script errors, files that
     failed to load, rejected promises and console.error.
   - Draws a frame round the window that never takes a click (amber: sandbox
     data; red: the real mirror), a label in the empty centre of the app header,
     and a badge in a bottom corner: TESTING SERVER, the data mode and a count of
     problems. The badge opens the panel: the server, app and git details, the
     sandbox's test accounts, and every problem list.
   - Asks the server for its lists (files a push would not send, missing files,
     API errors) every few seconds while the tab is visible; says so plainly when
     the server stops answering.
   - SANDBOX SIGN-IN, AT THE CARD. While the shared sign-in card is on screen on
     sandbox data, a box beside the badge says that only the test accounts exist
     there and signs in as any of them in one click (it fills the card and
     presses its own Sign In). Adam, 20-Oct-2026, typing his real password into
     the sandbox: "I just validated and its 100% the correct password". It was:
     his account is just not in the sandbox, and nothing on the card said so.
   - Never throws into the app: every handler is guarded, and a problem in the
     overlay's own drawing is never recorded as one of the app's.

   ============================================================================= */


// =============================================================================
// REGION | Testing Server Overlay
// =============================================================================

var VghLantern__TestServer__Overlay = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | From the Script Tag the Server Injected
    // ------------------------------------------------------------
    var SCRIPT_TAG       =  document.currentScript;
    var MODE             =  VghLantern__TestServer__Attr('data-mode') === 'real' ? 'real' : 'sandbox';
    var STATUS_URL       =  VghLantern__TestServer__Attr('data-status-url');
    var CLEAR_URL        =  VghLantern__TestServer__Attr('data-clear-url');
    var POLL_MS          =  parseInt(VghLantern__TestServer__Attr('data-poll-ms'), 10);
    var KEEP             =  parseInt(VghLantern__TestServer__Attr('data-keep'), 10);
    var CLS              =  'VghLantern__TestServer__';                    // <-- Every id and class: the triple token
    var SIDE_KEY         =  'VghLantern__TestServer__Side';                 // <-- localStorage: a per-browser UI preference only
    var MAX_TEXT         =  600;
    // ------------------------------------------------------------

    // MODULE VARIABLES | Overlay State
    // ------------------------------------------------------------
    var VghLantern__TestServer__State  =  {
        Browser          : [],                                              // <-- { Kind, Text, Count, Last }, newest first
        Server           : null,                                            // <-- The last /_testserver/api/status answer
        ServerDown       : false,
        Open             : false,
        Side             : VghLantern__TestServer__LoadSide(),
        Dom              : null,
        Drawing          : false,                                           // <-- True while the overlay draws itself
        RenderQueued     : false,
        PanelSignature   : '',                                              // <-- What the open panel last drew
        SignInVisible    : false                                            // <-- The shared sign-in card is on screen
    };
    var OriginalConsoleError  =  console.error;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read an Attribute of the Injected Script Tag
    // ------------------------------------------------------------
    function VghLantern__TestServer__Attr(name) {
        return SCRIPT_TAG ? (SCRIPT_TAG.getAttribute(name) || '') : '';
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | The Remembered Corner (left unless this browser chose right)
    // ------------------------------------------------------------
    function VghLantern__TestServer__LoadSide() {
        try { return window.localStorage.getItem(SIDE_KEY) === 'right' ? 'right' : 'left'; }
        catch (e) { return 'left'; }                                        // <-- Storage blocked: the default corner
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Make an Element (text always as text, never as HTML)
    // ------------------------------------------------------------
    function VghLantern__TestServer__El(tag, className, text) {
        var el = document.createElement(tag);
        if (className) { el.className = className; }
        if (text !== undefined && text !== null) { el.textContent = String(text); }
        return el;
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | A Value as Readable Text (errors with their first stack line)
    // ------------------------------------------------------------
    function VghLantern__TestServer__Describe(value) {
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
    function VghLantern__TestServer__ShortUrl(url) {
        var text = String(url || '');
        return text.indexOf(location.origin) === 0 ? text.slice(location.origin.length) : text;
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Copy Text to the Clipboard (localhost is a secure context)
    // ------------------------------------------------------------
    function VghLantern__TestServer__Copy(text, button) {
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
    function VghLantern__TestServer__AddBrowser(kind, text) {
        var State = VghLantern__TestServer__State;
        if (State.Drawing) { return; }                                      // <-- The overlay's own failure is not the app's
        text = String(text).slice(0, MAX_TEXT);
        var now = new Date().toTimeString().slice(0, 8);
        for (var i = 0; i < State.Browser.length; i++) {
            if (State.Browser[i].Kind === kind && State.Browser[i].Text === text) {
                var hit = State.Browser.splice(i, 1)[0];
                hit.Count += 1;
                hit.Last = now;
                State.Browser.unshift(hit);
                VghLantern__TestServer__QueueRender();
                return;
            }
        }
        State.Browser.unshift({ Kind: kind, Text: text, Count: 1, Last: now });
        if (KEEP > 0 && State.Browser.length > KEEP) { State.Browser.length = KEEP; }
        VghLantern__TestServer__QueueRender();
    }
    // ------------------------------------------------------------

    // BOOT | Listen From the First Line of the App
    // ------------------------------------------------------------
    window.addEventListener('error', function(event) {
        try {
            var target = event.target;
            if (target && target !== window && target.tagName) {            // <-- A script, stylesheet or image that failed to load
                var url = target.src || target.href || target.currentSrc || '';
                VghLantern__TestServer__AddBrowser('Failed to load', target.tagName.toLowerCase() + ' ' + VghLantern__TestServer__ShortUrl(url));
                return;
            }
            var where = event.filename
                ? '  (' + VghLantern__TestServer__ShortUrl(event.filename) + ':' + event.lineno + ':' + event.colno + ')' : '';
            var message = event.error ? VghLantern__TestServer__Describe(event.error) : (event.message || 'Error');
            VghLantern__TestServer__AddBrowser('Script error', message + where);
        } catch (e) { }
    }, true);                                                               // <-- Capture phase: load errors do not bubble

    window.addEventListener('unhandledrejection', function(event) {
        try { VghLantern__TestServer__AddBrowser('Unhandled promise rejection', VghLantern__TestServer__Describe(event.reason)); }
        catch (e) { }
    });

    console.error = function() {
        try {
            var parts = [];
            for (var i = 0; i < arguments.length; i++) { parts.push(VghLantern__TestServer__Describe(arguments[i])); }
            VghLantern__TestServer__AddBrowser('console.error', parts.join(' '));
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
    function VghLantern__TestServer__Poll() {
        var State = VghLantern__TestServer__State;
        if (!STATUS_URL || document.hidden) { return; }
        fetch(STATUS_URL, { cache: 'no-store' }).then(function(res) {
            if (!res.ok) { throw new Error('HTTP ' + res.status); }
            return res.json();
        }).then(function(data) {
            State.Server = data;
            State.ServerDown = false;
            VghLantern__TestServer__QueueRender();
        }, function() {
            State.ServerDown = true;                                        // <-- Stopped, or restarting after a .py change
            VghLantern__TestServer__QueueRender();
        });
    }
    // ------------------------------------------------------------

    // FUNCTION | Clear Every List (the browser's here, the server's there)
    // ------------------------------------------------------------
    function VghLantern__TestServer__ClearLists() {
        VghLantern__TestServer__State.Browser = [];
        VghLantern__TestServer__QueueRender();
        if (!CLEAR_URL) { return; }
        fetch(CLEAR_URL, { method: 'POST', cache: 'no-store' }).then(VghLantern__TestServer__Poll, function() { });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Sandbox Sign-In (the shared card: Shared__UserLogin/ValeShared__UserLogin__.js)
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Is the Shared Sign-In Card on Screen (not the change-password card: it has no email field)
    // ------------------------------------------------------------
    function VghLantern__TestServer__SignInCardShown() {
        var email = document.getElementById('ValeUserLogin__Email');
        return !!(email && email.getClientRects().length);                  // <-- Not offsetParent: the card sits in a fixed overlay
    }
    // ------------------------------------------------------------

    // FUNCTION | Sign In as a Test Account Through the Card Itself (its own Sign In, so the real flow is what runs)
    // ------------------------------------------------------------
    function VghLantern__TestServer__SignInAs(email, password) {
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

    // SUB FUNCTION | The Box Beside the Badge While the Card Shows on Sandbox Data
    // ------------------------------------------------------------
    function VghLantern__TestServer__RenderSignInHelp(box, S, mode) {
        var El = VghLantern__TestServer__El;
        var show = mode === 'sandbox' && VghLantern__TestServer__State.SignInVisible && !!(S && S.Sandbox);
        box.hidden = !show;
        if (!show) { box.textContent = ''; box.removeAttribute('data-drawn'); return; }
        if (box.getAttribute('data-drawn') === S.Sandbox.Password) { return; } // <-- Drawn already: keep it still under the pointer
        box.textContent = '';
        box.setAttribute('data-drawn', S.Sandbox.Password);
        box.appendChild(El('h2', CLS + 'SignInTitle', 'Sandbox: test accounts only'));
        box.appendChild(El('p', CLS + 'SignInText', 'Your own Vale account is not in the sandbox, so its password is refused here, however correct. Sign in as:'));
        var row = El('div', CLS + 'SignInButtons');
        for (var i = 0; i < S.Sandbox.Accounts.length; i++) {
            var acc = S.Sandbox.Accounts[i];
            var btn = El('button', CLS + 'SignInButton', acc.Level);
            btn.type = 'button';
            btn.title = 'Sign in as ' + acc.Email;
            (function(email, button) {
                button.addEventListener('click', function() { VghLantern__TestServer__SignInAs(email, S.Sandbox.Password); });
            })(acc.Email, btn);
            row.appendChild(btn);
        }
        box.appendChild(row);
        box.appendChild(El('p', CLS + 'SignInFoot', 'Password ' + S.Sandbox.Password + ' for all four. Your own account and the real designs: start the server with --real.'));
    }
    // ------------------------------------------------------------

    // BOOT | Watch for the Card (it appears after the app's config and the me call; cheap: one lookup)
    // ------------------------------------------------------------
    setInterval(function() {
        var shown = VghLantern__TestServer__SignInCardShown();
        if (shown !== VghLantern__TestServer__State.SignInVisible) {
            VghLantern__TestServer__State.SignInVisible = shown;
            VghLantern__TestServer__QueueRender();
        }
    }, 500);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Drawing the Overlay
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Server's Lists, in the Order the Panel Shows Them
    // ------------------------------------------------------------
    function VghLantern__TestServer__Groups() {
        var S = VghLantern__TestServer__State.Server || {};
        var browser = VghLantern__TestServer__State.Browser.map(function(b) {
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

    // FUNCTION | Build the Overlay Once (frame, header label, dock with badge and panel)
    // ------------------------------------------------------------
    function VghLantern__TestServer__Build() {
        var State  =  VghLantern__TestServer__State;
        var root   =  VghLantern__TestServer__El('div', CLS + 'Root');
        root.id    =  CLS + 'Root';

        var frame  =  VghLantern__TestServer__El('div', CLS + 'Frame');
        frame.setAttribute('aria-hidden', 'true');
        var label  =  VghLantern__TestServer__El('div', CLS + 'HeaderLabel');
        label.setAttribute('aria-hidden', 'true');

        var dock   =  VghLantern__TestServer__El('div', CLS + 'Dock');
        var panel  =  VghLantern__TestServer__El('section', CLS + 'Panel');
        panel.id   =  CLS + 'Panel';
        panel.setAttribute('aria-label', 'Testing server');
        panel.hidden = true;

        var badge  =  VghLantern__TestServer__El('button', CLS + 'Badge');
        badge.type =  'button';
        badge.setAttribute('aria-controls', panel.id);
        badge.setAttribute('aria-expanded', 'false');
        badge.appendChild(VghLantern__TestServer__El('span', CLS + 'BadgeTitle', 'Testing Server'));
        var mode   =  VghLantern__TestServer__El('span', CLS + 'BadgeMode');
        var count  =  VghLantern__TestServer__El('span', CLS + 'BadgeCount');
        badge.appendChild(mode);
        badge.appendChild(count);
        badge.addEventListener('click', function() {
            State.Open = !State.Open;
            VghLantern__TestServer__QueueRender();
        });

        var help   =  VghLantern__TestServer__El('section', CLS + 'SignInHelp');
        help.setAttribute('aria-label', 'Sandbox test accounts');
        help.hidden = true;

        dock.appendChild(panel);
        dock.appendChild(help);
        dock.appendChild(badge);
        root.appendChild(frame);
        root.appendChild(label);
        root.appendChild(dock);
        document.body.appendChild(root);

        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && State.Open) { State.Open = false; VghLantern__TestServer__QueueRender(); }
        });

        State.Dom = { Root: root, Label: label, Panel: panel, Help: help, Badge: badge, Mode: mode, Count: count };
        VghLantern__TestServer__Render();
    }
    // ------------------------------------------------------------

    // FUNCTION | Draw on the Next Frame (many errors at boot are one redraw)
    // ------------------------------------------------------------
    function VghLantern__TestServer__QueueRender() {
        var State = VghLantern__TestServer__State;
        if (State.RenderQueued || !State.Dom) { return; }
        State.RenderQueued = true;
        setTimeout(function() {
            State.RenderQueued = false;
            VghLantern__TestServer__Render();
        }, 50);
    }
    // ------------------------------------------------------------

    // FUNCTION | Draw Everything From the State
    // ------------------------------------------------------------
    function VghLantern__TestServer__Render() {
        var State = VghLantern__TestServer__State;
        if (!State.Dom) { return; }
        State.Drawing = true;
        try {
            var S       =  State.Server;
            var mode    =  S && S.Server ? S.Server.Mode : MODE;
            var groups  =  VghLantern__TestServer__Groups();
            var total   =  0;
            for (var g = 0; g < groups.length; g++) { total += groups[g].Items.length; }

            State.Dom.Root.className = CLS + 'Root ' + CLS + 'Root--' + mode + ' ' + CLS + 'Root--' + State.Side
                + (State.ServerDown ? ' ' + CLS + 'Root--down' : '');
            State.Dom.Label.textContent = 'Testing Server  |  ' + (mode === 'real' ? 'Real data' : 'Sandbox data');
            State.Dom.Mode.textContent  = State.ServerDown ? 'Server not answering' : (mode === 'real' ? 'Real data' : 'Sandbox data');
            State.Dom.Count.textContent = String(total);
            State.Dom.Count.className   = CLS + 'BadgeCount ' + CLS + 'BadgeCount--' + (total ? 'issues' : 'clear');
            State.Dom.Badge.title       = total ? total + ' problem' + (total === 1 ? '' : 's') + ' found: click to see them' : 'No problems found so far';
            State.Dom.Badge.setAttribute('aria-expanded', State.Open ? 'true' : 'false');
            State.Dom.Panel.hidden      = !State.Open;
            VghLantern__TestServer__RenderSignInHelp(State.Dom.Help, S, mode);
            var signature = State.Open ? JSON.stringify([S, State.Browser, State.ServerDown, State.Side]) : '';
            if (State.Open && signature !== State.PanelSignature) {         // <-- Unchanged data: no redraw, so a selection survives the poll
                VghLantern__TestServer__RenderPanel(State.Dom.Panel, S, mode, groups);
            }
            State.PanelSignature = signature;
        } finally {
            State.Drawing = false;
        }
    }
    // ------------------------------------------------------------

    // SUB FUNCTION | The Panel's Contents
    // ------------------------------------------------------------
    function VghLantern__TestServer__RenderPanel(panel, S, mode, groups) {
        var State = VghLantern__TestServer__State;
        var El    = VghLantern__TestServer__El;
        var keepScroll = panel.scrollTop;
        panel.textContent = '';

        var head = El('div', CLS + 'PanelHead');
        head.appendChild(El('h2', CLS + 'PanelTitle', 'Lantern Designer testing server'));
        var close = El('button', CLS + 'PanelClose', 'Close');
        close.type = 'button';
        close.addEventListener('click', function() { State.Open = false; VghLantern__TestServer__QueueRender(); });
        head.appendChild(close);
        panel.appendChild(head);

        if (State.ServerDown) {
            panel.appendChild(El('p', CLS + 'Warning', 'The testing server is not answering: it has stopped, or it is restarting after a .py file changed. Reload the page once it is back.'));
        }

        // Facts
        var facts = El('dl', CLS + 'Facts');
        function Fact(name, value) {
            facts.appendChild(El('dt', '', name));
            facts.appendChild(El('dd', '', value));
        }
        if (S && S.Server) {
            Fact('Data', mode === 'real'
                ? 'REAL MIRROR: your own account and the real designs. A save or New design changes the PC mirror.'
                : 'Sandbox: test accounts and the demo jobs. The real mirror is never written.');
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

        // Test accounts (sandbox)
        if (S && S.Sandbox) {
            var accounts = El('div', CLS + 'Group');
            accounts.appendChild(El('h3', CLS + 'GroupTitle', 'Test accounts'));
            accounts.appendChild(El('p', CLS + 'GroupNote', 'One per permission level, all with the same password. They exist only in the sandbox, and they are the only accounts here: your own Vale account works with --real.'));
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
                    button.addEventListener('click', function() { VghLantern__TestServer__Copy(text, button); });
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
        clear.addEventListener('click', VghLantern__TestServer__ClearLists);
        var move = El('button', CLS + 'Small', State.Side === 'left' ? 'Move to the right' : 'Move to the left');
        move.type = 'button';
        move.addEventListener('click', function() {
            State.Side = State.Side === 'left' ? 'right' : 'left';
            try { window.localStorage.setItem(SIDE_KEY, State.Side); } catch (e) { }
            VghLantern__TestServer__QueueRender();
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
    function VghLantern__TestServer__Boot() {
        try { VghLantern__TestServer__Build(); }
        catch (e) { OriginalConsoleError.call(console, '[VghLantern__TestServer] Overlay failed to build:', e); }
        VghLantern__TestServer__Poll();
        if (POLL_MS > 0) { setInterval(VghLantern__TestServer__Poll, POLL_MS); }
        else { OriginalConsoleError.call(console, '[VghLantern__TestServer] data-poll-ms is missing: the server lists will not refresh'); }
        document.addEventListener('visibilitychange', function() { if (!document.hidden) { VghLantern__TestServer__Poll(); } });
    }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', VghLantern__TestServer__Boot); }
    else { VghLantern__TestServer__Boot(); }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__TestServer__Poll       : VghLantern__TestServer__Poll,
        VghLantern__TestServer__ClearLists : VghLantern__TestServer__ClearLists,
        VghLantern__TestServer__State      : VghLantern__TestServer__State
    };
    // ------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__TestServer__Overlay  =  VghLantern__TestServer__Overlay;
