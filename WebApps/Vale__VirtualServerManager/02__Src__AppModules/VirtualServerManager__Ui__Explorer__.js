/* =============================================================================
   VALE VIRTUAL SERVER MANAGER - UI | TAB 01 LIVE SERVER EXPLORER
   =============================================================================

   FILE       : VirtualServerManager__Ui__Explorer__.js
   NAMESPACE  : Vsm.Explorer
   MODULE     : Ui - Live Server Explorer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Browse the Linux server's /srv/vale tree live, with every file and
                folder marked against this PC's mirror: lane and parity state
   CREATED    : 06-Oct-2026

   DESCRIPTION:
   - While this tab is open the local server holds ONE ssh session that streams
     the server tree every few seconds; this module polls /api/tree (local only)
     and redraws when the version changes.
   - Folders roll up what is inside them: to push, to collect, conflicts, deletes.
   - Pausing (or leaving the tab) lets the local server hang up after 90 s.
   - Delete from the server: tick files (a folder ticks every deletable file
     inside it that the search and filters show; Shift ticks a range), then
     Delete from server, or use the detail panel's button for one file or
     folder. A modal lists every file and asks first. Each file is backed up
     and journaled on the server, so Undo last push in tab 02 restores them.

   =============================================================================

   DEVELOPMENT LOG:
   07-Oct-2026 - Version 0.8.0
   - Content made on the server (ServerMadeContent) that the PC lacks or has older
     shows as collect, with its own explanation.

   07-Oct-2026 - Version 0.7.0
   - Delete files from the server, with a confirm modal (asked for by Adam:
     superseded GLBs left in a project's Content__ folder). Tick boxes on every
     row; the users register, secrets and other files left out of sync, and
     unmapped files cannot be ticked. User data and project records need an
     extra tick in the modal. Optionally moves this PC's copies to
     90__ServerBackups too, so a push does not send them back.

   06-Oct-2026 - Version 0.4.4
   - Created (this PC's creation time) and Last synced (when push / collect last moved
     the file, from the sync ledger; folders show their latest file) columns. The
     Name column stretches so the table fills its card.

   06-Oct-2026 - Version 0.4.3
   - Click Name / Status / Size / Modified to sort (shared sort system; folders stay
     above files). Columns size to their content.

   06-Oct-2026 - Version 0.2.0
   - Initial build.

   ============================================================================= */

