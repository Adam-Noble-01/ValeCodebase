/* =============================================================================
   VALE VIRTUAL SERVER MANAGER - UI CORE
   =============================================================================

   FILE       : VirtualServerManager__Ui__Core__.js
   NAMESPACE  : Vsm
   MODULE     : Ui - Core
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Shared helpers for the manager PWA: API calls, modal, toast, tabs,
                header (connection pill and live server stats), settings, server
                status, service-worker registration
   CREATED    : 06-Oct-2026

   DESCRIPTION:
   - Exposes window.Vsm, used by the Matrix and Explorer modules.
   - Every server job is one POST to /api/op/<action>; the local server runs it
     over ONE ssh connection through the shared gateway.

   =============================================================================

   DEVELOPMENT LOG:
   06-Oct-2026 - Version 0.4.0
   - Fourth tab: user accounts.
   - Version banner says which side is old: reload the page, or --restart the server.

   06-Oct-2026 - Version 0.4.3
   - One column-sort system for every table (SortState / SortToggle / SortHead /
     SortValue / SortCompare); dialog tables (.Vsm__Table) sort on header click.

   06-Oct-2026 - Version 0.3.1
   - Post always resolves with a readable error; page/server version check.

   06-Oct-2026 - Version 0.3.0
   - Third tab: URL configurator.

   06-Oct-2026 - Version 0.2.0
   - Split from the single UI file; tabs, live stats, PWA registration.

   ============================================================================= */

