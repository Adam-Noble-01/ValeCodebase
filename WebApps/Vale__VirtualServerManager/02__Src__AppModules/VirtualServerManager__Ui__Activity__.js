/* =============================================================================
   VALE VIRTUAL SERVER MANAGER - UI | TAB 05 USER ACTIVITY
   =============================================================================

   FILE       : VirtualServerManager__Ui__Activity__.js
   NAMESPACE  : Vsm.Activity
   MODULE     : Ui - User Activity
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Show the activity ledger: who did what in which Vale app, when and
                from where; the links staff generated and who opened them; the
                people and devices behind it all
   CREATED    : 08-Oct-2026

   DESCRIPTION:
   - THE LEDGER is written on the server by every app's API
     (Api__Shared/ValeShared__Activity__.py) into
     Server__UserAccountData/UserData__ActivityLedger/ValeActivity__Ledger__<day>__.jsonl.
     This tab reads the PC's copy (GET /api/activity?days=, no connection).
   - FETCH brings the server's new lines in one read-only session (job
     "activity"). It runs by itself when the tab opens and the copy is more than
     5 minutes old, and every 5 minutes while the tab is on screen, unless a job
     is running, the key is not loaded or the connection is cooling down.
   - THREE VIEWS of the same events:
       Activity ledger      one row per event (repeats in a row grouped "x12")
       Generated links      ValeVision Theia client links (the PC's copies of each
                            project's links file, plus the ledger), and links staff
                            copied: who made them, opens, distinct visitors
       People and devices   one row per signed-in person, and per external
                            device (or IP when the browser sent no device id)
   - EXTERNAL means no sign-in: a client or guest who opened a link. They are
     told apart by device id (a random id in the browser's cookie) and IP.
   - Filters (period, search, app, account type, action) and the shared column
     sort work as on the other tabs. Click a row for every detail.
   - A YEAR LIVE, THEN ARCHIVED: the server zips each month once all its days are
     a year old (00__Archive/ServerLogs__<yyyy>__Archived__.zip, a folder per month).
     The period list names every month: a live one loads from the day files, an
     archived one is unzipped into the audit cache (BackupRoot/ServerLogs__AuditCache)
     and loaded from there.

   =============================================================================

   DEVELOPMENT LOG:
   08-Oct-2026 - Version 0.11.0
   - Months in the period list: live months, and archived months unzipped into the
     audit cache to audit. Links show Theia's own view counter beside the ledger's.

   08-Oct-2026 - Version 0.10.0
   - Initial build.

   ============================================================================= */

