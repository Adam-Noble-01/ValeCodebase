/* =============================================================================
   VALE VIRTUAL SERVER MANAGER - UI | TAB 03 URL CONFIGURATOR
   =============================================================================

   FILE       : VirtualServerManager__Ui__Urls__.js
   NAMESPACE  : Vsm.Urls
   MODULE     : Ui - URL Configurator
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Map short, user-friendly public URLs to the apps in the mirror, and
                tiny short links (for small QR codes) to full app URLs with queries
   CREATED    : 06-Oct-2026

   DESCRIPTION:
   - App route   : app.valegardenhouses.com/<path>/  serves  <App folder>/<entry>.
                   Queries pass straight through (?project=64135).
   - Short link  : app.valegardenhouses.com/p/{project}  redirects to e.g.
                   /valevision/?project={project}. Shorter URL = smaller QR code.
   - Typing updates each card's example URL live; cards are only rebuilt on load,
     save, revert, add and remove, so a field is never replaced while you use it.
   - Save (button or Enter) writes the routes on this PC and always ends with a
     result or a readable error. "Test on server" checks the generated nginx config
     against a copy of the live one (no change). "Apply" installs it, reloads nginx,
     verifies, and restores the previous config on any failure.

   =============================================================================

   DEVELOPMENT LOG:
   06-Oct-2026 - Version 0.4.5
   - Open (globe icon) sits beside Remove (trash icon) at the right of each card's
     top line. Remove asks for confirmation in a dialog first.

   06-Oct-2026 - Version 0.4.4
   - App routes are listed in API port order (8001 first), short links after them.
     Changing a port moves its card when you leave the field; the saved order of
     the routes file is unchanged (display only).

   06-Oct-2026 - Version 0.3.1
   - Live example URLs while typing; no card rebuild on change/blur; Save shows
     "Saving..." and always resolves; Enter saves.

   06-Oct-2026 - Version 0.3.0
   - Initial build.

   ============================================================================= */

