/* =============================================================================
   VALE VIRTUAL SERVER MANAGER - UI | TAB 02 PARITY MATRIX
   =============================================================================

   FILE       : VirtualServerManager__Ui__Matrix__.js
   NAMESPACE  : Vsm.Matrix
   MODULE     : Ui - Parity Matrix
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : One card per mapping: PC path beside its server path, and three
                lanes with what each would move, both ways
   CREATED    : 06-Oct-2026

   DESCRIPTION:
   - Source code    PC -> server  exact mirror (adds, replaces, deletes)
   - Heavy content  PC -> server  additive, newer wins (server-newer = conflict)
   - User data      server -> PC  additive, newer wins (PC-newer = conflict)
   - Push and Collect apply exactly the plan shown by the last Compare.

   =============================================================================

   DEVELOPMENT LOG:
   07-Oct-2026 - Version 0.8.0
   - Content made on the server (ServerMadeContent, e.g. ValeVision Theia videos)
     counts as "to collect": the card's content lane, the file lists and a
     "Made on the server" column in the Collect modal. Collect brings it without
     the heavy-content tick.

   06-Oct-2026 - Version 0.2.0
   - Lanes, Push / Collect, conflict options.

   ============================================================================= */

(function() {

    var Vsm = window.Vsm;
    var Matrix = Vsm.Matrix = {};

// -----------------------------------------------------------------------------
// REGION | State and Helpers
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Selection and Expanded Plans
    // ------------------------------------------------------------
    var Vsm__Selected = new Set();
    var Vsm__Expanded = new Set();
    var Vsm__LaneText = {
        code     : ['Source code', 'PC \u2192 server \u00b7 mirror'],
        content  : ['Heavy content', 'PC \u2192 server \u00b7 newer wins'],
        userdata : ['User data', 'server \u2192 PC \u00b7 newer wins'],
        shared   : ['Project data', 'both ways \u00b7 newer wins']
    };
    // ------------------------------------------------------------


    // HELPER FUNCTION | Mapping by Id, Pending Counts of a Plan
    // ------------------------------------------------------------
    function Vsm__Mapping(id) {
        return Vsm.State.config.Mappings.find(function(m) { return m.Id === id; });
    }

    function Vsm__PushCount(p) { return p ? p.code_new_count + p.code_changed_count + p.code_delete_count + p.content_push_count + p.shared_push_count : 0; }
    function Vsm__CollectCount(p) { return p ? p.user_collect_count + p.shared_collect_count + (p.content_collect_count || 0) : 0; }
    function Vsm__ConflictCount(p) { return p ? p.content_server_newer_count + p.user_pc_newer_count : 0; }

    function Vsm__Selection(filterFn) {
        return Array.from(Vsm__Selected).filter(function(i) { return !filterFn || filterFn(Vsm.State.plans[i]); });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Rendering
// -----------------------------------------------------------------------------

    // SUB HELPER FUNCTION | One Lane Row of a Card
    // ------------------------------------------------------------
    function Vsm__RenderLane(lane, row, p) {
        var local = (row.LocalLanes || {})[lane] || [0, 0];
        var counts = [];
        if (!p) {
            counts.push('<span class="Vsm__Muted">PC: ' + local[0] + ' file' + (local[0] === 1 ? '' : 's') + ' \u00b7 ' + Vsm.Mb(local[1]) + '</span>');
        } else if (lane === 'code') {
            if (p.code_new_count) counts.push('<span class="Vsm__C-push">+' + p.code_new_count + ' new</span>');
            if (p.code_changed_count) counts.push('<span class="Vsm__C-push">~' + p.code_changed_count + ' changed</span>');
            if (p.code_delete_count) counts.push('<span class="Vsm__C-delete">\u2212' + p.code_delete_count + ' delete on server</span>');
        } else if (lane === 'content') {
            if (p.content_push_count) counts.push('<span class="Vsm__C-push">\u2191' + p.content_push_count + ' to push</span>');
            if (p.content_server_newer_count) counts.push('<span class="Vsm__C-conflict">!' + p.content_server_newer_count + ' server newer</span>');
            if (p.content_server_only_count) counts.push('<span class="Vsm__Muted">' + p.content_server_only_count + ' server only</span>');
            if (p.content_collect_count) counts.push('<span class="Vsm__C-collect">↓' + p.content_collect_count + ' made on the server: collect</span>');
        } else if (lane === 'shared') {
            if (p.shared_push_count) counts.push('<span class="Vsm__C-push">\u2191' + p.shared_push_count + ' PC newer: push</span>');
            if (p.shared_collect_count) counts.push('<span class="Vsm__C-collect">\u2193' + p.shared_collect_count + ' server newer: collect</span>');
        } else {
            if (p.user_collect_count) counts.push('<span class="Vsm__C-collect">\u2193' + p.user_collect_count + ' to collect</span>');
            if (p.user_pc_newer_count) counts.push('<span class="Vsm__C-conflict">!' + p.user_pc_newer_count + ' PC newer</span>');
            if (p.user_pc_only_count) counts.push('<span class="Vsm__Muted">' + p.user_pc_only_count + ' PC only (seedable)</span>');
        }
        if (p && !counts.length) counts.push('<span class="Vsm__C-ok">\u2713 in parity' + (p.same[lane] ? ' \u00b7 ' + p.same[lane] + ' file(s)' : '') + '</span>');
        return '<div class="Vsm__Lane lane-' + lane + '"><span class="Vsm__LaneName">' + Vsm__LaneText[lane][0] + '</span>' +
               '<span class="Vsm__LaneDir">' + Vsm__LaneText[lane][1] + '</span><span class="Vsm__LaneCounts">' + counts.join('') + '</span>' +
               '<span class="Vsm__Meta">' + (p ? '' : '') + '</span></div>';
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Which Lane Rows a Card Shows
    // ------------------------------------------------------------
    function Vsm__LanesFor(row, p) {
        var ll = row.LocalLanes || {};
        var shared = row.DefaultLane === 'shared';
        var lanes = shared ? ['shared', 'content', 'userdata'] : ['code', 'content', 'userdata'];
        if (!shared && ((ll.shared && ll.shared[0]) || (p && (p.shared_push_count || p.shared_collect_count || p.same.shared)))) lanes.push('shared');
        if (shared && ((ll.code && ll.code[0]) || (p && (p.code_new_count || p.code_changed_count || p.code_delete_count)))) lanes.unshift('code');
        return lanes;
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | File Lists of a Plan
    // ------------------------------------------------------------
    function Vsm__RenderFiles(p) {
        var groups = [
            ['code_new', 'Code: new', 'f-push', '+'], ['code_changed', 'Code: changed', 'f-push', '~'],
            ['code_delete', 'Code: delete on server', 'f-delete', '\u2212'],
            ['content_push', 'Content: push', 'f-push', '\u2191'], ['content_server_newer', 'Content: server newer (conflict)', 'f-conflict', '!'],
            ['content_server_only', 'Content: server only', 'f-info', '\u00b7'],
            ['content_collect', 'Content made on the server: collect', 'f-collect', '\u2193'],
            ['shared_push', 'Project data: PC newer, push', 'f-push', '\u2191'], ['shared_collect', 'Project data: server newer, collect', 'f-collect', '\u2193'],
            ['user_collect', 'User data: collect', 'f-collect', '\u2193'], ['user_pc_newer', 'User data: PC newer (conflict)', 'f-conflict', '!'],
            ['user_pc_only', 'User data: PC only', 'f-info', '\u00b7']
        ];
        var html = '<div class="Vsm__FileList">';
        groups.forEach(function(g) {
            if (!p[g[0]].length) return;
            html += '<div class="f-head">' + g[1] + ' (' + p[g[0] + '_count'] + ')</div>';
            p[g[0]].forEach(function(rel) { html += '<div class="' + g[2] + '">' + g[3] + ' ' + Vsm.Esc(rel) + '</div>'; });
            var more = p[g[0] + '_count'] - p[g[0]].length;
            if (more > 0) html += '<div class="f-info">\u2026 ' + more + ' more</div>';
        });
        return html + '</div>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | One Mapping Card
    // ------------------------------------------------------------
    function Vsm__RenderCard(row) {
        var p = Vsm.State.plans[row.Id];
        var pending = Vsm__PushCount(p) + Vsm__CollectCount(p);
        var root = Vsm.State.config.Server.Root.replace(/\/$/, '') + '/';
        var remoteRel = (row.Remote === '.' ? '' : row.Remote);
        var cls = 'Vsm__Card' + (row.Enabled === false ? ' is-disabled' : '') + (p ? (pending ? ' has-changes' : ' is-synced') : '');
        var id = Vsm.Esc(row.Id);
        var last = (Vsm.State.last_action || {})[row.Id];
        var foot = p ? 'Compared ' + (p.compared_utc || '').slice(11, 16) + ' UTC' + (p.remote_exists ? '' : ' \u00b7 server folder will be created') +
                       ' \u00b7 push ' + Vsm.Mb(p.push_bytes) + ' \u00b7 collect ' + Vsm.Mb(p.collect_bytes)
                     : (last ? 'Last: ' + Vsm.Esc(last.t) + ' ' + Vsm.Esc(last.text) + '. Compare to check.' : 'Not compared yet.');
        var anyFiles = p && (pending || Vsm__ConflictCount(p) || p.content_server_only_count || p.user_pc_only_count);
        return '<article class="' + cls + '" data-card="' + id + '">' +
            '<div class="Vsm__CardHead">' +
                '<input type="checkbox" data-select="' + id + '"' + (Vsm__Selected.has(row.Id) ? ' checked' : '') + '>' +
                '<div class="Vsm__CardName">' + Vsm.Esc(row.Name) + '<span class="Vsm__Id">' + id + '</span></div>' +
                '<span class="Vsm__Badge kind-' + Vsm.Esc(row.Kind) + '">' + (row.Kind === 'server' ? 'server only' : 'web') + '</span>' +
                (row.IsMirror ? '<span class="Vsm__Badge is-mirror">\u2713 mirror</span>' : '<span class="Vsm__Badge is-custom">custom path</span>') +
                (row.Enabled === false ? '<span class="Vsm__Badge is-off">disabled</span>' : '') +
                (row.FilesOnly ? '<span class="Vsm__Badge kind-server">top-level files only</span>' : '') +
                '<span class="Vsm__Spacer"></span>' +
                '<button class="Vsm__BtnSmall" data-act="edit" data-id="' + id + '">Edit</button>' +
            '</div>' +
            '<div class="Vsm__Paths">' +
                '<div class="Vsm__PathRow"><span class="Vsm__Dot ' + (row.LocalExists ? 'is-ok' : 'is-missing') + '"></span>' +
                    '<span class="Vsm__PathLabel">PC</span><code>' + Vsm.Esc(row.LocalFull) + '</code>' +
                    '<span class="Vsm__Meta">' + (row.LocalExists ? '' : 'folder missing') + '</span></div>' +
                '<div class="Vsm__PathRow"><span class="Vsm__Dot' + (p ? (p.remote_exists ? ' is-ok' : ' is-missing') : '') + '"></span>' +
                    '<span class="Vsm__PathLabel">Server</span>' +
                    '<div class="Vsm__RemoteEdit"><code title="' + Vsm.Esc(root) + '">' + Vsm.Esc(root) + '</code>' +
                    '<input class="Vsm__RemoteInput" data-remote="' + id + '" value="' + Vsm.Esc(remoteRel) + '" ' +
                    'placeholder="(server root)" title="Path under the server root. Press Enter to save."></div>' +
                    '<span class="Vsm__Meta">' + (p ? (p.remote_exists ? 'exists' : 'not created yet') : '') + '</span></div>' +
                (row.IsMirror ? '' : '<div class="Vsm__Note">Custom path: the server no longer mirrors this PC folder\u2019s position.</div>') +
            '</div>' +
            '<div class="Vsm__Lanes">' + Vsm__LanesFor(row, p).map(function(l) { return Vsm__RenderLane(l, row, p); }).join('') + '</div>' +
            '<div class="Vsm__PlanFoot"><span>' + foot + '</span><span class="Vsm__Spacer"></span>' +
                (anyFiles ? '<button class="Vsm__BtnSmall" data-act="toggle" data-id="' + id + '">' + (Vsm__Expanded.has(row.Id) ? 'Hide files' : 'Show files') + '</button>' : '') +
            '</div>' +
            (anyFiles && Vsm__Expanded.has(row.Id) ? Vsm__RenderFiles(p) : '') +
            '<div class="Vsm__CardActions">' +
                '<button data-act="compare" data-id="' + id + '">Compare</button>' +
                '<button data-act="push" data-id="' + id + '" class="' + (Vsm__PushCount(p) ? 'Vsm__BtnPush' : '') + '"' + (Vsm__PushCount(p) || (p && p.content_server_newer_count) ? '' : ' disabled') + '>\u2191 Push\u2026</button>' +
                '<button data-act="collect" data-id="' + id + '" class="' + (Vsm__CollectCount(p) ? 'Vsm__BtnCollect' : '') + '"' + (p && (Vsm__CollectCount(p) || p.content_server_only_count || p.content_server_newer_count || p.user_pc_newer_count) ? '' : ' disabled') + '>\u2193 Collect\u2026</button>' +
                '<button data-act="undo" data-id="' + id + '">Undo last push\u2026</button>' +
                '<button data-act="seed" data-id="' + id + '">Seed user data\u2026</button>' +
                '<button data-act="backup" data-id="' + id + '">Snapshot user data</button>' +
            '</div>' +
        '</article>';
    }
    // ------------------------------------------------------------


    // FUNCTION | Toolbar State
    // ------------------------------------------------------------
    Matrix.RenderToolbar = function() {
        var busy = Vsm.State && Vsm.State.busy.label;
        Vsm.El('Vsm__Busy').textContent = busy ? 'Working: ' + busy + ' (' + Vsm.State.busy.secs + ' s)\u2026' : (Vsm.Running ? 'Working\u2026' : '');
        var off = Vsm__Selected.size === 0 || Vsm.Running || !!busy;
        Vsm.El('Vsm__BtnCompare').disabled = off;
        Vsm.El('Vsm__BtnPush').disabled = off || !Vsm__Selection(function(p) { return Vsm__PushCount(p); }).length;
        Vsm.El('Vsm__BtnCollect').disabled = off || !Vsm__Selection(function(p) { return Vsm__CollectCount(p); }).length;
    };
    // ------------------------------------------------------------


    // FUNCTION | Render the Matrix Tab
    // ------------------------------------------------------------
    Matrix.Render = function() {
        var S = Vsm.State;
        var focused = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.remote;
        Vsm.El('Vsm__Results').innerHTML = (S.results || []).slice().reverse().map(function(r) {
            var s = r.session ? ' \u00b7 ' + r.session.secs + ' s' : '';
            return '<div class="Vsm__Result ' + (r.ok ? 'is-ok' : 'is-bad') + '"><b>' + Vsm.Esc(r.t) + '</b> ' +
                   Vsm.Esc(r.label) + s + (r.error ? '<br>' + Vsm.Esc(r.error) : '') + '</div>';
        }).join('') || '<span class="Vsm__Muted">Nothing yet.</span>';
        Vsm.El('Vsm__SessionLog').textContent = (S.gateway.log || []).slice().reverse().join('\n') || 'No connections yet.';
        Matrix.RenderToolbar();
        if (focused) return;                                                   // <-- Don't clobber a path being edited
        Vsm.El('Vsm__LocalRoot').textContent = S.config.Local.MirrorRoot;
        Vsm.El('Vsm__RemoteRoot').textContent = S.config.Server.HostAlias + ' : ' + S.config.Server.Root;
        Vsm.El('Vsm__Mappings').innerHTML = S.mappings.map(Vsm__RenderCard).join('');
        Vsm.El('Vsm__Unmapped').innerHTML = !(S.unmapped || []).length ? '' :
            'Folders in the mirror that are not synced yet: ' + S.unmapped.map(function(n) {
                return '<button class="Vsm__BtnSmall" data-act="add" data-folder="' + Vsm.Esc(n) + '">+ ' + Vsm.Esc(n) + '</button>';
            }).join(' ');
        Vsm.El('Vsm__SelectAll').checked = Vsm__Selected.size > 0 && Vsm__Selected.size === S.mappings.length;
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Push, Collect, Undo, Seed Dialogs
// -----------------------------------------------------------------------------

    // FUNCTION | Confirm a Push (code + content, PC -> server)
    // ------------------------------------------------------------
    Matrix.ConfirmPush = function(ids) {
        var rows = ids.map(function(i) { return Vsm.State.plans[i]; }).filter(function(p) { return p && (Vsm__PushCount(p) || p.content_server_newer_count); });
        if (!rows.length) { Vsm.Toast('Nothing to push: compare first, or the server is already in parity.'); return; }
        var deletes = rows.reduce(function(n, p) { return n + p.code_delete_count; }, 0);
        var newer = rows.reduce(function(n, p) { return n + p.content_server_newer_count; }, 0);
        var bytes = rows.reduce(function(n, p) { return n + p.push_bytes; }, 0);
        var html = '<h2>\u2191 Push to the server</h2><p>Source code is mirrored; heavy content is added or replaced where this PC is newer. ' +
            'User data is never pushed. One connection; every file replaced or deleted is backed up on the server first (<b>Undo last push</b>).</p>' +
            '<table class="Vsm__Table"><tr><th>Mapping</th><th>Code new</th><th>Code changed</th><th>Code delete</th><th>Content push</th><th>Content server-newer</th><th>Project data</th><th>Size</th></tr>' +
            rows.map(function(p) {
                return '<tr><td>' + Vsm.Esc(p.name) + '<br><code>' + Vsm.Esc(p.remote) + '</code></td><td>' + p.code_new_count + '</td><td>' +
                       p.code_changed_count + '</td><td' + (p.code_delete_count ? ' class="Vsm__Warn"' : '') + '>' + p.code_delete_count +
                       '</td><td>' + p.content_push_count + '</td><td>' + p.content_server_newer_count + '</td><td>' + p.shared_push_count +
                       '</td><td>' + Vsm.Mb(p.push_bytes) + '</td></tr>';
            }).join('') + '</table><div class="Vsm__Options">' +
            (deletes ? '<label class="Vsm__Check"><input type="checkbox" id="Vsm__OptDeletes" checked> <span class="Vsm__Warn">Delete ' + deletes +
                       ' server code file(s) that are no longer on this PC</span></label>' : '') +
            (newer ? '<label class="Vsm__Check"><input type="checkbox" id="Vsm__OptForceContent"> Also overwrite ' + newer +
                     ' content file(s) the server has newer (normally skipped)</label>' : '') +
            '<span class="Vsm__Muted">If anything on the server changed since Compare, nothing is changed and you are asked to compare again.</span></div>';
        Vsm.OpenModal(html, [
            { label: 'Cancel' },
            { label: '\u2191 Push now (' + Vsm.Mb(bytes) + ')', cls: 'Vsm__BtnPush', run: function() {
                var del = Vsm.El('Vsm__OptDeletes'), force = Vsm.El('Vsm__OptForceContent');
                Vsm.Operate('push', { ids: rows.map(function(p) { return p.id; }), allow_deletes: del ? del.checked : true,
                                      force_content: force ? force.checked : false }, function(res) {
                    if (res.nothing) return 'Nothing to push.';
                    return 'Pushed: ' + (res.plans || []).map(function(p) {
                        return p.id + ' +' + p.added.length + ' ~' + p.replaced.length + ' \u2212' + p.deleted.length;
                    }).join(', ');
                });
            } }
        ]);
    };
    // ------------------------------------------------------------


    // FUNCTION | Confirm a Collect (user data, server -> PC)
    // ------------------------------------------------------------
    Matrix.ConfirmCollect = function(ids) {
        var rows = ids.map(function(i) { return Vsm.State.plans[i]; }).filter(function(p) {
            return p && (Vsm__CollectCount(p) || p.user_pc_newer_count || p.content_server_only_count || p.content_server_newer_count);
        });
        if (!rows.length) { Vsm.Toast('Nothing to collect: compare first, or this PC already has everything.'); return; }
        var sum = function(k) { return rows.reduce(function(n, p) { return n + p[k]; }, 0); };
        var html = '<h2>\u2193 Collect from the server</h2><p>Brings user content and configs made on the server, and content made there ' +
            '(ValeVision Theia videos and posters), into this PC\u2019s mirror, ' +
            'where the server copy is newer or this PC has none. Nothing is deleted on either side. Any PC file it replaces is kept first in ' +
            '<code>' + Vsm.Esc(Vsm.State.config.Local.BackupRoot) + '\\collect__&lt;date&gt;</code>.</p>' +
            '<table class="Vsm__Table"><tr><th>Mapping</th><th>User data to collect</th><th>Project data (server newer)</th><th>Made on the server</th><th>PC newer</th><th>Content server-only</th><th>Content server-newer</th><th>Size</th></tr>' +
            rows.map(function(p) {
                return '<tr><td>' + Vsm.Esc(p.name) + '</td><td>' + p.user_collect_count + '</td><td>' + p.shared_collect_count + '</td><td>' + (p.content_collect_count || 0) + '</td><td>' + p.user_pc_newer_count + '</td><td>' +
                       p.content_server_only_count + '</td><td>' + p.content_server_newer_count + '</td><td>' + Vsm.Mb(p.collect_bytes) + '</td></tr>';
            }).join('') + '</table><div class="Vsm__Options">' +
            (sum('content_server_only_count') + sum('content_server_newer_count') ?
                '<label class="Vsm__Check"><input type="checkbox" id="Vsm__OptWithContent"> Also collect heavy content the server has (' +
                (sum('content_server_only_count') + sum('content_server_newer_count')) + ' file(s), may be large)</label>' : '') +
            (sum('user_pc_newer_count') ? '<label class="Vsm__Check"><input type="checkbox" id="Vsm__OptForceUser"> <span class="Vsm__Warn">Overwrite ' +
                sum('user_pc_newer_count') + ' user file(s) that are newer on this PC</span></label>' : '') +
            '<span class="Vsm__Muted">Files that changed on the server or this PC since Compare are skipped and listed.</span></div>';
        Vsm.OpenModal(html, [
            { label: 'Cancel' },
            { label: '\u2193 Collect now', cls: 'Vsm__BtnCollect', run: function() {
                var wc = Vsm.El('Vsm__OptWithContent'), fu = Vsm.El('Vsm__OptForceUser');
                Vsm.Operate('collect', { ids: rows.map(function(p) { return p.id; }), with_content: wc ? wc.checked : false,
                                         force_userdata: fu ? fu.checked : false }, function(res) {
                    if (res.nothing) return 'Nothing to collect.';
                    var skipped = (res.skipped_count || 0) + (res.skipped_local || []).length;
                    return 'Collected ' + res.received + ' file(s)' + (res.replaced_on_pc ? ', ' + res.replaced_on_pc + ' PC copies kept in the backup folder' : '') +
                           (skipped ? ', ' + skipped + ' skipped (changed since compare)' : '') + '.';
                });
            } }
        ]);
    };
    // ------------------------------------------------------------


    // FUNCTION | Confirm Undo and Seed
    // ------------------------------------------------------------
    Matrix.ConfirmUndo = function(id) {
        Vsm.OpenModal('<h2>Undo the last push of ' + Vsm.Esc(Vsm__Mapping(id).Name) + '?</h2>' +
            '<p>Files that push added are removed; files it replaced or deleted are restored from the server-side backup. ' +
            'It refuses if those files changed again since.</p>',
            [{ label: 'Cancel' }, { label: 'Undo last push', cls: 'Vsm__BtnDanger', run: function() {
                Vsm.Operate('undo', { id: id }, function(r) { return 'Undid ' + r.undid + ': removed ' + r.removed + ', restored ' + r.restored + '.'; });
            } }]);
    };

    Matrix.ConfirmSeed = function(id) {
        Vsm.OpenModal('<h2>Seed user data for ' + Vsm.Esc(Vsm__Mapping(id).Name) + '?</h2>' +
            '<p>Uploads this PC\u2019s user-data files <b>only where the server has no file of that name</b>. Server data is never overwritten. ' +
            'Use it once, when an app first moves to the server.</p>',
            [{ label: 'Cancel' }, { label: 'Seed missing files', cls: 'Vsm__BtnPrimary', run: function() {
                Vsm.Operate('seed', { ids: [id] }, function(r) { return 'Seed: ' + r.added + ' added, ' + r.kept + ' already on the server.'; });
            } }]);
    };
    // ------------------------------------------------------------


    // FUNCTION | Edit (or Add) a Mapping
    // ------------------------------------------------------------
    Matrix.ShowEdit = function(id, draft) {
        var m = draft || Vsm__Mapping(id), isNew = !!draft;
        var list = function(a) { return (a || []).join(', '); };
        var pats = Vsm.State.config.LanePatterns;
        Vsm.OpenModal('<h2>' + (isNew ? 'Add mapping' : 'Edit mapping') + '</h2><div class="Vsm__Form">' +
            '<label>Id</label><input type="text" id="Vsm__EdId" value="' + Vsm.Esc(m.Id) + '"' + (isNew ? '' : ' disabled') + '>' +
            '<label>Name</label><input type="text" id="Vsm__EdName" value="' + Vsm.Esc(m.Name) + '">' +
            '<label>Kind</label><select id="Vsm__EdKind"><option value="web"' + (m.Kind === 'web' ? ' selected' : '') + '>web (served by nginx)</option>' +
                '<option value="server"' + (m.Kind === 'server' ? ' selected' : '') + '>server only (never web-served)</option></select>' +
            '<div class="Vsm__Help">web leaves .md, .py, scripts and dev folders out of the code lane, so they are never public.</div>' +
            '<label>PC folder</label><input type="text" id="Vsm__EdLocal" value="' + Vsm.Esc(m.Local) + '">' +
            '<div class="Vsm__Help">Relative to the mirror root, or a full path.</div>' +
            '<label>Server path</label><input type="text" id="Vsm__EdRemote" value="' + Vsm.Esc(m.Remote) + '">' +
            '<div class="Vsm__Help">Relative to ' + Vsm.Esc(Vsm.State.config.Server.Root) + '. Same as the PC folder = mirror.</div>' +
            '<label>Heavy content folders</label><input type="text" id="Vsm__EdContent" value="' + Vsm.Esc(list(m.Content)) + '">' +
            '<div class="Vsm__Help">PC \u2192 server, newer wins, never deleted. Comma separated, relative to the mapping. Automatic for folders named ' +
                Vsm.Esc(pats.content.join(', ')) + '.</div>' +
            '<label>Default lane</label><select id="Vsm__EdLane"><option value="code"' + (m.DefaultLane !== 'shared' ? ' selected' : '') +
                '>Source code (PC \u2192 server mirror)</option><option value="shared"' + (m.DefaultLane === 'shared' ? ' selected' : '') +
                '>Project data (two-way, newer wins)</option></select>' +
            '<div class="Vsm__Help">For folders not named for a lane. Apps: source code. The project library: project data.</div>' +
            '<label>User data folders</label><input type="text" id="Vsm__EdUser" value="' + Vsm.Esc(list(m.UserData)) + '">' +
            '<div class="Vsm__Help">Server \u2192 PC (Collect), newer wins, never pushed or deleted. Automatic for ' + Vsm.Esc(pats.userdata.join(', ')) + '.</div>' +
            '<label>Extra excludes</label><input type="text" id="Vsm__EdExcl" value="' + Vsm.Esc(list(m.Exclude)) + '">' +
            '<div class="Vsm__Help">Comma separated patterns, e.g. <code>*.psd, 99__Scratch/</code>. Excluded files are invisible to sync on both sides.</div>' +
            '<label>Options</label><div>' +
                '<label class="Vsm__Check"><input type="checkbox" id="Vsm__EdEnabled"' + (m.Enabled !== false ? ' checked' : '') + '> Enabled</label> &nbsp; ' +
                '<label class="Vsm__Check"><input type="checkbox" id="Vsm__EdDeletes"' + (m.AllowDeletes !== false ? ' checked' : '') + '> Push deletes server code removed from the PC</label> &nbsp; ' +
                '<label class="Vsm__Check"><input type="checkbox" id="Vsm__EdFilesOnly"' + (m.FilesOnly ? ' checked' : '') + '> Top-level files only</label>' +
            '</div></div>',
            (isNew ? [] : [{ label: 'Remove mapping\u2026', cls: 'Vsm__BtnDanger', run: function() {
                Vsm.OpenModal('<h2>Remove the mapping ' + Vsm.Esc(m.Id) + '?</h2><p>Only the entry in the sync map is removed. Nothing on the server or this PC is deleted.</p>',
                    [{ label: 'Cancel' }, { label: 'Remove', cls: 'Vsm__BtnDanger', run: function() {
                        var cfg = Vsm.CloneConfig();
                        cfg.Mappings = cfg.Mappings.filter(function(x) { return x.Id !== m.Id; });
                        Vsm__Selected.delete(m.Id);
                        Vsm.SaveConfig(cfg, 'Mapping removed.');
                    } }]);
                return true;
            } }]).concat([{ label: 'Cancel' }, { label: 'Save', cls: 'Vsm__BtnPrimary', run: function() {
                var split = function(v) { return v.split(',').map(function(s) { return s.trim(); }).filter(Boolean); };
                var next = {
                    Id: Vsm.El('Vsm__EdId').value.trim(), Name: Vsm.El('Vsm__EdName').value.trim() || m.Id,
                    Kind: Vsm.El('Vsm__EdKind').value, Local: Vsm.El('Vsm__EdLocal').value.trim(),
                    Remote: Vsm.El('Vsm__EdRemote').value.trim() || '.', Enabled: Vsm.El('Vsm__EdEnabled').checked,
                    AllowDeletes: Vsm.El('Vsm__EdDeletes').checked, Exclude: split(Vsm.El('Vsm__EdExcl').value),
                    Content: split(Vsm.El('Vsm__EdContent').value), UserData: split(Vsm.El('Vsm__EdUser').value),
                    DefaultLane: Vsm.El('Vsm__EdLane').value
                };
                if (Vsm.El('Vsm__EdFilesOnly').checked) next.FilesOnly = true;
                var cfg = Vsm.CloneConfig();
                if (isNew) cfg.Mappings.push(next);
                else cfg.Mappings = cfg.Mappings.map(function(x) { return x.Id === m.Id ? next : x; });
                Vsm.SaveConfig(cfg, isNew ? 'Mapping added.' : 'Mapping saved.');
            } }]));
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Events
// -----------------------------------------------------------------------------

    // FUNCTION | Compare From Anywhere (also used by the Explorer)
    // ------------------------------------------------------------
    Matrix.Compare = function(ids) {
        return Vsm.Operate('compare', { ids: ids, deep: Vsm.El('Vsm__Deep').checked });
    };
    // ------------------------------------------------------------


    // FUNCTION | Clicks, Checkboxes and Path Edits Inside the Matrix
    // ------------------------------------------------------------
    function Vsm__OnClick(e) {
        if (!Vsm.El('Vsm__TabMatrix').contains(e.target)) return;
        var t = e.target.closest('[data-act], [data-select]');
        if (!t) return;
        if (t.dataset.select) {
            if (t.checked) Vsm__Selected.add(t.dataset.select); else Vsm__Selected.delete(t.dataset.select);
            Matrix.RenderToolbar();
            return;
        }
        var id = t.dataset.id, act = t.dataset.act;
        if (act === 'compare') Matrix.Compare([id]);
        else if (act === 'push') Matrix.ConfirmPush([id]);
        else if (act === 'collect') Matrix.ConfirmCollect([id]);
        else if (act === 'undo') Matrix.ConfirmUndo(id);
        else if (act === 'seed') Matrix.ConfirmSeed(id);
        else if (act === 'backup') Vsm.Operate('backup', { ids: [id] }, function(r) { return 'Snapshot: ' + (r.files || 0) + ' user-data file(s) saved to ' + r.dest; });
        else if (act === 'edit') Matrix.ShowEdit(id);
        else if (act === 'toggle') { if (Vsm__Expanded.has(id)) Vsm__Expanded.delete(id); else Vsm__Expanded.add(id); Matrix.Render(); }
        else if (act === 'add') {
            var folder = t.dataset.folder;
            Matrix.ShowEdit(null, { Id: folder.replace(/^Vale__/, '').toLowerCase().replace(/[^a-z0-9_-]/g, ''),
                                    Name: folder.replace(/^Vale__/, '').replace(/__/g, ' '), Kind: folder.indexOf('Server__') === 0 ? 'server' : 'web',
                                    Local: folder, Remote: folder, Enabled: true, AllowDeletes: true, Content: [], UserData: [], Exclude: [] });
        }
    }

    function Vsm__OnRemoteKey(e) {
        if (!e.target.dataset || !e.target.dataset.remote) return;
        if (e.key === 'Escape') { e.target.blur(); Matrix.Render(); return; }
        if (e.key !== 'Enter') return;
        var id = e.target.dataset.remote, value = e.target.value.trim().replace(/^\/+|\/+$/g, '') || '.';
        var cfg = Vsm.CloneConfig();
        cfg.Mappings.forEach(function(m) { if (m.Id === id) m.Remote = value; });
        e.target.blur();
        Vsm.SaveConfig(cfg, 'Server path saved. Compare again before pushing.');
    }
    // ------------------------------------------------------------


    // FUNCTION | Wire Up the Matrix
    // ------------------------------------------------------------
    Matrix.Init = function() {
        document.addEventListener('click', Vsm__OnClick);
        document.addEventListener('keydown', Vsm__OnRemoteKey);
        Vsm.El('Vsm__SelectAll').addEventListener('change', function(e) {
            Vsm__Selected = new Set(e.target.checked && Vsm.State ? Vsm.State.mappings.map(function(m) { return m.Id; }) : []);
            Matrix.Render();
        });
        Vsm.El('Vsm__BtnCompare').addEventListener('click', function() { Matrix.Compare(Array.from(Vsm__Selected)); });
        Vsm.El('Vsm__BtnPush').addEventListener('click', function() { Matrix.ConfirmPush(Vsm__Selection(function(p) { return Vsm__PushCount(p); })); });
        Vsm.El('Vsm__BtnCollect').addEventListener('click', function() { Matrix.ConfirmCollect(Vsm__Selection(function(p) { return Vsm__CollectCount(p); })); });
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

})();
