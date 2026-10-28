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
   - FOUR VIEWS of the same events:
       Activity ledger      one row per event (repeats in a row grouped "x12")
       Generated links      client links of ValeVision Theia and ValeVision 3D (the
                            PC's copies of each project's links file, plus the
                            ledger), and links staff copied: who made them, opens,
                            distinct visitors
       People and devices   one row per signed-in person, and per external
                            device (or IP when the browser sent no device id)
       Insights             the same events counted (0.13.0): headline figures,
                            what clients and staff use (two colours, every bar
                            split), activity day by day, each client link's and
                            each project's engagement (time spent exploring,
                            images exported, scenes, the tour, video watched),
                            and the most used sizes, lenses, scenes, layers and
                            videos. Click a row for its events in the ledger.
   - EXTERNAL means no sign-in: a client or guest who opened a link. They are
     told apart by device id (a random id in the browser's cookie) and IP.
   - Filters (period, search, app, account type, action) and the shared column
     sort work as on the other tabs. Click a row for every detail.
   - HIDE MY ACTIONS leaves out the person using this PC (USR00000001, or
     localStorage Vsm__ActivityMe): their signed-in events, and external events
     from any browser they have signed in on (their own client-link tests). The
     devices are remembered on this PC (Vsm__ActivityMyDevices), so a test in a
     short period is still known. Never by IP: the office address is shared.
   - A YEAR LIVE, THEN ARCHIVED: the server zips each month once all its days are
     a year old (00__Archive/ServerLogs__<yyyy>__Archived__.zip, a folder per month).
     The period list names every month: a live one loads from the day files, an
     archived one is unzipped into the audit cache (BackupRoot/ServerLogs__AuditCache)
     and loaded from there.

   =============================================================================

   DEVELOPMENT LOG:
   28-Oct-2026 - Version 0.13.0
   - Insights, the fourth view (above). New action kinds for ValeVision 3D's
     menu actions and visits and Theia's watch time (ValeShared__Activity__ 1.2.0):
     Exported, Changed, Guided, Visit. ValeVision 3D's client links join Theia's
     in Generated links, each with its own address; a link's panel shows what
     its visitors did.

   13-Oct-2026 - Version 0.12.0
   - Hide my actions (beside Group repeats): the ledger, people and the links'
     opens and visitors leave out the PC's own person and their browsers.

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
    var Vsm__MyDevices = {};                                                   // <-- Device ids the PC's own person signed in on
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
    var Vsm__MeDefault  = 'USR00000001';                                       // <-- Adam: the person using this PC unless Vsm__ActivityMe says otherwise
    var Vsm__MyDevicesMax = 200;                                               // <-- Remembered device ids at most (newest kept)
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
        export   : { label: 'Exported', cls: 'kind-server' },                 // <-- 0.13.0: an image saved from ValeVision 3D
        setting  : { label: 'Changed',  cls: 'is-off' },                      // <-- the camera, layers, full screen, Reset View, settings
        guide    : { label: 'Guided',   cls: 'kind-web' },                    // <-- Help and the client tour
        visit    : { label: 'Visit',    cls: 'is-mirror' },                   // <-- a visit's time and moves on the model
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
        if (/^(app|project)\.(open|resume|edit|switch)$|^(view|model|menu)\.open$|^(scene|drawing)\.view$|^view\.mode$/.test(a)) return 'open';
        if (/^video\.(play|publish|delete|watch)$/.test(a)) return 'video';
        if (/^email\./.test(a)) return 'email';
        if (/^file\.download$/.test(a)) return 'download';
        if (/^(tool|search|report)\.|^file\.print$|^video\.preview$/.test(a)) return 'tool';
        if (a === 'image.export') return 'export';
        if (/^(camera|layer|settings)\.|^view\.(fullscreen|reset)$/.test(a)) return 'setting';
        if (/^(help|tour)\./.test(a)) return 'guide';
        if (a === 'visit.summary') return 'visit';
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


    // HELPER FUNCTION | Me: the Person Using This PC, and the Browsers They Signed In On
    // ------------------------------------------------------------
    function Vsm__MeCode() { return Vsm.Store('ActivityMe') || Vsm__MeDefault; }

    function Vsm__IsMine(e) {
        if (e.User) return e.User.Code === Vsm__MeCode();
        return !!(e.DeviceId && Vsm__MyDevices[e.DeviceId]);                   // <-- External, but one of my browsers: my own link test
    }

    function Vsm__LearnMyDevices(events) {                                     // <-- Remembered, so a short period still knows them
        var me = Vsm__MeCode(), list = [];
        try { list = JSON.parse(Vsm.Store('ActivityMyDevices') || '[]'); } catch (err) { list = []; }
        if (!Array.isArray(list)) list = [];
        var before = list.length;
        events.forEach(function(e) {
            if (e.User && e.User.Code === me && e.DeviceId && list.indexOf(e.DeviceId) < 0) list.push(e.DeviceId);
        });
        list = list.slice(-Vsm__MyDevicesMax);
        if (list.length !== before) Vsm.Store('ActivityMyDevices', JSON.stringify(list));
        Vsm__MyDevices = {};
        list.forEach(function(id) { Vsm__MyDevices[id] = true; });
    }

    function Vsm__NameMe() {                                                   // <-- The toggle says who "me" is
        var code = Vsm__MeCode(), n = Object.keys(Vsm__MyDevices).length;
        Vsm.El('Vsm__ActHideMeLabel').title = 'Leave out everything you (' + Vsm__UserName(code) + ', ' + code + ') did: signed in, and external visits from the ' +
            n + ' browser' + (n === 1 ? '' : 's') + ' you have signed in on (your own client-link tests). Never by IP: the office address is shared.';
    }
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
            group : Vsm.El('Vsm__ActGroup').checked,
            hideMe: Vsm.El('Vsm__ActHideMe').checked
        };
    }

    function Vsm__TextMatch(text, terms) {
        for (var i = 0; i < terms.length; i++) if (text.indexOf(terms[i]) < 0) return false;
        return true;
    }

    function Vsm__Matches(e, f) {
        if (f.hideMe && Vsm__IsMine(e)) return false;
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
    // Hide my actions keeps the links I made but leaves my own opens out of
    // the opens, visitors and last open.
    // ------------------------------------------------------------
    function Vsm__Links(f) {
        var map = {}, order = [], hide = !!(f && f.hideMe);
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
                } else if (hide && e.Action !== 'link.copy' && Vsm__IsMine(e)) {
                    return;                                                    // <-- My own open or play of the link
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
                    (!since || e._d >= since) && !(hide && Vsm__IsMine(e))) l.opens.push(e);
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
            if (f.hideMe && Vsm__IsMine(e)) return;
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
        var all = Object.assign({}, f, { hideMe: false });
        var mine = f.hideMe ? Vsm__Data.events.filter(function(e) { return Vsm__IsMine(e) && Vsm__Matches(e, all); }).length : 0;
        return events.toLocaleString() + ' event' + (events === 1 ? '' : 's') + ' · ' + Object.keys(people).length + ' signed-in ' +
               (Object.keys(people).length === 1 ? 'person' : 'people') + ' · ' + Object.keys(ext).length + ' external device' + (Object.keys(ext).length === 1 ? '' : 's') +
               (mine ? ' · ' + mine.toLocaleString() + ' of yours hidden' : '');
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Links Table
    // ------------------------------------------------------------
    function Vsm__RenderLinks(f) {
        var sort = Vsm__Sorts.links;
        var col = Vsm__LinkCols.find(function(c) { return c.key === sort.key; }) || Vsm__LinkCols[0];
        var list = Vsm__Links(f).filter(function(l) { return (!f.app || l.app === f.app) && Vsm__TextMatch(l._s, f.terms); });
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
                    (l.counter > l.opens.length ? ' <span class="Vsm__Muted" title="The link’s own view counter in ' + Vsm.Esc(l.app || 'its app') + ', all time, from this PC’s copy of the links file (Collect brings it up to date). It counts visits from before the ledger began, or before this period.">· ' +
                     l.counter + ' in all</span>' : '') + '</td>' +
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
        var f = Vsm__Filters(), view = Vsm.El('Vsm__ActView').value, insights = view === 'insights';
        Vsm.El('Vsm__ActTable').parentNode.hidden = insights;                  // <-- Insights draws its own page in place of the table
        Vsm.El('Vsm__ActInsights').hidden = !insights;
        if (!insights) Vsm.El('Vsm__ActInsTip').hidden = true;
        var counts = insights ? Vsm__RenderInsights(f) : view === 'links' ? Vsm__RenderLinks(f) : view === 'people' ? Vsm__RenderPeople(f) : Vsm__RenderLedger(f);
        Vsm__RenderBar(counts);
        Vsm.El('Vsm__ActErrors').innerHTML = Vsm__Data.truncated ? '<div>⚠ ' + Vsm__Data.truncated.toLocaleString() +
            ' older events in this period are left out (newest ' + Vsm__Data.events.length.toLocaleString() + ' shown): choose a shorter period.</div>' : '';
        Vsm__RenderSide();
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Insights: the Same Events, Counted (the fourth view, 0.13.0)
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | What Is Counted, and How Many Rows Each List Shows
    // ------------------------------------------------------------
    // Two series everywhere: clients (no sign-in) and staff (signed in), in
    // the stylesheet's --Vsm_InsClient and --Vsm_InsStaff (the reference data
    // palette's first two colours, checked colour-blind safe on white). Bars
    // carry the colour; every number and name stays in the text colours.
    // ------------------------------------------------------------
    var Vsm__InsTop = 8;                                                       // <-- Rows in each "most used" list
    var Vsm__InsRows = 15;                                                     // <-- Rows in the links and projects tables
    var Vsm__InsDaysMax = 92;                                                  // <-- Longer periods are drawn week by week

    function Vsm__Is(action) { return function(e) { return e.Action === action; }; }

    var Vsm__InsFeatures = [                                                   // <-- [what it reads as, the action to find in the ledger, the test]
        ['Opened an app',                'app.open',          Vsm__Is('app.open')],
        ['Opened a 3D model',            'model.open',        Vsm__Is('model.open')],
        ['Viewed a presentation scene',  'scene.view',        Vsm__Is('scene.view')],
        ['Exported an image',            'image.export',      Vsm__Is('image.export')],
        ['Changed the camera lens',      'camera.lens',       Vsm__Is('camera.lens')],
        ['Perspective correction',       'camera.correction', Vsm__Is('camera.correction')],
        ['Showed or hid a model layer',  'layer.toggle',      Vsm__Is('layer.toggle')],
        ['Went full screen',             'view.fullscreen',   function(e) { return e.Action === 'view.fullscreen' && e.Target === 'Entered'; }],
        ['Reset the view',               'view.reset',        Vsm__Is('view.reset')],
        ['Walk, orbit or fly',           'view.mode',         Vsm__Is('view.mode')],
        ['Opened a drawing view',        'view.open',         Vsm__Is('view.open')],
        ['Opened a menu',                'menu.open',         Vsm__Is('menu.open')],
        ['Changed a setting',            'settings.change',   Vsm__Is('settings.change')],
        ['Opened Help',                  'help.open',         Vsm__Is('help.open')],
        ['Started the tour',             'tour.start',        Vsm__Is('tour.start')],
        ['Finished the tour',            'tour.finish',       Vsm__Is('tour.finish')],
        ['Left the tour early',          'tour.skip',         Vsm__Is('tour.skip')],
        ['Played a video',               'video.play',        Vsm__Is('video.play')],
        ['Watched a video to the end',   'video.watch',       function(e) { return e.Action === 'video.watch' && !!(e.Detail && e.Detail.Finished === true); }],
        ['Copied a link',                'link.copy',         Vsm__Is('link.copy')],
        ['Downloaded a file',            'file.download',     Vsm__Is('file.download')]
    ];
    // ------------------------------------------------------------


    // HELPER FUNCTION | Durations in Words ("45 s", "12 min", "3 h 20 min")
    // ------------------------------------------------------------
    function Vsm__Dur(seconds) {
        var s = Math.round(Number(seconds) || 0);
        if (s < 60) return s + ' s';
        var m = Math.round(s / 60);
        if (m < 60) return m + ' min';
        return Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '');
    }

    function Vsm__N(n, one, many) { return n.toLocaleString() + ' ' + (n === 1 ? one : many || one + 's'); }
    // ------------------------------------------------------------


    // FUNCTION | What a Set of Events Adds Up To (a link's, a project's, a period's)
    // ------------------------------------------------------------
    function Vsm__Engage(list) {
        var g = { opens: 0, visits: 0, seconds: 0, active: 0, exports: 0, scenes: 0, layers: 0, camera: 0, menus: 0, help: 0,
                  tourStart: 0, tourFinish: 0, tourSkip: 0, tourAt: '', videoSeconds: 0, videoFinished: 0, plays: 0, devices: {}, last: null };
        list.forEach(function(e) {
            var d = e.Detail || {};
            switch (e.Action) {
                case 'link.open':         g.opens += 1; break;
                case 'app.open':          g.visits += 1; break;
                case 'visit.summary':     g.seconds += Number(d.Seconds) || 0; g.active += Number(d.ActiveSeconds) || 0; break;
                case 'image.export':      g.exports += 1; break;
                case 'scene.view':        g.scenes += 1; break;
                case 'layer.toggle':      g.layers += 1; break;
                case 'camera.lens':
                case 'camera.correction': g.camera += 1; break;
                case 'menu.open':         g.menus += 1; break;
                case 'help.open':         g.help += 1; break;
                case 'tour.start':        g.tourStart += 1; break;
                case 'tour.finish':       g.tourFinish += 1; break;
                case 'tour.skip':         g.tourSkip += 1; g.tourAt = e.Target || g.tourAt; break;
                case 'video.watch':       g.videoSeconds += Number(d.Seconds) || 0; if (d.Finished === true) g.videoFinished += 1; break;
                case 'video.play':        g.plays += 1; break;
            }
            if (!e.User) g.devices[e.DeviceId || e.Ip || '?'] = true;
            if (!g.last || e._t > g.last._t) g.last = e;
        });
        g.visitors = Object.keys(g.devices).length;
        return g;
    }

    function Vsm__TourWords(g) {
        if (g.tourFinish) return 'finished' + (g.tourFinish > 1 ? ' ×' + g.tourFinish : '');
        if (g.tourSkip) return 'left early' + (g.tourAt ? ' at ' + g.tourAt : '');
        return g.tourStart ? 'started' : '';
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | A Bar Split Into Clients and Staff (2 px apart; the far end rounded)
    // ------------------------------------------------------------
    function Vsm__InsBar(c, s, max) {
        var both = c && s, segs = [];
        var width = function(n) { var f = max ? n / max : 0; return both ? 'calc((100% - 2px) * ' + f.toFixed(4) + ')' : (f * 100).toFixed(2) + '%'; };
        if (c) segs.push(['is-client', width(c)]);
        if (s) segs.push(['is-staff', width(s)]);
        return '<span class="Vsm__InsTrack">' + segs.map(function(x, i) {
            return '<span class="Vsm__InsSeg ' + x[0] + (i === segs.length - 1 ? ' is-end' : '') + '" style="width:' + x[1] + '"></span>';
        }).join('') + '</span>';
    }

    function Vsm__InsSplitWords(c, s, fmt) {                                   // <-- "12 by clients · 3 by staff", "4 min by clients"
        var f = fmt || function(n) { return n.toLocaleString(); };
        return [c ? f(c) + ' by clients' : '', s ? f(s) + ' by staff' : ''].filter(Boolean).join(' · ');
    }

    function Vsm__InsRow(label, c, s, max, find, fmt) {
        var words = Vsm__InsSplitWords(c, s, fmt);
        return '<div class="Vsm__InsRow"' + (find ? ' data-act-find="' + Vsm.Esc(find) + '"' : '') + ' data-tip="' + Vsm.Esc(label + '\n' + words +
               (find ? '\nClick: these events in the ledger' : '')) + '">' +
            '<span class="Vsm__InsLabel">' + Vsm.Esc(label) + '</span>' + Vsm__InsBar(c, s, max) +
            '<span class="Vsm__InsNum">' + Vsm.Esc(words) + '</span></div>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | A "Most Used" List: events grouped by a key, split clients / staff
    // ------------------------------------------------------------
    // key(e) names the row ('' leaves the event out); value(e) is what it adds
    // (1 by default, seconds for watch time); fmt words the totals.
    // ------------------------------------------------------------
    function Vsm__InsList(events, test, key, value, fmt) {
        var map = {};
        events.forEach(function(e) {
            if (!test(e)) return;
            var k = key(e);
            if (!k) return;
            var row = map[k] || (map[k] = { k: k, c: 0, s: 0 });
            row[e.User ? 's' : 'c'] += value ? value(e) : 1;
        });
        var rows = Object.keys(map).map(function(k) { return map[k]; }).sort(function(a, b) { return (b.c + b.s) - (a.c + a.s); });
        if (!rows.length) return '<div class="Vsm__InsEmpty">None in this period.</div>';
        var max = rows.reduce(function(m, r) { return Math.max(m, r.c + r.s); }, 0);
        return rows.slice(0, Vsm__InsTop).map(function(r) { return Vsm__InsRow(r.k, r.c, r.s, max, r.k, fmt); }).join('') +
               (rows.length > Vsm__InsTop ? '<div class="Vsm__InsEmpty">and ' + (rows.length - Vsm__InsTop) + ' more</div>' : '');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Period in Buckets: Days, or Weeks When Longer Than 92 Days
    // ------------------------------------------------------------
    function Vsm__InsBuckets(events) {
        var day = function(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
        var keyOf = function(d) { return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); };
        var end = day(new Date()), start;
        if (Vsm__Data.month) {
            var y = Number(Vsm__Data.month.slice(0, 4)), m = Number(Vsm__Data.month.slice(5, 7)) - 1;
            start = new Date(y, m, 1);
            end = new Date(y, m + 1, 0);
        } else {
            start = Vsm__Data.since ? day(new Date(Vsm__Data.since + 'T00:00:00')) : end;
        }
        if (events.length && events[0]._d && day(events[0]._d) < start) start = day(events[0]._d);   // <-- UTC days against this PC's days
        var weekly = Math.round((end - start) / 864e5) + 1 > Vsm__InsDaysMax;
        var monday = function(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() - (d.getDay() + 6) % 7); };
        if (weekly) start = monday(start);
        var list = [], index = {};
        for (var d = start; d <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (weekly ? 7 : 1))) {
            index[keyOf(d)] = list.length;
            list.push({ d: d, c: 0, s: 0 });
        }
        events.forEach(function(e) {
            if (!e._d) return;
            var i = index[keyOf(weekly ? monday(day(e._d)) : day(e._d))];
            if (i !== undefined) list[i][e.User ? 's' : 'c'] += 1;
        });
        return { list: list, weekly: weekly };
    }

    function Vsm__InsNiceMax(v) {
        if (v <= 5) return 5;
        var p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p;
        return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
    }

    function Vsm__InsTopRounded(x, y, w, h, r) {                               // <-- A bar's top corners rounded, its foot square on the baseline
        r = Math.max(0, Math.min(r, w / 2, h));
        return 'M' + x.toFixed(1) + ',' + (y + h).toFixed(1) + 'V' + (y + r).toFixed(1) + 'Q' + x.toFixed(1) + ',' + y.toFixed(1) + ' ' +
               (x + r).toFixed(1) + ',' + y.toFixed(1) + 'H' + (x + w - r).toFixed(1) + 'Q' + (x + w).toFixed(1) + ',' + y.toFixed(1) + ' ' +
               (x + w).toFixed(1) + ',' + (y + r).toFixed(1) + 'V' + (y + h).toFixed(1) + 'Z';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Activity Day by Day (inline SVG: clients at the foot, staff above, one axis)
    // ------------------------------------------------------------
    function Vsm__InsDayChart(events) {
        var b = Vsm__InsBuckets(events), list = b.list;
        if (!list.length) return '<div class="Vsm__InsEmpty">No days in this period.</div>';
        var most = list.reduce(function(m, x) { return Math.max(m, x.c + x.s); }, 0);
        var top = Vsm__InsNiceMax(most);
        var W = 720, H = 172, L = 40, R = 8, T = 10, B = 24, w = W - L - R, h = H - T - B, base = T + h;
        var slot = w / list.length, bw = Math.max(2, Math.min(26, slot * 0.68)), gap = 2;
        var px = function(v) { return top ? v / top * h : 0; };
        var out = [];
        [0, top / 2, top].forEach(function(v) {
            var y = (base - px(v)).toFixed(1);
            out.push('<line class="is-grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '"></line>');
            out.push('<text x="' + (L - 6) + '" y="' + (Number(y) + 4) + '" text-anchor="end">' + Math.round(v).toLocaleString() + '</text>');
        });
        var every = Math.max(1, Math.ceil(list.length / 7));
        var dayName = function(d) { return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]; };
        list.forEach(function(x, i) {
            var cx = L + slot * i + slot / 2, x0 = cx - bw / 2;
            var hc = x.c ? Math.max(1, px(x.c)) : 0, hs = x.s ? Math.max(1, px(x.s)) : 0;
            if (hc) out.push(hs ? '<rect class="is-client" x="' + x0.toFixed(1) + '" y="' + (base - hc).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + hc.toFixed(1) + '"></rect>'
                                : '<path class="is-client" d="' + Vsm__InsTopRounded(x0, base - hc, bw, hc, 3) + '"></path>');
            if (hs) out.push('<path class="is-staff" d="' + Vsm__InsTopRounded(x0, base - hc - (hc ? gap : 0) - hs, bw, hs, 3) + '"></path>');
            var when = b.weekly ? 'Week of ' + Vsm__Day(x.d) : dayName(x.d) + ' ' + Vsm__Day(x.d);
            out.push('<rect class="is-hit" x="' + (L + slot * i).toFixed(1) + '" y="' + T + '" width="' + slot.toFixed(1) + '" height="' + h + '" data-tip="' +
                     Vsm.Esc(when + '\n' + (x.c + x.s ? 'Clients ' + x.c.toLocaleString() + ' · Staff ' + x.s.toLocaleString() + ' events' : 'No events')) + '"></rect>');
            if (i % every === 0) {
                out.push('<text x="' + cx.toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' + Vsm.Esc(x.d.getDate() + ' ' + Vsm__Months[x.d.getMonth()]) + '</text>');
            }
        });
        return '<svg class="Vsm__InsChart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Events ' + (b.weekly ? 'week' : 'day') +
               ' by ' + (b.weekly ? 'week' : 'day') + ', clients and staff">' + out.join('') + '</svg>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Client Links: What Each Link's Visitors Did
    // ------------------------------------------------------------
    function Vsm__InsLinks(f) {
        var links = Vsm__Links(f).filter(function(l) {
            return l.token && (!f.app || l.app === f.app) && (l.opens.length || l.seen.length) && Vsm__TextMatch(l._s, f.terms);
        }).map(function(l) { return Object.assign(l, { g: Vsm__Engage(l.opens.concat(l.seen)) }); });
        links.sort(function(a, b) { return (b.g.last ? b.g.last._t : 0) - (a.g.last ? a.g.last._t : 0); });
        if (!links.length) return '<div class="Vsm__InsEmpty">No client link was used in this period.</div>';
        var most = links.reduce(function(m, l) { return Math.max(m, l.g.seconds); }, 0);
        return '<table class="Vsm__UserTable Vsm__InsTable"><thead><tr><th>Link</th><th>App</th><th>Project</th><th>Opens</th><th>Visitors</th>' +
               '<th>Exploring</th><th>Images</th><th>Scenes</th><th>Tour</th><th>Watched</th><th>Last used</th></tr></thead><tbody>' +
            links.slice(0, Vsm__InsRows).map(function(l) {
                var g = l.g;
                return '<tr class="Vsm__ActRow" data-act-find="' + Vsm.Esc(l.token) + '" data-tip="' + Vsm.Esc((l.label || 'No label') + '\nClick: everything with this link in the ledger') + '">' +
                    '<td><b>' + Vsm.Esc(l.label || 'No label') + '</b> ' + Vsm__LinkHtml(l.token) + '</td>' +
                    '<td>' + Vsm.Esc((l.app || '').replace(/^ValeVision /, '')) + '</td>' +
                    '<td>' + Vsm__ProjectHtml(l.project) + '</td>' +
                    '<td>' + l.opens.length + '</td>' +
                    '<td>' + g.visitors + '</td>' +
                    '<td>' + (g.seconds ? '<span class="Vsm__InsMini" style="width:' + Math.max(3, Math.round(g.seconds / (most || 1) * 60)) + 'px"></span>' + Vsm.Esc(Vsm__Dur(g.seconds)) : '') + '</td>' +
                    '<td>' + (g.exports || '') + '</td>' +
                    '<td>' + (g.scenes || '') + '</td>' +
                    '<td>' + Vsm.Esc(Vsm__TourWords(g)) + '</td>' +
                    '<td>' + (g.videoSeconds ? Vsm.Esc(Vsm__Dur(g.videoSeconds)) + (g.videoFinished ? ' <span class="Vsm__Muted">· ' + g.videoFinished + ' to the end</span>' : '') : '') + '</td>' +
                    '<td>' + (g.last ? Vsm.Esc(Vsm__Day(g.last._d) + ' ' + Vsm__Clock(g.last._d)) : '') + '</td></tr>';
            }).join('') + '</tbody></table>' +
            (links.length > Vsm__InsRows ? '<div class="Vsm__InsEmpty">and ' + (links.length - Vsm__InsRows) + ' more: see Generated links</div>' : '');
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Projects Clients Opened, the Most Explored First
    // ------------------------------------------------------------
    function Vsm__InsProjects(events) {
        var map = {};
        events.forEach(function(e) { if (!e.User && e.Project) (map[e.Project] || (map[e.Project] = [])).push(e); });
        var rows = Object.keys(map).map(function(p) { return { project: p, apps: {}, g: Vsm__Engage(map[p]), list: map[p] }; });
        rows.forEach(function(r) { r.list.forEach(function(e) { if (e.App) r.apps[e.App.replace(/^ValeVision /, '')] = true; }); });
        rows.sort(function(a, b) { return (b.g.seconds + b.g.videoSeconds) - (a.g.seconds + a.g.videoSeconds) || b.g.visits - a.g.visits; });
        if (!rows.length) return '<div class="Vsm__InsEmpty">No client opened a project in this period.</div>';
        var most = rows.reduce(function(m, r) { return Math.max(m, r.g.seconds); }, 0);
        return '<table class="Vsm__UserTable Vsm__InsTable"><thead><tr><th>Project</th><th>Apps</th><th>Visits</th><th>Visitors</th><th>Exploring</th>' +
               '<th>Images</th><th>Scenes</th><th>Watched</th><th>Last visit</th></tr></thead><tbody>' +
            rows.slice(0, Vsm__InsRows).map(function(r) {
                var g = r.g;
                return '<tr class="Vsm__ActRow" data-act-find="' + Vsm.Esc(r.project) + '" data-tip="' + Vsm.Esc(Vsm__ProjectText(r.project) + '\nClick: this project in the ledger') + '">' +
                    '<td>' + Vsm__ProjectHtml(r.project) + '</td>' +
                    '<td>' + Vsm.Esc(Object.keys(r.apps).join(', ')) + '</td>' +
                    '<td>' + g.visits + '</td>' +
                    '<td>' + g.visitors + '</td>' +
                    '<td>' + (g.seconds ? '<span class="Vsm__InsMini" style="width:' + Math.max(3, Math.round(g.seconds / (most || 1) * 60)) + 'px"></span>' + Vsm.Esc(Vsm__Dur(g.seconds)) : '') + '</td>' +
                    '<td>' + (g.exports || '') + '</td>' +
                    '<td>' + (g.scenes || '') + '</td>' +
                    '<td>' + (g.videoSeconds ? Vsm.Esc(Vsm__Dur(g.videoSeconds)) : '') + '</td>' +
                    '<td>' + (g.last ? Vsm.Esc(Vsm__Day(g.last._d) + ' ' + Vsm__Clock(g.last._d)) : '') + '</td></tr>';
            }).join('') + '</tbody></table>';
    }
    // ------------------------------------------------------------


    // FUNCTION | Render Insights for the Filters (the kind filter is the ledger's alone)
    // ------------------------------------------------------------
    function Vsm__RenderInsights(f) {
        var fi = Object.assign({}, f, { kind: '' });
        var events = Vsm__Data.events.filter(function(e) { return Vsm__Matches(e, fi); });
        var clients = events.filter(function(e) { return !e.User; }), staff = events.length - clients.length;
        var cg = Vsm__Engage(clients), sg = Vsm__Engage(events.filter(function(e) { return !!e.User; }));
        var tile = function(label, value, sub, tip) {
            return '<div class="Vsm__InsTile"' + (tip ? ' data-tip="' + Vsm.Esc(tip) + '"' : '') + '><span>' + Vsm.Esc(label) + '</span><b>' + Vsm.Esc(value) + '</b><span>' + Vsm.Esc(sub || '') + '</span></div>';
        };
        var features = Vsm__InsFeatures.map(function(x) {
            var c = 0, s = 0;
            events.forEach(function(e) { if (x[2](e)) { if (e.User) s += 1; else c += 1; } });
            return { label: x[0], find: x[1], c: c, s: s };
        }).filter(function(x) { return x.c + x.s; }).sort(function(a, b) { return (b.c + b.s) - (a.c + a.s); });
        var fmax = features.reduce(function(m, x) { return Math.max(m, x.c + x.s); }, 0);
        var stripState = function(e) { return String(e.Target || '').replace(/\s*\((shown|hidden)\)$/, '').trim(); };   // <-- One row per layer, shown or hidden
        var minutes = function(n) { return Vsm__Dur(n); };

        Vsm.El('Vsm__ActInsights').innerHTML =
            '<div class="Vsm__InsLegend"><span><i class="Vsm__InsKey is-client"></i>Clients: no sign-in (client links)</span>' +
                '<span><i class="Vsm__InsKey is-staff"></i>Staff: signed in</span>' +
                '<span class="Vsm__Muted">Point at anything for its numbers; click a row for its events in the ledger.</span></div>' +
            '<div class="Vsm__InsTiles">' +
                tile('Client visits', cg.visits.toLocaleString(), Vsm__N(cg.visitors, 'device') + ' · ' + Vsm__N(cg.opens, 'link open'), 'An app opened with no sign-in (each page load), the devices behind them, and client links opened (once per browser session)') +
                tile('Clients exploring', Vsm__Dur(cg.seconds), cg.active ? Vsm__Dur(cg.active) + ' active' : 'ValeVision 3D', 'Time ValeVision 3D was on a client’s screen after the model showed; active: an input in each 5 seconds') +
                tile('Images exported', cg.exports.toLocaleString(), (sg.exports ? sg.exports.toLocaleString() + ' by staff' : 'by clients'), 'Images actually downloaded from Export Image') +
                tile('Scenes viewed', cg.scenes.toLocaleString(), (sg.scenes ? sg.scenes.toLocaleString() + ' by staff' : 'by clients'), 'Presentation scenes a person chose') +
                tile('Client tour', cg.tourStart ? cg.tourFinish + ' of ' + cg.tourStart : '0', cg.tourStart ? 'finished · ' + cg.tourSkip + ' left early' : 'not started yet', 'Tours finished of those started') +
                tile('Video watched', Vsm__Dur(cg.videoSeconds), cg.videoFinished ? cg.videoFinished + ' to the end' : 'by clients', 'ValeVision Theia: seconds actually played by clients') +
            '</div>' +
            '<div class="Vsm__InsGrid">' +
                '<section class="Vsm__InsCard is-wide"><h3>Activity ' + (Vsm__InsBuckets(events).weekly ? 'week by week' : 'day by day') + '</h3>' + Vsm__InsDayChart(events) + '</section>' +
                '<section class="Vsm__InsCard"><h3>What people use</h3>' + (features.length ? features.map(function(x) {
                    return Vsm__InsRow(x.label, x.c, x.s, fmax, x.find);
                }).join('') : '<div class="Vsm__InsEmpty">' + Vsm__EmptyText() + '</div>') + '</section>' +
                '<section class="Vsm__InsCard"><h3>Images exported</h3>' + Vsm__InsList(events, Vsm__Is('image.export'), function(e) { return e.Target || 'image'; }) +
                    '<h3 class="Vsm__InsSub">Camera lenses chosen</h3>' + Vsm__InsList(events, Vsm__Is('camera.lens'), function(e) { return e.Target; }) + '</section>' +
                '<section class="Vsm__InsCard is-wide"><h3>Client links</h3>' + Vsm__InsLinks(f) + '</section>' +
                '<section class="Vsm__InsCard is-wide"><h3>Projects clients opened</h3>' + Vsm__InsProjects(events) + '</section>' +
                '<section class="Vsm__InsCard"><h3>Scenes viewed</h3>' + Vsm__InsList(events, Vsm__Is('scene.view'), function(e) { return e.Target; }) + '</section>' +
                '<section class="Vsm__InsCard"><h3>Model layers shown or hidden</h3>' + Vsm__InsList(events, Vsm__Is('layer.toggle'), stripState) + '</section>' +
                '<section class="Vsm__InsCard"><h3>Menus opened</h3>' + Vsm__InsList(events, Vsm__Is('menu.open'), function(e) { return e.Target; }) + '</section>' +
                '<section class="Vsm__InsCard"><h3>Videos watched</h3>' + Vsm__InsList(events, Vsm__Is('video.watch'), function(e) { return e.Target; },
                    function(e) { return Number(e.Detail && e.Detail.Seconds) || 0; }, minutes) + '</section>' +
            '</div>';
        return Vsm__N(events.length, 'event') + ' · ' + Vsm__N(cg.visitors, 'client device') + ' · ' + Vsm__N(staff, 'staff event');
    }
    // ------------------------------------------------------------


    // FUNCTION | The Hover Tip: any element in Insights with data-tip
    // ------------------------------------------------------------
    function Vsm__InsTip(e) {
        var tip = Vsm.El('Vsm__ActInsTip'), box = Vsm.El('Vsm__ActInsights');
        var t = e.target && e.target.closest ? e.target.closest('[data-tip]') : null;
        if (!tip) return;
        if (!t || !box.contains(t) || e.type === 'mouseleave') { tip.hidden = true; return; }
        tip.textContent = t.getAttribute('data-tip');
        tip.hidden = false;
        var r = tip.getBoundingClientRect(), x = e.clientX + 14, y = e.clientY + 14;
        if (x + r.width > window.innerWidth - 8) x = e.clientX - r.width - 14;
        if (y + r.height > window.innerHeight - 8) y = e.clientY - r.height - 14;
        tip.style.left = Math.max(4, x) + 'px';
        tip.style.top = Math.max(4, y) + 'px';
    }
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
        var route = l.app === 'ValeVision 3D' ? '/valevision/' : '/theia/';
        var url = l.token && l.project ? route + '?project=' + encodeURIComponent(l.project) + '&share=' + encodeURIComponent(l.token) : l.path || '';
        var g = Vsm__Engage(l.opens.concat(l.seen));
        return '<h3>' + Vsm.Esc(l.label || l.kind) + '</h3>' + Vsm__Dl([
                ['Kind', Vsm.Esc(l.kind)],
                ['App', Vsm.Esc(l.app || '')],
                ['Project', l.project ? '<code>' + Vsm.Esc(l.project) + '</code>' : ''],
                ['Made by', Vsm.Esc((l.by || '') + (l.created ? ', ' + Vsm__Stamp(Vsm__Parse(l.created)) : ''))],
                ['Address', url ? '<code>' + Vsm.Esc(url) + '</code>' : ''],
                ['State', Vsm.Esc(l.state || '')],
                ['Expires', l.kind === 'Copied link' ? '' : l.expires ? Vsm.Esc(Vsm__Stamp(Vsm__Parse(l.expires))) : 'never'],
                ['Videos', l.kind === 'Copied link' || l.app !== 'ValeVision Theia' ? '' : l.videos ? String(l.videos) : 'all'],
                ['Opens', l.opens.length + ' in the period' + (l.counter ? ' · ' + l.counter + ' counted by the link in all' : '')],
                ['Visitors', l.visitors + ' external device(s) or IP(s)'],
                ['Exploring', g.seconds ? Vsm.Esc(Vsm__Dur(g.seconds) + (g.active ? ', ' + Vsm__Dur(g.active) + ' of it active' : '')) : ''],
                ['Images', g.exports ? g.exports + ' exported' : ''],
                ['Scenes', g.scenes ? g.scenes + ' viewed' : ''],
                ['Tour', Vsm.Esc(Vsm__TourWords(g))],
                ['Watched', g.videoSeconds ? Vsm.Esc(Vsm__Dur(g.videoSeconds) + (g.videoFinished ? ', ' + g.videoFinished + ' to the end' : '')) : ''],
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
        } else if (view === 'insights') {
            html = '<h3>About Insights</h3><p class="Vsm__Muted">The same events as the ledger, counted. The period, app, account type, ' +
                   'search and Hide my actions filters apply. <b>Clients</b> are visitors with no sign-in: almost always someone on a client link. ' +
                   'ValeVision 3D reports its menu actions, image exports and a summary of each visit (time on screen, time active, turns, ' +
                   'zooms and slides), and ValeVision Theia how long each video was watched, since 28-Oct-2026: earlier days have none of these.</p>' +
                   Vsm__SideSummary();
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
            Vsm__LearnMyDevices(d.events || []);
            Vsm__Data = d;
            Vsm__NameMe();
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
        Vsm.El('Vsm__ActInsights').addEventListener('mousemove', Vsm__InsTip);   // <-- Insights: every bar, tile and row says its numbers
        Vsm.El('Vsm__ActInsights').addEventListener('mouseleave', Vsm__InsTip);
        Vsm.El('Vsm__ActHideMe').checked = Vsm.Store('ActivityHideMe') === '1';
        Vsm.El('Vsm__ActHideMe').addEventListener('change', function() {
            Vsm.Store('ActivityHideMe', this.checked ? '1' : '0');
            Activity.Render();
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