(function() {

    var Vsm = window.Vsm;
    var Urls = Vsm.Urls = {};

// -----------------------------------------------------------------------------
// REGION | State and Helpers
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Routes Being Edited
    // ------------------------------------------------------------
    var Vsm__Data     = null;                                                  // <-- Last /api/routes payload
    var Vsm__Draft    = null;                                                  // <-- Routes as edited (unsaved)
    var Vsm__Dirty    = false;
    var Vsm__Saving   = false;
    var Vsm__ShowConf = false;
    // ------------------------------------------------------------


    // HELPER FUNCTION | Host, Paths, Example Values
    // ------------------------------------------------------------
    function Vsm__Host() { return (Vsm__Draft && Vsm__Draft.PublicHost) || 'app.valegardenhouses.com'; }

    function Vsm__CleanPath(p) { return String(p || '').trim().replace(/^\/+|\/+$/g, ''); }

    function Vsm__FullUrl(path, trailing) { return 'https://' + Vsm__Host() + '/' + Vsm__CleanPath(path) + (trailing ? '/' : ''); }

    function Vsm__Fill(template, example) {                                   // <-- {var} -> example value
        return String(template || '').replace(/\{[a-z][a-z0-9_]*\}/g, example || '64135');
    }

    function Vsm__AppExample(r) {
        return Vsm__FullUrl(r.Path, true) + (r.ExampleQuery ? '?' + String(r.ExampleQuery).replace(/^\?/, '') : '');
    }

    function Vsm__LinkExample(r) {
        return 'https://' + Vsm__Host() + '/' + Vsm__Fill(Vsm__CleanPath(r.Path), r.Example);
    }

    function Vsm__Order() {                                                     // <-- Display order: apps by API port, then links
        var routes = Vsm__Draft.Routes || [];
        var port = function(r) { var n = Number(r.ApiPort); return r.Type === 'link' ? Infinity : (n > 0 ? n : 1e9); };
        return routes.map(function(r, i) { return i; }).sort(function(a, b) {
            return port(routes[a]) - port(routes[b]) || a - b;
        });
    }

    function Vsm__EntryOk(r) {
        var app = (Vsm__Data.apps || []).find(function(a) { return a.folder === r.Target; });
        return !!(app && app.entries.indexOf(r.Entry || 'index.html') >= 0);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Rendering
// -----------------------------------------------------------------------------

    // SUB HELPER FUNCTION | Card Actions: Open (globe) and Remove (trash), Top Right
    // ------------------------------------------------------------
    function Vsm__CardActions(url) {
        return '<a class="Vsm__BtnSmall Vsm__LinkBtn Vsm__IconBtn" data-d="open" href="' + Vsm.Esc(url) + '" target="_blank" rel="noopener" ' +
                   'title="Open ' + Vsm.Esc(url) + '"><span class="Vsm__Ico is-open"></span>Open</a>' +
               '<button class="Vsm__BtnSmall Vsm__IconBtn is-danger" data-act="remove" title="Remove this route">' +
                   '<span class="Vsm__Ico is-delete"></span>Remove</button>';
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | One App Route Card
    // ------------------------------------------------------------
    function Vsm__AppCard(r, i) {
        var entryOk = Vsm__EntryOk(r);
        var example = Vsm__AppExample(r);
        var options = (Vsm__Data.apps || []).map(function(a) {
            return '<option value="' + Vsm.Esc(a.folder) + '"' + (a.folder === r.Target ? ' selected' : '') + '>' + Vsm.Esc(a.folder) + '</option>';
        }).join('');
        return '<article class="Vsm__RouteCard' + (r.Enabled === false ? ' is-disabled' : '') + '" data-route="' + i + '">' +
            '<div class="Vsm__RouteHead">' +
                '<label class="Vsm__Check"><input type="checkbox" data-f="Enabled"' + (r.Enabled !== false ? ' checked' : '') + '> on</label>' +
                '<span class="Vsm__Badge lane-code">App</span>' +
                '<span class="Vsm__UrlEdit"><span class="Vsm__Muted">https://' + Vsm.Esc(Vsm__Host()) + '/</span>' +
                '<input class="Vsm__UrlInput" data-f="Path" value="' + Vsm.Esc(Vsm__CleanPath(r.Path)) + '" placeholder="short-path">' +
                '<span class="Vsm__Muted">/</span></span>' +
                '<span class="Vsm__Arrow">→</span>' +
                '<select class="Vsm__Select" data-f="Target">' + options + '</select>' +
                '<span class="Vsm__Muted">/</span>' +
                '<input class="Vsm__UrlInput is-entry" data-f="Entry" value="' + Vsm.Esc(r.Entry || 'index.html') + '" title="Entry page">' +
                '<span data-d="entry" class="' + (entryOk ? 'Vsm__C-ok' : 'Vsm__C-conflict') + '" title="' +
                    (entryOk ? 'found on this PC' : 'not on this PC yet') + '">' + (entryOk ? '✓' : '!') + '</span>' +
                '<span class="Vsm__Spacer"></span>' + Vsm__CardActions(example) +
            '</div>' +
            '<div class="Vsm__RouteBody">' +
                '<span class="Vsm__Muted">Example query</span> <input class="Vsm__UrlInput" data-f="ExampleQuery" value="' + Vsm.Esc(r.ExampleQuery || '') + '" placeholder="project=64135">' +
                '<code class="Vsm__UrlExample" data-d="example">' + Vsm.Esc(example) + '</code>' +
                '<span class="Vsm__Muted" data-d="chars">' + example.length + ' chars</span>' +
            '</div>' +
            '<div class="Vsm__RouteBody">' +
                '<label class="Vsm__Check"><input type="checkbox" data-f="Api"' + (r.Api ? ' checked' : '') + '> API proxy</label>' +
                '<code class="Vsm__Muted" data-d="api">/' + Vsm.Esc(Vsm__CleanPath(r.Path)) + '/api/ → 127.0.0.1:</code>' +
                '<input class="Vsm__UrlInput is-port" data-f="ApiPort" value="' + Vsm.Esc(r.ApiPort || '') + '">' +
                '<input class="Vsm__UrlInput is-note" data-f="Note" value="' + Vsm.Esc(r.Note || '') + '" placeholder="Note">' +
            '</div></article>';
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | One Short Link Card
    // ------------------------------------------------------------
    function Vsm__LinkCard(r, i) {
        var shortUrl = Vsm__LinkExample(r);
        return '<article class="Vsm__RouteCard is-link' + (r.Enabled === false ? ' is-disabled' : '') + '" data-route="' + i + '">' +
            '<div class="Vsm__RouteHead">' +
                '<label class="Vsm__Check"><input type="checkbox" data-f="Enabled"' + (r.Enabled !== false ? ' checked' : '') + '> on</label>' +
                '<span class="Vsm__Badge lane-content">Short link</span>' +
                '<span class="Vsm__UrlEdit"><span class="Vsm__Muted">https://' + Vsm.Esc(Vsm__Host()) + '/</span>' +
                '<input class="Vsm__UrlInput" data-f="Path" value="' + Vsm.Esc(Vsm__CleanPath(r.Path)) + '" placeholder="p/{project}"></span>' +
                '<span class="Vsm__Arrow">→</span>' +
                '<input class="Vsm__UrlInput is-target" data-f="Target" value="' + Vsm.Esc(r.Target || '') + '" placeholder="/valevision/?project={project}">' +
                '<select class="Vsm__Select" data-f="Code" title="Redirect type">' +
                    [302, 301, 307, 308].map(function(c) {
                        return '<option value="' + c + '"' + (Number(r.Code || 302) === c ? ' selected' : '') + '>' + c +
                               (c === 302 ? ' (retargetable)' : c === 301 ? ' (permanent)' : '') + '</option>';
                    }).join('') + '</select>' +
                '<span class="Vsm__Spacer"></span>' + Vsm__CardActions(shortUrl) +
            '</div>' +
            '<div class="Vsm__RouteBody">' +
                '<span class="Vsm__Muted">Example value</span> <input class="Vsm__UrlInput is-port" data-f="Example" value="' + Vsm.Esc(r.Example || '') + '" placeholder="64135">' +
                '<code class="Vsm__UrlExample" data-d="example">' + Vsm.Esc(shortUrl) + '</code>' +
                '<span class="Vsm__Muted" data-d="chars">' + shortUrl.length + ' chars → ' + Vsm.Esc(Vsm__Fill(r.Target, r.Example)) + '</span>' +
                '<input class="Vsm__UrlInput is-note" data-f="Note" value="' + Vsm.Esc(r.Note || '') + '" placeholder="Note">' +
            '</div></article>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Refresh One Card's Derived Text While Typing (inputs are never rebuilt)
    // ------------------------------------------------------------
    function Vsm__UpdateDerived(card, r) {
        var q = function(k) { return card.querySelector('[data-d="' + k + '"]'); };
        if (r.Type === 'link') {
            var from = Vsm__LinkExample(r);
            q('example').textContent = from;
            q('chars').textContent = from.length + ' chars → ' + Vsm__Fill(r.Target, r.Example);
            q('open').href = from;
            q('open').title = 'Open ' + from;
            return;
        }
        var example = Vsm__AppExample(r), ok = Vsm__EntryOk(r);
        q('example').textContent = example;
        q('chars').textContent = example.length + ' chars';
        q('open').href = example;
        q('open').title = 'Open ' + example;
        q('api').textContent = '/' + Vsm__CleanPath(r.Path) + '/api/ → 127.0.0.1:';
        q('entry').className = ok ? 'Vsm__C-ok' : 'Vsm__C-conflict';
        q('entry').textContent = ok ? '✓' : '!';
        q('entry').title = ok ? 'found on this PC' : 'not on this PC yet';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Toolbar: Status Pill and Buttons
    // ------------------------------------------------------------
    function Vsm__RenderBar() {
        if (!Vsm__Data) return;
        var applied = Vsm__Data.applied || {};
        var live = applied.Hash && applied.Hash === Vsm__Data.hash && !Vsm__Dirty;
        var pill = Vsm.El('Vsm__UrlPill');
        pill.className = 'Vsm__Pill is-light ' + (Vsm__Dirty ? 'is-warn' : live ? 'is-good' : 'is-warn');
        pill.textContent = Vsm__Saving ? 'Saving…'
            : Vsm__Dirty ? 'Unsaved changes: press Save (or Enter)'
            : live ? 'Live on nginx · applied ' + (applied.Utc || '').replace('T', ' ').slice(0, 16) + ' UTC'
            : (applied.Hash ? 'Saved on this PC, not live yet: Test, then Apply' : 'Never applied');
        var blocked = Vsm__Dirty || Vsm__Saving || !!(Vsm__Data.errors || []).length;
        Vsm.El('Vsm__BtnUrlSave').disabled = !Vsm__Dirty || Vsm__Saving;
        Vsm.El('Vsm__BtnUrlSave').textContent = Vsm__Saving ? 'Saving…' : 'Save';
        Vsm.El('Vsm__BtnUrlRevert').disabled = !Vsm__Dirty || Vsm__Saving;
        Vsm.El('Vsm__BtnUrlTest').disabled = blocked;
        Vsm.El('Vsm__BtnUrlApply').disabled = blocked;
    }

    function Vsm__RenderErrors() {
        Vsm.El('Vsm__UrlErrors').innerHTML = (Vsm__Data.errors || []).map(function(e) { return '<div>⚠ ' + Vsm.Esc(e) + '</div>'; }).join('');
    }
    // ------------------------------------------------------------


    // FUNCTION | Render Tab 03 (cards rebuilt only on load, save, revert, add, remove)
    // ------------------------------------------------------------
    Urls.Render = function() {
        if (!Vsm__Data || !Vsm__Draft) return;
        Vsm__RenderBar();
        Vsm__RenderErrors();
        Vsm.El('Vsm__UrlList').innerHTML = Vsm__Order().map(function(i) {
            var r = Vsm__Draft.Routes[i];
            return r.Type === 'link' ? Vsm__LinkCard(r, i) : Vsm__AppCard(r, i);
        }).join('') || '<div class="Vsm__TreeEmpty">No routes yet.</div>';
        Vsm.El('Vsm__UrlConf').textContent = Vsm__Data.conf || '(fix the problems above to see the generated configuration)';
        Vsm.El('Vsm__UrlConf').hidden = !Vsm__ShowConf;
        Vsm.El('Vsm__BtnUrlConf').textContent = Vsm__ShowConf ? 'Hide generated nginx' : 'Show generated nginx';
        Vsm.El('Vsm__UrlRoot').textContent = Vsm__Data.root;
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Load, Edit, Save, Test, Apply
// -----------------------------------------------------------------------------

    // FUNCTION | Load Routes From the Local Server
    // ------------------------------------------------------------
    Urls.Load = function() {
        return fetch('/api/routes', { cache: 'no-store' }).then(function(r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        }).then(function(d) {
            Vsm__Data = d;
            if (!Vsm__Dirty) Vsm__Draft = JSON.parse(JSON.stringify(d.routes));
            Urls.Render();
        }).catch(function(err) {
            Vsm.Toast('Could not load the routes (' + err.message + '). Restart the manager server if this persists.', true);
        });
    };
    // ------------------------------------------------------------


    // FUNCTION | Save (validated on the local server; always ends with a result)
    // ------------------------------------------------------------
    Urls.Save = function() {
        if (Vsm__Saving || !Vsm__Dirty) return Promise.resolve(false);
        Vsm__Saving = true;
        Vsm__RenderBar();
        return Vsm.Post('/api/routes', { routes: Vsm__Draft }).then(function(res) {
            Vsm__Saving = false;
            if (!res || !res.ok) {
                Vsm__Data.errors = (res && res.errors) || [(res && res.error) || 'unknown error'];
                Vsm__RenderErrors();
                Vsm__RenderBar();
                Vsm.Toast('Not saved: ' + ((res && res.error) || 'check the routes'), true);
                return false;
            }
            Vsm__Dirty = false;
            Vsm__Data = res;
            Vsm__Draft = JSON.parse(JSON.stringify(res.routes));
            Urls.Render();
            Vsm.Toast('Routes saved on this PC. Test, then Apply to put them live.');
            return true;
        });
    };
    // ------------------------------------------------------------


    // FUNCTION | Test on the Server (dry run against a copy of the live nginx)
    // ------------------------------------------------------------
    Urls.Test = function() {
        Vsm.Operate('nginx-test', {}, function(r) {
            return 'nginx accepts the new routes' + (r.will_wire ? ' (first apply will also wire the site file)' : '') + '. Nothing was changed.';
        }).then(function(res) {
            if (res && !res.ok && res.test_output) Vsm.ShowInfo('nginx test output', '<pre class="Vsm__SessionLog">' + Vsm.Esc(res.test_output) + '</pre>');
            Urls.Load();
        });
    };
    // ------------------------------------------------------------


    // FUNCTION | Apply to nginx (backup, install, test, reload, verify, auto-restore)
    // ------------------------------------------------------------
    Urls.ConfirmApply = function() {
        var enabled = (Vsm__Draft.Routes || []).filter(function(r) { return r.Enabled !== false; });
        Vsm.OpenModal('<h2>Apply the URL routes to nginx?</h2>' +
            '<p>One connection (sudo). The server checks the new configuration against a copy of the live one, backs up the current files, ' +
            'installs <code>/etc/nginx/snippets/vale-site.conf</code>, reloads nginx and checks that <code>/</code> answers 200 and that ' +
            '<code>/Server__Api/</code> and <code>/Server__DeveloperTools/</code> answer 404. On any failure it restores the previous configuration.</p>' +
            '<table class="Vsm__Table"><tr><th>Public URL</th><th>Goes to</th></tr>' + enabled.map(function(r) {
                return '<tr><td><code>' + Vsm.Esc(Vsm__FullUrl(r.Path, r.Type === 'app')) + '</code></td><td><code>' +
                       Vsm.Esc(r.Type === 'app' ? Vsm__Data.root + '/' + r.Target + '/' + (r.Entry || 'index.html') : r.Target + ' (' + (r.Code || 302) + ')') +
                       '</code></td></tr>';
            }).join('') + '</table>' +
            '<p class="Vsm__Muted">Old routes that are no longer listed stop working at once (no redirect is added).</p>',
            [{ label: 'Cancel' }, { label: 'Apply to nginx', cls: 'Vsm__BtnPrimary', run: function() {
                Vsm.Operate('nginx-apply', {}, function(r) {
                    return 'nginx updated' + (r.rewired ? ' (site file wired)' : '') + ': ' + Object.keys(r.codes || {}).map(function(k) { return k + ' ' + r.codes[k]; }).join(', ');
                }).then(function(res) {
                    if (res && !res.ok) Vsm.ShowInfo('nginx apply did not complete', '<p>' + Vsm.Esc(res.error) + '</p>' +
                        (res.codes ? '<pre class="Vsm__SessionLog">' + Vsm.Esc(JSON.stringify(res.codes, null, 1)) + '</pre>' : '') +
                        (res.test_output ? '<pre class="Vsm__SessionLog">' + Vsm.Esc(res.test_output) + '</pre>' : ''));
                    Urls.Load();
                });
            } }]);
    };
    // ------------------------------------------------------------


    // FUNCTION | Edits in the Route Cards (update the draft and the card's derived text only)
    // ------------------------------------------------------------
    function Vsm__OnInput(e) {
        var card = e.target.closest && e.target.closest('[data-route]');
        var f = e.target.dataset && e.target.dataset.f;
        if (!card || !f || !Vsm.El('Vsm__TabUrls').contains(card) || !Vsm__Draft) return;
        var r = Vsm__Draft.Routes[Number(card.dataset.route)];
        if (!r) return;
        if (e.target.type === 'checkbox') r[f] = e.target.checked;
        else if (f === 'ApiPort' || f === 'Code') r[f] = Number(e.target.value) || e.target.value;
        else if (f === 'Path') r[f] = e.target.value.toLowerCase().replace(/\s+/g, '-');
        else r[f] = e.target.value;
        if (f === 'Enabled') card.classList.toggle('is-disabled', !r.Enabled);
        Vsm__Dirty = true;
        Vsm__UpdateDerived(card, r);
        Vsm__RenderBar();
        if (f === 'ApiPort' && e.type === 'change') {                          // <-- Port settled: move the card into port order
            var list = Vsm.El('Vsm__UrlList');
            Vsm__Order().forEach(function(i) {
                var c = list.querySelector('[data-route="' + i + '"]');
                if (c) list.appendChild(c);
            });
        }
    }

    function Vsm__ConfirmRemove(i) {
        var r = Vsm__Draft.Routes[i];
        if (!r) return;
        var from = r.Type === 'link' ? Vsm__LinkExample(r) : Vsm__FullUrl(r.Path, true);
        var to = r.Type === 'link' ? Vsm__Fill(r.Target, r.Example) + ' (' + (r.Code || 302) + ')' : r.Target + '/' + (r.Entry || 'index.html');
        Vsm.OpenModal('<h2>Remove this ' + (r.Type === 'link' ? 'short link' : 'app route') + '?</h2>' +
            '<table class="Vsm__Table"><tr><th>Public URL</th><th>Goes to</th></tr><tr><td><code>' + Vsm.Esc(from) +
            '</code></td><td><code>' + Vsm.Esc(to) + '</code></td></tr></table>' +
            '<p>It leaves this list at once. Nothing changes on this PC until you <b>Save</b>, and nothing changes on the ' +
            'server until you <b>Apply</b>; after that the URL stops working at once. <b>Revert</b> brings it back before you save.</p>',
            [{ label: 'Cancel' }, { label: 'Remove', cls: 'Vsm__BtnDanger', run: function() {
                Vsm__Draft.Routes.splice(i, 1);
                Vsm__Dirty = true;
                Urls.Render();
            } }]);
    }

    function Vsm__OnKey(e) {
        if (e.key !== 'Enter' || !e.target.closest || !e.target.closest('#Vsm__UrlList')) return;
        e.preventDefault();
        Urls.Save();
    }

    function Vsm__OnClick(e) {
        if (!Vsm.El('Vsm__TabUrls').contains(e.target)) return;
        var rm = e.target.closest('[data-act="remove"]');
        if (rm) Vsm__ConfirmRemove(Number(rm.closest('[data-route]').dataset.route));
    }
    // ------------------------------------------------------------


    // FUNCTION | Wire Up Tab 03
    // ------------------------------------------------------------
    Urls.Init = function() {
        document.addEventListener('input', Vsm__OnInput);
        document.addEventListener('change', Vsm__OnInput);
        document.addEventListener('keydown', Vsm__OnKey);
        document.addEventListener('click', Vsm__OnClick);
        Vsm.El('Vsm__BtnUrlAddApp').addEventListener('click', function() {
            var used = (Vsm__Draft.Routes || []).map(function(r) { return r.Target; });
            var free = (Vsm__Data.apps || []).find(function(a) { return used.indexOf(a.folder) < 0; }) || (Vsm__Data.apps || [])[0] || { folder: '' };
            Vsm__Draft.Routes.push({ Id: 'app' + Date.now() % 100000, Enabled: true, Type: 'app', Path: '', Target: free.folder, Entry: 'index.html',
                                     ExampleQuery: '', Api: false, ApiPort: 8005, Note: '' });
            Vsm__Dirty = true;
            Urls.Render();
        });
        Vsm.El('Vsm__BtnUrlAddLink').addEventListener('click', function() {
            Vsm__Draft.Routes.push({ Id: 'link' + Date.now() % 100000, Enabled: true, Type: 'link', Path: '', Target: '/', Code: 302, Example: '', Note: '' });
            Vsm__Dirty = true;
            Urls.Render();
        });
        Vsm.El('Vsm__BtnUrlSave').addEventListener('click', function() { Urls.Save(); });
        Vsm.El('Vsm__BtnUrlRevert').addEventListener('click', function() { Vsm__Dirty = false; Urls.Load(); });
        Vsm.El('Vsm__BtnUrlTest').addEventListener('click', Urls.Test);
        Vsm.El('Vsm__BtnUrlApply').addEventListener('click', Urls.ConfirmApply);
        Vsm.El('Vsm__BtnUrlConf').addEventListener('click', function() { Vsm__ShowConf = !Vsm__ShowConf; Urls.Render(); });
    };

    Urls.Show = function() { if (!Vsm__Dirty) Urls.Load(); };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

})();