(function() {

// -----------------------------------------------------------------------------
// REGION | Namespace, Helpers
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Shared State
    // ------------------------------------------------------------
    var Vsm = window.Vsm = {
        PageVersion: '0.6.0',                                                  // <-- Must match the local server's version
        State      : null,                                                     // <-- Last /api/state payload
        Running    : false,                                                    // <-- A job request is in flight
        Tab        : 'explorer',
        Matrix     : null,                                                     // <-- Set by the Matrix module
        Explorer   : null,                                                     // <-- Set by the Explorer module
        PollTimer  : null
    };
    // ------------------------------------------------------------


    // HELPER FUNCTION | DOM, Escaping, Formatting
    // ------------------------------------------------------------
    Vsm.El = function(id) { return document.getElementById(id); };

    Vsm.Esc = function(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function(c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    };

    Vsm.Mb = function(bytes) {
        if (bytes == null) return '';
        if (bytes < 1e3) return bytes + ' B';
        if (bytes < 1e6) return (bytes / 1e3).toFixed(1) + ' KB';
        if (bytes < 1e9) return (bytes / 1e6).toFixed(1) + ' MB';
        return (bytes / 1e9).toFixed(2) + ' GB';
    };

    Vsm.Ago = function(epochSeconds) {
        if (!epochSeconds) return '';
        var s = Math.max(0, Math.round(Date.now() / 1000 - epochSeconds));
        if (s < 60) return s + ' s ago';
        if (s < 3600) return Math.floor(s / 60) + ' min ago';
        if (s < 86400) return Math.floor(s / 3600) + ' h ago';
        return Math.floor(s / 86400) + ' d ago';
    };

    Vsm.When = function(epochSeconds) {
        if (!epochSeconds) return '';
        var d = new Date(epochSeconds * 1000);
        return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) + ' ' +
               d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    };

    Vsm.NewerThan = function(a, b) {                                            // <-- "0.4.0" > "0.3.1"
        var x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
        for (var i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); }
        return false;
    };

    // HELPER FUNCTION | Shared Column Sort (every table: click a header to sort, again to reverse)
    // ------------------------------------------------------------
    Vsm.SortState = function(name, fallback) {                                 // <-- Remembered per table, per PC
        try { return JSON.parse(Vsm.Store('Sort__' + name)) || fallback; } catch (e) { return fallback; }
    };

    Vsm.SortToggle = function(name, state, key) {
        var next = { key: key, dir: state.key === key ? -state.dir : 1 };
        Vsm.Store('Sort__' + name, JSON.stringify(next));
        return next;
    };

    Vsm.SortHead = function(state, key) {                                       // <-- Attributes for a sortable header cell
        return ' class="Vsm__SortTh" data-sort="' + key + '"' + (state.key === key ? ' data-dir="' + state.dir + '"' : '');
    };

    Vsm.SortValue = function(text) {                                            // <-- "1.2 MB" / "42" / "06-Oct-2026" / text
        var t = String(text == null ? '' : text).trim();
        if (!t || t === '—') return null;
        var size = /^([\d.]+)\s*(B|KB|MB|GB)$/i.exec(t);
        if (size) return Number(size[1]) * { B: 1, KB: 1e3, MB: 1e6, GB: 1e9 }[size[2].toUpperCase()];
        if (/^-?[\d.,]+$/.test(t)) return Number(t.replace(/,/g, ''));
        var day = /^(\d{2})-([A-Za-z]{3})-(\d{4})$/.exec(t);
        var months = 'janfebmaraprmayjunjulaugsepoctnovdec';
        if (day) return Number(day[3]) * 1e4 + (months.indexOf(day[2].toLowerCase()) / 3 + 1) * 100 + Number(day[1]);
        return t.toLowerCase();
    };

    Vsm.SortCompare = function(x, y, dir) {                                     // <-- Blanks always last, both directions
        var bx = x == null || x === '', by = y == null || y === '';
        if (bx || by) return bx === by ? 0 : (bx ? 1 : -1);
        if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
        return String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' }) * dir;
    };

    Vsm.SortTables = function(root) {                                           // <-- Make every .Vsm__Table header row sortable
        (root || document).querySelectorAll('table.Vsm__Table').forEach(function(table) {
            var head = table.rows[0];
            if (!head || !head.querySelector('th') || table.rows.length < 3) return;
            Array.prototype.forEach.call(head.cells, function(th, i) { th.classList.add('Vsm__SortTh'); th.dataset.col = i; });
        });
    };

    function Vsm__SortTableClick(e) {
        var th = e.target.closest && e.target.closest('table.Vsm__Table th.Vsm__SortTh');
        if (!th) return;
        var table = th.closest('table'), col = Number(th.dataset.col);
        var dir = th.dataset.dir === '1' ? -1 : 1;
        Array.prototype.forEach.call(table.rows[0].cells, function(c) { delete c.dataset.dir; });
        th.dataset.dir = dir;
        var rows = Array.prototype.slice.call(table.rows, 1);
        rows.sort(function(a, b) {
            return Vsm.SortCompare(Vsm.SortValue(a.cells[col] && a.cells[col].textContent),
                                   Vsm.SortValue(b.cells[col] && b.cells[col].textContent), dir);
        });
        rows.forEach(function(r) { r.parentNode.appendChild(r); });
    }
    // ------------------------------------------------------------

    Vsm.Store = function(key, value) {                                         // <-- localStorage, never required
        try {
            if (value === undefined) return window.localStorage.getItem('Vsm__' + key);
            window.localStorage.setItem('Vsm__' + key, value);
        } catch (e) { return null; }
    };
    // ------------------------------------------------------------


    // HELPER FUNCTION | Toast Message
    // ------------------------------------------------------------
    Vsm.Toast = function(text, isBad) {
        var toast = Vsm.El('Vsm__Toast');
        toast.textContent = text;
        toast.className = 'Vsm__Toast' + (isBad ? ' is-bad' : '');
        toast.hidden = false;
        window.clearTimeout(Vsm.Toast.timer);
        Vsm.Toast.timer = window.setTimeout(function() { toast.hidden = true; }, isBad ? 9000 : 5000);
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | API
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | POST JSON to the Local Server (always resolves: {ok:false, error} on any failure)
    // ------------------------------------------------------------
    Vsm.Post = function(path, body) {
        return fetch(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Vale-Manager': '1' },
            body: JSON.stringify(body || {})
        }).then(function(r) {
            return r.text().then(function(text) {
                try { return JSON.parse(text); }
                catch (err) {
                    return { ok: false, error: 'The manager server answered HTTP ' + r.status +
                        (r.status === 404 ? ': it is older than this page, so restart it (Start__VirtualServerManager__Localhost__8020__.bat, or sign out and in)' : '') };
                }
            });
        }).catch(function(err) {
            return { ok: false, error: 'Cannot reach the manager server (' + err.message + '). Is it running?' };
        });
    };
    // ------------------------------------------------------------


    // FUNCTION | Reload the Matrix State and Re-render
    // ------------------------------------------------------------
    Vsm.Refresh = function() {
        return fetch('/api/state', { cache: 'no-store' })
            .then(function(r) { return r.json(); })
            .then(function(state) {
                if (state.error) throw new Error(state.error);
                Vsm.El('Vsm__Offline').hidden = true;
                Vsm.El('Vsm__Stale').hidden = !state.version || state.version === Vsm.PageVersion;
                Vsm.El('Vsm__Stale').textContent = Vsm.NewerThan(state.version, Vsm.PageVersion)
                    ? 'This page (' + Vsm.PageVersion + ') is older than the manager server (' + state.version + '): reload it with Ctrl+Shift+R.'
                    : 'The manager server is running ' + state.version + ' but this page is ' + Vsm.PageVersion +
                      ': restart the server. Run Restart__VirtualServerManager__8020__.bat, or: python VirtualServerManager__LocalServer__.py --restart';
                Vsm.State = state;
                Vsm.RenderHeader(state.gateway, state.live);
                if (Vsm.Matrix) Vsm.Matrix.Render();
                Vsm.SchedulePoll();
            })
            .catch(function(err) {
                Vsm.El('Vsm__Offline').hidden = false;
                Vsm.El('Vsm__Conn').textContent = 'Manager offline';
                Vsm.El('Vsm__Conn').className = 'Vsm__Pill is-bad';
                Vsm.SchedulePoll(5000);
                console.warn(err);
            });
    };

    Vsm.SchedulePoll = function(ms) {
        window.clearTimeout(Vsm.PollTimer);
        var busy = Vsm.State && Vsm.State.busy && Vsm.State.busy.label;
        Vsm.PollTimer = window.setTimeout(Vsm.Refresh, ms || (busy || Vsm.Running ? 2000 : 15000));
    };
    // ------------------------------------------------------------


    // FUNCTION | Run a Job (one server session)
    // ------------------------------------------------------------
    Vsm.Operate = function(action, body, okText) {
        if (Vsm.Running) { Vsm.Toast('Wait for the current job to finish.', true); return Promise.resolve(null); }
        Vsm.Running = true;
        if (Vsm.Matrix) Vsm.Matrix.RenderToolbar();
        Vsm.SchedulePoll(1500);
        return Vsm.Post('/api/op/' + action, body).then(function(res) {
            Vsm.Running = false;
            if (res.ok) {
                if (okText) Vsm.Toast(typeof okText === 'function' ? okText(res) : okText);
            } else {
                var extra = res.conflicts ? ' (' + res.conflict_count + ' file(s) changed on the server)' : '';
                Vsm.Toast((res.error || 'Failed') + extra, true);
            }
            return Vsm.Refresh().then(function() { return res; });
        }).catch(function(err) {
            Vsm.Running = false;
            Vsm.Toast('Request failed: ' + err, true);
            Vsm.Refresh();
            return null;
        });
    };
    // ------------------------------------------------------------


    // FUNCTION | Save the Whole Config
    // ------------------------------------------------------------
    Vsm.SaveConfig = function(cfg, okText) {
        return Vsm.Post('/api/config', cfg).then(function(res) {
            if (!res.ok) { Vsm.Toast(res.error || 'Could not save', true); return false; }
            if (okText) Vsm.Toast(okText);
            return Vsm.Refresh().then(function() { return true; });
        });
    };

    Vsm.CloneConfig = function() { return JSON.parse(JSON.stringify(Vsm.State.config)); };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Modal
// -----------------------------------------------------------------------------

    // FUNCTION | Open, Close, Info
    // ------------------------------------------------------------
    Vsm.OpenModal = function(html, actions) {
        Vsm.El('Vsm__ModalBody').innerHTML = html;
        Vsm.SortTables(Vsm.El('Vsm__ModalBody'));
        var bar = Vsm.El('Vsm__ModalActions');
        bar.innerHTML = '';
        (actions || [{ label: 'Close' }]).forEach(function(a) {
            var b = document.createElement('button');
            b.textContent = a.label;
            if (a.cls) b.className = a.cls;
            b.onclick = function() {
                var keep = a.run ? a.run() : false;
                if (keep !== true) Vsm.CloseModal();
            };
            bar.appendChild(b);
        });
        Vsm.El('Vsm__Modal').hidden = false;
    };

    Vsm.CloseModal = function() { Vsm.El('Vsm__Modal').hidden = true; };

    Vsm.ShowInfo = function(title, html) { Vsm.OpenModal('<h2>' + Vsm.Esc(title) + '</h2>' + html); };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Header: Connection Pill and Live Stats
// -----------------------------------------------------------------------------

    // FUNCTION | Render the Header From Gateway and Live Summaries
    // ------------------------------------------------------------
    Vsm.RenderHeader = function(g, live) {
        var pill = Vsm.El('Vsm__Conn');
        if (g) {
            if (g.cooldown_s > 0) {
                pill.className = 'Vsm__Pill is-bad';
                pill.textContent = 'Cooldown ' + Math.floor(g.cooldown_s / 60) + ':' + String(g.cooldown_s % 60).padStart(2, '0');
                pill.title = g.cooldown_reason + '\nDo not retry. Click to clear once the cause is fixed.';
                pill.style.cursor = 'pointer';
                pill.onclick = Vsm.ConfirmClearCooldown;
            } else if (!g.agent_ok) {
                pill.className = 'Vsm__Pill is-warn';
                pill.textContent = 'SSH key not loaded';
                pill.title = g.agent_msg;
                pill.style.cursor = 'pointer';
                pill.onclick = function() { Vsm.ShowInfo('SSH key not loaded', '<p>' + Vsm.Esc(g.agent_msg) + '</p>'); };
            } else {
                pill.className = 'Vsm__Pill is-good';
                pill.textContent = 'Ready · ' + g.sessions_10min + ' login' + (g.sessions_10min === 1 ? '' : 's') + ' / 10 min';
                pill.title = g.agent_msg;
                pill.onclick = null;
                pill.style.cursor = 'default';
            }
        }
        var st = live && live.stats;
        var bits = [];
        if (st && st.load && st.load.length) bits.push('load <b>' + st.load[0] + '</b>');
        if (st && st.mem_used_pct != null) bits.push('mem <b>' + st.mem_used_pct + '%</b>');
        if (st && st.disk_free_gb != null) bits.push('disk <b>' + st.disk_free_gb + ' GB</b> free');
        if (st && st.nginx) bits.push('nginx <b>' + Vsm.Esc(st.nginx) + '</b>');
        if (st && st.uptime_h != null) bits.push('up <b>' + st.uptime_h + ' h</b>');
        Vsm.El('Vsm__Stats').innerHTML = bits.length ? bits.join(' · ') +
            (live.status === 'live' ? '' : ' <span class="Vsm__Muted">(last seen)</span>') : 'mirror sync';
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Shared Dialogs: Cooldown, Status, Settings
// -----------------------------------------------------------------------------

    // FUNCTION | Clear the Connection Cooldown (only once fixed)
    // ------------------------------------------------------------
    Vsm.ConfirmClearCooldown = function() {
        var g = Vsm.State.gateway;
        Vsm.OpenModal('<h2>Connection cooldown</h2><p>' + Vsm.Esc(g.cooldown_reason) + '</p>' +
            '<p>The server bans an IP for 10 minutes after 5 failed logins; retrying makes it longer. ' +
            'Clear this only once the cause is fixed (key loaded, ban lifted, server back).</p>',
            [{ label: 'Keep waiting' }, { label: 'Clear cooldown', cls: 'Vsm__BtnDanger', run: function() {
                Vsm.Post('/api/clear-cooldown', {}).then(Vsm.Refresh);
            } }]);
    };
    // ------------------------------------------------------------


    // FUNCTION | Server Status Report
    // ------------------------------------------------------------
    Vsm.ShowStatus = function() {
        Vsm.Operate('status', {}).then(function(res) {
            if (!res || !res.ok) return;
            var s = res.status;
            var svc = Object.keys(s.services).map(function(k) {
                return '<tr><td>' + Vsm.Esc(k) + '</td><td>' + Vsm.Esc(s.services[k]) + '</td></tr>';
            }).join('');
            var maps = Object.keys(s.mappings).map(function(k) {
                var m = s.mappings[k], lanes = m.lanes || {};
                var txt = ['code', 'content', 'userdata', 'shared'].filter(function(l) { return lanes[l]; }).map(function(l) {
                    return l + ' ' + lanes[l][0] + ' (' + Vsm.Mb(lanes[l][1]) + ')';
                }).join(', ');
                return '<tr><td>' + Vsm.Esc(k) + '</td><td>' + (m.exists ? (txt || 'empty') : 'not on the server') + '</td></tr>';
            }).join('');
            maps = '<tr><th>Mapping</th><th>Files on the server</th></tr>' + maps;
            Vsm.ShowInfo('Server status · ' + s.host, '<table class="Vsm__Table">' +
                '<tr><td>Time (UTC)</td><td>' + Vsm.Esc(s.time_utc) + '</td></tr>' +
                '<tr><td>Uptime / load</td><td>' + Vsm.Esc(s.uptime) + ' · ' + Vsm.Esc((s.load || []).join(' ')) + '</td></tr>' +
                '<tr><td>Memory used</td><td>' + Vsm.Esc(s.mem_used_pct) + '%</td></tr>' +
                '<tr><td>Disk</td><td>' + s.disk_used_gb + ' GB used, ' + s.disk_free_gb + ' GB free</td></tr>' +
                '<tr><td>Reboot needed</td><td>' + (s.reboot_required ? '<span class="Vsm__Warn">yes</span>' : 'no') + '</td></tr>' +
                '<tr><td>Server root</td><td>' + (s.root_exists ? 'exists' : '<span class="Vsm__Warn">missing: Settings → Prepare server root</span>') + '</td></tr>' +
                '<tr><td>nginx root</td><td><code>' + Vsm.Esc(s.nginx_root) + '</code></td></tr>' + svc +
                '<tr><td>Flask services</td><td>' + Vsm.Esc((s.vale_services || []).join(', ') || 'none running') + '</td></tr>' +
                '</table><h4>Files on the server by lane</h4><table class="Vsm__Table">' + maps + '</table>' +
                '<h4>Recent sync log</h4><pre class="Vsm__SessionLog">' + Vsm.Esc((s.recent || []).join('\n') || 'none') + '</pre>');
        });
    };
    // ------------------------------------------------------------


    // FUNCTION | Settings (paths, prepare server root)
    // ------------------------------------------------------------
    Vsm.ShowSettings = function() {
        var c = Vsm.State.config;
        var f = function(id, label, value, help) {
            return '<label for="' + id + '">' + label + '</label><input type="text" id="' + id + '" value="' + Vsm.Esc(value) + '">' +
                   (help ? '<div class="Vsm__Help">' + help + '</div>' : '');
        };
        Vsm.OpenModal('<h2>Settings</h2><div class="Vsm__Form">' +
            f('Vsm__SetMirror', 'Local mirror root', c.Local.MirrorRoot, 'This folder IS the server root.') +
            f('Vsm__SetBackup', 'Local backup folder', c.Local.BackupRoot, 'PC copies replaced by Collect, and user-data snapshots. Keep it out of git.') +
            f('Vsm__SetHost', 'SSH host alias', c.Server.HostAlias, 'From %USERPROFILE%\\.ssh\\config. Never the domain: Cloudflare does not carry SSH.') +
            f('Vsm__SetRoot', 'Server root', c.Server.Root, 'Must be under /srv/. Every mapping lives inside it.') +
            f('Vsm__SetArea', 'Server sync area', c.Server.SyncArea, 'Staging, per-push backups, the journal and sync.log. Outside the web root.') +
            '</div>',
            [{ label: 'Prepare server root…', run: function() {
                Vsm.OpenModal('<h2>Prepare the server root?</h2><p>Creates <code>' + Vsm.Esc(c.Server.Root) + '</code> and <code>' +
                    Vsm.Esc(c.Server.SyncArea) + '</code> on the server (sudo, one connection), owned by the SSH user. Safe to repeat.</p>',
                    [{ label: 'Cancel' }, { label: 'Create folders', cls: 'Vsm__BtnPrimary', run: function() {
                        Vsm.Operate('prepare', {}, 'Server root ready.');
                    } }]);
                return true;
            } },
            { label: 'Cancel' },
            { label: 'Save', cls: 'Vsm__BtnPrimary', run: function() {
                var cfg = Vsm.CloneConfig();
                cfg.Local.MirrorRoot = Vsm.El('Vsm__SetMirror').value.trim();
                cfg.Local.BackupRoot = Vsm.El('Vsm__SetBackup').value.trim();
                cfg.Server.HostAlias = Vsm.El('Vsm__SetHost').value.trim();
                cfg.Server.Root = Vsm.El('Vsm__SetRoot').value.trim().replace(/\/+$/, '');
                cfg.Server.SyncArea = Vsm.El('Vsm__SetArea').value.trim().replace(/\/+$/, '');
                Vsm.SaveConfig(cfg, 'Settings saved.');
            } }]);
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Tabs, PWA, Start-Up
// -----------------------------------------------------------------------------

    // FUNCTION | Switch Tab
    // ------------------------------------------------------------
    Vsm.SetTab = function(name) {
        Vsm.Tab = name;
        Vsm.Store('Tab', name);
        document.querySelectorAll('.Vsm__Tab').forEach(function(t) { t.classList.toggle('is-active', t.dataset.tab === name); });
        Vsm.El('Vsm__TabExplorer').hidden = name !== 'explorer';
        Vsm.El('Vsm__TabMatrix').hidden = name !== 'matrix';
        Vsm.El('Vsm__TabUrls').hidden = name !== 'urls';
        Vsm.El('Vsm__TabUsers').hidden = name !== 'users';
        if (Vsm.Urls && name === 'urls') Vsm.Urls.Show();
        if (Vsm.Users && name === 'users') Vsm.Users.Show();
        if (Vsm.Explorer) { if (name === 'explorer') Vsm.Explorer.Show(); else Vsm.Explorer.Hide(); }
    };
    // ------------------------------------------------------------


    // FUNCTION | Register the Service Worker (installable PWA)
    // ------------------------------------------------------------
    Vsm.RegisterServiceWorker = function() {
        if (!('serviceWorker' in navigator)) return;
        navigator.serviceWorker.register('/VirtualServerManager__Pwa__ServiceWorker__.js', { scope: '/' })
            .catch(function(err) { console.warn('Service worker not registered:', err); });
    };
    // ------------------------------------------------------------


    // FUNCTION | Wire Up Shared Controls and Start
    // ------------------------------------------------------------
    Vsm.Init = function() {
        document.querySelectorAll('.Vsm__Tab').forEach(function(t) {
            t.addEventListener('click', function() { Vsm.SetTab(t.dataset.tab); });
        });
        Vsm.El('Vsm__Modal').addEventListener('click', function(e) { if (e.target.id === 'Vsm__Modal') Vsm.CloseModal(); });
        document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && !Vsm.El('Vsm__Modal').hidden) Vsm.CloseModal(); });
        document.addEventListener('click', Vsm__SortTableClick);
        Vsm.El('Vsm__BtnStatus').addEventListener('click', Vsm.ShowStatus);
        Vsm.El('Vsm__BtnSettings').addEventListener('click', function() { if (Vsm.State) Vsm.ShowSettings(); });
        Vsm.El('Vsm__BtnBackupAll').addEventListener('click', function() {
            if (!Vsm.State) return;
            Vsm.Operate('backup', { ids: Vsm.State.mappings.map(function(m) { return m.Id; }) },
                        function(r) { return 'Snapshot: ' + (r.files || 0) + ' user-data file(s) saved to ' + r.dest; });
        });
        if (Vsm.Matrix) Vsm.Matrix.Init();
        if (Vsm.Explorer) Vsm.Explorer.Init();
        if (Vsm.Urls) Vsm.Urls.Init();
        if (Vsm.Users) Vsm.Users.Init();
        var wanted = new URLSearchParams(window.location.search).get('tab') || Vsm.Store('Tab');   // <-- Start-menu shortcuts pass ?tab=
        Vsm.SetTab(['matrix', 'urls', 'users'].indexOf(wanted) >= 0 ? wanted : 'explorer');
        Vsm.Refresh();
        Vsm.RegisterServiceWorker();
    };

    document.addEventListener('DOMContentLoaded', function() { window.setTimeout(Vsm.Init, 0); });
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

})();