(function() {

    var Vsm = window.Vsm;
    var Activity = Vsm.Activity = {};

// -----------------------------------------------------------------------------
// REGION | State and Helpers
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Data, Selection, Sort
    // ------------------------------------------------------------
    var Vsm__Data      = null;                                                 // <-- Last /api/activity payload
    var Vsm__Fetching  = false;
    var Vsm__AutoError = '';
    var Vsm__Selected  = null;                                                 // <-- { view, key }
    var Vsm__Rows      = [];                                                   // <-- Rows on screen (for clicks)
    var Vsm__Timer     = null;
    var Vsm__PeriodHtml = '';                                                  // <-- The fixed period options (the months follow)
    var Vsm__Sorts     = {
        ledger : Vsm.SortState('Activity', { key: 'when', dir: -1 }),
        links  : Vsm.SortState('ActivityLinks', { key: 'created', dir: -1 }),
        people : Vsm.SortState('ActivityPeople', { key: 'last', dir: -1 })
    };
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Limits, Timing, Words
    // ------------------------------------------------------------
    var Vsm__RowLimit   = 1500;                                                // <-- Rows drawn at most (the filters narrow)
    var Vsm__StaleMs    = 5 * 60e3;                                            // <-- Fetch by itself when older than this
    var Vsm__GroupGapS  = 600;                                                 // <-- The same thing again within 10 min: one row
    var Vsm__Months     = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var Vsm__Kinds      = {                                                    // <-- Badge colours borrowed from the lane badges
        account  : { label: 'Account',  cls: 'kind-web' },
        open     : { label: 'Opened',   cls: 'is-mirror' },
        save     : { label: 'Saved',    cls: 'lane-content' },
        link     : { label: 'Link',     cls: 'lane-userdata' },
        video    : { label: 'Video',    cls: 'is-custom' },
        email    : { label: 'Email',    cls: 'kind-server' },
        download : { label: 'Download', cls: 'kind-server' },
        tool     : { label: 'Used',     cls: 'is-off' },
        refused  : { label: 'Refused',  cls: 'is-refused' }
    };
    var Vsm__AppRoutes  = { '/valevision/': 'ValeVision 3D', '/theia/': 'ValeVision Theia', '/project-gallery/': 'ValeVision Gallery',
                            '/help/': 'ValeVision Help', '/valespec/': 'ValeSpec', '/lantern-designer/': 'Lantern Designer' };
    // ------------------------------------------------------------


    // HELPER FUNCTION | Dates in This PC's Time ("08-Oct-2026", "11:00")
    // ------------------------------------------------------------
    function Vsm__Pad(n) { return (n < 10 ? '0' : '') + n; }
    function Vsm__Day(d) { return d ? Vsm__Pad(d.getDate()) + '-' + Vsm__Months[d.getMonth()] + '-' + d.getFullYear() : ''; }
    function Vsm__Clock(d) { return d ? Vsm__Pad(d.getHours()) + ':' + Vsm__Pad(d.getMinutes()) : ''; }
    function Vsm__Stamp(d) { return d ? Vsm__Day(d) + ' ' + Vsm__Clock(d) + ':' + Vsm__Pad(d.getSeconds()) : ''; }
    function Vsm__Parse(iso) { var d = iso ? new Date(iso) : null; return d && !isNaN(d) ? d : null; }
    function Vsm__MonthName(ym) {                                              // <-- "2025-09" -> "September 2025"
        var names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return names[Number(String(ym).slice(5, 7)) - 1] + ' ' + String(ym).slice(0, 4);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Who, What Kind, Which Project
    // ------------------------------------------------------------
    function Vsm__WhoKey(e) { return e.User ? 'u:' + e.User.Code : e.DeviceId ? 'd:' + e.DeviceId : 'ip:' + (e.Ip || '?'); }

    function Vsm__WhoName(e) { return e.User ? (e.User.Name || e.User.Code) : 'External'; }

    function Vsm__Level(code) {
        var lv = ((Vsm__Data && Vsm__Data.levels) || []).find(function(l) { return l.Code === code; });
        return lv ? lv : { Code: code, Name: code || 'Guest', Rank: code ? 50 : 99 };
    }

    function Vsm__Kind(e) {
        var a = String(e.Action || '');
        if (e.Ok === false) return 'refused';
        if (/^account\./.test(a)) return 'account';
        if (/^link\./.test(a)) return 'link';
        if (/^(app|project)\.(open|resume|edit|switch)$|^(view|model)\.open$|^(scene|drawing)\.view$|^view\.mode$/.test(a)) return 'open';
        if (/^video\.(play|publish|delete)$/.test(a)) return 'video';
        if (/^email\./.test(a)) return 'email';
        if (/^file\.download$/.test(a)) return 'download';
        if (/^(tool|search|report)\.|^file\.print$|^video\.preview$/.test(a)) return 'tool';
        return 'save';
    }

    function Vsm__KindLabel(e) {
        var a = String(e.Action || '');
        if (e.Ok === false) return 'Refused';
        if (a === 'account.signin') return 'Sign-in';
        if (a === 'account.signout') return 'Sign-out';
        if (a === 'account.password') return 'Password';
        return Vsm__Kinds[Vsm__Kind(e)].label;
    }

    function Vsm__ProjectText(id) { return String(id || '').replace(/__/g, ' '); }

    function Vsm__AppOfPath(path) {
        var hit = Object.keys(Vsm__AppRoutes).find(function(r) { return String(path || '').indexOf(r) === 0; });
        return hit ? Vsm__AppRoutes[hit] : '';
    }

    function Vsm__UserName(code) {
        var u = ((Vsm__Data && Vsm__Data.users) || []).find(function(x) { return x.Code === code; });
        return u ? u.Name : (code || '');
    }

    function Vsm__Short(token) { return token ? String(token).slice(0, 6) + '…' : ''; }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Prepare Events Once Per Load (date, search text)
    // ------------------------------------------------------------
    function Vsm__Prepare(events) {
        events.forEach(function(e, i) {
            e._i = i;
            e._k = [e.Utc, e.Action, e.Ip, e.DeviceId, e.Target, i].join('|');  // <-- Survives a reload (selection)
            e._d = Vsm__Parse(e.Utc);
            e._t = e._d ? e._d.getTime() / 1000 : 0;
            var u = e.User || {};
            e._s = [u.Name, u.Code, u.Level, u.Role, u.Dept, e.User ? '' : 'external guest', e.App, e.Action, e.Text,
                    Vsm__KindLabel(e), e.Project, Vsm__ProjectText(e.Project), e.Target, e.Link, e.Ip, e.Country, e.Device,
                    e.DeviceId, e.Mode, e.Detail ? JSON.stringify(e.Detail) : ''].join(' ').toLowerCase();
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Filters
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Filter Bar's Values
    // ------------------------------------------------------------
    function Vsm__Filters() {
        return {
            terms : Vsm.El('Vsm__ActSearch').value.trim().toLowerCase().split(/\s+/).filter(Boolean),
            app   : Vsm.El('Vsm__ActApp').value,
            who   : Vsm.El('Vsm__ActWho').value,
            kind  : Vsm.El('Vsm__ActKind').value,
            group : Vsm.El('Vsm__ActGroup').checked
        };
    }

    function Vsm__TextMatch(text, terms) {
        for (var i = 0; i < terms.length; i++) if (text.indexOf(terms[i]) < 0) return false;
        return true;
    }

    function Vsm__Matches(e, f) {
        if (f.app && e.App !== f.app) return false;
        if (f.who === 'staff' && !e.User) return false;
        if (f.who === 'external' && e.User) return false;
        if (f.who.indexOf('level:') === 0 && (!e.User || e.User.Level !== f.who.slice(6))) return false;
        if (f.kind && Vsm__Kind(e) !== f.kind) return false;
        return Vsm__TextMatch(e._s, f.terms);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Fill the App and Account-Type Lists From the Data (keeps the choice)
    // ------------------------------------------------------------
    function Vsm__FillSelects() {
        var apps = {};
        Vsm__Data.events.forEach(function(e) { if (e.App) apps[e.App] = true; });
        (Vsm__Data.links || []).forEach(function(l) { if (l.App) apps[l.App] = true; });
        var sel = Vsm.El('Vsm__ActApp'), keep = sel.value;
        sel.innerHTML = '<option value="">All apps</option>' + Object.keys(apps).sort().map(function(a) {
            return '<option' + (a === keep ? ' selected' : '') + '>' + Vsm.Esc(a) + '</option>';
        }).join('');
        var who = Vsm.El('Vsm__ActWho'), keepWho = who.value;
        who.innerHTML = '<option value="">Everyone</option><option value="staff">Staff (signed in)</option>' +
            '<option value="external">External (no sign-in)</option>' +
            (Vsm__Data.levels || []).filter(function(l) { return l.Rank < 5; }).map(function(l) {
                return '<option value="level:' + Vsm.Esc(l.Code) + '">' + Vsm.Esc(l.Rank + ' · ' + l.Name) + '</option>';
            }).join('');
        who.value = keepWho;
        if (who.value !== keepWho) who.value = '';
        var period = Vsm.El('Vsm__ActDays'), keepPeriod = period.value;
        var months = Vsm__Data.months || [];
        var opt = function(m, note) {
            return '<option value="m:' + Vsm.Esc(m.Month) + '">' + Vsm.Esc(Vsm__MonthName(m.Month) + ' · ' + note) + '</option>';
        };
        var live = months.filter(function(m) { return m.LiveDays; }).map(function(m) { return opt(m, m.LiveDays + ' day' + (m.LiveDays === 1 ? '' : 's')); });
        var old = months.filter(function(m) { return m.ArchivedDays && !m.LiveDays; }).map(function(m) { return opt(m, m.ArchivedDays + ' days, archived'); });
        period.innerHTML = Vsm__PeriodHtml + (live.length ? '<optgroup label="Months">' + live.join('') + '</optgroup>' : '') +
            (old.length ? '<optgroup label="Archived months (unzipped to audit)">' + old.join('') + '</optgroup>' : '');
        period.value = keepPeriod;
        if (period.value !== keepPeriod) period.value = '7';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Models: Ledger Rows, Links, People
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Ledger Columns (the order Adam asked for; Date and Time sort together)
    // ------------------------------------------------------------
    var Vsm__LedgerCols = [
        { key: 'user',    label: 'User',          val: function(e) { return e.User ? Vsm.SortValue(Vsm__WhoName(e)) : 'zzz external'; } },
        { key: 'level',   label: 'Account type',  val: function(e) { return Vsm__Level(e.User && e.User.Level).Rank; } },
        { key: 'role',    label: 'Role',          val: function(e) { return Vsm.SortValue(e.User && e.User.Role); } },
        { key: 'app',     label: 'App',           val: function(e) { return Vsm.SortValue(e.App); } },
        { key: 'action',  label: 'Action',        val: function(e) { return Vsm.SortValue(e.Text); } },
        { key: 'project', label: 'Project',       val: function(e) { return Vsm.SortValue(e.Project); } },
        { key: 'detail',  label: 'Detail',        val: function(e) { return Vsm.SortValue(e.Target || e.Link); } },
        { key: 'when',    label: 'Date',          val: function(e) { return e._t; } },
        { key: 'when',    label: 'Time',          val: function(e) { return e._t; } },
        { key: 'ip',      label: 'IP address',    val: function(e) { return Vsm.SortValue(e.Ip); } },
        { key: 'device',  label: 'Device',        val: function(e) { return Vsm.SortValue(e.Device); } }
    ];
    // ------------------------------------------------------------


    // FUNCTION | Ledger Rows: Filtered, Sorted, Repeats Grouped (in time order only)
    // ------------------------------------------------------------
    function Vsm__LedgerRows(f) {
        var sort = Vsm__Sorts.ledger;
        var col = Vsm__LedgerCols.find(function(c) { return c.key === sort.key; }) || Vsm__LedgerCols[7];
        var list = Vsm__Data.events.filter(function(e) { return Vsm__Matches(e, f); });
        list.sort(function(a, b) { return Vsm.SortCompare(col.val(a), col.val(b), sort.dir) || (b._t - a._t); });
        if (!f.group || sort.key !== 'when') return list.map(function(e) { return { e: e, n: 1, first: e }; });
        var rows = [];
        list.forEach(function(e) {
            var last = rows[rows.length - 1];
            if (last && Vsm__WhoKey(last.first) === Vsm__WhoKey(e) && last.e.App === e.App && last.e.Action === e.Action &&
                (last.e.Project || '') === (e.Project || '') && (last.e.Target || '') === (e.Target || '') &&
                last.e.Ok === e.Ok && Math.abs(last.first._t - e._t) <= Vsm__GroupGapS) {
                last.n += 1;
                last.first = e;                                                // <-- The far end of the group
            } else {
                rows.push({ e: e, n: 1, first: e });
            }
        });
        return rows;
    }
    // ------------------------------------------------------------


    // FUNCTION | Links: Theia Client Links (records + ledger) and Links Staff Copied
    // ------------------------------------------------------------
    function Vsm__Links() {
        var map = {}, order = [];
        function link(key, base) {
            if (!map[key]) { map[key] = Object.assign({ key: key, opens: [], refused: [], seen: [], plays: 0, copies: 0 }, base); order.push(key); }
            return map[key];
        }
        (Vsm__Data.links || []).forEach(function(r) {
            link('t:' + r.Token, { token: r.Token, kind: 'Client link', app: r.App, project: r.Project, label: r.Label || '',
                                   created: r.CreatedIso, by: Vsm__UserName(r.CreatedBy), expires: r.ExpiresIso, revoked: r.RevokedIso,
                                   counter: r.ViewCount || 0, counterLast: r.LastViewedIso, videos: (r.VideoIds || []).length });
        });
        var events = Vsm__Data.events, copied = [];
        events.forEach(function(e) {
            if (e.Link) {
                var l = link('t:' + e.Link, { token: e.Link, kind: 'Client link', app: e.App, project: e.Project, label: '' });
                if (e.Action === 'link.create') {
                    l.created = l.created || e.Utc; l.by = l.by || Vsm__WhoName(e); l.label = l.label || e.Target || '';
                    l.project = l.project || e.Project; l.app = e.App;
                    if (e.Detail && e.Detail.Expires && !l.expires) l.expires = e.Detail.Expires === 'never' ? null : e.Detail.Expires;
                } else if (e.Action === 'link.revoke') {
                    l.revoked = l.revoked || e.Utc;
                } else if (e.Action === 'link.open') {
                    l.opens.push(e); l.label = l.label || e.Target || '';
                } else if (e.Action === 'link.open-refused') {
                    l.refused.push(e);
                } else if (e.Action === 'link.copy') {
                    l.copies += 1;
                } else {
                    if (e.Action === 'video.play') l.plays += 1;
                    l.seen.push(e);
                }
            } else if (e.Action === 'link.copy') {
                copied.push(e);
            }
        });
        copied.forEach(function(e) {                                           // <-- A plain app link: no token, so the project's external opens
            var path = (e.Detail && e.Detail.Path) || e.Target || '';
            var l = link('p:' + path, { kind: 'Copied link', app: Vsm__AppOfPath(path) || e.App, project: e.Project, label: path,
                                        created: e.Utc, by: Vsm__WhoName(e), path: path });
            l.copies += 1;
        });
        order.forEach(function(k) {
            var l = map[k];
            if (l.kind !== 'Copied link') return;
            var since = Vsm__Parse(l.created);
            events.forEach(function(e) {
                if (!e.User && !e.Link && e.App === l.app && e.Project && e.Project === l.project && /^(app|project)\.open$/.test(e.Action) &&
                    (!since || e._d >= since)) l.opens.push(e);
            });
        });
        var now = new Date().toISOString();
        return order.map(function(k) {
            var l = map[k], all = l.opens.concat(l.seen), visitors = {};
            all.forEach(function(e) { if (!e.User) visitors[e.DeviceId || e.Ip || '?'] = true; });
            var last = all.reduce(function(m, e) { return !m || e._t > m._t ? e : m; }, null);
            l.visitors = Object.keys(visitors).length;
            l.last = last;
            l.state = l.kind === 'Copied link' ? '' : l.revoked ? 'Switched off' : l.expires && l.expires < now ? 'Expired' : 'Active';
            l._s = [l.kind, l.app, l.project, Vsm__ProjectText(l.project), l.label, l.token, l.by, l.state, l.path].join(' ').toLowerCase();
            return l;
        });
    }

    var Vsm__LinkCols = [
        { key: 'created', label: 'Created',     val: function(l) { var d = Vsm__Parse(l.created); return d ? d.getTime() : null; } },
        { key: 'by',      label: 'By',          val: function(l) { return Vsm.SortValue(l.by); } },
        { key: 'app',     label: 'App',         val: function(l) { return Vsm.SortValue(l.app); } },
        { key: 'project', label: 'Project',     val: function(l) { return Vsm.SortValue(l.project); } },
        { key: 'label',   label: 'Label',       val: function(l) { return Vsm.SortValue(l.label); } },
        { key: 'link',    label: 'Link',        val: function(l) { return Vsm.SortValue(l.kind + ' ' + (l.token || '')); } },
        { key: 'expires', label: 'Expires',     val: function(l) { return Vsm.SortValue(l.expires); } },
        { key: 'state',   label: 'State',       val: function(l) { return Vsm.SortValue(l.state); } },
        { key: 'opens',   label: 'Opens',       val: function(l) { return l.opens.length; } },
        { key: 'visitors',label: 'Visitors',    val: function(l) { return l.visitors; } },
        { key: 'last',    label: 'Last opened', val: function(l) { return l.last ? l.last._t : null; } },
        { key: 'from',    label: 'Last from',   val: function(l) { return Vsm.SortValue(l.last && l.last.Ip); } }
    ];
    // ------------------------------------------------------------


    // FUNCTION | People: Each Signed-In Person, Each External Device
    // ------------------------------------------------------------
    function Vsm__People(f) {
        var map = {}, order = [];
        Vsm__Data.events.forEach(function(e) {
            if (f.app && e.App !== f.app) return;
            if (f.who === 'staff' && !e.User) return;
            if (f.who === 'external' && e.User) return;
            if (f.who.indexOf('level:') === 0 && (!e.User || e.User.Level !== f.who.slice(6))) return;
            var key = Vsm__WhoKey(e), p = map[key];
            if (!p) {
                p = map[key] = { key: key, name: Vsm__WhoName(e), user: e.User || null, deviceId: e.DeviceId || '', events: 0,
                                 apps: {}, projects: {}, ips: {}, devices: {}, countries: {}, links: {}, first: e, last: e };
                order.push(key);
            }
            p.events += 1;
            if (e.App) p.apps[e.App] = true;
            if (e.Project) p.projects[e.Project] = true;
            if (e.Ip) p.ips[e.Ip] = true;
            if (e.Device) p.devices[e.Device] = true;
            if (e.Country) p.countries[e.Country] = true;
            if (e.Link) p.links[e.Link] = true;
            if (e._t < p.first._t) p.first = e;
            if (e._t > p.last._t) p.last = e;
        });
        return order.map(function(k) {
            var p = map[k];
            p._s = [p.name, p.user && p.user.Code, p.user && p.user.Level, p.user && p.user.Role, p.deviceId,
                    Object.keys(p.apps).join(' '), Object.keys(p.projects).join(' '), Object.keys(p.ips).join(' '),
                    Object.keys(p.devices).join(' '), Object.keys(p.countries).join(' '), Object.keys(p.links).join(' ')].join(' ').toLowerCase();
            return p;
        }).filter(function(p) { return Vsm__TextMatch(p._s, f.terms); });
    }

    var Vsm__PeopleCols = [
        { key: 'person',   label: 'User',         val: function(p) { return p.user ? Vsm.SortValue(p.name) : 'zzz external'; } },
        { key: 'level',    label: 'Account type', val: function(p) { return Vsm__Level(p.user && p.user.Level).Rank; } },
        { key: 'role',     label: 'Role',         val: function(p) { return Vsm.SortValue(p.user && p.user.Role); } },
        { key: 'apps',     label: 'Apps',         val: function(p) { return Object.keys(p.apps).length; } },
        { key: 'events',   label: 'Events',       val: function(p) { return p.events; } },
        { key: 'projects', label: 'Projects',     val: function(p) { return Object.keys(p.projects).length; } },
        { key: 'first',    label: 'First seen',   val: function(p) { return p.first._t; } },
        { key: 'last',     label: 'Last seen',    val: function(p) { return p.last._t; } },
        { key: 'ips',      label: 'IP addresses', val: function(p) { return Object.keys(p.ips).length; } },
        { key: 'devices',  label: 'Devices',      val: function(p) { return Object.keys(p.devices).length; } }
    ];
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Rendering
// -----------------------------------------------------------------------------

    // SUB HELPER FUNCTION | Cells Shared by the Views
    // ------------------------------------------------------------
    function Vsm__WhoHtml(e) {
        if (e.User) return '<b>' + Vsm.Esc(Vsm__WhoName(e)) + '</b>';
        var tag = e.DeviceId ? '#' + e.DeviceId.slice(-4) : '';
        return '<span class="Vsm__Chip" title="No sign-in: a client or guest">External</span>' +
               (tag ? ' <span class="Vsm__Muted" title="Device ' + Vsm.Esc(e.DeviceId) + '">' + Vsm.Esc(tag) + '</span>' : '');
    }

    function Vsm__LevelHtml(user) {
        return user ? Vsm.Esc(Vsm__Level(user.Level).Name) : '<span class="Vsm__Muted">Guest</span>';
    }

    function Vsm__ProjectHtml(id) {
        return id ? '<span title="' + Vsm.Esc(id) + '">' + Vsm.Esc(Vsm__ProjectText(id)) + '</span>' : '';
    }

    function Vsm__LinkHtml(token) {
        return token ? '<span class="Vsm__IconBtn" title="Link ' + Vsm.Esc(token) + '"><span class="Vsm__Ico is-link"></span><code>' +
                       Vsm.Esc(Vsm__Short(token)) + '</code></span>' : '';
    }

    function Vsm__IpHtml(e) {
        return e && e.Ip ? '<code>' + Vsm.Esc(e.Ip) + '</code>' + (e.Country ? ' <span class="Vsm__Muted">' + Vsm.Esc(e.Country) + '</span>' : '') : '';
    }

    function Vsm__Head(cols, sort) {
        return '<thead><tr>' + cols.map(function(c) {
            return '<th' + Vsm.SortHead(sort, c.key) + ' title="Sort by ' + c.label.toLowerCase() + '">' + Vsm.Esc(c.label) + '</th>';
        }).join('') + '</tr></thead>';
    }

    function Vsm__More(shown, total, span) {
        return total > shown ? '<tr class="Vsm__ActMore"><td colspan="' + span + '">Showing ' + shown.toLocaleString() + ' of ' +
               total.toLocaleString() + ': narrow the period, search or filters to see the rest.</td></tr>' : '';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Ledger Table
    // ------------------------------------------------------------
    function Vsm__RenderLedger(f) {
        var rows = Vsm__LedgerRows(f);
        Vsm__Rows = rows.slice(0, Vsm__RowLimit);
        var sel = Vsm__Selected && Vsm__Selected.view === 'ledger' ? Vsm__Selected.key : null;
        Vsm.El('Vsm__ActTable').innerHTML = Vsm__Head(Vsm__LedgerCols, Vsm__Sorts.ledger) + '<tbody>' +
            Vsm__Rows.map(function(r, i) {
                var e = r.e, kind = Vsm__Kind(e);
                var many = r.n > 1 ? ' <span class="Vsm__Muted" title="' + r.n + ' times, from ' + Vsm.Esc(Vsm__Stamp(r.first._d)) + '">×' + r.n + '</span>' : '';
                return '<tr data-row="' + i + '" class="Vsm__ActRow' + (e.Ok === false ? ' is-refused' : '') + (sel === e._k ? ' is-selected' : '') + '">' +
                    '<td>' + Vsm__WhoHtml(e) + '</td>' +
                    '<td>' + Vsm__LevelHtml(e.User) + '</td>' +
                    '<td>' + Vsm.Esc(e.User ? e.User.Role : '') + '</td>' +
                    '<td>' + Vsm.Esc(e.App) + '</td>' +
                    '<td class="Vsm__ActText"><span class="Vsm__Badge ' + Vsm__Kinds[kind].cls + '">' + Vsm.Esc(Vsm__KindLabel(e)) + '</span> ' +
                        Vsm.Esc(e.Text) + many + '</td>' +
                    '<td>' + Vsm__ProjectHtml(e.Project) + '</td>' +
                    '<td class="Vsm__ActText">' + Vsm.Esc(e.Target || '') + (e.Target && e.Link ? ' ' : '') + Vsm__LinkHtml(e.Link) + '</td>' +
                    '<td>' + Vsm.Esc(Vsm__Day(e._d)) + '</td>' +
                    '<td title="' + Vsm.Esc(e.Utc) + ' UTC">' + Vsm.Esc(Vsm__Clock(e._d)) + '</td>' +
                    '<td>' + Vsm__IpHtml(e) + '</td>' +
                    '<td>' + Vsm.Esc(e.Device || '') + (e.Mode ? ' <span class="Vsm__Muted">· ' + (e.Mode === 'Installed app' ? 'app' : 'browser') + '</span>' : '') + '</td>' +
                    '</tr>';
            }).join('') + Vsm__More(Vsm__Rows.length, rows.length, Vsm__LedgerCols.length) +
            (rows.length ? '' : '<tr><td colspan="' + Vsm__LedgerCols.length + '" class="Vsm__TreeEmpty">' + Vsm__EmptyText() + '</td></tr>') + '</tbody>';
        var events = rows.reduce(function(n, r) { return n + r.n; }, 0), people = {}, ext = {};
        rows.forEach(function(r) { (r.e.User ? people : ext)[Vsm__WhoKey(r.e)] = true; });
        return events.toLocaleString() + ' event' + (events === 1 ? '' : 's') + ' · ' + Object.keys(people).length + ' signed-in ' +
               (Object.keys(people).length === 1 ? 'person' : 'people') + ' · ' + Object.keys(ext).length + ' external device' + (Object.keys(ext).length === 1 ? '' : 's');
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Links Table
    // ------------------------------------------------------------
    function Vsm__RenderLinks(f) {
        var sort = Vsm__Sorts.links;
        var col = Vsm__LinkCols.find(function(c) { return c.key === sort.key; }) || Vsm__LinkCols[0];
        var list = Vsm__Links().filter(function(l) { return (!f.app || l.app === f.app) && Vsm__TextMatch(l._s, f.terms); });
        list.sort(function(a, b) { return Vsm.SortCompare(col.val(a), col.val(b), sort.dir); });
        Vsm__Rows = list.slice(0, Vsm__RowLimit);
        var sel = Vsm__Selected && Vsm__Selected.view === 'links' ? Vsm__Selected.key : null;
        Vsm.El('Vsm__ActTable').innerHTML = Vsm__Head(Vsm__LinkCols, sort) + '<tbody>' + Vsm__Rows.map(function(l, i) {
            var d = Vsm__Parse(l.created), ex = Vsm__Parse(l.expires);
            var state = l.state === 'Active' ? '<span class="Vsm__C-ok">Active</span>' : l.state ? '<span class="Vsm__C-delete">' + Vsm.Esc(l.state) + '</span>' : '';
            return '<tr data-row="' + i + '" class="Vsm__ActRow' + (sel === l.key ? ' is-selected' : '') + '">' +
                '<td>' + Vsm.Esc(Vsm__Day(d)) + ' <span class="Vsm__Muted">' + Vsm.Esc(Vsm__Clock(d)) + '</span></td>' +
                '<td>' + Vsm.Esc(l.by || '') + '</td>' +
                '<td>' + Vsm.Esc(l.app || '') + '</td>' +
                '<td>' + Vsm__ProjectHtml(l.project) + '</td>' +
                '<td class="Vsm__ActText">' + (l.kind === 'Copied link' ? '<code>' + Vsm.Esc(l.label) + '</code>' : Vsm.Esc(l.label) || '<span class="Vsm__Muted">no label</span>') + '</td>' +
                '<td>' + (l.token ? Vsm__LinkHtml(l.token) : '<span class="Vsm__Muted">copied ×' + l.copies + '</span>') + '</td>' +
                '<td>' + (l.kind === 'Copied link' ? '' : ex ? Vsm.Esc(Vsm__Day(ex)) : '<span class="Vsm__Muted">never</span>') + '</td>' +
                '<td>' + state + '</td>' +
                '<td>' + l.opens.length + (l.refused.length ? ' <span class="Vsm__C-delete" title="Opened after it expired or was switched off">+' + l.refused.length + ' refused</span>' : '') +
                    (l.counter > l.opens.length ? ' <span class="Vsm__Muted" title="Theia’s own view counter, all time, from this PC’s copy of the links file (Collect brings it up to date). It counts visits from before the ledger began.">· ' +
                     l.counter + ' by Theia</span>' : '') + '</td>' +
                '<td>' + l.visitors + '</td>' +
                '<td>' + (l.last ? Vsm.Esc(Vsm__Day(l.last._d) + ' ' + Vsm__Clock(l.last._d)) : '') + '</td>' +
                '<td>' + Vsm__IpHtml(l.last) + '</td>' +
                '</tr>';
        }).join('') + Vsm__More(Vsm__Rows.length, list.length, Vsm__LinkCols.length) +
        (list.length ? '' : '<tr><td colspan="' + Vsm__LinkCols.length + '" class="Vsm__TreeEmpty">No generated links match.</td></tr>') + '</tbody>';
        var opens = list.reduce(function(n, l) { return n + l.opens.length; }, 0);
        return list.length + ' link' + (list.length === 1 ? '' : 's') + ' · ' + opens + ' open' + (opens === 1 ? '' : 's') + ' in the period';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The People Table
    // ------------------------------------------------------------
    function Vsm__RenderPeople(f) {
        var sort = Vsm__Sorts.people;
        var col = Vsm__PeopleCols.find(function(c) { return c.key === sort.key; }) || Vsm__PeopleCols[7];
        var list = Vsm__People(f);
        list.sort(function(a, b) { return Vsm.SortCompare(col.val(a), col.val(b), sort.dir); });
        Vsm__Rows = list.slice(0, Vsm__RowLimit);
        var keys = function(o) { return Object.keys(o); };
        Vsm.El('Vsm__ActTable').innerHTML = Vsm__Head(Vsm__PeopleCols, sort) + '<tbody>' + Vsm__Rows.map(function(p, i) {
            var ips = keys(p.ips), devs = keys(p.devices);
            return '<tr data-row="' + i + '" class="Vsm__ActRow" title="Show this ' + (p.user ? 'person' : 'device') + '’s activity">' +
                '<td>' + Vsm__WhoHtml(p.user ? { User: p.user } : { DeviceId: p.deviceId }) + (p.user ? ' <span class="Vsm__Muted">' + Vsm.Esc(p.user.Code) + '</span>' : '') + '</td>' +
                '<td>' + Vsm__LevelHtml(p.user) + '</td>' +
                '<td>' + Vsm.Esc(p.user ? p.user.Role : '') + '</td>' +
                '<td>' + keys(p.apps).map(function(a) { return '<span class="Vsm__Chip">' + Vsm.Esc(a.replace(/^ValeVision /, '')) + '</span>'; }).join('') + '</td>' +
                '<td>' + p.events + '</td>' +
                '<td>' + keys(p.projects).length + '</td>' +
                '<td>' + Vsm.Esc(Vsm__Day(p.first._d) + ' ' + Vsm__Clock(p.first._d)) + '</td>' +
                '<td>' + Vsm.Esc(Vsm__Day(p.last._d) + ' ' + Vsm__Clock(p.last._d)) + '</td>' +
                '<td title="' + Vsm.Esc(ips.join(', ')) + '"><code>' + Vsm.Esc(ips[0] || '') + '</code>' + (ips.length > 1 ? ' <span class="Vsm__Muted">+' + (ips.length - 1) + '</span>' : '') +
                    (keys(p.countries).length ? ' <span class="Vsm__Muted">' + Vsm.Esc(keys(p.countries).join(' ')) + '</span>' : '') + '</td>' +
                '<td title="' + Vsm.Esc(devs.join(', ')) + '">' + Vsm.Esc(devs[0] || '') + (devs.length > 1 ? ' <span class="Vsm__Muted">+' + (devs.length - 1) + '</span>' : '') + '</td>' +
                '</tr>';
        }).join('') + Vsm__More(Vsm__Rows.length, list.length, Vsm__PeopleCols.length) +
        (list.length ? '' : '<tr><td colspan="' + Vsm__PeopleCols.length + '" class="Vsm__TreeEmpty">' + Vsm__EmptyText() + '</td></tr>') + '</tbody>';
        var staff = list.filter(function(p) { return p.user; }).length;
        return staff + ' signed-in ' + (staff === 1 ? 'person' : 'people') + ' · ' + (list.length - staff) + ' external device' + (list.length - staff === 1 ? '' : 's');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | What an Empty Table Says
    // ------------------------------------------------------------
    function Vsm__EmptyText() {
        if (!Vsm__Data.files.count) return 'No activity on this PC yet. The ledger starts once the apps with activity logging are on the server; then press Fetch from server.';
        return Vsm__Data.events.length ? 'Nothing matches the filters.' : 'No activity in this period.';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Toolbar: Pill, Buttons, Counts
    // ------------------------------------------------------------
    function Vsm__RenderBar(counts) {
        var pill = Vsm.El('Vsm__ActPill'), fetch = (Vsm__Data && Vsm__Data.fetch) || {};
        if (Vsm__Fetching) {
            pill.className = 'Vsm__Pill is-light is-warn';
            pill.textContent = 'Fetching from the server…';
        } else if (!Vsm__Data) {
            pill.className = 'Vsm__Pill is-light';
            pill.textContent = 'Loading…';
        } else if (fetch.t) {
            pill.className = 'Vsm__Pill is-light is-good';
            pill.textContent = 'Fetched ' + Vsm__Clock(new Date(fetch.t * 1000)) + ' · ' + (fetch.received ? fetch.received + ' file(s) updated' : 'up to date');
        } else {
            pill.className = 'Vsm__Pill is-light ' + (Vsm__Data.files.count ? 'is-warn' : 'is-bad');
            pill.textContent = Vsm__Data.files.count ? 'This PC’s copy: not fetched yet' : 'No ledger on this PC yet';
        }
        pill.title = Vsm__AutoError ? 'Last automatic fetch: ' + Vsm__AutoError : '';
        Vsm.El('Vsm__BtnActFetch').disabled = Vsm__Fetching;
        Vsm.El('Vsm__BtnActFetch').textContent = Vsm__Fetching ? 'Fetching…' : 'Fetch from server';
        if (counts !== undefined) Vsm.El('Vsm__ActCounts').textContent = counts;
        var view = Vsm.El('Vsm__ActView').value;
        Vsm.El('Vsm__ActKind').disabled = view !== 'ledger';
        Vsm.El('Vsm__ActWho').disabled = view === 'links';
        Vsm.El('Vsm__ActGroup').disabled = view !== 'ledger';
    }
    // ------------------------------------------------------------


    // FUNCTION | Render Tab 05
    // ------------------------------------------------------------
    Activity.Render = function() {
        if (!Vsm__Data) { Vsm__RenderBar(); return; }
        var f = Vsm__Filters(), view = Vsm.El('Vsm__ActView').value;
        var counts = view === 'links' ? Vsm__RenderLinks(f) : view === 'people' ? Vsm__RenderPeople(f) : Vsm__RenderLedger(f);
        Vsm__RenderBar(counts);
        Vsm.El('Vsm__ActErrors').innerHTML = Vsm__Data.truncated ? '<div>⚠ ' + Vsm__Data.truncated.toLocaleString() +
            ' older events in this period are left out (newest ' + Vsm__Data.events.length.toLocaleString() + ' shown): choose a shorter period.</div>' : '';
        Vsm__RenderSide();
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Side Panel: Summary, One Event, One Link
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Definition List From [label, html] Pairs (empty values left out)
    // ------------------------------------------------------------
    function Vsm__Dl(pairs) {
        return '<dl>' + pairs.filter(function(p) { return p[1] !== '' && p[1] != null; }).map(function(p) {
            return '<dt>' + Vsm.Esc(p[0]) + '</dt><dd>' + p[1] + '</dd>';
        }).join('') + '</dl>';
    }

    function Vsm__FilterBtn(label, value) {
        return value ? '<button class="Vsm__BtnSmall" data-act-find="' + Vsm.Esc(value) + '">' + Vsm.Esc(label) + '</button>' : '';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Summary of the Period (nothing selected)
    // ------------------------------------------------------------
    function Vsm__SideSummary() {
        var ev = Vsm__Data.events, staff = {}, ext = {}, apps = {}, made = 0, opened = 0, refused = 0;
        ev.forEach(function(e) {
            var k = Vsm__WhoKey(e);
            if (e.User) staff[k] = (staff[k] || 0) + 1; else ext[k] = true;
            if (e.App) apps[e.App] = (apps[e.App] || 0) + 1;
            if (e.Action === 'link.create') made += 1;
            if (e.Action === 'link.open') opened += 1;
            if (e.Action === 'account.signin-refused') refused += 1;
        });
        var top = Object.keys(staff).sort(function(a, b) { return staff[b] - staff[a]; }).slice(0, 6).map(function(k) {
            var e = ev.find(function(x) { return Vsm__WhoKey(x) === k; });
            return '<div class="Vsm__Level"><b>' + Vsm.Esc(Vsm__WhoName(e)) + '</b> <span class="Vsm__Muted">' + staff[k] + ' events</span></div>';
        }).join('');
        var appList = Object.keys(apps).sort(function(a, b) { return apps[b] - apps[a]; }).map(function(a) {
            return '<div class="Vsm__Level">' + Vsm.Esc(a) + ' <span class="Vsm__Muted">' + apps[a] + '</span></div>';
        }).join('');
        var files = Vsm__Data.files, fetch = Vsm__Data.fetch || {};
        var period = Vsm__Data.month ? Vsm__MonthName(Vsm__Data.month)
            : { 1: 'Today', 7: 'Last 7 days', 30: 'Last 30 days', 90: 'Last 90 days' }[Vsm__Data.days] || 'Everything not archived';
        var audit = Vsm__Data.month && Vsm__Data.source !== 'live'
            ? '<p class="Vsm__Muted">Archived: unzipped from <code>' + Vsm.Esc(((Vsm__Data.months || []).find(function(m) { return m.Month === Vsm__Data.month; }) || {}).Archive || '') +
              '</code> into <code>' + Vsm.Esc(Vsm__Data.cache) + '</code> and loaded from there.</p>' : '';
        var zips = (Vsm__Data.archives || []).map(function(z) {
            return '<code>' + Vsm.Esc(z.Name) + '</code> <span class="Vsm__Muted">' + Vsm.Mb(z.Bytes) + ', ' + z.Months.length + ' month(s)</span>';
        }).join('<br>');
        return '<h3>' + Vsm.Esc(period) + '</h3>' + audit + Vsm__Dl([
                ['Events', ev.length.toLocaleString()],
                ['Signed in', Object.keys(staff).length + ' people'],
                ['External', Object.keys(ext).length + ' devices or IPs'],
                ['Links made', String(made)],
                ['Link opens', String(opened)],
                ['Refused', refused ? '<span class="Vsm__Warn">' + refused + ' sign-in(s)</span>' : '0 sign-ins']]) +
            (top ? '<h3>Most active</h3><div class="Vsm__Levels">' + top + '</div>' : '') +
            (appList ? '<h3>Apps</h3><div class="Vsm__Levels">' + appList + '</div>' : '') +
            '<h3>Files</h3>' + Vsm__Dl([
                ['Ledger', '<code>' + Vsm.Esc(Vsm__Data.rel) + '</code>'],
                ['This PC', files.count ? files.count + ' day file(s), ' + Vsm.Mb(files.bytes) + ', ' + Vsm.Esc(files.first) + ' to ' + Vsm.Esc(files.last) : 'none yet'],
                ['Archives', zips || 'none yet: each month is zipped once all its days are ' + (Vsm__Data.keep_days || 365) + ' days old'],
                ['Audit cache', '<code>' + Vsm.Esc(Vsm__Data.audit_cache || '') + '</code>'],
                ['Server', '<code>' + Vsm.Esc(Vsm__Data.server) + '</code>'],
                ['Last fetch', fetch.t ? Vsm.Esc(Vsm__Stamp(new Date(fetch.t * 1000))) + ' (' + fetch.server_files + ' on the server)' : 'not since the manager started']]) +
            '<div class="Vsm__Muted">Fetch brings only the files that changed, in one read-only connection. Collect (mapping <code>' +
            Vsm.Esc(Vsm__Data.mapping || 'useraccounts') + '</code>, tab 02) brings them too. Click any row for its details.</div>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | One Event
    // ------------------------------------------------------------
    function Vsm__SideEvent(row) {
        var e = row.e, u = e.User;
        var detail = e.Detail ? Object.keys(e.Detail).map(function(k) {
            var v = e.Detail[k];
            return [k, Vsm.Esc(Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v))];
        }) : [];
        return '<h3>' + Vsm.Esc(e.Text) + '</h3>' + Vsm__Dl([
                ['When', Vsm.Esc(Vsm__Stamp(e._d)) + (row.n > 1 ? ' <span class="Vsm__Muted">(×' + row.n + ' since ' + Vsm.Esc(Vsm__Clock(row.first._d)) + ')</span>' : '')],
                ['UTC', '<code>' + Vsm.Esc(e.Utc) + '</code>'],
                ['User', u ? Vsm.Esc(u.Name) + ' <span class="Vsm__Muted">' + Vsm.Esc(u.Code) + '</span>' : Vsm__WhoHtml(e)],
                ['Account', u ? Vsm.Esc(Vsm__Level(u.Level).Name + (u.Role ? ' · ' + u.Role : '') + (u.Dept ? ' · ' + u.Dept : '')) : 'Guest (no sign-in)'],
                ['App', Vsm.Esc(e.App)],
                ['Action', '<code>' + Vsm.Esc(e.Action) + '</code>' + (e.Ok === false ? ' <span class="Vsm__Warn">refused</span>' : '')],
                ['Project', e.Project ? '<code>' + Vsm.Esc(e.Project) + '</code>' : ''],
                ['Detail', Vsm.Esc(e.Target || '')],
                ['Link', e.Link ? '<code>' + Vsm.Esc(e.Link) + '</code>' : ''],
                ['IP address', e.Ip ? '<code>' + Vsm.Esc(e.Ip) + '</code>' + (e.Country ? ' · ' + Vsm.Esc(e.Country) : '') : ''],
                ['Device', Vsm.Esc((e.Device || '') + (e.Mode ? ' · ' + e.Mode : ''))],
                ['Device id', e.DeviceId ? '<code>' + Vsm.Esc(e.DeviceId) + '</code>' : '']].concat(detail)) +
            '<div class="Vsm__ActFind">' +
                Vsm__FilterBtn(u ? 'Everything by ' + (u.Name || u.Code) : '', u && u.Code) +
                Vsm__FilterBtn('This device', e.DeviceId) +
                Vsm__FilterBtn('This IP', e.Ip) +
                Vsm__FilterBtn('This link', e.Link) +
                Vsm__FilterBtn('This project', e.Project) +
                '<button class="Vsm__BtnSmall" data-act-clear="1">Summary</button>' +
            '</div>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | One Link and Everyone Who Opened It
    // ------------------------------------------------------------
    function Vsm__SideLink(l) {
        var seen = l.opens.concat(l.refused, l.seen).sort(function(a, b) { return b._t - a._t; }).slice(0, 200);
        var rows = seen.map(function(e) {
            return '<tr><td>' + Vsm.Esc(Vsm__Day(e._d) + ' ' + Vsm__Clock(e._d)) + '</td><td>' + Vsm__WhoHtml(e) + '</td><td>' +
                   Vsm.Esc(e.Ok === false ? 'refused' : e.Action === 'link.open' || /^(app|project)\.open$/.test(e.Action) ? 'opened' : e.Text) +
                   '</td><td>' + Vsm__IpHtml(e) + '</td><td>' + Vsm.Esc(e.Device || '') + '</td></tr>';
        }).join('');
        var url = l.token && l.project ? '/theia/?project=' + encodeURIComponent(l.project) + '&share=' + encodeURIComponent(l.token) : l.path || '';
        return '<h3>' + Vsm.Esc(l.label || l.kind) + '</h3>' + Vsm__Dl([
                ['Kind', Vsm.Esc(l.kind)],
                ['App', Vsm.Esc(l.app || '')],
                ['Project', l.project ? '<code>' + Vsm.Esc(l.project) + '</code>' : ''],
                ['Made by', Vsm.Esc((l.by || '') + (l.created ? ', ' + Vsm__Stamp(Vsm__Parse(l.created)) : ''))],
                ['Address', url ? '<code>' + Vsm.Esc(url) + '</code>' : ''],
                ['State', Vsm.Esc(l.state || '')],
                ['Expires', l.kind === 'Copied link' ? '' : l.expires ? Vsm.Esc(Vsm__Stamp(Vsm__Parse(l.expires))) : 'never'],
                ['Videos', l.kind === 'Copied link' ? '' : l.videos ? String(l.videos) : 'all'],
                ['Opens', l.opens.length + ' in the period' + (l.counter ? ' · ' + l.counter + ' counted by Theia in all' : '')],
                ['Visitors', l.visitors + ' external device(s) or IP(s)'],
                ['Plays', l.plays ? String(l.plays) : ''],
                ['Copied', l.copies ? l.copies + ' time(s)' : '']]) +
            (l.kind === 'Copied link' ? '<p class="Vsm__Muted">A plain app link carries no token: these are the project’s external opens in ' +
                Vsm.Esc(l.app) + ' since it was first copied.</p>' : '') +
            '<h4>Who opened it</h4>' + (rows ? '<table class="Vsm__Table"><tr><th>When</th><th>Who</th><th>What</th><th>IP</th><th>Device</th></tr>' + rows + '</table>'
                                             : '<div class="Vsm__Muted">No opens in this period.</div>') +
            '<div class="Vsm__ActFind">' + Vsm__FilterBtn('Everything with this link', l.token) +
                Vsm__FilterBtn('This project', l.project) + '<button class="Vsm__BtnSmall" data-act-clear="1">Summary</button></div>';
    }
    // ------------------------------------------------------------


    // FUNCTION | Render the Side Panel for the Current Selection
    // ------------------------------------------------------------
    function Vsm__RenderSide() {
        var side = Vsm.El('Vsm__ActDetail'), sel = Vsm__Selected, view = Vsm.El('Vsm__ActView').value;
        var html = '';
        if (sel && sel.view === view && view === 'ledger') {
            var row = Vsm__Rows.find(function(r) { return r.e._k === sel.key; });
            html = row ? Vsm__SideEvent(row) : '';
        } else if (sel && sel.view === view && view === 'links') {
            var link = Vsm__Rows.find(function(l) { return l.key === sel.key; });
            html = link ? Vsm__SideLink(link) : '';
        }
        side.innerHTML = html || Vsm__SideSummary();
        Vsm.SortTables(side);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Load and Fetch
// -----------------------------------------------------------------------------

    // FUNCTION | Load the PC's Copy for the Chosen Period (no connection)
    // ------------------------------------------------------------
    Activity.Load = function() {
        var period = Vsm.El('Vsm__ActDays').value;
        var query = period.indexOf('m:') === 0 ? 'month=' + encodeURIComponent(period.slice(2)) : 'days=' + encodeURIComponent(period);
        return fetch('/api/activity?' + query, { cache: 'no-store' }).then(function(r) {
            if (!r.ok) throw new Error('HTTP ' + r.status + (r.status === 404 ? ': restart the manager server' : ''));
            return r.json();
        }).then(function(d) {
            if (!d.ok) throw new Error(d.error || 'no data');
            Vsm__Prepare(d.events || []);
            Vsm__Data = d;
            Vsm__FillSelects();
            Activity.Render();
            return d;
        }).catch(function(err) {
            Vsm.Toast('Could not load the user activity (' + err.message + ').', true);
            return null;
        });
    };
    // ------------------------------------------------------------


    // FUNCTION | Fetch the Server's New Lines (one read-only session), Then Reload
    // ------------------------------------------------------------
    Activity.Fetch = function(auto) {
        if (Vsm__Fetching) return Promise.resolve(null);
        if (auto) {                                                            // <-- Never in the way of a job, a cooldown or a missing key
            var g = Vsm.State && Vsm.State.gateway;
            if (Vsm.Running || (Vsm.State && Vsm.State.busy && Vsm.State.busy.label) || !g || g.cooldown_s > 0 || !g.agent_ok) return Promise.resolve(null);
        }
        Vsm__Fetching = true;
        Vsm__RenderBar();
        var job = auto ? Vsm.Post('/api/op/activity', { days: 0 })
                       : Vsm.Operate('activity', { days: 0 }, function(r) {
                             return r.received ? 'Fetched ' + r.received + ' ledger file(s) from the server.' : 'This PC already had every activity line.';
                         });
        return job.then(function(res) {
            Vsm__Fetching = false;
            Vsm__AutoError = auto && res && !res.ok ? (res.error || 'failed') : '';
            return Activity.Load();
        });
    };

    function Vsm__FetchIfStale() {
        var t = Vsm__Data && Vsm__Data.fetch && Vsm__Data.fetch.t;
        if (Vsm.Tab === 'activity' && document.visibilityState === 'visible' && (!t || Date.now() - t * 1000 > Vsm__StaleMs)) Activity.Fetch(true);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Events
// -----------------------------------------------------------------------------

    // FUNCTION | Clicks: Sort Headers, Rows, Side-Panel Filters
    // ------------------------------------------------------------
    function Vsm__OnClick(e) {
        if (!Vsm.El('Vsm__TabActivity').contains(e.target)) return;
        var view = Vsm.El('Vsm__ActView').value;
        var th = e.target.closest('#Vsm__ActTable th[data-sort]');
        if (th) {
            var names = { ledger: 'Activity', links: 'ActivityLinks', people: 'ActivityPeople' };
            Vsm__Sorts[view] = Vsm.SortToggle(names[view], Vsm__Sorts[view], th.dataset.sort);
            Activity.Render();
            return;
        }
        var find = e.target.closest('[data-act-find]');
        if (find) {
            Vsm.El('Vsm__ActSearch').value = find.dataset.actFind;
            if (view !== 'ledger') Vsm.El('Vsm__ActView').value = 'ledger';
            Activity.Render();
            return;
        }
        if (e.target.closest('[data-act-clear]')) { Vsm__Selected = null; Activity.Render(); return; }
        var tr = e.target.closest('#Vsm__ActTable tr[data-row]');
        if (!tr) return;
        var item = Vsm__Rows[Number(tr.dataset.row)];
        if (!item) return;
        if (view === 'people') {                                               // <-- A person or device: their own ledger
            Vsm.El('Vsm__ActSearch').value = item.user ? item.user.Code : item.deviceId || Object.keys(item.ips)[0] || '';
            Vsm.El('Vsm__ActView').value = 'ledger';
            Vsm__Selected = null;
        } else {
            var key = view === 'ledger' ? item.e._k : item.key;
            Vsm__Selected = Vsm__Selected && Vsm__Selected.view === view && Vsm__Selected.key === key ? null : { view: view, key: key };
        }
        Activity.Render();
    }
    // ------------------------------------------------------------


    // FUNCTION | Wire Up Tab 05
    // ------------------------------------------------------------
    Activity.Init = function() {
        Vsm__PeriodHtml = Vsm.El('Vsm__ActDays').innerHTML;
        var view = Vsm.Store('ActivityView'), days = Vsm.Store('ActivityDays');
        if (view && Vsm.El('Vsm__ActView').querySelector('option[value="' + view + '"]')) Vsm.El('Vsm__ActView').value = view;
        if (days && Vsm.El('Vsm__ActDays').querySelector('option[value="' + days + '"]')) Vsm.El('Vsm__ActDays').value = days;
        document.addEventListener('click', Vsm__OnClick);
        Vsm.El('Vsm__BtnActFetch').addEventListener('click', function() { Activity.Fetch(false); });
        Vsm.El('Vsm__ActView').addEventListener('change', function() {
            Vsm.Store('ActivityView', this.value);
            Vsm__Selected = null;
            Activity.Render();
        });
        Vsm.El('Vsm__ActDays').addEventListener('change', function() {
            if (this.value.indexOf('m:') !== 0) Vsm.Store('ActivityDays', this.value);
            Vsm__Selected = null;
            Activity.Load();
        });
        ['Vsm__ActApp', 'Vsm__ActWho', 'Vsm__ActKind', 'Vsm__ActGroup'].forEach(function(id) {
            Vsm.El(id).addEventListener('change', Activity.Render);
        });
        var typing = null;
        Vsm.El('Vsm__ActSearch').addEventListener('input', function() {
            window.clearTimeout(typing);
            typing = window.setTimeout(Activity.Render, 150);
        });
        Vsm__Timer = window.setInterval(Vsm__FetchIfStale, 60e3);              // <-- Every minute: fetch when the copy is 5 min old
    };

    Activity.Show = function() {
        var first = !Vsm__Data;
        Activity.Load().then(function() { if (first || Vsm__Data) Vsm__FetchIfStale(); });
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

})();