(function() {

    var Vsm = window.Vsm;
    var Explorer = Vsm.Explorer = {};

// -----------------------------------------------------------------------------
// REGION | State and Constants
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Tree State
    // ------------------------------------------------------------
    var Vsm__Version   = null;                                                 // <-- Last tree version received
    var Vsm__Payload   = null;                                                 // <-- Last /api/tree payload (status part)
    var Vsm__Nodes     = new Map();                                            // <-- rel -> node
    var Vsm__Roots     = [];
    var Vsm__Expanded  = new Set();
    var Vsm__SelectedRel = '';
    var Vsm__Timer     = null;
    var Vsm__Visible   = false;
    var Vsm__LiveOn    = Vsm.Store('LiveOn') !== '0';
    var Vsm__RowLimit  = 4000;                                                 // <-- Keep the DOM light
    var Vsm__Sort      = Vsm.SortState('Tree', { key: 'name', dir: 1 });       // <-- Shared sort system (Ui__Core__)
    // ------------------------------------------------------------


    // MODULE VARIABLES | Files Ticked for Deleting From the Server
    // ------------------------------------------------------------
    var Vsm__Picked    = new Set();                                            // <-- Root-relative server file paths
    var Vsm__PickAnchor = '';                                                  // <-- Last file ticked, for Shift ranges
    var Vsm__PickOrder = [];                                                   // <-- Deletable files in the order drawn
    var Vsm__REGISTER  = 'Server__UserAccountData/UserAccountData__ValeUsers__Register__.json';   // <-- Never deleted: untick Active
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Verdict Labels and Roll-Up Keys
    // ------------------------------------------------------------
    var Vsm__VerdictText = {
        'same': '✓ in sync', 'push': '↑ push', 'delete': '× delete', 'server-newer': '! server newer',
        'server-only': 'server only', 'collect': '↓ collect', 'pc-newer': '! PC newer', 'pc-only': 'PC only',
        'not-synced': 'not synced', 'unmapped': 'unmapped'
    };
    var Vsm__VerdictRank = {                                                   // <-- Status sort: most urgent first
        'delete': 0, 'server-newer': 1, 'pc-newer': 1, 'push': 2, 'collect': 3, 'server-only': 4, 'pc-only': 5,
        'same': 6, 'not-synced': 7, 'unmapped': 8
    };
    var Vsm__RollKey = {
        'push': 'push', 'delete': 'delete', 'collect': 'collect', 'server-newer': 'conflict', 'pc-newer': 'conflict',
        'server-only': 'serverOnly', 'pc-only': 'pcOnly', 'same': 'same'
    };
    var Vsm__Explain = {
        'same'        : 'Identical on both sides (size and modified time).',
        'push-code'   : 'Source code lane: this PC’s copy is new or different. <b>Push</b> uploads it; the server mirrors the PC.',
        'push-content': 'Heavy content lane: this PC’s copy is new or newer. <b>Push</b> uploads it.',
        'delete'      : 'Source code lane: no longer on this PC. <b>Push</b> deletes it from the server (backed up first).',
        'server-newer': 'Conflict: the server copy is newer. Push skips it unless you tick “overwrite”; Collect with content brings it to this PC.',
        'server-only' : 'Heavy content only on the server (e.g. uploaded there). Collect with content brings it to this PC.',
        'collect'     : 'User data lane: the server copy is new or newer. <b>Collect</b> brings it to this PC.',
        'pc-newer'    : 'Conflict: this PC’s copy is newer. User data is never pushed; Collect skips it unless you tick “overwrite”.',
        'pc-only'     : 'User data only on this PC. It is never pushed; <b>Seed</b> adds it where the server has none.',
        'not-synced'  : 'Left out of sync: secrets, docs, scripts or dev folders, by the mapping’s rules.',
        'unmapped'    : 'Not in any mapping. Add the folder in the Parity matrix to sync it.',
        'shared-push' : 'Project data (two-way): this PC\u2019s copy is newer or new. <b>Push</b> uploads it.',
        'shared-collect': 'Project data (two-way): the server copy is newer or new. <b>Collect</b> brings it to this PC.',
        'content-collect': 'Heavy content made on the server (ServerMadeContent, e.g. ValeVision Theia videos and posters): the server copy is new or newer. <b>Collect</b> brings it to this PC.'
    };
    var Vsm__LaneName = { code: 'Source code', content: 'Heavy content', userdata: 'User data', shared: 'Project data' };
    var Vsm__IconDir  = '<svg class="Vsm__Icon" viewBox="0 0 16 16"><path fill="#c9a04a" d="M1 3.5A1.5 1.5 0 0 1 2.5 2h3.6l1.5 1.6h5.9A1.5 1.5 0 0 1 15 5.1v7.4a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5z"/></svg>';
    var Vsm__IconFile = '<svg class="Vsm__Icon" viewBox="0 0 16 16"><path fill="#9aa7b2" d="M3 1.5h6.2L13 5.3v9.2H3z"/><path fill="#dfe5ea" d="M9 1.5v4h4"/></svg>';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Building the Tree
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Empty Roll-Up Counter
    // ------------------------------------------------------------
    function Vsm__Roll() { return { push: 0, delete: 0, collect: 0, conflict: 0, serverOnly: 0, pcOnly: 0, same: 0 }; }
    // ------------------------------------------------------------


    // FUNCTION | Build Nodes, Children and Roll-Ups From the Server Rows
    // ------------------------------------------------------------
    function Vsm__Build(rows) {
        Vsm__Nodes = new Map();
        Vsm__Roots = [];
        rows.forEach(function(r) {
            var rel = r[0], cut = rel.lastIndexOf('/');
            Vsm__Nodes.set(rel, {
                rel: rel, name: cut < 0 ? rel : rel.slice(cut + 1), parent: cut < 0 ? '' : rel.slice(0, cut),
                depth: rel.split('/').length - 1, dir: r[1] === 'd',
                s: r[2] != null || r[1] === 'd' && r[3] != null ? [r[2], r[3]] : null,
                l: r[4] != null || r[1] === 'd' && r[5] != null ? [r[4], r[5]] : null,
                mid: r[6], lane: r[7], verdict: r[8], born: r[9] || null, sync: r[10] || null,
                kids: [], roll: Vsm__Roll()
            });
        });
        Vsm__Nodes.forEach(function(n) {
            var p = n.parent && Vsm__Nodes.get(n.parent);
            if (p) p.kids.push(n); else Vsm__Roots.push(n);
            if (n.dir) return;
            for (var s = p; n.sync && s; s = s.parent && Vsm__Nodes.get(s.parent)) {     // <-- Folders: latest sync inside
                if (!s.sync || s.sync[0] < n.sync[0]) s.sync = n.sync;
            }
            var key = Vsm__RollKey[n.verdict];
            if (!key) return;
            for (var a = p; a; a = a.parent && Vsm__Nodes.get(a.parent)) a.roll[key] += 1;
        });
        Vsm__SortTree();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Sort Every Folder's Children by the Current Column (folders stay above files)
    // ------------------------------------------------------------
    function Vsm__SortValueOf(n) {
        var k = Vsm__Sort.key, e = n.s || n.l;
        if (k === 'size') return n.dir || !e ? null : e[0];
        if (k === 'modified') return e ? e[1] : null;
        if (k === 'created') return n.born;
        if (k === 'synced') return n.sync ? n.sync[0] : null;
        if (k === 'status') {
            if (!n.dir) return Vsm__VerdictRank[n.verdict] != null ? Vsm__VerdictRank[n.verdict] : 9;
            var r = n.roll;
            return r.delete ? 0 : r.conflict ? 1 : r.push ? 2 : r.collect ? 3 : r.serverOnly ? 4 : r.pcOnly ? 5 : r.same ? 6 : 7;
        }
        return n.name.toLowerCase();
    }

    function Vsm__SortTree() {
        var order = function(a, b) {
            if (a.dir !== b.dir) return a.dir ? -1 : 1;
            return Vsm.SortCompare(Vsm__SortValueOf(a), Vsm__SortValueOf(b), Vsm__Sort.dir) ||
                   Vsm.SortCompare(a.name.toLowerCase(), b.name.toLowerCase(), 1);   // <-- Ties: by name
        };
        Vsm__Roots.sort(order);
        Vsm__Nodes.forEach(function(n) { if (n.kids.length) n.kids.sort(order); });
    }
    // ------------------------------------------------------------


    // FUNCTION | Which Nodes Pass the Search / Difference / Lane Filters
    // ------------------------------------------------------------
    function Vsm__FilterSet() {
        var term = Vsm.El('Vsm__Search').value.trim().toLowerCase();
        var diffOnly = Vsm.El('Vsm__DiffOnly').checked;
        var lane = Vsm.El('Vsm__LaneFilter').value;
        if (!term && !diffOnly && !lane) return null;
        var keep = new Set();
        Vsm__Nodes.forEach(function(n) {
            var ok = true;
            if (term && n.rel.toLowerCase().indexOf(term) < 0) ok = false;
            if (lane && n.lane !== lane) ok = false;
            if (diffOnly && (n.dir || ['same', 'not-synced', 'unmapped'].indexOf(n.verdict) >= 0)) ok = false;
            if (!ok) return;
            keep.add(n.rel);
            for (var a = n.parent; a; a = (Vsm__Nodes.get(a) || {}).parent) keep.add(a);
        });
        return keep;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Can This File Be Deleted From the Server Here?
    // ------------------------------------------------------------
    // Only files the server has, inside a mapping and synced by it. Secrets and
    // anything else the mapping leaves out stay invisible to sync, so they stay
    // out of reach here too; the server checks all of this again.
    // ------------------------------------------------------------
    function Vsm__Deletable(n) {
        return !!n && !n.dir && !!n.s && !!n.mid && n.verdict !== 'not-synced' && n.verdict !== 'unmapped' &&
               n.rel !== Vsm__REGISTER;
    }

    function Vsm__WhyNot(n) {
        if (n.dir) return 'Nothing inside this folder can be deleted from here.';
        if (!n.s) return 'Not on the server.';
        if (n.rel === Vsm__REGISTER) return 'The users register is never deleted: untick Active in tab 04.';
        if (!n.mid) return 'Not in any mapping.';
        return 'Left out of sync by the mapping’s rules (secrets, docs, scripts), so it cannot be deleted from here.';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Deletable Files Inside a Folder (only those the filters show)
    // ------------------------------------------------------------
    function Vsm__DeletableUnder(n, keep) {
        var out = [];
        var walk = function(x) {
            if (keep && !keep.has(x.rel)) return;
            if (!x.dir) { if (Vsm__Deletable(x)) out.push(x.rel); return; }
            x.kids.forEach(walk);
        };
        walk(n);
        return out;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Forget Ticks for Files the Server No Longer Has
    // ------------------------------------------------------------
    function Vsm__PrunePicked() {
        Vsm__Picked.forEach(function(rel) { if (!Vsm__Deletable(Vsm__Nodes.get(rel))) Vsm__Picked.delete(rel); });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Rendering
// -----------------------------------------------------------------------------

    // SUB HELPER FUNCTION | Status Cell: Verdict for Files, Roll-Up for Folders
    // ------------------------------------------------------------
    function Vsm__StatusCell(n) {
        if (!n.dir) {
            return '<span class="Vsm__Verdict v-' + n.verdict + '">' + (Vsm__VerdictText[n.verdict] || n.verdict) + '</span>';
        }
        var r = n.roll, bits = [];
        if (r.push) bits.push('<span class="r-push" title="to push">↑' + r.push + '</span>');
        if (r.collect) bits.push('<span class="r-collect" title="to collect">↓' + r.collect + '</span>');
        if (r.conflict) bits.push('<span class="r-conflict" title="conflicts">!' + r.conflict + '</span>');
        if (r.delete) bits.push('<span class="r-delete" title="push deletes">×' + r.delete + '</span>');
        if (!bits.length && r.same) bits.push('<span class="r-same">✓ ' + r.same + '</span>');
        return '<span class="Vsm__Roll">' + bits.join('') + '</span>';
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Last Synced Cell: Time and Direction (↑ pushed, ↓ collected)
    // ------------------------------------------------------------
    function Vsm__SyncCell(n) {
        if (!n.sync) return '<span class="Vsm__When"></span>';
        var up = n.sync[1] === 'push';
        return '<span class="Vsm__When" title="' + (n.dir ? 'Latest file inside ' : '') + (up ? 'pushed' : 'collected') + ' ' +
               Vsm.Ago(n.sync[0]) + '">' + Vsm.When(n.sync[0]) + ' <span class="Vsm__SyncDir">' + (up ? '↑' : '↓') + '</span></span>';
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Name Cell With Chevron, Icon and Lane / Mapping Badges
    // ------------------------------------------------------------
    function Vsm__PickBox(n, keep) {
        var rels = n.dir ? Vsm__DeletableUnder(n, keep) : (Vsm__Deletable(n) ? [n.rel] : []);
        if (!rels.length) {
            return '<input type="checkbox" class="Vsm__Pick" disabled title="' + Vsm.Esc(Vsm__WhyNot(n)) + '">';
        }
        var picked = rels.filter(function(r) { return Vsm__Picked.has(r); }).length;
        var title = n.dir ? 'Tick the ' + rels.length + ' file' + (rels.length === 1 ? '' : 's') + ' inside that can be deleted from the server' +
                            (keep ? ' (only those the search and filters show)' : '')
                          : 'Tick to delete from the server (Shift: a range)';
        return '<input type="checkbox" class="Vsm__Pick" data-pick="' + Vsm.Esc(n.rel) + '"' + (picked === rels.length ? ' checked' : '') +
               (picked && picked < rels.length ? ' data-partial="1"' : '') + ' title="' + Vsm.Esc(title) + '">';
    }

    function Vsm__NameCell(n, open, keep) {
        var parent = n.parent && Vsm__Nodes.get(n.parent);
        var badges = '';
        if (n.dir && n.mid && (!parent || parent.mid !== n.mid)) badges += ' <span class="Vsm__Badge kind-web">' + Vsm.Esc(n.mid) + '</span>';
        if (n.dir && !n.mid && !parent) badges += ' <span class="Vsm__Badge is-off">unmapped</span>';
        if (n.dir && n.lane && n.lane !== 'code' && (!parent || parent.lane !== n.lane))
            badges += ' <span class="Vsm__Badge lane-' + n.lane + '">' + Vsm__LaneName[n.lane] + '</span>';
        return '<div class="Vsm__NameCell">' + Vsm__PickBox(n, keep) +
               '<span class="Vsm__Indent" style="width:' + (n.depth * 16) + 'px"></span>' +
               '<span class="Vsm__Chevron" data-toggle="' + Vsm.Esc(n.rel) + '">' + (n.dir ? (open ? '▾' : '▸') : '') + '</span>' +
               (n.dir ? Vsm__IconDir : Vsm__IconFile) +
               '<span class="Vsm__Name' + (n.dir ? ' is-dir' : '') + '"' + (n.dir ? ' data-toggle="' + Vsm.Esc(n.rel) + '"' : '') +
               ' title="' + Vsm.Esc(n.rel) + '">' + Vsm.Esc(n.name) + '</span>' + badges + '</div>';
    }
    // ------------------------------------------------------------


    // FUNCTION | Render the Tree Rows
    // ------------------------------------------------------------
    function Vsm__RenderTree() {
        var host = Vsm.El('Vsm__Tree');
        if (!Vsm__Nodes.size) {
            var live = Vsm__Payload && Vsm__Payload.live;
            host.innerHTML = '<div class="Vsm__TreeEmpty">' + (live && live.missing
                ? 'The server root does not exist yet. Settings → Prepare server root.'
                : (live && live.status === 'live' ? 'The server root is empty.' : 'Waiting for the server…')) + '</div>';
            return;
        }
        var keep = Vsm__FilterSet();
        var html = ['<div class="Vsm__TreeHead"><span' + Vsm.SortHead(Vsm__Sort, 'name') + '>Name</span>' +
                    '<span' + Vsm.SortHead(Vsm__Sort, 'status') + ' title="Most urgent first">Status</span>' +
                    '<span' + Vsm.SortHead(Vsm__Sort, 'size') + ' style="text-align:right">Size</span>' +
                    '<span' + Vsm.SortHead(Vsm__Sort, 'created') + ' style="text-align:right" title="Created on this PC">Created</span>' +
                    '<span' + Vsm.SortHead(Vsm__Sort, 'modified') + ' style="text-align:right">Modified</span>' +
                    '<span' + Vsm.SortHead(Vsm__Sort, 'synced') + ' style="text-align:right" title="Last pushed or collected by this manager">Last synced</span></div>'];
        var count = 0, truncated = false;
        Vsm__PickOrder = [];
        var walk = function(list) {
            for (var i = 0; i < list.length; i++) {
                var n = list[i];
                if (keep && !keep.has(n.rel)) continue;
                if (count >= Vsm__RowLimit) { truncated = true; return; }
                var open = n.dir && (keep ? true : Vsm__Expanded.has(n.rel));
                var size = n.dir ? '' : Vsm.Mb(n.s ? n.s[0] : (n.l ? n.l[0] : null));
                var when = n.s ? Vsm.When(n.s[1]) : (n.l ? Vsm.When(n.l[1]) : '');
                if (Vsm__Deletable(n)) Vsm__PickOrder.push(n.rel);
                html.push('<div class="Vsm__Row' + (n.rel === Vsm__SelectedRel ? ' is-selected' : '') + (n.s ? '' : ' is-missing-server') +
                          (Vsm__Picked.has(n.rel) ? ' is-picked' : '') +
                          '" data-rel="' + Vsm.Esc(n.rel) + '">' + Vsm__NameCell(n, open, keep) + Vsm__StatusCell(n) +
                          '<span class="Vsm__Size">' + size + '</span><span class="Vsm__When">' + Vsm.When(n.born) + '</span>' +
                          '<span class="Vsm__When">' + when + '</span>' + Vsm__SyncCell(n) + '</div>');
                count++;
                if (open) walk(n.kids);
            }
        };
        walk(Vsm__Roots);
        if (truncated) html.push('<div class="Vsm__TreeEmpty">Showing the first ' + Vsm__RowLimit + ' rows: narrow the search to see more.</div>');
        var scroll = host.scrollTop;
        host.innerHTML = html.join('');
        host.scrollTop = scroll;
        host.querySelectorAll('.Vsm__Pick[data-partial]').forEach(function(b) { b.indeterminate = true; });   // <-- Some, not all, inside
        Vsm__RenderPickBar();
    }
    // ------------------------------------------------------------


    // FUNCTION | The Toolbar's Ticked Count and Delete Button
    // ------------------------------------------------------------
    function Vsm__RenderPickBar() {
        var bar = Vsm.El('Vsm__PickBar');
        if (!bar) return;
        bar.hidden = !Vsm__Picked.size;
        if (!Vsm__Picked.size) return;
        var bytes = 0;
        Vsm__Picked.forEach(function(rel) { var n = Vsm__Nodes.get(rel); if (n && n.s) bytes += n.s[0] || 0; });
        Vsm.El('Vsm__PickInfo').textContent = Vsm__Picked.size + ' ticked · ' + Vsm.Mb(bytes);
    }
    // ------------------------------------------------------------


    // FUNCTION | Render the Detail Panel for the Selected Node
    // ------------------------------------------------------------
    function Vsm__RenderDetail() {
        var host = Vsm.El('Vsm__Detail');
        var n = Vsm__SelectedRel && Vsm__Nodes.get(Vsm__SelectedRel);
        if (!n) { host.innerHTML = '<span class="Vsm__Muted">Select a file or folder.</span>'; return; }
        var root = (Vsm__Payload.root || '').replace(/\/$/, ''), mirror = (Vsm__Payload.mirror || '').replace(/\\$/, '');
        var side = function(e) { return e ? (n.dir ? 'present' : Vsm.Mb(e[0]) + ' · ' + Vsm.When(e[1])) : '<span class="Vsm__Muted">absent</span>'; };
        var key = n.lane === 'shared' && (n.verdict === 'push' || n.verdict === 'collect') ? 'shared-' + n.verdict
                : n.lane === 'content' && n.verdict === 'collect' ? 'content-collect'
                : n.verdict === 'push' ? 'push-' + (n.lane === 'content' ? 'content' : 'code') : n.verdict;
        var html = '<h3>' + Vsm.Esc(n.name) + '</h3><dl>' +
            '<dt>Server</dt><dd><code>' + Vsm.Esc(root + '/' + n.rel) + '</code><br>' + side(n.s) + '</dd>' +
            '<dt>This PC</dt><dd><code>' + Vsm.Esc(mirror + '\\' + n.rel.replace(/\//g, '\\')) + '</code><br>' + side(n.l) + '</dd>' +
            '<dt>Mapping</dt><dd>' + (n.mid ? Vsm.Esc(n.mid) : '<span class="Vsm__Muted">none</span>') + '</dd>' +
            '<dt>Created</dt><dd>' + (n.born ? Vsm.When(n.born) + ' <span class="Vsm__Muted">on this PC</span>' : '<span class="Vsm__Muted">-</span>') + '</dd>' +
            '<dt>Last synced</dt><dd>' + (n.sync ? Vsm.When(n.sync[0]) + ' · ' + (n.sync[1] === 'push' ? 'pushed' : 'collected') +
                (n.dir ? ' <span class="Vsm__Muted">(latest file inside)</span>' : '') : '<span class="Vsm__Muted">not since the ledger began</span>') + '</dd>' +
            '<dt>Lane</dt><dd>' + (n.lane ? '<span class="Vsm__Badge lane-' + n.lane + '">' + Vsm__LaneName[n.lane] + '</span>' : '-') + '</dd></dl>';
        if (n.dir) {
            var r = n.roll;
            html += '<div class="Vsm__Explain">Inside: ' + [r.push + ' to push', r.collect + ' to collect', r.conflict + ' conflicts',
                    r.delete + ' push would delete', r.serverOnly + ' server only', r.pcOnly + ' PC only', r.same + ' in sync'].join(' · ') + '</div>';
        } else {
            html += '<div class="Vsm__Explain"><span class="Vsm__Verdict v-' + n.verdict + '">' + (Vsm__VerdictText[n.verdict] || '') + '</span><br>' +
                    (Vsm__Explain[key] || '') + '</div>';
        }
        if (n.mid) html += '<p><button class="Vsm__BtnPrimary" data-compare="' + Vsm.Esc(n.mid) + '">Compare ' + Vsm.Esc(n.mid) + ' in the matrix</button></p>';
        var gone = n.dir ? Vsm__DeletableUnder(n, null) : (Vsm__Deletable(n) ? [n.rel] : []);
        if (gone.length) {
            html += '<p><button class="Vsm__BtnDanger" data-delete-node="' + Vsm.Esc(n.rel) + '">Delete ' +
                    (n.dir ? gone.length + ' file' + (gone.length === 1 ? '' : 's') + ' inside' : 'this file') + ' from the server…</button></p>';
        }
        host.innerHTML = html;
    }
    // ------------------------------------------------------------


    // FUNCTION | Live Status Pill, Button and Info Line
    // ------------------------------------------------------------
    function Vsm__RenderLive() {
        var live = Vsm__Payload ? Vsm__Payload.live : null;
        var pill = Vsm.El('Vsm__LivePill'), btn = Vsm.El('Vsm__BtnLive');
        btn.textContent = Vsm__LiveOn ? 'Pause live' : 'Go live';
        if (!Vsm__LiveOn) {
            pill.className = 'Vsm__Pill is-light';
            pill.textContent = 'Paused · showing the last view';
        } else if (!live) {
            pill.className = 'Vsm__Pill is-light is-warn';
            pill.textContent = 'Starting…';
        } else if (live.status === 'live') {
            pill.className = 'Vsm__Pill is-light is-live';
            pill.textContent = 'Live · updated ' + (live.age_s == null ? '-' : live.age_s + ' s ago');
        } else {
            pill.className = 'Vsm__Pill is-light ' + (live.status === 'blocked' ? 'is-bad' : 'is-warn');
            pill.textContent = { connecting: 'Connecting…', retrying: 'Reconnecting', blocked: 'Blocked', off: 'Idle' }[live.status] || live.status;
        }
        pill.title = live && live.detail ? live.detail : '';
        var info = Vsm__Nodes.size ? Vsm__Nodes.size + ' items' : '';
        if (live && live.stats && live.stats.walk_s != null) info += ' · server scan ' + live.stats.walk_s + ' s';
        if (live && live.detail && live.status !== 'live') info += ' · ' + live.detail;
        Vsm.El('Vsm__TreeInfo').textContent = info;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Deleting From the Server
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Confirm Modal Limits
    // ------------------------------------------------------------
    var Vsm__DeleteListMax = 400;                                              // <-- Rows listed in the modal; the rest are counted
    // ------------------------------------------------------------


    // FUNCTION | Ask First: Delete These Files From the Server
    // ------------------------------------------------------------
    // rels: root-relative server files. Everything the server is about to lose
    // is listed, with what it will mean: user data and project records need an
    // extra tick, and a PC copy that a push would send back can go too.
    // ------------------------------------------------------------
    function Vsm__ConfirmDelete(rels) {
        var items = rels.map(function(r) { return Vsm__Nodes.get(r); }).filter(Vsm__Deletable)
                        .sort(function(a, b) { return a.rel < b.rel ? -1 : 1; });
        if (!items.length) { Vsm.Toast('Nothing ticked can be deleted from the server.', true); return; }
        var root  = (Vsm__Payload.root || '/srv/vale').replace(/\/$/, '');
        var bytes = 0, mids = {}, userish = [], onPc = [], comesBack = [];
        items.forEach(function(n) {
            bytes += n.s[0] || 0;
            mids[n.mid] = (mids[n.mid] || 0) + 1;
            if (n.lane === 'userdata' || n.lane === 'shared') userish.push(n);
            if (n.l) { onPc.push(n); if (n.lane !== 'userdata') comesBack.push(n); }
        });
        var midList = Object.keys(mids);
        var count   = items.length + ' file' + (items.length === 1 ? '' : 's');
        var rows = items.slice(0, Vsm__DeleteListMax).map(function(n) {
            return '<tr><td><code>' + Vsm.Esc(n.rel) + '</code></td><td>' + Vsm.Esc(Vsm__LaneName[n.lane] || n.lane) + '</td>' +
                   '<td><span class="Vsm__Verdict v-' + n.verdict + '">' + (Vsm__VerdictText[n.verdict] || n.verdict) + '</span></td>' +
                   '<td style="text-align:right">' + Vsm.Mb(n.s[0]) + '</td><td>' + Vsm.When(n.s[1]) + '</td></tr>';
        }).join('');
        var more = items.length > Vsm__DeleteListMax ? '<p class="Vsm__Muted">…and ' + (items.length - Vsm__DeleteListMax) + ' more.</p>' : '';

        var html = '<h2>Delete ' + count + ' from the server?</h2>' +
            '<p>They are removed from the live server now, under <code>' + Vsm.Esc(root) + '</code> (one connection). ' +
            '<b>' + count + ' · ' + Vsm.Mb(bytes) + '</b> in ' + midList.map(function(m) { return '<b>' + Vsm.Esc(m) + '</b> (' + mids[m] + ')'; }).join(', ') + '.</p>' +
            '<div class="Vsm__DeleteList"><table class="Vsm__Table"><thead><tr><th>File</th><th>Lane</th><th>Status</th>' +
            '<th style="text-align:right">Size</th><th>Modified</th></tr></thead><tbody>' + rows + '</tbody></table></div>' + more;

        var checks = '';
        if (userish.length) {
            checks += '<label class="Vsm__Check Vsm__Warn"><input type="checkbox" id="Vsm__DelAck"> ' + userish.length + ' of these ' +
                      (userish.length === 1 ? 'is' : 'are') + ' user data or project records, made in the apps, perhaps by other people. ' +
                      'I have checked they can go.</label>';
        }
        if (onPc.length) {
            checks += '<label class="Vsm__Check"><input type="checkbox" id="Vsm__DelPc"> Also remove this PC’s copies (' + onPc.length +
                      ' file' + (onPc.length === 1 ? '' : 's') + '): moved to <code>90__ServerBackups\\deleted__&lt;time&gt;</code>, not deleted</label>' +
                      (comesBack.length ? '<div class="Vsm__Muted" id="Vsm__DelPcNote">Left ticked off, ' + comesBack.length + ' of them ' +
                      (comesBack.length === 1 ? 'is' : 'are') + ' sent back to the server by the next push.</div>' : '');
        }
        if (checks) html += '<div class="Vsm__Options">' + checks + '</div>';
        html += '<p class="Vsm__Muted">Each file is copied to <code>/srv/vale-sync/backups/&lt;stamp&gt;/</code> first and the delete is journaled: ' +
                'to put them back, use <b>Undo last push</b> on ' + midList.map(Vsm.Esc).join(', ') + ' in tab 02 (before that mapping is pushed again). ' +
                'Folders are kept, even when emptied.</p>';

        Vsm.OpenModal(html, [
            { label: 'Cancel' },
            { label: 'Delete ' + count + ' from the server', cls: 'Vsm__BtnDanger', run: function() {
                var ack = Vsm.El('Vsm__DelAck');
                if (ack && !ack.checked) { Vsm.Toast('Tick the box to confirm the user data and project records can go.', true); return true; }
                var pc = Vsm.El('Vsm__DelPc');
                Vsm__RunDelete(items, !!(pc && pc.checked));
            } }
        ]);
    }
    // ------------------------------------------------------------


    // FUNCTION | Run the Delete (one server session) and Report It
    // ------------------------------------------------------------
    // Sends the size and time each file had when it was shown, so the server
    // refuses the whole job if any of them changed since.
    // ------------------------------------------------------------
    function Vsm__RunDelete(items, pc) {
        var files = {};
        items.forEach(function(n) { (files[n.mid] = files[n.mid] || {})[n.rel] = [n.s[0], n.s[1]]; });
        Vsm.Operate('delete', { files: files, pc: pc }, function(res) {
            var n = (res.plans || []).reduce(function(t, p) { return t + (p.deleted || []).length; }, 0);
            return 'Deleted ' + n + ' file' + (n === 1 ? '' : 's') + ' from the server (backup ' + res.stamp + '). ' +
                   'To put them back: tab 02, Undo last push on ' + (res.plans || []).map(function(p) { return p.id; }).join(', ') + '.' +
                   (res.pc_moved ? ' ' + res.pc_moved + ' PC cop' + (res.pc_moved === 1 ? 'y' : 'ies') + ' moved to ' + res.pc_backup + '.' : '');
        }).then(function(res) {
            if (!res || !res.ok) return;
            items.forEach(function(x) { Vsm__Picked.delete(x.rel); });
            Vsm__RenderTree();
            Vsm__RenderDetail();
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Tick or Untick One File, a Folder's Files, or a Shift Range
    // ------------------------------------------------------------
    function Vsm__TogglePick(rel, shift) {
        var n = Vsm__Nodes.get(rel);
        if (!n) return;
        var keep = Vsm__FilterSet();
        var rels = n.dir ? Vsm__DeletableUnder(n, keep) : [rel];
        if (!n.dir && shift && Vsm__PickAnchor) {
            var a = Vsm__PickOrder.indexOf(Vsm__PickAnchor), b = Vsm__PickOrder.indexOf(rel);
            if (a >= 0 && b >= 0) rels = Vsm__PickOrder.slice(Math.min(a, b), Math.max(a, b) + 1);
        }
        var on = n.dir ? !rels.every(function(r) { return Vsm__Picked.has(r); }) : !Vsm__Picked.has(rel);
        rels.forEach(function(r) { if (on) Vsm__Picked.add(r); else Vsm__Picked.delete(r); });
        if (!n.dir) Vsm__PickAnchor = rel;
        Vsm__RenderTree();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Polling and Events
// -----------------------------------------------------------------------------

    // FUNCTION | Poll the Local Server for the Tree (cheap: local only)
    // ------------------------------------------------------------
    function Vsm__Poll() {
        window.clearTimeout(Vsm__Timer);
        if (!Vsm__Visible || !Vsm__LiveOn) return;
        fetch('/api/tree?v=' + encodeURIComponent(Vsm__Version || ''), { cache: 'no-store' })
            .then(function(r) { return r.json(); })
            .then(function(p) {
                Vsm.El('Vsm__Offline').hidden = true;
                Vsm__Payload = p;
                Vsm.RenderHeader(p.gateway, p.live);
                if (p.nodes) {
                    Vsm__Version = p.version;
                    Vsm__Build(p.nodes);
                    Vsm__PrunePicked();                                         // <-- Gone from the server: no longer ticked
                    Vsm__RenderTree();
                    Vsm__RenderDetail();
                }
                Vsm__RenderLive();
            })
            .catch(function() { Vsm.El('Vsm__Offline').hidden = false; })
            .then(function() { Vsm__Timer = window.setTimeout(Vsm__Poll, 2000); });
    }
    // ------------------------------------------------------------


    // FUNCTION | Show / Hide (called by the tab switcher)
    // ------------------------------------------------------------
    Explorer.Show = function() {
        Vsm__Visible = true;
        if (Vsm__LiveOn) Vsm.Post('/api/live', { on: true }).catch(function() {});
        Vsm__RenderLive();
        Vsm__Poll();
    };

    Explorer.Hide = function() {
        Vsm__Visible = false;
        window.clearTimeout(Vsm__Timer);
    };
    // ------------------------------------------------------------


    // FUNCTION | Clicks in the Tree and the Detail Panel
    // ------------------------------------------------------------
    function Vsm__OnClick(e) {
        if (!Vsm.El('Vsm__TabExplorer').contains(e.target)) return;
        var pick = e.target.closest('input[data-pick]');
        if (pick) { Vsm__TogglePick(pick.dataset.pick, e.shiftKey); return; }
        var del = e.target.closest('[data-delete-node]');
        if (del) {
            var dn = Vsm__Nodes.get(del.dataset.deleteNode);
            if (dn) Vsm__ConfirmDelete(dn.dir ? Vsm__DeletableUnder(dn, null) : [dn.rel]);
            return;
        }
        var th = e.target.closest('.Vsm__TreeHead [data-sort]');
        if (th) {
            Vsm__Sort = Vsm.SortToggle('Tree', Vsm__Sort, th.dataset.sort);
            Vsm__SortTree();
            Vsm__RenderTree();
            return;
        }
        var tog = e.target.closest('[data-toggle]');
        if (tog) {
            var rel = tog.dataset.toggle;
            if (Vsm__Expanded.has(rel)) Vsm__Expanded.delete(rel); else Vsm__Expanded.add(rel);
            Vsm.Store('Expanded', JSON.stringify(Array.from(Vsm__Expanded)));
            Vsm__SelectedRel = rel;
            Vsm__RenderTree();
            Vsm__RenderDetail();
            return;
        }
        var row = e.target.closest('[data-rel]');
        if (row) { Vsm__SelectedRel = row.dataset.rel; Vsm__RenderTree(); Vsm__RenderDetail(); return; }
        var cmp = e.target.closest('[data-compare]');
        if (cmp && Vsm.Matrix) { Vsm.SetTab('matrix'); Vsm.Matrix.Compare([cmp.dataset.compare]); }
    }
    // ------------------------------------------------------------


    // FUNCTION | Wire Up the Explorer
    // ------------------------------------------------------------
    Explorer.Init = function() {
        try { (JSON.parse(Vsm.Store('Expanded') || '[]') || []).forEach(function(r) { Vsm__Expanded.add(r); }); } catch (err) { /* fresh */ }
        document.addEventListener('click', Vsm__OnClick);
        var rerender = function() { Vsm__RenderTree(); };
        Vsm.El('Vsm__Search').addEventListener('input', function() { window.clearTimeout(rerender.t); rerender.t = window.setTimeout(rerender, 150); });
        Vsm.El('Vsm__DiffOnly').addEventListener('change', rerender);
        Vsm.El('Vsm__LaneFilter').addEventListener('change', rerender);
        Vsm.El('Vsm__BtnCollapse').addEventListener('click', function() {
            Vsm__Expanded.clear();
            Vsm.Store('Expanded', '[]');
            Vsm__RenderTree();
        });
        Vsm.El('Vsm__BtnDeletePicked').addEventListener('click', function() { Vsm__ConfirmDelete(Array.from(Vsm__Picked)); });
        Vsm.El('Vsm__BtnClearPicked').addEventListener('click', function() { Vsm__Picked.clear(); Vsm__RenderTree(); });
        Vsm.El('Vsm__BtnLive').addEventListener('click', function() {
            Vsm__LiveOn = !Vsm__LiveOn;
            Vsm.Store('LiveOn', Vsm__LiveOn ? '1' : '0');
            Vsm.Post('/api/live', { on: Vsm__LiveOn }).catch(function() {});
            Vsm__RenderLive();
            if (Vsm__LiveOn) Vsm__Poll(); else window.clearTimeout(Vsm__Timer);
        });
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

})();
