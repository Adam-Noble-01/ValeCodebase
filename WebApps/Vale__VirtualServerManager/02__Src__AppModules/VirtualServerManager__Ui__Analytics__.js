/* =============================================================================
   VALE VIRTUAL SERVER MANAGER - UI | TAB 06 USER ANALYTICS
   =============================================================================

   FILE       : VirtualServerManager__Ui__Analytics__.js
   NAMESPACE  : Vsm.Analytics
   MODULE     : Ui - User Analytics
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The activity ledger at a glance, in charts: how much Vale staff
                and outside visitors (clients on links) use each app, when, on
                what, how far clients get, which projects and links draw them,
                how fast the 3D models load and what was refused, each against
                the period before
   CREATED    : 18-Nov-2026

   DESCRIPTION:
   - THE DATA is tab 05's: the PC's copy of the activity ledger
     (Server__UserAccountData/UserData__ActivityLedger), read with no connection
     (GET /api/activity?days=0&limit=400000: every live day, not tab 05's newest
     20,000). An archived month is loaded on its own when picked. Fetch is tab
     05's job "activity" (one read-only session), and runs by itself when the
     copy is 5 minutes old while this tab is on screen.
   - TWO AUDIENCES, ONE COLOUR EACH, ON EVERY CHART: staff (signed in, orange)
     and clients (no sign-in: someone on a client link or a public page, one per
     device, blue). The words are tab 05's (Vsm.Activity.Shared: who is who, the
     features, Hide my actions), so both tabs count alike.
   - ONE FILTER ROW scopes every chart: the period, app, audience, a search,
     Hide my actions (on by default here: the developer's own testing would drown
     the picture), and chips for what a click narrowed. Drag across Activity (or
     click a day) to narrow to those days; click a person, project, link,
     platform, browser, country, department or IP to narrow to it. Show in
     ledger opens tab 05 on the same events.
   - COMPARED WITH THE PERIOD BEFORE: the same length of time just before (the
     month before, for a month). Shown only when this PC's ledger covers all of
     it; otherwise the tile says "no earlier data", never a made-up change.
   - SECTIONS: At a glance (8 tiles), Over time, When, Apps, Staff, Clients and
     guests, Projects, What people do, Devices and places, Performance, Security,
     About these numbers. Every card has a Table button (its numbers as a table);
     one card that fails to draw says so and the rest carry on.
   - The charts are Vsm.Charts (VirtualServerManager__Ui__AnalyticsCharts__.js,
     D3 7.9.0 from 04__Lib__ThirdParty__VersionLocked).

   =============================================================================

   DEVELOPMENT LOG:
   18-Nov-2026 - Version 0.17.0
   - Initial build (manager 0.17.0).

   ============================================================================= */

(function() {

    var Vsm = window.Vsm;
    var Analytics = Vsm.Analytics = {};
    var Charts = Vsm.Charts;
    var d3 = window.d3;

// -----------------------------------------------------------------------------
// REGION | State, Constants, Shared Words
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Data, Narrowing, View
    // ------------------------------------------------------------
    var Vsm__Data      = null;                                                 // <-- Last /api/activity payload (every live day, or one archived month)
    var Vsm__Events    = [];                                                   // <-- Its events, prepared, oldest first
    var Vsm__Source    = '';                                                   // <-- 'live', or 'a:YYYY-MM' for an archived month
    var Vsm__Fetching  = false;
    var Vsm__Loading   = false;
    var Vsm__AutoError = '';
    var Vsm__Timer     = null;
    var Vsm__Range     = null;                                                 // <-- [t0, t1] ms: days dragged or clicked on Activity
    var Vsm__Facets    = {};                                                   // <-- type -> { value, label }: what a click narrowed
    var Vsm__TableOn   = {};                                                   // <-- card id -> its table twin is showing
    var Vsm__Dirty     = true;                                                 // <-- Changed while the tab was hidden: draw on show
    var Vsm__Drawn     = 0;                                                    // <-- Width last drawn at
    var Vsm__Resizing  = null;
    var Vsm__PeriodHtml = '';
    var Vsm__Model     = null;                                                 // <-- The last model drawn (Analytics.Model() for checks)
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Limits, Timing, Words
    // ------------------------------------------------------------
    var Vsm__Limit     = 400000;                                               // <-- Events asked for: the engine's NA__ACTIVITY__LIMIT_MAX
    var Vsm__StaleMs   = 5 * 60e3;                                             // <-- Fetch by itself when the copy is older than this
    var Vsm__TopProjects = 15, Vsm__TopLinks = 12, Vsm__TopList = 10, Vsm__TeamMax = 40;
    var Vsm__Months    = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var Vsm__Periods   = { '1': 'Today', '7': 'Last 7 days', '30': 'Last 30 days', '90': 'Last 90 days', '365': 'Last 12 months', '0': 'Everything not archived' };
    var Vsm__VisitBins = [[0, 15, 'Under 15 s', '<15s'], [15, 30, '15 to 30 s', '15-30s'], [30, 60, '30 s to 1 min', '½-1m'],
                          [60, 120, '1 to 2 min', '1-2m'], [120, 300, '2 to 5 min', '2-5m'], [300, 600, '5 to 10 min', '5-10m'],
                          [600, 1200, '10 to 20 min', '10-20m'], [1200, Infinity, '20 min or more', '20m+']];
    var Vsm__LoadBins  = [[0, 1, 'Under 1 s', '<1s'], [1, 2, '1 to 2 s', '1-2s'], [2, 3, '2 to 3 s', '2-3s'], [3, 5, '3 to 5 s', '3-5s'],
                          [5, 10, '5 to 10 s', '5-10s'], [10, 30, '10 to 30 s', '10-30s'], [30, Infinity, '30 s or more', '30s+']];
    var Vsm__DayBins   = [[1, 1, '1 day'], [2, 2, '2 days'], [3, 3, '3 days'], [4, 7, '4 to 7 days'], [8, Infinity, '8 days or more']];
    var Vsm__Journey3d = [                                                     // <-- [step, test]: ValeVision 3D, a client device's way in (the tour opens first on a client link)
        ['Visited ValeVision 3D', function() { return true; }],
        ['Saw the 3D model', function(e) { return e.Action === 'model.open'; }],
        ['Started the tour', function(e) { return e.Action === 'tour.start'; }],
        ['Finished the tour', function(e) { return e.Action === 'tour.finish'; }],
        ['Chose a scene', function(e) { return e.Action === 'scene.view'; }],
        ['Exported an image', function(e) { return e.Action === 'image.export'; }]
    ];
    var Vsm__JourneyVideo = [                                                  // <-- ValeVision Theia
        ['Visited ValeVision Theia', function() { return true; }],
        ['Played a video', function(e) { return e.Action === 'video.play'; }],
        ['Watched half a video', function(e) { return e.Action === 'video.watch' && Number(e.Detail && e.Detail.Percent) >= 50; }],
        ['Watched one to the end', function(e) { return e.Action === 'video.watch' && !!(e.Detail && e.Detail.Finished === true); }]
    ];
    var Vsm__Regions = (function() { try { return new Intl.DisplayNames(['en-GB'], { type: 'region' }); } catch (err) { return null; } })();
    // ------------------------------------------------------------


    // HELPER FUNCTION | Tab 05's Words (Vsm.Activity.Shared), With a Stand-In if That Module Is Missing
    // ------------------------------------------------------------
    function Vsm__S() {
        var s = Vsm.Activity && Vsm.Activity.Shared;
        if (s) return s;
        return {
            WhoKey: function(e) { return e.User ? 'u:' + e.User.Code : e.DeviceId ? 'd:' + e.DeviceId : 'ip:' + (e.Ip || '?'); },
            IsMine: function() { return false; }, LearnMyDevices: function() {}, MeCode: function() { return 'USR00000001'; },
            KindLabel: function() { return ''; }, Features: [], ProjectText: function(id) { return String(id || '').replace(/__/g, ' '); }
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Dates in This PC's Time ("18-Nov-2026", "14:05"), Countries, Projects
    // ------------------------------------------------------------
    function Vsm__Pad(n) { return (n < 10 ? '0' : '') + n; }
    function Vsm__Day(t) { var d = new Date(t); return Vsm__Pad(d.getDate()) + '-' + Vsm__Months[d.getMonth()] + '-' + d.getFullYear(); }
    function Vsm__Short(t) { var d = new Date(t); return d.getDate() + ' ' + Vsm__Months[d.getMonth()]; }
    function Vsm__Clock(t) { var d = new Date(t); return Vsm__Pad(d.getHours()) + ':' + Vsm__Pad(d.getMinutes()); }
    function Vsm__Stamp(t) { return t ? Vsm__Day(t) + ' ' + Vsm__Clock(t) : ''; }
    function Vsm__MonthName(ym) {
        var names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return names[Number(String(ym).slice(5, 7)) - 1] + ' ' + String(ym).slice(0, 4);
    }
    function Vsm__Country(code) {
        if (!code) return 'Not known';
        try { return (Vsm__Regions && Vsm__Regions.of(code)) || code; } catch (err) { return code; }
    }
    function Vsm__Project(id) { return Vsm__S().ProjectText(id); }
    function Vsm__N(n, one, many) { return Charts.Num(n) + ' ' + (Math.round(n) === 1 ? one : many || one + 's'); }
    function Vsm__AppShort(app) { return String(app || '').replace(/^ValeVision /, ''); }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Prepare, Filter, Period, Buckets
// -----------------------------------------------------------------------------

    // FUNCTION | Prepare Events Once Per Load: time, local day and hour, audience, who, device, search text
    // ------------------------------------------------------------
    function Vsm__Prepare(events) {
        var S = Vsm__S();
        events.forEach(function(e) {
            var d = new Date(e.Utc);
            e._d = isNaN(d) ? null : d;
            e._t = e._d ? e._d.getTime() : 0;
            e._hour = e._d ? e._d.getHours() : 0;
            e._dow = e._d ? (e._d.getDay() + 6) % 7 : 0;                        // <-- Monday 0 .. Sunday 6
            e._day = e._d ? +d3.timeDay.floor(e._d) : 0;
            e._who = S.WhoKey(e);
            var dev = String(e.Device || '').split(/\s*·\s*/);
            e._plat = dev[0] || 'Not reported';
            e._brow = dev[1] || 'Not reported';
            var u = e.User || {};
            e._s = [u.Name, u.Code, u.Level, u.Role, u.Dept, e.User ? '' : 'external client guest', e.App, e.Action, e.Text,
                    S.KindLabel(e), e.Project, Vsm__Project(e.Project), e.Target, e.Link, e.Ip, e.Country, Vsm__Country(e.Country),
                    e.Device, e.DeviceId, e.Mode].join(' ').toLowerCase();
        });
        events.sort(function(a, b) { return a._t - b._t; });
    }
    // ------------------------------------------------------------


    // MODULE CONSTANTS | What a Click Can Narrow To
    // ------------------------------------------------------------
    var Vsm__FacetDefs = {
        person  : { name: 'Person',     test: function(e, v) { return !!e.User && e.User.Code === v; } },
        dept    : { name: 'Department', test: function(e, v) { return !!e.User && (e.User.Dept || 'No department') === v; } },
        visitor : { name: 'Device',     test: function(e, v) { return e._who === v; } },
        project : { name: 'Project',    test: function(e, v) { return e.Project === v; } },
        link    : { name: 'Link',       test: function(e, v) { return e.Link === v; } },
        platform: { name: 'Platform',   test: function(e, v) { return e._plat === v; } },
        browser : { name: 'Browser',    test: function(e, v) { return e._brow === v; } },
        country : { name: 'Country',    test: function(e, v) { return (e.Country || '') === v; } },
        ip      : { name: 'IP',         test: function(e, v) { return e.Ip === v; } }
    };
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Filter Row's Values, and the Test Every Event Passes (the period aside)
    // ------------------------------------------------------------
    function Vsm__FilterState() {
        return {
            app   : Vsm.El('Vsm__AnaApp').value,
            who   : Vsm.El('Vsm__AnaWho').value,
            terms : Vsm.El('Vsm__AnaSearch').value.trim().toLowerCase().split(/\s+/).filter(Boolean),
            hideMe: Vsm.El('Vsm__AnaHideMe').checked
        };
    }

    function Vsm__Test(f, skipMe) {
        var S = Vsm__S(), facets = Object.keys(Vsm__Facets).map(function(k) { return [Vsm__FacetDefs[k].test, Vsm__Facets[k].value]; });
        return function(e) {
            if (!skipMe && f.hideMe && S.IsMine(e)) return false;
            if (f.app && e.App !== f.app) return false;
            if (f.who === 'staff' && !e.User) return false;
            if (f.who === 'external' && e.User) return false;
            if (f.who.indexOf('level:') === 0 && (!e.User || e.User.Level !== f.who.slice(6))) return false;
            for (var i = 0; i < facets.length; i++) if (!facets[i][0](e, facets[i][1])) return false;
            for (var j = 0; j < f.terms.length; j++) if (e._s.indexOf(f.terms[j]) < 0) return false;
            return true;
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Period, the Range Inside It, and the Period Before (covered by this PC's ledger, or not)
    // ------------------------------------------------------------
    function Vsm__Period() {
        var v = Vsm.El('Vsm__AnaPeriod').value || '30';
        var today = d3.timeDay.floor(new Date()), end = +d3.timeDay.offset(today, 1);
        var p = { value: v, t1: end };
        if (/^[ma]:\d{4}-\d{2}$/.test(v)) {
            var y = Number(v.slice(2, 6)), mo = Number(v.slice(7, 9)) - 1;
            p.t0 = +new Date(y, mo, 1);
            p.t1 = Math.min(+new Date(y, mo + 1, 1), end);
            p.label = Vsm__MonthName(v.slice(2));
            p.prev = [+new Date(y, mo - 1, 1), p.t0];
            p.prevLabel = Vsm__MonthName(new Date(y, mo - 1, 1).getFullYear() + '-' + Vsm__Pad(new Date(y, mo - 1, 1).getMonth() + 1));
        } else if (Number(v) > 0) {
            var n = Number(v);
            p.t0 = +d3.timeDay.offset(new Date(end), -n);
            p.label = Vsm__Periods[v] || 'Last ' + n + ' days';
            p.prev = [+d3.timeDay.offset(new Date(p.t0), -n), p.t0];
            p.prevLabel = n === 1 ? 'yesterday' : 'the ' + n + ' days before';
        } else {
            var first = Vsm__Events.find(function(e) { return e._t; });
            p.t0 = first ? first._day : +today;
            p.label = 'Everything not archived';
            p.prev = null;
        }
        p.ranged = false;
        p.r0 = p.t0;
        p.r1 = p.t1;
        if (Vsm__Range) {
            var a = Math.max(Vsm__Range[0], p.t0), b = Math.min(Vsm__Range[1], p.t1);
            if (b > a && (a > p.t0 || b < p.t1)) {
                p.ranged = true;
                p.r0 = a;
                p.r1 = b;
                p.prev = [a - (b - a), a];
                var days = Math.round((b - a) / 864e5);
                p.prevLabel = days <= 1 ? 'the day before' : 'the ' + days + ' days before';
            }
        }
        p.rangeLabel = Vsm__Day(p.r0) + (p.r1 - p.r0 > 864e5 + 36e5 ? ' to ' + Vsm__Day(p.r1 - 1) : '');
        var start = Vsm__LedgerStart();
        p.covered = !!(p.prev && start != null && p.prev[0] >= start);
        if (p.prev) p.prevLabel += ' (' + Vsm__Day(p.prev[0]) + (p.prev[1] - p.prev[0] > 864e5 + 36e5 ? ' to ' + Vsm__Day(p.prev[1] - 1) : '') + ')';
        return p;
    }

    function Vsm__LedgerStart() {                                              // <-- The first day this PC's copy holds (local midnight)
        if (!Vsm__Data) return null;
        if (Vsm__Source !== 'live') { var m = Vsm__Source.slice(2); return +new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, 1); }
        var f = Vsm__Data.files && Vsm__Data.files.first;
        if (!f) return null;
        return +new Date(Number(f.slice(0, 4)), Number(f.slice(5, 7)) - 1, Number(f.slice(8, 10)));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Events Between Two Times That Pass the Test (the list is in time order: two binary searches)
    // ------------------------------------------------------------
    var Vsm__ByTime = null;                                                    // <-- Made on first use: this file must load even when D3 did not

    function Vsm__Slice(t0, t1, test) {
        if (!Vsm__ByTime) Vsm__ByTime = d3.bisector(function(e) { return e._t; });
        var out = [], i = Vsm__ByTime.left(Vsm__Events, t0), j = Vsm__ByTime.left(Vsm__Events, t1);
        for (; i < j; i++) if (test(Vsm__Events[i])) out.push(Vsm__Events[i]);
        return out;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Buckets: hours up to 2 days, days up to 92, then weeks (Mondays), in this PC's time
    // ------------------------------------------------------------
    function Vsm__Buckets(t0, t1, unit) {
        var span = (t1 - t0) / 864e5;
        unit = unit || (span <= 2 ? 'hour' : span <= 92 ? 'day' : 'week');
        var iv = unit === 'hour' ? d3.timeHour : unit === 'day' ? d3.timeDay : d3.timeMonday;
        var starts = iv.range(iv.floor(new Date(t0)), new Date(t1));
        if (!starts.length) starts = [iv.floor(new Date(t0))];
        var list = starts.map(function(s, i) {
            return { t0: +s, t1: i + 1 < starts.length ? +starts[i + 1] : +iv.offset(s, 1), i: i };
        });
        return { unit: unit, list: list, starts: list.map(function(b) { return b.t0; }) };
    }

    function Vsm__Split(events, B) {
        var out = B.list.map(function() { return []; });
        events.forEach(function(e) {
            var i = d3.bisectRight(B.starts, e._t) - 1;
            if (i >= 0 && i < out.length) out[i].push(e);
        });
        return out;
    }

    function Vsm__BucketWords(b, unit) {
        var d = new Date(b.t0), dow = Charts.WeekDays[(d.getDay() + 6) % 7];
        if (unit === 'hour') return dow + ' ' + Vsm__Day(b.t0) + ', ' + Vsm__Pad(d.getHours()) + ':00 to ' + Vsm__Pad((d.getHours() + 1) % 24) + ':00';
        if (unit === 'week') return 'Week of ' + Vsm__Day(b.t0);
        return dow + ' ' + Vsm__Day(b.t0);
    }

    function Vsm__UnitWord(unit) { return unit === 'hour' ? 'hour' : unit === 'week' ? 'week' : 'day'; }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Counting Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Distinct People and Devices, Sums, Medians
    // ------------------------------------------------------------
    function Vsm__StaffKey(e) { return e.User ? e.User.Code : ''; }
    function Vsm__ClientKey(e) { return e.User ? '' : e._who; }

    function Vsm__Distinct(list, key) {
        var s = new Set();
        list.forEach(function(e) { var k = key(e); if (k) s.add(k); });
        return s.size;
    }

    function Vsm__Secs(e) { return Math.max(0, Number(e.Detail && e.Detail.Seconds) || 0); }

    function Vsm__Loads(list, aud) {                                           // <-- model.open LoadSeconds, sorted
        var out = [];
        list.forEach(function(e) {
            if (e.Action !== 'model.open' || (aud === 's' && !e.User) || (aud === 'c' && e.User)) return;
            var v = Number(e.Detail && e.Detail.LoadSeconds);
            if (isFinite(v) && v >= 0) out.push(v);
        });
        return out.sort(d3.ascending);
    }

    function Vsm__Q(sorted, q) { return sorted.length ? d3.quantileSorted(sorted, q) : null; }

    function Vsm__Visits(list, aud) {                                          // <-- visit.summary seconds, sorted
        var out = [];
        list.forEach(function(e) {
            if (e.Action !== 'visit.summary' || (aud === 's' && !e.User) || (aud === 'c' && e.User)) return;
            out.push(Vsm__Secs(e));
        });
        return out.sort(d3.ascending);
    }

    function Vsm__Is(action, aud) {
        return function(e) { return e.Action === action && (!aud || (aud === 's') === !!e.User); };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Model: Everything the Cards Draw, Counted Once Per Render
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Headline Tiles
    // ------------------------------------------------------------
    // up: 'good' (a rise is better), 'bad' (a rise is worse), 'none' (neither).
    // ------------------------------------------------------------
    var Vsm__KpiDefs = [
        { id: 'staff', label: 'Staff signed in', up: 'good', fmt: Charts.Num,
          calc: function(l) { return Vsm__Distinct(l, Vsm__StaffKey); },
          sub: function(m) { return 'of ' + Vsm__N(m.accounts.length, 'active account'); },
          tip: 'Different people who signed in and did anything' },
        { id: 'visitors', label: 'Client visitors', up: 'good', fmt: Charts.Num,
          calc: function(l) { return Vsm__Distinct(l, Vsm__ClientKey); },
          sub: function(m) { return Charts.Num(m.newDevices) + ' new · ' + Charts.Num(m.returningDevices) + ' returning'; },
          tip: 'Devices with no sign-in: a client or guest on a link or a public page (one per browser, or per IP when the browser sent no id)' },
        { id: 'opens', label: 'Client link opens', up: 'good', fmt: Charts.Num,
          calc: function(l) { return l.reduce(function(n, e) { return n + (!e.User && e.Action === 'link.open' ? 1 : 0); }, 0); },
          sub: function(m) { return Vsm__N(m.linksUsed, 'link') + ' used'; },
          tip: 'Client links opened (once per browser session), ValeVision 3D and ValeVision Theia' },
        { id: 'explore', label: 'Clients exploring', up: 'good', fmt: Charts.Dur,
          calc: function(l) { return d3.sum(l, function(e) { return !e.User && e.Action === 'visit.summary' ? Vsm__Secs(e) : 0; }); },
          sub: function(m) { return m.visitMedianC != null ? 'median visit ' + Charts.Dur(m.visitMedianC) : 'in ValeVision 3D'; },
          tip: 'Time ValeVision 3D was on a client’s screen after the model showed (its visit summaries)' },
        { id: 'video', label: 'Video watched by clients', up: 'good', fmt: Charts.Dur,
          calc: function(l) { return d3.sum(l, function(e) { return !e.User && e.Action === 'video.watch' ? Vsm__Secs(e) : 0; }); },
          sub: function(m) { return Vsm__N(m.videoFinishedC, 'video') + ' to the end'; },
          tip: 'ValeVision Theia: seconds actually played by clients' },
        { id: 'events', label: 'Events', up: 'none', fmt: Charts.Num,
          calc: function(l) { return l.length; },
          sub: function(m) { return Charts.Compact(m.staffEvents) + ' by staff · ' + Charts.Compact(m.clientEvents) + ' by clients'; },
          tip: 'Everything the apps wrote to the ledger that passes the filters' },
        { id: 'load', label: '3D model load, median', up: 'bad', fmt: Charts.Secs,
          calc: function(l) { return Vsm__Q(Vsm__Loads(l), 0.5); },
          sub: function(m) { return m.loads.length ? 'p90 ' + Charts.Secs(Vsm__Q(m.loads, 0.9)) + ' · ' + Vsm__N(m.loads.length, 'load') : 'no models opened'; },
          tip: 'ValeVision 3D: from the page opening to the model on screen; half of all loads were quicker than this' },
        { id: 'refused', label: 'Refused', up: 'bad', fmt: Charts.Num, status: true,
          calc: function(l) { return l.reduce(function(n, e) { return n + (e.Ok === false ? 1 : 0); }, 0); },
          sub: function(m) { return m.refused.length ? Vsm__N(m.refusedSignins, 'sign-in') + ' · ' + Vsm__N(m.refusedLinks, 'link') : 'nothing refused'; },
          tip: 'Sign-ins refused (wrong password, unknown address) and client links opened after they expired or were switched off' }
    ];
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Change Against the Period Before, in Words and a Colour Class
    // ------------------------------------------------------------
    function Vsm__Delta(now, before, up, p) {
        if (!p.prev) return null;
        if (!p.covered) return { text: 'no earlier data', cls: 'is-flat', tip: 'This PC’s ledger starts ' + (Vsm__LedgerStart() ? Vsm__Day(Vsm__LedgerStart()) : 'later') + ': it does not cover ' + p.prevLabel };
        if (now == null || before == null) return { text: '', cls: 'is-flat' };
        var tone = function(rise) { return up === 'none' ? 'is-flat' : (rise === (up === 'good')) ? 'is-good' : 'is-bad'; };
        if (!before && !now) return { text: 'no change', cls: 'is-flat' };
        if (!before) return { text: '▲ new', cls: tone(true) };
        var d = (now - before) / before;
        if (Math.abs(d) < 0.005) return { text: 'no change', cls: 'is-flat' };
        return { text: (d > 0 ? '▲ ' : '▼ ') + Math.round(Math.abs(d) * 100) + '%', cls: tone(d > 0) };
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Model for the Filters, the Period and the Range
    // ------------------------------------------------------------
    function Vsm__Build() {
        var S = Vsm__S(), f = Vsm__FilterState(), test = Vsm__Test(f), p = Vsm__Period();
        var m = { f: f, p: p };
        m.whole = Vsm__Slice(p.t0, p.t1, test);                                 // <-- The period: Activity and People show all of it
        m.cur = p.ranged ? Vsm__Slice(p.r0, p.r1, test) : m.whole;              // <-- Everything else counts the range
        m.prev = p.prev ? Vsm__Slice(p.prev[0], p.prev[1], test) : [];
        var cur = m.cur;
        m.staffEvents = cur.filter(function(e) { return !!e.User; }).length;
        m.clientEvents = cur.length - m.staffEvents;

        // MINE | How many of the person using this PC's events the filters hide
        var all = Vsm__Test(f, true), me = 0;
        if (f.hideMe) Vsm__Slice(p.r0, p.r1, all).forEach(function(e) { if (S.IsMine(e)) me += 1; });
        m.mineHidden = me;

        // FIRST AND LAST SEEN | Every live day (not only the period): new against returning, the quiet accounts' last visit
        var first = {}, last = {};
        Vsm__Events.forEach(function(e) {
            if (!e._t || !test(e)) return;
            if (!(e._who in first)) first[e._who] = e._t;
            last[e._who] = e._t;
        });
        m.lastSeen = last;

        // ACCOUNTS | Active accounts the audience covers (less me when my actions are hidden)
        var users = (Vsm__Data.users || []), meCode = S.MeCode();
        m.users = {};
        users.forEach(function(u) { m.users[u.Code] = u; });
        m.accounts = users.filter(function(u) {
            if (!u.Active || (f.hideMe && u.Code === meCode)) return false;
            if (f.who === 'external') return false;
            if (f.who.indexOf('level:') === 0 && u.Level !== f.who.slice(6)) return false;
            if (Vsm__Facets.person && u.Code !== Vsm__Facets.person.value) return false;
            if (Vsm__Facets.dept && (u.Dept || 'No department') !== Vsm__Facets.dept.value) return false;
            return true;
        });
        m.levels = Vsm__Data.levels || [];

        // BUCKETS | The period's (Activity, People), the range's (tiles, strip, trends), the period before's (tiles)
        m.PB = Vsm__Buckets(p.t0, p.t1);
        m.RB = p.ranged ? Vsm__Buckets(p.r0, p.r1) : m.PB;
        m.XB = p.prev ? Vsm__Buckets(p.prev[0], p.prev[1], m.RB.unit) : null;
        m.wholeBy = Vsm__Split(m.whole, m.PB);
        m.curBy = p.ranged ? Vsm__Split(cur, m.RB) : m.wholeBy;
        m.prevBy = m.XB ? Vsm__Split(m.prev, m.XB) : null;

        // CLIENT HEADLINES | New and returning devices, links used, visit medians, videos to the end
        var devices = {}, links = {};
        cur.forEach(function(e) {
            if (e.User) return;
            devices[e._who] = true;
            if (e.Action === 'link.open' && e.Link) links[e.Link] = true;
        });
        m.newDevices = Object.keys(devices).filter(function(k) { return first[k] >= p.r0; }).length;
        m.returningDevices = Object.keys(devices).length - m.newDevices;
        m.linksUsed = Object.keys(links).length;
        m.visitsC = Vsm__Visits(cur, 'c');
        m.visitsS = Vsm__Visits(cur, 's');
        m.visitMedianC = Vsm__Q(m.visitsC, 0.5);
        m.videoFinishedC = cur.filter(function(e) { return !e.User && e.Action === 'video.watch' && e.Detail && e.Detail.Finished === true; }).length;
        m.loads = Vsm__Loads(cur);
        m.refused = cur.filter(function(e) { return e.Ok === false; });
        m.refusedLinks = m.refused.filter(function(e) { return /^link\./.test(e.Action); }).length;
        m.refusedSignins = m.refused.length - m.refusedLinks;

        // TILES | Value, the period before, sparkline values (one per bucket)
        m.kpis = Vsm__KpiDefs.map(function(k) {
            var now = k.calc(cur), before = p.prev && p.covered ? k.calc(m.prev) : null;
            return { def: k, now: now, before: before, delta: Vsm__Delta(now, before, k.up, p),
                     spark: m.curBy.map(function(l) { return k.calc(l); }),
                     sparkPrev: m.prevBy && p.covered ? m.prevBy.map(function(l) { return k.calc(l); }) : null };
        });
        return m;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Cards: Over Time, When, Apps
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Narrow Every Chart (a click) and the Days Dragged on Activity
    // ------------------------------------------------------------
    function Vsm__SetFacet(type, value, label) {
        if (!value) return;
        if (Vsm__Facets[type] && Vsm__Facets[type].value === value) delete Vsm__Facets[type];
        else Vsm__Facets[type] = { value: value, label: label || value };
        Vsm__Render();
    }

    function Vsm__SetRange(r) {
        var now = Vsm__Range;
        if (!r && !now) return;
        if (r && now && +r[0] === +now[0] && +r[1] === +now[1]) return;
        Vsm__Range = r ? [+r[0], +r[1]] : null;
        Vsm__Render();
    }

    function Vsm__SetApp(app) {
        var sel = Vsm.El('Vsm__AnaApp');
        sel.value = sel.value === app ? '' : app;
        if (sel.value !== app && sel.value !== '') sel.value = '';
        Vsm__Render();
    }
    // ------------------------------------------------------------


    // CARD | Activity: Events per Day, Clients and Staff (drag to narrow)
    // ------------------------------------------------------------
    function Vsm__ActivityRows(m) {
        return m.PB.list.map(function(b, i) {
            var l = m.wholeBy[i], c = 0, s = 0, ps = new Set(), pc = new Set();
            l.forEach(function(e) { if (e.User) { s += 1; ps.add(e.User.Code); } else { c += 1; pc.add(e._who); } });
            return { t0: b.t0, t1: b.t1, c: c, s: s, people: ps.size, devices: pc.size };
        });
    }

    var Vsm__CardActivity = {
        id: 'activity', span: 12, keys: [['client', 'Clients'], ['staff', 'Staff']],
        title: function(m) { return 'Activity ' + (m.PB.unit === 'week' ? 'week by week' : m.PB.unit === 'hour' ? 'hour by hour' : 'day by day'); },
        sub: function() { return 'Events in the apps. Drag across the columns to narrow every chart to those days; click one for that ' + 'day alone; click outside to clear.'; },
        draw: function(el, m) {
            var rows = Vsm__ActivityRows(m), unit = m.PB.unit;
            Charts.Columns(el, {
                buckets: rows, unit: unit, height: 230, range: m.p.ranged ? [m.p.r0, m.p.r1] : null, onRange: Vsm__SetRange,
                label: 'Events per ' + Vsm__UnitWord(unit) + ', clients and staff',
                tip: function(b) {
                    return { head: Vsm__BucketWords(b, unit), rows: [
                        { key: 'staff', value: Charts.Num(b.s), label: 'by staff · ' + Vsm__N(b.people, 'person', 'people') },
                        { key: 'client', value: Charts.Num(b.c), label: 'by clients · ' + Vsm__N(b.devices, 'device') }],
                        note: m.p.ranged ? 'Click outside the shaded days to see the whole period' : 'Drag to choose days · click for this ' + Vsm__UnitWord(unit) };
                }
            });
        },
        table: function(m) {
            return { cols: [{ label: Vsm__UnitWord(m.PB.unit) === 'week' ? 'Week of' : 'When' }, { label: 'Staff events', num: true }, { label: 'Client events', num: true },
                            { label: 'Staff people', num: true }, { label: 'Client devices', num: true }],
                     rows: Vsm__ActivityRows(m).map(function(b) { return [Vsm__BucketWords(b, m.PB.unit), b.s, b.c, b.people, b.devices]; }) };
        }
    };
    // ------------------------------------------------------------


    // CARD | People Each Day: staff signed in, client devices
    // ------------------------------------------------------------
    var Vsm__CardPeople = {
        id: 'people', span: 12, keys: [['client', 'Client devices'], ['staff', 'Staff signed in']], keyShape: 'line',
        title: function(m) { return 'People each ' + Vsm__UnitWord(m.PB.unit); },
        sub: function() { return 'Different people signed in, and different client devices, who did anything.'; },
        draw: function(el, m) {
            var rows = Vsm__ActivityRows(m), unit = m.PB.unit;
            Charts.Lines(el, {
                buckets: rows, unit: unit, height: 190, range: m.p.ranged ? [m.p.r0, m.p.r1] : null,
                series: [{ key: 'staff', values: rows.map(function(b) { return b.people; }) },
                         { key: 'client', values: rows.map(function(b) { return b.devices; }) }],
                label: 'People per ' + Vsm__UnitWord(unit),
                tip: function(i) {
                    var b = rows[i];
                    return { head: Vsm__BucketWords(b, unit), rows: [
                        { key: 'staff', value: Charts.Num(b.people), label: 'staff signed in' },
                        { key: 'client', value: Charts.Num(b.devices), label: 'client devices' }] };
                }
            });
        },
        table: function(m) {
            return { cols: [{ label: 'When' }, { label: 'Staff signed in', num: true }, { label: 'Client devices', num: true }],
                     rows: Vsm__ActivityRows(m).map(function(b) { return [Vsm__BucketWords(b, m.PB.unit), b.people, b.devices]; }) };
        }
    };
    // ------------------------------------------------------------


    // CARD | When: Weekday by Hour, Staff and Clients Apart
    // ------------------------------------------------------------
    function Vsm__Hours(m, aud) {
        var cells = d3.range(7).map(function() { return d3.range(24).map(function() { return 0; }); });
        var who = d3.range(7).map(function() { return d3.range(24).map(function() { return new Set(); }); });
        m.cur.forEach(function(e) {
            if (!e._t || (aud === 's') !== !!e.User) return;
            cells[e._dow][e._hour] += 1;
            who[e._dow][e._hour].add(e._who);
        });
        return { cells: cells, who: who };
    }

    function Vsm__HoursCard(aud) {
        var staff = aud === 's';
        return {
            id: staff ? 'hoursStaff' : 'hoursClients', span: 6,
            title: function() { return staff ? 'Staff: when they use the apps' : 'Clients: when they look'; },
            sub: function(m) { return 'Events by weekday and hour, this PC’s time · ' + m.p.rangeLabel; },
            draw: function(el, m) {
                var h = Vsm__Hours(m, aud), total = d3.sum(h.cells, function(r) { return d3.sum(r); });
                if (!total) { Charts.Empty(el, staff ? 'No staff activity in this period.' : 'No client activity in this period.'); return; }
                Charts.Heatmap(el, {
                    cells: h.cells, ramp: staff ? 'staff' : 'client', words: 'events',
                    label: (staff ? 'Staff' : 'Client') + ' events by weekday and hour',
                    tip: function(r, c, n) {
                        return { head: Charts.WeekDaysLong[r] + ', ' + Vsm__Pad(c) + ':00 to ' + Vsm__Pad((c + 1) % 24) + ':00',
                                 rows: [{ key: staff ? 'staff' : 'client', value: Charts.Num(n), label: 'events' },
                                        { value: Charts.Num(h.who[r][c].size), label: staff ? 'people' : 'devices' }] };
                    }
                });
            },
            table: function(m) {
                var h = Vsm__Hours(m, aud);
                return { cols: [{ label: 'Day' }].concat(d3.range(24).map(function(c) { return { label: Vsm__Pad(c), num: true }; })),
                         rows: h.cells.map(function(r, i) { return [Charts.WeekDays[i]].concat(r); }) };
            }
        };
    }
    // ------------------------------------------------------------


    // CARD | Apps: one row each, small multiples
    // ------------------------------------------------------------
    function Vsm__Apps(m) {
        var map = {};
        m.cur.forEach(function(e) {
            var k = e.App || 'Not named', a = map[k];
            if (!a) a = map[k] = { app: k, c: 0, s: 0, people: new Set(), devices: new Set(), installed: 0, moded: 0, last: 0,
                                   trendS: m.RB.list.map(function() { return 0; }), trendC: m.RB.list.map(function() { return 0; }) };
            if (e.User) { a.s += 1; a.people.add(e.User.Code); if (e.Mode) { a.moded += 1; if (e.Mode === 'Installed app') a.installed += 1; } }
            else { a.c += 1; a.devices.add(e._who); }
            if (e._t > a.last) a.last = e._t;
            var i = d3.bisectRight(m.RB.starts, e._t) - 1;
            if (i >= 0 && i < a.trendS.length) (e.User ? a.trendS : a.trendC)[i] += 1;
        });
        return Object.keys(map).map(function(k) { return map[k]; }).sort(function(a, b) { return (b.c + b.s) - (a.c + a.s); });
    }

    var Vsm__CardApps = {
        id: 'apps', span: 12, keys: [['client', 'Clients'], ['staff', 'Staff']],
        title: function() { return 'Apps'; },
        sub: function(m) { return 'Each app’s events, people and trend (each trend on its own scale) · ' + m.p.rangeLabel + ' · click an app to narrow every chart to it'; },
        draw: function(el, m) {
            var apps = Vsm__Apps(m);
            el.textContent = '';
            if (!apps.length) { Charts.Empty(el, 'No app activity in this period.'); return; }
            var max = d3.max(apps, function(a) { return a.c + a.s; }) || 1;
            var wrap = d3.select(el).append('div').attr('class', 'Vsm__UserTableWrap').style('max-height', 'none');
            var table = wrap.append('table').attr('class', 'Vsm__UserTable');
            table.append('thead').append('tr').selectAll('th').data(['App', 'Events: staff and clients', '', 'Staff', 'Client devices', 'Installed app', 'Trend', 'Last used'])
                .join('th').text(function(t) { return t; });
            var tr = table.append('tbody').selectAll('tr').data(apps).join('tr').attr('class', 'Vsm__ActRow')
                .classed('is-selected', function(a) { return m.f.app === a.app; });
            tr.append('td').append('b').text(function(a) { return a.app; });
            tr.append('td').style('width', '32%').append('span').attr('class', 'Vsm__AnaTrack').each(function(a) {
                var t = d3.select(this), segs = [];
                if (a.c) segs.push(['is-client', a.c]);
                if (a.s) segs.push(['is-staff', a.s]);
                segs.forEach(function(sg, i) {
                    t.append('span').attr('class', 'Vsm__AnaSeg ' + sg[0] + (i === segs.length - 1 ? ' is-end' : ''))
                     .style('width', 'max(2px, calc((100% - ' + (segs.length - 1) * 2 + 'px) * ' + (sg[1] / max).toFixed(4) + '))');
                });
            });
            tr.append('td').attr('class', 'Vsm__AnaNum').text(function(a) { return Charts.Num(a.s) + ' · ' + Charts.Num(a.c); });
            tr.append('td').text(function(a) { return Charts.Num(a.people.size); });
            tr.append('td').text(function(a) { return Charts.Num(a.devices.size); });
            tr.append('td').text(function(a) { return a.moded ? Charts.Pct(a.installed, a.moded) : '—'; });
            tr.append('td').each(function(a) {
                this.appendChild(Charts.MiniLines({ w: 150, h: 26, series: [{ key: 'staff', values: a.trendS }, { key: 'client', values: a.trendC }] }));
            });
            tr.append('td').text(function(a) { return a.last ? Vsm__Stamp(a.last) : ''; });
            Charts.Bind(tr, function(a) {
                return { head: a.app, rows: [
                    { key: 'staff', value: Charts.Num(a.s), label: 'events by ' + Vsm__N(a.people.size, 'person', 'people') },
                    { key: 'client', value: Charts.Num(a.c), label: 'events by ' + Vsm__N(a.devices.size, 'client device') },
                    { value: a.moded ? Charts.Pct(a.installed, a.moded) : '—', label: 'of staff use from the installed app' }],
                    note: m.f.app === a.app ? 'Click: every app again' : 'Click: narrow every chart to ' + a.app };
            }, function(a) { Vsm__SetApp(a.app); });
        },
        table: function(m) {
            return { cols: [{ label: 'App' }, { label: 'Staff events', num: true }, { label: 'Client events', num: true }, { label: 'Staff people', num: true },
                            { label: 'Client devices', num: true }, { label: 'Installed app (staff)' }, { label: 'Last used' }],
                     rows: Vsm__Apps(m).map(function(a) { return [a.app, a.s, a.c, a.people.size, a.devices.size, a.moded ? Charts.Pct(a.installed, a.moded) : '', Vsm__Stamp(a.last)]; }) };
        }
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Cards: Staff
// -----------------------------------------------------------------------------

    // CARD | Team: one row per person, one cell per day
    // ------------------------------------------------------------
    function Vsm__Team(m) {
        var map = {};
        m.cur.forEach(function(e) {
            if (!e.User) return;
            var k = e.User.Code, u = m.users[k] || {}, p = map[k];
            if (!p) p = map[k] = { key: k, name: u.Name || e.User.Name || k, role: u.Role || e.User.Role || '', dept: u.Dept || e.User.Dept || '',
                                   level: u.Level || e.User.Level || '', n: 0, days: new Set(), apps: {}, first: e._t, last: e._t,
                                   cells: m.RB.list.map(function() { return 0; }), cellApps: m.RB.list.map(function() { return null; }) };
            p.n += 1;
            p.days.add(e._day);
            p.apps[e.App] = (p.apps[e.App] || 0) + 1;
            p.last = Math.max(p.last, e._t);
            p.first = Math.min(p.first, e._t);
            var i = d3.bisectRight(m.RB.starts, e._t) - 1;
            if (i >= 0 && i < p.cells.length) {
                p.cells[i] += 1;
                (p.cellApps[i] || (p.cellApps[i] = {}))[e.App] = true;
            }
        });
        return Object.keys(map).map(function(k) { return map[k]; }).sort(function(a, b) { return b.n - a.n; });
    }

    var Vsm__CardTeam = {
        id: 'team', span: 12,
        title: function() { return 'Who used the apps'; },
        sub: function(m) { return 'Signed-in staff, ' + Vsm__UnitWord(m.RB.unit) + ' by ' + Vsm__UnitWord(m.RB.unit) + ', shaded by events · ' + m.p.rangeLabel + ' · click a name to narrow every chart to them'; },
        draw: function(el, m) {
            var team = Vsm__Team(m), unit = m.RB.unit;
            if (!team.length) { Charts.Empty(el, 'No signed-in activity in this period.'); return; }
            var rows = team.slice(0, Vsm__TeamMax).map(function(p) {
                return { key: p.key, name: p.name, sub: p.role, cells: p.cells, person: p,
                         text: Vsm__N(p.n, 'event') + ' · ' + Vsm__N(p.days.size, 'day') };
            });
            Charts.Strip(el, {
                rows: rows, buckets: m.RB.list, unit: unit, ramp: 'staff', words: 'events', label: 'Events per person per ' + Vsm__UnitWord(unit),
                onRow: function(r) { Vsm__SetFacet('person', r.key, r.name); },
                tip: function(r, i) {
                    var apps = r.person.cellApps[i] ? Object.keys(r.person.cellApps[i]).map(Vsm__AppShort).join(', ') : '';
                    return { head: r.name + ' · ' + Vsm__BucketWords(m.RB.list[i], unit),
                             rows: [{ key: 'staff', value: Charts.Num(r.cells[i]), label: 'events' + (apps ? ' in ' + apps : '') }] };
                }
            });
            if (team.length > Vsm__TeamMax) d3.select(el).append('div').attr('class', 'Vsm__AnaEmpty').text('and ' + (team.length - Vsm__TeamMax) + ' more: see the table');
        },
        table: function(m) {
            return { cols: [{ label: 'Person' }, { label: 'Code' }, { label: 'Role' }, { label: 'Department' }, { label: 'Account type' }, { label: 'Events', num: true },
                            { label: 'Active days', num: true }, { label: 'Apps' }, { label: 'First' }, { label: 'Last' }],
                     rows: Vsm__Team(m).map(function(p) {
                         return [p.name, p.key, p.role, p.dept, p.level, p.n, p.days.size, Object.keys(p.apps).map(Vsm__AppShort).join(', '), Vsm__Stamp(p.first), Vsm__Stamp(p.last)];
                     }) };
        }
    };
    // ------------------------------------------------------------


    // CARD | Departments and Account Types: how many of each have used the apps
    // ------------------------------------------------------------
    function Vsm__Groups(m, field) {
        var active = {}, events = {}, map = {};
        Vsm__Team(m).forEach(function(p) { active[p.key] = true; events[p.key] = p.n; });
        m.accounts.forEach(function(u) {
            var k = field === 'Dept' ? (u.Dept || 'No department') : (u.Level || 'Not set');
            var g = map[k] || (map[k] = { key: k, of: 0, n: 0, events: 0 });
            g.of += 1;
            if (active[u.Code]) { g.n += 1; g.events += events[u.Code]; }
        });
        var rank = {};
        m.levels.forEach(function(l) { rank[l.Code] = l.Rank; });
        return Object.keys(map).map(function(k) { return map[k]; }).sort(function(a, b) {
            return field === 'Level' ? (rank[a.key] || 9) - (rank[b.key] || 9) : b.of - a.of || a.key.localeCompare(b.key);
        });
    }

    function Vsm__LevelName(m, code) {
        var l = m.levels.find(function(x) { return x.Code === code; });
        return l ? l.Name : code;
    }

    var Vsm__CardGroups = {
        id: 'groups', span: 6,
        title: function() { return 'Departments and account types'; },
        sub: function(m) { return 'Active accounts that used the apps · ' + m.p.rangeLabel; },
        draw: function(el, m) {
            el.textContent = '';
            if (!m.accounts.length) { Charts.Empty(el, 'No staff accounts in this view.'); return; }
            var block = function(title, rows) {
                var head = document.createElement('div');
                head.className = 'Vsm__AnaBarsHead';
                head.innerHTML = '<span></span><span></span><span></span>';
                head.firstChild.textContent = title;
                head.lastChild.textContent = 'used · accounts';
                el.appendChild(head);
                var box = document.createElement('div');
                el.appendChild(box);
                return box;
            };
            Charts.Meters(block('Department', null), {
                rows: Vsm__Groups(m, 'Dept').map(function(g) {
                    return { label: g.key, n: g.n, of: g.of, color: 'staff', text: g.n + ' of ' + g.of, key: g.key,
                             tip: { head: g.key, rows: [{ key: 'staff', value: g.n + ' of ' + g.of, label: 'accounts used the apps' }, { value: Charts.Num(g.events), label: 'events' }],
                                    note: 'Click: narrow every chart to ' + g.key } };
                }),
                onClick: function(r) { Vsm__SetFacet('dept', r.key, r.label); }
            });
            var spacer = document.createElement('div');
            spacer.style.height = '12px';
            el.appendChild(spacer);
            Charts.Meters(block('Account type', null), {
                rows: Vsm__Groups(m, 'Level').map(function(g) {
                    var name = Vsm__LevelName(m, g.key);
                    return { label: name, n: g.n, of: g.of, color: 'staff', text: g.n + ' of ' + g.of,
                             tip: { head: name, rows: [{ key: 'staff', value: g.n + ' of ' + g.of, label: 'accounts used the apps' }, { value: Charts.Num(g.events), label: 'events' }] } };
                })
            });
        },
        table: function(m) {
            var rows = Vsm__Groups(m, 'Dept').map(function(g) { return ['Department', g.key, g.n, g.of, g.events]; })
                .concat(Vsm__Groups(m, 'Level').map(function(g) { return ['Account type', Vsm__LevelName(m, g.key), g.n, g.of, g.events]; }));
            return { cols: [{ label: 'By' }, { label: 'Group' }, { label: 'Used the apps', num: true }, { label: 'Accounts', num: true }, { label: 'Events', num: true }], rows: rows };
        }
    };
    // ------------------------------------------------------------


    // CARD | Accounts Not Seen in the Period (adoption, and leavers still active)
    // ------------------------------------------------------------
    function Vsm__Quiet(m) {
        var seen = {};
        Vsm__Team(m).forEach(function(p) { seen[p.key] = true; });
        return m.accounts.filter(function(u) { return !seen[u.Code]; }).map(function(u) {
            return { u: u, last: m.lastSeen['u:' + u.Code] || 0 };
        }).sort(function(a, b) { return b.last - a.last || a.u.Name.localeCompare(b.u.Name); });
    }

    var Vsm__CardQuiet = {
        id: 'quiet', span: 6, noTable: true,                                   // <-- Already a table
        title: function() { return 'Accounts not seen in this period'; },
        sub: function(m) { return 'Active accounts with no activity · ' + m.p.rangeLabel + ' · leavers are unticked in tab 04'; },
        draw: function(el, m) {
            var rows = Vsm__Quiet(m);
            if (!m.accounts.length) { Charts.Empty(el, 'No staff accounts in this view.'); return; }
            if (!rows.length) { Charts.Empty(el, 'Every active account was seen in this period.'); return; }
            Charts.Table(el, Vsm__CardQuiet.table(m));
        },
        table: function(m) {
            return { cols: [{ label: 'Person' }, { label: 'Account type' }, { label: 'Department' }, { label: 'Role' }, { label: 'Last seen' }],
                     rows: Vsm__Quiet(m).map(function(q) {
                         return [q.u.Name, Vsm__LevelName(m, q.u.Level), q.u.Dept || '', q.u.Role || '', q.last ? Vsm__Stamp(q.last) : 'not in the ledger'];
                     }),
                     note: 'Last seen counts every live day of the ledger on this PC (from ' + (Vsm__LedgerStart() ? Vsm__Day(Vsm__LedgerStart()) : 'its start') + ').' };
        }
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Cards: Clients and Guests
// -----------------------------------------------------------------------------

    // CARD | Journeys: how far client devices get in ValeVision 3D and in Theia
    // ------------------------------------------------------------
    function Vsm__Journey(m, app, steps) {
        var sets = steps.map(function() { return new Set(); });
        m.cur.forEach(function(e) {
            if (e.User || e.App !== app) return;
            steps.forEach(function(s, i) { if (s[1](e)) sets[i].add(e._who); });
        });
        return steps.map(function(s, i) { return { label: s[0], n: sets[i].size }; });
    }

    function Vsm__JourneyCard(id, app, steps, title) {
        return {
            id: id, span: 6,
            title: function() { return title; },
            sub: function(m) { return 'Client devices that reached each step · ' + m.p.rangeLabel; },
            draw: function(el, m) {
                var list = Vsm__Journey(m, app, steps), first = list[0].n;
                Charts.Funnel(el, { words: 'client devices', empty: 'No client used ' + app + ' in this period.',
                    steps: list.map(function(s, i) {
                        return { label: s.label, n: s.n, tip: { head: s.label, rows: [{ key: 'client', value: Charts.Num(s.n), label: 'client devices' },
                            { value: Charts.Pct(s.n, first), label: 'of those that visited' }].concat(i ? [{ value: Charts.Pct(s.n, list[i - 1].n), label: 'of the step before' }] : []) } };
                    }) });
            },
            table: function(m) {
                var list = Vsm__Journey(m, app, steps), first = list[0].n;
                return { cols: [{ label: 'Step' }, { label: 'Client devices', num: true }, { label: 'Of those that visited', num: true }],
                         rows: first ? list.map(function(s) { return [s.label, s.n, Charts.Pct(s.n, first)]; }) : [] };
            }
        };
    }
    // ------------------------------------------------------------


    // CARD | Visit Length: how long a ValeVision 3D visit lasts, as a share of each audience's visits
    // ------------------------------------------------------------
    function Vsm__VisitTable(m) {
        var tc = m.visitsC.length, ts = m.visitsS.length;
        return Vsm__VisitBins.map(function(b) {
            var inBin = function(v) { return v >= b[0] && v < b[1]; };
            var c = m.visitsC.filter(inBin).length, s = m.visitsS.filter(inBin).length;
            return { label: b[2], short: b[3], cn: c, sn: s, c: tc ? c / tc : 0, s: ts ? s / ts : 0 };
        });
    }

    var Vsm__CardVisits = {
        id: 'visits', span: 6, keys: [['client', 'Clients'], ['staff', 'Staff']],
        title: function() { return 'How long a ValeVision 3D visit lasts'; },
        sub: function(m) { return 'Share of each audience’s visits, by time on screen after the model showed · ' + m.p.rangeLabel; },
        draw: function(el, m) {
            el.textContent = '';
            if (!m.visitsC.length && !m.visitsS.length) { Charts.Empty(el, 'No ValeVision 3D visit summaries in this period (reported since 28-Oct-2026).'); return; }
            var activeC = d3.sum(m.cur, function(e) { return !e.User && e.Action === 'visit.summary' ? Number(e.Detail && e.Detail.ActiveSeconds) || 0 : 0; });
            var totalC = d3.sum(m.visitsC);
            var figs = d3.select(el).append('div').attr('class', 'Vsm__AnaFigs');
            [['Median client visit', m.visitsC.length ? Charts.Dur(Vsm__Q(m.visitsC, 0.5)) : '—', Vsm__N(m.visitsC.length, 'visit')],
             ['Median staff visit', m.visitsS.length ? Charts.Dur(Vsm__Q(m.visitsS, 0.5)) : '—', Vsm__N(m.visitsS.length, 'visit')],
             ['Clients active', totalC ? Charts.Pct(activeC, totalC) : '—', 'of their time on screen']].forEach(function(f) {
                var d = figs.append('div');
                d.append('span').text(f[0]);
                d.append('b').text(f[1]);
                d.append('span').text(f[2]);
            });
            var box = d3.select(el).append('div').node();
            Charts.Histogram(box, {
                bins: Vsm__VisitTable(m), share: true, height: 200, label: 'Visit lengths, share of visits, clients and staff',
                tip: function(b) {
                    return { head: b.label, rows: [{ key: 'client', value: Charts.Pct(b.c, 1), label: 'of client visits (' + Charts.Num(b.cn) + ')' },
                                                   { key: 'staff', value: Charts.Pct(b.s, 1), label: 'of staff visits (' + Charts.Num(b.sn) + ')' }] };
                }
            });
        },
        table: function(m) {
            return { cols: [{ label: 'Visit length' }, { label: 'Client visits', num: true }, { label: 'Share', num: true }, { label: 'Staff visits', num: true }, { label: 'Share', num: true }],
                     rows: (m.visitsC.length || m.visitsS.length) ? Vsm__VisitTable(m).map(function(b) { return [b.label, b.cn, Charts.Pct(b.c, 1), b.sn, Charts.Pct(b.s, 1)]; }) : [] };
        }
    };
    // ------------------------------------------------------------


    // CARD | New and Returning Client Devices
    // ------------------------------------------------------------
    function Vsm__Returning(m) {
        var days = {};
        m.cur.forEach(function(e) { if (!e.User) (days[e._who] || (days[e._who] = new Set())).add(e._day); });
        var keys = Object.keys(days);
        return {
            total: keys.length, fresh: m.newDevices, back: m.returningDevices,
            bins: Vsm__DayBins.map(function(b) { return { label: b[2], n: keys.filter(function(k) { return days[k].size >= b[0] && days[k].size <= b[1]; }).length }; })
        };
    }

    var Vsm__CardReturning = {
        id: 'returning', span: 6,
        title: function() { return 'New and returning client devices'; },
        sub: function(m) { return 'New: first seen in this period (in the ledger on this PC) · ' + m.p.rangeLabel; },
        draw: function(el, m) {
            var r = Vsm__Returning(m);
            el.textContent = '';
            if (!r.total) { Charts.Empty(el, 'No client devices in this period.'); return; }
            var a = document.createElement('div'), b = document.createElement('div'), gap = document.createElement('div');
            gap.style.height = '10px';
            el.appendChild(a); el.appendChild(gap); el.appendChild(b);
            Charts.Bars(a, { split: false, color: 'client', max: r.total, head: ['Client devices', '', 'devices · share'],
                rows: [['New', r.fresh, 'first seen in this period'], ['Returning', r.back, 'seen before this period too']].map(function(x) {
                    return { label: x[0], sub: x[2], n: x[1], text: Charts.Num(x[1]) + ' · ' + Charts.Pct(x[1], r.total),
                             tip: { head: x[0], rows: [{ key: 'client', value: Charts.Num(x[1]), label: 'client devices, ' + Charts.Pct(x[1], r.total) }] } };
                }) });
            Charts.Bars(b, { split: false, color: 'client', max: r.total, head: ['Days seen in the period', '', 'devices'],
                rows: r.bins.map(function(x) {
                    return { label: x.label, n: x.n, text: Charts.Num(x.n), tip: { head: 'Seen on ' + x.label, rows: [{ key: 'client', value: Charts.Num(x.n), label: 'client devices' }] } };
                }) });
        },
        table: function(m) {
            var r = Vsm__Returning(m);
            return { cols: [{ label: 'Group' }, { label: 'Client devices', num: true }],
                     rows: r.total ? [['New', r.fresh], ['Returning', r.back]].concat(r.bins.map(function(x) { return ['Seen on ' + x.label, x.n]; })) : [] };
        }
    };
    // ------------------------------------------------------------


    // CARD | Client Links: opens and visitors, the most opened first
    // ------------------------------------------------------------
    function Vsm__Links(m) {
        var map = {}, made = [];
        var link = function(token) {
            return map[token] || (map[token] = { token: token, opens: 0, visitors: new Set(), last: 0, label: '', project: '', app: '', by: '', created: '', state: '' });
        };
        (Vsm__Data.links || []).forEach(function(r) {
            var l = link(r.Token);
            l.label = r.Label || '';
            l.project = r.Project || '';
            l.app = r.App || '';
            l.by = (m.users[r.CreatedBy] || {}).Name || r.CreatedBy || '';
            l.created = r.CreatedIso || '';
            l.state = r.RevokedIso ? 'Switched off' : r.ExpiresIso && new Date(r.ExpiresIso) < new Date() ? 'Expired' : 'Active';
        });
        m.cur.forEach(function(e) {
            if (e.Action === 'link.create') made.push(e);
            if (!e.Link || e.User) return;
            var l = link(e.Link);
            l.project = l.project || e.Project || '';
            l.app = l.app || e.App || '';
            l.label = l.label || (e.Action === 'link.open' ? e.Target || '' : '');
            if (e.Action === 'link.open') l.opens += 1;
            l.visitors.add(e._who);
            l.last = Math.max(l.last, e._t);
        });
        var used = Object.keys(map).map(function(k) { return map[k]; }).filter(function(l) { return l.opens || l.visitors.size; })
            .sort(function(a, b) { return b.opens - a.opens || b.visitors.size - a.visitors.size || b.last - a.last; });
        return { used: used, made: made };
    }

    var Vsm__CardLinks = {
        id: 'links', span: 12,
        title: function() { return 'Client links'; },
        sub: function(m) {
            var L = Vsm__Links(m), by = {};
            L.made.forEach(function(e) { var n = e.User ? e.User.Name || e.User.Code : 'someone'; by[n] = (by[n] || 0) + 1; });
            var who = Object.keys(by).sort(function(a, b) { return by[b] - by[a]; }).map(function(n) { return n + ' ' + by[n]; }).join(', ');
            return Vsm__N(L.used.length, 'link') + ' used, ' + Vsm__N(L.made.length, 'link') + ' made' + (who ? ' (' + who + ')' : '') + ' · ' + m.p.rangeLabel + ' · click a link to narrow every chart to it';
        },
        draw: function(el, m) {
            var L = Vsm__Links(m);
            var rows = L.used.slice(0, Vsm__TopLinks).map(function(l) {
                return { key: l.token, label: l.label || 'No label', sub: Vsm__Project(l.project) + ' · ' + Vsm__AppShort(l.app) + (l.state && l.state !== 'Active' ? ' · ' + l.state : ''),
                         n: l.opens, text: Vsm__N(l.opens, 'open') + ' · ' + Vsm__N(l.visitors.size, 'visitor'), active: Vsm__Facets.link && Vsm__Facets.link.value === l.token,
                         tip: { head: (l.label || 'No label') + ' · ' + Vsm__Project(l.project), rows: [
                             { key: 'client', value: Charts.Num(l.opens), label: 'opens' },
                             { value: Charts.Num(l.visitors.size), label: 'client devices used it' },
                             { value: l.last ? Vsm__Stamp(l.last) : '—', label: 'last used' }],
                             note: (l.app || '') + (l.by ? ' · made by ' + l.by : '') + (l.state ? ' · ' + l.state : '') } };
            });
            Charts.Bars(el, { split: false, color: 'client', rows: rows, head: ['Link', 'Opens', 'opens · visitors'], empty: 'No client link was used in this period.',
                              more: L.used.length > Vsm__TopLinks ? 'and ' + (L.used.length - Vsm__TopLinks) + ' more: see the table' : '',
                              onClick: function(r) { Vsm__SetFacet('link', r.key, r.label); } });
        },
        table: function(m) {
            return { cols: [{ label: 'Label' }, { label: 'Project' }, { label: 'App' }, { label: 'State' }, { label: 'Made by' }, { label: 'Opens', num: true },
                            { label: 'Visitors', num: true }, { label: 'Last used' }, { label: 'Token' }],
                     rows: Vsm__Links(m).used.map(function(l) { return [l.label, Vsm__Project(l.project), l.app, l.state, l.by, l.opens, l.visitors.size, Vsm__Stamp(l.last), l.token]; }) };
        }
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Cards: Projects, What People Do
// -----------------------------------------------------------------------------

    // CARD | Projects: the most active first, staff and clients
    // ------------------------------------------------------------
    function Vsm__Projects(m) {
        var map = {};
        m.cur.forEach(function(e) {
            if (!e.Project) return;
            var p = map[e.Project] || (map[e.Project] = { id: e.Project, c: 0, s: 0, people: new Set(), devices: new Set(), explore: 0, last: 0 });
            if (e.User) { p.s += 1; p.people.add(e.User.Code); } else { p.c += 1; p.devices.add(e._who); if (e.Action === 'visit.summary') p.explore += Vsm__Secs(e); }
            p.last = Math.max(p.last, e._t);
        });
        return Object.keys(map).map(function(k) { return map[k]; }).sort(function(a, b) { return (b.c + b.s) - (a.c + a.s); });
    }

    var Vsm__CardProjects = {
        id: 'projects', span: 12, keys: [['client', 'Clients'], ['staff', 'Staff']],
        title: function() { return 'Projects'; },
        sub: function(m) { return 'The most active projects · ' + m.p.rangeLabel + ' · click a project to narrow every chart to it'; },
        draw: function(el, m) {
            var list = Vsm__Projects(m);
            Charts.Bars(el, { split: true, head: ['Project', 'Events', 'staff · clients'], empty: 'No project activity in this period.',
                more: list.length > Vsm__TopProjects ? 'and ' + (list.length - Vsm__TopProjects) + ' more: see the table' : '',
                rows: list.slice(0, Vsm__TopProjects).map(function(p) {
                    return { key: p.id, label: Vsm__Project(p.id), c: p.c, s: p.s, text: Charts.Num(p.s) + ' · ' + Charts.Num(p.c),
                             active: Vsm__Facets.project && Vsm__Facets.project.value === p.id,
                             tip: { head: Vsm__Project(p.id), rows: [
                                 { key: 'staff', value: Charts.Num(p.s), label: 'events by ' + Vsm__N(p.people.size, 'person', 'people') },
                                 { key: 'client', value: Charts.Num(p.c), label: 'events by ' + Vsm__N(p.devices.size, 'client device') },
                                 { value: p.explore ? Charts.Dur(p.explore) : '—', label: 'clients exploring in 3D' }], note: 'Last: ' + Vsm__Stamp(p.last) } };
                }),
                onClick: function(r) { Vsm__SetFacet('project', r.key, r.label); } });
        },
        table: function(m) {
            return { cols: [{ label: 'Project' }, { label: 'Staff events', num: true }, { label: 'Client events', num: true }, { label: 'Staff people', num: true },
                            { label: 'Client devices', num: true }, { label: 'Clients exploring' }, { label: 'Last' }],
                     rows: Vsm__Projects(m).map(function(p) { return [Vsm__Project(p.id), p.s, p.c, p.people.size, p.devices.size, p.explore ? Charts.Dur(p.explore) : '', Vsm__Stamp(p.last)]; }) };
        }
    };
    // ------------------------------------------------------------


    // CARD | What People Do: the share of each audience that used each feature (tab 05's list)
    // ------------------------------------------------------------
    function Vsm__Features(m) {
        var staff = new Set(), clients = new Set();
        m.cur.forEach(function(e) { (e.User ? staff : clients).add(e._who); });
        return (Vsm__S().Features || []).map(function(x) {
            var s = new Set(), c = new Set(), sn = 0, cn = 0;
            m.cur.forEach(function(e) {
                if (!x[2](e)) return;
                if (e.User) { s.add(e._who); sn += 1; } else { c.add(e._who); cn += 1; }
            });
            return { label: x[0], action: x[1], s: staff.size ? s.size / staff.size : 0, c: clients.size ? c.size / clients.size : 0,
                     sp: s.size, cp: c.size, sn: sn, cn: cn, staff: staff.size, clients: clients.size };
        }).filter(function(r) { return r.sn + r.cn; }).sort(function(a, b) { return (b.s + b.c) - (a.s + a.c); });
    }

    var Vsm__CardFeatures = {
        id: 'features', span: 12, keys: [['staff', 'Staff'], ['client', 'Clients']],
        title: function() { return 'What people do'; },
        sub: function(m) { return 'The share of staff (left) and of client devices (right) that did each thing at least once · ' + m.p.rangeLabel; },
        draw: function(el, m) {
            var rows = Vsm__Features(m);
            Charts.Butterfly(el, { heads: ['Staff who did it', 'Feature', 'Client devices that did it'], empty: 'Nothing in this period.',
                rows: rows.map(function(r) {
                    return { label: r.label, s: r.s, c: r.c, tip: { head: r.label, rows: [
                        { key: 'staff', value: Charts.Pct(r.s, 1), label: r.sp + ' of ' + Vsm__N(r.staff, 'person', 'people') + ', ' + Vsm__N(r.sn, 'time') },
                        { key: 'client', value: Charts.Pct(r.c, 1), label: r.cp + ' of ' + Vsm__N(r.clients, 'client device') + ', ' + Vsm__N(r.cn, 'time') }],
                        note: 'In the ledger: ' + r.action } };
                }) });
        },
        table: function(m) {
            return { cols: [{ label: 'Feature' }, { label: 'Staff', num: true }, { label: 'Share', num: true }, { label: 'Times', num: true },
                            { label: 'Client devices', num: true }, { label: 'Share', num: true }, { label: 'Times', num: true }, { label: 'Action' }],
                     rows: Vsm__Features(m).map(function(r) { return [r.label, r.sp, Charts.Pct(r.s, 1), r.sn, r.cp, Charts.Pct(r.c, 1), r.cn, r.action]; }) };
        }
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Cards: Devices and Places
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Different People (staff) and Devices (clients) per Value of a Field
    // ------------------------------------------------------------
    function Vsm__WhoBy(m, key) {
        var map = {};
        m.cur.forEach(function(e) {
            var k = key(e), r = map[k] || (map[k] = { key: k, sSet: new Set(), cSet: new Set(), events: 0 });
            (e.User ? r.sSet : r.cSet).add(e._who);
            r.events += 1;
        });
        return Object.keys(map).map(function(k) { var r = map[k]; r.s = r.sSet.size; r.c = r.cSet.size; return r; })
            .sort(function(a, b) { return (b.s + b.c) - (a.s + a.c) || b.events - a.events; });
    }

    function Vsm__WhoByCard(id, title, key, facet, nameOf, span) {
        return {
            id: id, span: span || 6, keys: [['client', 'Client devices'], ['staff', 'Staff']],
            title: function() { return title; },
            sub: function(m) { return 'Different staff and client devices · ' + m.p.rangeLabel + ' · click one to narrow every chart to it'; },
            draw: function(el, m) {
                var list = Vsm__WhoBy(m, key);
                Charts.Bars(el, { split: true, head: [title.replace(/s$/, ''), 'People and devices', 'staff · clients'], empty: 'Nothing in this period.',
                    more: list.length > Vsm__TopList ? 'and ' + (list.length - Vsm__TopList) + ' more: see the table' : '',
                    rows: list.slice(0, Vsm__TopList).map(function(r) {
                        var name = nameOf ? nameOf(r.key) : r.key;
                        return { key: r.key, label: name, c: r.c, s: r.s, text: Charts.Num(r.s) + ' · ' + Charts.Num(r.c),
                                 active: Vsm__Facets[facet] && Vsm__Facets[facet].value === r.key,
                                 tip: { head: name, rows: [{ key: 'staff', value: Charts.Num(r.s), label: 'staff' }, { key: 'client', value: Charts.Num(r.c), label: 'client devices' },
                                                           { value: Charts.Num(r.events), label: 'events' }] } };
                    }),
                    onClick: function(r) { Vsm__SetFacet(facet, r.key, r.label); } });
            },
            table: function(m) {
                return { cols: [{ label: title.replace(/s$/, '') }, { label: 'Staff', num: true }, { label: 'Client devices', num: true }, { label: 'Events', num: true }],
                         rows: Vsm__WhoBy(m, key).map(function(r) { return [nameOf ? nameOf(r.key) : r.key, r.s, r.c, r.events]; }) };
            }
        };
    }
    // ------------------------------------------------------------


    // CARD | Installed App or Browser: the share of each audience's use from the installed app
    // ------------------------------------------------------------
    function Vsm__Modes(m) {
        var out = { s: { app: 0, browser: 0, none: 0 }, c: { app: 0, browser: 0, none: 0 } };
        m.cur.forEach(function(e) {
            var o = out[e.User ? 's' : 'c'];
            if (e.Mode === 'Installed app') o.app += 1; else if (e.Mode === 'Browser') o.browser += 1; else o.none += 1;
        });
        return out;
    }

    var Vsm__CardModes = {
        id: 'modes', span: 6,
        title: function() { return 'Installed app or browser'; },
        sub: function(m) { return 'The share of each audience’s use from the installed app (Start menu or home screen) · ' + m.p.rangeLabel; },
        draw: function(el, m) {
            var o = Vsm__Modes(m);
            var row = function(label, aud, x) {
                var known = x.app + x.browser;
                return { label: label, n: x.app, of: known, color: aud === 's' ? 'staff' : 'client',
                         text: known ? Charts.Pct(x.app, known) + ' app' : 'not reported',
                         tip: { head: label, rows: [{ key: aud === 's' ? 'staff' : 'client', value: Charts.Num(x.app), label: 'events from the installed app' },
                                                    { value: Charts.Num(x.browser), label: 'in a browser tab' },
                                                    { value: Charts.Num(x.none), label: 'not reported (older apps)' }] } };
            };
            Charts.Meters(el, { rows: [row('Staff', 's', o.s), row('Clients', 'c', o.c)].filter(function(r) { return r.of || r.tip.rows[2].value !== '0'; }),
                                empty: 'Nothing in this period.' });
        },
        table: function(m) {
            var o = Vsm__Modes(m);
            return { cols: [{ label: 'Audience' }, { label: 'Installed app', num: true }, { label: 'Browser', num: true }, { label: 'Not reported', num: true }],
                     rows: [['Staff', o.s.app, o.s.browser, o.s.none], ['Clients', o.c.app, o.c.browser, o.c.none]] };
        }
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Cards: Performance, Security, About
// -----------------------------------------------------------------------------

    // CARD | 3D Model Load Time: the spread, staff and clients
    // ------------------------------------------------------------
    function Vsm__LoadTable(m) {
        var c = Vsm__Loads(m.cur, 'c'), s = Vsm__Loads(m.cur, 's');
        return { c: c, s: s, bins: Vsm__LoadBins.map(function(b) {
            var inBin = function(v) { return v >= b[0] && v < b[1]; };
            var cn = c.filter(inBin).length, sn = s.filter(inBin).length;
            return { label: b[2], short: b[3], cn: cn, sn: sn, c: c.length ? cn / c.length : 0, s: s.length ? sn / s.length : 0 };
        }) };
    }

    var Vsm__CardLoad = {
        id: 'load', span: 6, keys: [['client', 'Clients'], ['staff', 'Staff']],
        title: function() { return 'How fast 3D models load'; },
        sub: function(m) { return 'ValeVision 3D, page open to model on screen: the share of each audience’s loads · ' + m.p.rangeLabel; },
        draw: function(el, m) {
            var L = Vsm__LoadTable(m);
            el.textContent = '';
            if (!L.c.length && !L.s.length) { Charts.Empty(el, 'No 3D models opened in this period.'); return; }
            var figs = d3.select(el).append('div').attr('class', 'Vsm__AnaFigs');
            [['Clients, median', L.c.length ? Charts.Secs(Vsm__Q(L.c, 0.5)) : '—', L.c.length ? 'p90 ' + Charts.Secs(Vsm__Q(L.c, 0.9)) + ' · ' + Vsm__N(L.c.length, 'load') : 'no loads'],
             ['Staff, median', L.s.length ? Charts.Secs(Vsm__Q(L.s, 0.5)) : '—', L.s.length ? 'p90 ' + Charts.Secs(Vsm__Q(L.s, 0.9)) + ' · ' + Vsm__N(L.s.length, 'load') : 'no loads'],
             ['Slowest', Charts.Secs(Math.max(L.c.length ? L.c[L.c.length - 1] : 0, L.s.length ? L.s[L.s.length - 1] : 0)), 'a tab left in the background counts too']].forEach(function(f) {
                var d = figs.append('div');
                d.append('span').text(f[0]);
                d.append('b').text(f[1]);
                d.append('span').text(f[2]);
            });
            var box = d3.select(el).append('div').node();
            Charts.Histogram(box, {
                bins: L.bins, share: true, height: 200, label: 'Model load times, share of loads, clients and staff',
                tip: function(b) {
                    return { head: b.label, rows: [{ key: 'client', value: Charts.Pct(b.c, 1), label: 'of client loads (' + Charts.Num(b.cn) + ')' },
                                                   { key: 'staff', value: Charts.Pct(b.s, 1), label: 'of staff loads (' + Charts.Num(b.sn) + ')' }] };
                }
            });
        },
        table: function(m) {
            var L = Vsm__LoadTable(m);
            return { cols: [{ label: 'Load time' }, { label: 'Client loads', num: true }, { label: 'Share', num: true }, { label: 'Staff loads', num: true }, { label: 'Share', num: true }],
                     rows: (L.c.length || L.s.length) ? L.bins.map(function(b) { return [b.label, b.cn, Charts.Pct(b.c, 1), b.sn, Charts.Pct(b.s, 1)]; }) : [] };
        }
    };
    // ------------------------------------------------------------


    // CARD | Load Time Over the Range: the median, staff and clients
    // ------------------------------------------------------------
    function Vsm__LoadTrend(m) {
        return m.RB.list.map(function(b, i) {
            var l = m.curBy[i], s = Vsm__Loads(l, 's'), c = Vsm__Loads(l, 'c');
            return { t0: b.t0, t1: b.t1, s: Vsm__Q(s, 0.5), c: Vsm__Q(c, 0.5), sn: s.length, cn: c.length };
        });
    }

    var Vsm__CardLoadTrend = {
        id: 'loadTrend', span: 6, keys: [['client', 'Clients'], ['staff', 'Staff']], keyShape: 'line',
        title: function(m) { return 'Median load time, ' + Vsm__UnitWord(m.RB.unit) + ' by ' + Vsm__UnitWord(m.RB.unit); },
        sub: function(m) { return 'On a log scale, so one slow load does not flatten the rest; gaps are ' + Vsm__UnitWord(m.RB.unit) + 's with no model opened · ' + m.p.rangeLabel; },
        draw: function(el, m) {
            var rows = Vsm__LoadTrend(m), unit = m.RB.unit;
            if (!rows.some(function(r) { return r.sn || r.cn; })) { Charts.Empty(el, 'No 3D models opened in this period.'); return; }
            Charts.Lines(el, {
                buckets: rows, unit: unit, height: 220, dots: rows.length <= 45, log: true, yFormat: Charts.Secs,
                series: [{ key: 'staff', values: rows.map(function(r) { return r.s; }) }, { key: 'client', values: rows.map(function(r) { return r.c; }) }],
                label: 'Median model load time per ' + Vsm__UnitWord(unit),
                tip: function(i) {
                    var r = rows[i];
                    return { head: Vsm__BucketWords(r, unit), rows: [
                        { key: 'staff', value: Charts.Secs(r.s), label: 'staff median · ' + Vsm__N(r.sn, 'load') },
                        { key: 'client', value: Charts.Secs(r.c), label: 'client median · ' + Vsm__N(r.cn, 'load') }] };
                }
            });
        },
        table: function(m) {
            return { cols: [{ label: 'When' }, { label: 'Staff median' }, { label: 'Staff loads', num: true }, { label: 'Client median' }, { label: 'Client loads', num: true }],
                     rows: Vsm__LoadTrend(m).filter(function(r) { return r.sn || r.cn; }).map(function(r) {
                         return [Vsm__BucketWords(r, m.RB.unit), r.sn ? Charts.Secs(r.s) : '', r.sn, r.cn ? Charts.Secs(r.c) : '', r.cn];
                     }) };
        }
    };
    // ------------------------------------------------------------


    // CARD | Security: refused sign-ins and links, who and from where; passwords changed
    // ------------------------------------------------------------
    function Vsm__Security(m) {
        var byAccount = {}, byIp = {}, unknown = 0, links = 0;
        m.refused.forEach(function(e) {
            if (/^link\./.test(e.Action)) links += 1;
            else if (e.User) { var k = e.User.Code; (byAccount[k] || (byAccount[k] = { code: k, name: e.User.Name || k, n: 0, last: 0 })).n += 1; byAccount[k].last = Math.max(byAccount[k].last, e._t); }
            else unknown += 1;
            var ip = e.Ip || 'Not known';
            (byIp[ip] || (byIp[ip] = { ip: ip, country: e.Country || '', n: 0, last: 0 })).n += 1;
            byIp[ip].last = Math.max(byIp[ip].last, e._t);
        });
        var changed = {};
        m.cur.forEach(function(e) { if (e.Action === 'account.password' && e.User) changed[e.User.Code] = e.User.Name || e.User.Code; });
        var signins = m.cur.filter(function(e) { return e.Action === 'account.signin'; }).length;
        return { accounts: Object.keys(byAccount).map(function(k) { return byAccount[k]; }).sort(function(a, b) { return b.n - a.n; }),
                 ips: Object.keys(byIp).map(function(k) { return byIp[k]; }).sort(function(a, b) { return b.n - a.n; }),
                 unknown: unknown, links: links, changed: Object.keys(changed).map(function(k) { return changed[k]; }), signins: signins };
    }

    var Vsm__CardSecurity = {
        id: 'security', span: 12,
        title: function() { return 'Refused sign-ins and links'; },
        sub: function(m) { return 'Wrong passwords, unknown addresses and expired or switched-off client links · ' + m.p.rangeLabel; },
        draw: function(el, m) {
            var S = Vsm__Security(m), unit = m.RB.unit;
            el.textContent = '';
            var status = d3.select(el).append('div').attr('class', 'Vsm__AnaFigs');
            var st = status.append('div');
            st.append('span').text('Refused');
            st.append('b').append('span').attr('class', 'Vsm__AnaStatus ' + (m.refused.length ? 'is-critical' : 'is-good'))
              .text(m.refused.length ? '⚠ ' + Charts.Num(m.refused.length) : '✓ none');
            st.append('span').text(m.refused.length ? Vsm__N(m.refusedSignins, 'sign-in') + ' · ' + Vsm__N(S.links, 'link') : 'in this period');
            [['Sign-ins', Charts.Num(S.signins), 'accepted'],
             ['Unknown addresses', Charts.Num(S.unknown), 'sign-ins for no account'],
             ['Own passwords set', Charts.Num(S.changed.length), S.changed.length ? S.changed.join(', ') : 'nobody in this period']].forEach(function(f) {
                var d = status.append('div');
                d.append('span').text(f[0]);
                d.append('b').text(f[1]);
                d.append('span').text(f[2]);
            });
            if (!m.refused.length) return;
            var chart = d3.select(el).append('div').node();
            Charts.Columns(chart, {
                buckets: m.RB.list.map(function(b, i) { return { t0: b.t0, t1: b.t1, n: m.curBy[i].filter(function(e) { return e.Ok === false; }).length }; }),
                single: 'critical', unit: unit, height: 150, label: 'Refused per ' + Vsm__UnitWord(unit),
                tip: function(b) { return { head: Vsm__BucketWords(b, unit), rows: [{ key: 'critical', value: '⚠ ' + Charts.Num(b.n), label: 'refused' }] }; }
            });
            var lists = d3.select(el).append('div').style('display', 'grid').style('grid-template-columns', 'repeat(auto-fit, minmax(300px, 1fr))').style('gap', '16px').style('margin-top', '10px');
            Charts.Bars(lists.append('div').node(), { split: false, color: 'critical', head: ['Wrong password for', '', 'refused'],
                empty: 'No wrong passwords.',
                rows: S.accounts.slice(0, Vsm__TopList).map(function(a) {
                    return { key: a.code, label: a.name, n: a.n, text: '⚠ ' + Charts.Num(a.n), tip: { head: a.name, rows: [{ key: 'critical', value: Charts.Num(a.n), label: 'wrong passwords' }, { value: Vsm__Stamp(a.last), label: 'last' }], note: 'Click: narrow every chart to ' + a.name } };
                }),
                onClick: function(r) { Vsm__SetFacet('person', r.key, r.label); } });
            Charts.Bars(lists.append('div').node(), { split: false, color: 'critical', head: ['From', '', 'refused'],
                rows: S.ips.slice(0, Vsm__TopList).map(function(x) {
                    return { key: x.ip, label: x.ip, sub: Vsm__Country(x.country), n: x.n, text: '⚠ ' + Charts.Num(x.n),
                             tip: { head: x.ip + ' · ' + Vsm__Country(x.country), rows: [{ key: 'critical', value: Charts.Num(x.n), label: 'refused' }, { value: Vsm__Stamp(x.last), label: 'last' }], note: 'Click: narrow every chart to this IP' } };
                }),
                onClick: function(r) { Vsm__SetFacet('ip', r.key, r.label); } });
        },
        table: function(m) {
            return { cols: [{ label: 'When' }, { label: 'App' }, { label: 'What' }, { label: 'Account' }, { label: 'IP' }, { label: 'Country' }, { label: 'Device' }],
                     rows: m.refused.slice().reverse().map(function(e) {
                         return [Vsm__Stamp(e._t), e.App, e.Text, e.User ? e.User.Name || e.User.Code : '', e.Ip || '', Vsm__Country(e.Country), e.Device || ''];
                     }) };
        }
    };
    // ------------------------------------------------------------


    // CARD | About These Numbers: the words, the files, the fetch
    // ------------------------------------------------------------
    var Vsm__CardAbout = {
        id: 'about', span: 12, noTable: true,
        title: function() { return 'About these numbers'; },
        sub: function() { return 'How tab 06 counts, and what it read.'; },
        draw: function(el, m) {
            var D = Vsm__Data, files = D.files || {}, fetch = D.fetch || {};
            var pairs = [
                ['Staff', 'Signed in with a Vale account (tab 04). Counted by person.'],
                ['Clients', 'No sign-in: almost always someone on a client link, also public pages (Help, the sign-in screens). Counted by device: the random id in that browser, or the IP when the browser sent none. One person on a phone and a laptop is two devices.'],
                ['Hide my actions', 'Leaves out ' + (m.users[Vsm__S().MeCode()] ? m.users[Vsm__S().MeCode()].Name : Vsm__S().MeCode()) + ' (this PC’s person), signed in, and their own client-link tests from the browsers they have signed in on. Never by IP: the office address is shared.'],
                ['Days', 'This PC’s time, midnight to midnight. Hours up to two days, days up to 92, then weeks from Monday.'],
                ['Compared with', 'The same length of time just before (the month before, for a month), only when the ledger on this PC covers all of it.'],
                ['Clients exploring', 'ValeVision 3D’s visit summaries: time on screen after the model showed (since 28-Oct-2026). Active: an input in each 5 seconds.'],
                ['Video watched', 'ValeVision Theia: seconds actually played, and whether the video reached its end.'],
                ['Load time', 'ValeVision 3D: from the page opening to the model on screen. A tab opened in the background counts its wait too.'],
                ['Ledger on this PC', (files.count ? Vsm__N(files.count, 'day file') + ', ' + Vsm.Mb(files.bytes) + ', ' + files.first + ' to ' + files.last : 'none yet') +
                    ' (' + (Vsm__Source === 'live' ? 'every live day' : 'archived ' + Vsm__MonthName(Vsm__Source.slice(2))) + ')'],
                ['Events read', Charts.Num(D.events.length) + (D.truncated ? ', ' + Charts.Num(D.truncated) + ' older ones left out' : '') + (D.bad_lines ? ' · ' + Vsm__N(D.bad_lines, 'line') + ' cut short mid-write, skipped' : '')],
                ['Last fetch', fetch.t ? Vsm__Stamp(fetch.t * 1000) + ' (' + Vsm__N(fetch.server_files || 0, 'file') + ' on the server)' : 'not since the manager started'],
                ['Charts', 'D3 ' + (d3 && d3.version) + ', vendored in 04__Lib__ThirdParty__VersionLocked. Every card’s Table button lists its numbers.']
            ];
            el.textContent = '';
            var dl = d3.select(el).append('dl').style('display', 'grid').style('grid-template-columns', '150px minmax(0, 1fr)').style('gap', '6px 14px').style('margin', '0').style('font-size', '12.5px');
            pairs.forEach(function(p) {
                dl.append('dt').style('color', 'var(--Vale_TextSecondary)').text(p[0]);
                dl.append('dd').style('margin', '0').text(p[1]);
            });
        }
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Layout: Sections, Cards, the Tiles
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Sections, Top to Bottom
    // ------------------------------------------------------------
    var Vsm__Sections = [
        { id: 'glance', nav: 'At a glance', title: 'At a glance', note: function(m) { return m.p.label + (m.p.ranged ? ', narrowed to ' + m.p.rangeLabel : '') + (m.p.prev ? ' · compared with ' + m.p.prevLabel : ''); }, cards: ['kpis'] },
        { id: 'time', nav: 'Over time', title: 'Over time', cards: [Vsm__CardActivity, Vsm__CardPeople] },
        { id: 'when', nav: 'When', title: 'When people use the apps', cards: [Vsm__HoursCard('s'), Vsm__HoursCard('c')] },
        { id: 'apps', nav: 'Apps', title: 'Apps', cards: [Vsm__CardApps] },
        { id: 'staff', nav: 'Staff', title: 'Staff', cards: [Vsm__CardTeam, Vsm__CardGroups, Vsm__CardQuiet] },
        { id: 'clients', nav: 'Clients', title: 'Clients and guests', cards: [
            Vsm__JourneyCard('journey3d', 'ValeVision 3D', Vsm__Journey3d, 'Client journey in ValeVision 3D'),
            Vsm__JourneyCard('journeyVideo', 'ValeVision Theia', Vsm__JourneyVideo, 'Client journey in ValeVision Theia'),
            Vsm__CardVisits, Vsm__CardReturning, Vsm__CardLinks] },
        { id: 'projects', nav: 'Projects', title: 'Projects', cards: [Vsm__CardProjects] },
        { id: 'features', nav: 'What people do', title: 'What people do', cards: [Vsm__CardFeatures] },
        { id: 'devices', nav: 'Devices', title: 'Devices and places', cards: [
            Vsm__WhoByCard('platforms', 'Platforms', function(e) { return e._plat; }, 'platform'),
            Vsm__WhoByCard('browsers', 'Browsers', function(e) { return e._brow; }, 'browser'),
            Vsm__WhoByCard('countries', 'Countries', function(e) { return e.Country || ''; }, 'country', Vsm__Country),
            Vsm__CardModes] },
        { id: 'performance', nav: 'Performance', title: 'Performance', cards: [Vsm__CardLoad, Vsm__CardLoadTrend] },
        { id: 'security', nav: 'Security', title: 'Security', cards: [Vsm__CardSecurity] },
        { id: 'about', nav: 'About', title: 'About these numbers', cards: [Vsm__CardAbout] }
    ];
    // ------------------------------------------------------------


    // SUB FUNCTION | The Tiles: label, value, change, sparkline (the period before in grey)
    // ------------------------------------------------------------
    var Vsm__CardKpis = {
        id: 'kpis', span: 12,
        title: function() { return 'Headline figures'; },
        sub: function(m) {
            return m.p.prev ? (m.p.covered ? '▲ ▼ against ' + m.p.prevLabel + ', the line in grey' : 'No change shown: this PC’s ledger does not cover ' + m.p.prevLabel)
                            : 'Everything not archived has no period before it' + ' · point at a tile for its numbers';
        },
        table: function(m) {
            return { cols: [{ label: 'Measure' }, { label: 'This period' }, { label: 'The period before' }, { label: 'Change' }],
                     rows: m.kpis.map(function(k) {
                         return [k.def.label, k.def.fmt(k.now), k.before == null ? (m.p.prev ? 'not covered' : '') : k.def.fmt(k.before), k.delta ? k.delta.text : ''];
                     }) };
        },
        draw: function(el, m) {
            el.textContent = '';
            var grid = d3.select(el).append('div').attr('class', 'Vsm__AnaTiles');
            m.kpis.forEach(function(k) {
                var tile = grid.append('div').attr('class', 'Vsm__AnaTile').datum(k);
                tile.append('span').text(k.def.label);
                var b = tile.append('b');
                if (k.def.status) b.append('span').attr('class', 'Vsm__AnaStatus ' + (k.now ? 'is-critical' : 'is-good')).text(k.now ? '⚠ ' : '✓ ');
                b.append('span').text(k.now == null ? '—' : k.def.fmt(k.now));
                tile.node().appendChild(Charts.Spark({ now: k.spark, prev: k.sparkPrev, w: 96, h: 32 }));
                var small = tile.append('small');
                if (k.delta && k.delta.text) small.append('span').attr('class', 'Vsm__AnaDelta ' + k.delta.cls).text(k.delta.text);
                small.append('span').text((k.delta && k.delta.text ? ' · ' : '') + k.def.sub(m));
                Charts.Bind(tile, function(d) {
                    var rows = [{ key: 'navy', value: d.now == null ? '—' : d.def.fmt(d.now), label: 'this period' }];
                    if (m.p.prev) rows.push({ value: d.before == null ? '—' : d.def.fmt(d.before), label: m.p.prevLabel });
                    return { head: d.def.label, rows: rows, note: d.def.tip + (d.delta && d.delta.tip ? '. ' + d.delta.tip : '') };
                });
            });
        }
    };
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Card: title, words, legend, Table button, then its chart (or its table); a failure stays in the card
    // ------------------------------------------------------------
    function Vsm__Card(grid, def, m) {
        var card = document.createElement('section');
        card.className = 'Vsm__AnaCard is-' + (def.span || 6);
        card.id = 'Vsm__AnaCard__' + def.id;
        var body = document.createElement('div');
        if (!def.bare) {
            var head = document.createElement('div'), words = document.createElement('div'), h = document.createElement('h3'), p = document.createElement('p');
            head.className = 'Vsm__AnaHead';
            h.textContent = def.title(m);
            p.textContent = def.sub ? def.sub(m) : '';
            words.appendChild(h);
            words.appendChild(p);
            head.appendChild(words);
            var tools = document.createElement('div');
            tools.className = 'Vsm__AnaTools';
            if (def.keys) tools.appendChild(Charts.Keys(def.keys, def.keyShape));
            if (def.table && !def.noTable) {
                var btn = document.createElement('button');
                btn.className = 'Vsm__BtnSmall';
                btn.dataset.anaTable = def.id;
                btn.setAttribute('aria-pressed', Vsm__TableOn[def.id] ? 'true' : 'false');
                btn.title = 'Show this chart’s numbers as a table';
                btn.textContent = Vsm__TableOn[def.id] ? 'Chart' : 'Table';
                tools.appendChild(btn);
            }
            head.appendChild(tools);
            card.appendChild(head);
        }
        card.appendChild(body);
        grid.appendChild(card);
        try {
            if (Vsm__TableOn[def.id] && def.table) Charts.Table(body, def.table(m));
            else def.draw(body, m);
        } catch (err) {
            console.error('Tab 06 card ' + def.id + ':', err);
            Charts.Empty(body, 'This card could not be drawn: ' + (err && err.message || err) + '. The rest of the page is unaffected.', true);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Render the Whole Page (keeps the scroll position)
    // ------------------------------------------------------------
    function Vsm__Render() {
        var body = Vsm.El('Vsm__AnaBody');
        if (!Charts || !Charts.Ready()) {
            body.innerHTML = '<div class="Vsm__AnaEmpty is-error">The charts library did not load (04__Lib__ThirdParty__VersionLocked/01__Vendor__D3__v7.9.0/dist/d3.min.js). ' +
                             'Restart the manager (Restart manager, top right) so it serves that folder, then reload this page.</div>';
            return;
        }
        if (!Vsm__Data) { Vsm__RenderBar(); return; }
        if (Vsm.Tab !== 'analytics') { Vsm__Dirty = true; Vsm__RenderBar(); return; }
        Vsm__Dirty = false;
        Charts.Tip.Hide();
        var t = window.performance.now();
        var m = Vsm__Model = Vsm__Build();
        var scroll = body.scrollTop;
        body.textContent = '';
        var nav = document.createElement('div');
        nav.className = 'Vsm__AnaNav';
        Vsm__Sections.forEach(function(s) {
            var b = document.createElement('button');
            b.className = 'Vsm__BtnSmall';
            b.dataset.anaGo = s.id;
            b.textContent = s.nav;
            nav.appendChild(b);
        });
        body.appendChild(nav);
        Vsm__Sections.forEach(function(s) {
            var head = document.createElement('div'), h = document.createElement('h2'), note = document.createElement('span');
            head.className = 'Vsm__AnaSection';
            head.id = 'Vsm__AnaSection__' + s.id;
            h.textContent = s.title;
            note.textContent = s.note ? s.note(m) : '';
            head.appendChild(h);
            head.appendChild(note);
            body.appendChild(head);
            var grid = document.createElement('div');
            grid.className = 'Vsm__AnaGrid';
            body.appendChild(grid);
            s.cards.forEach(function(c) { Vsm__Card(grid, c === 'kpis' ? Vsm__CardKpis : c, m); });
        });
        body.scrollTop = scroll;
        Vsm__Drawn = body.clientWidth;
        m.ms = Math.round(window.performance.now() - t);
        Vsm__RenderBar(m);
        Vsm__RenderChips(m);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Filter Row: Pill, Counts, Chips, Lists
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Pill, Fetch Button, Counts, the Archive Warning
    // ------------------------------------------------------------
    function Vsm__RenderBar(m) {
        var pill = Vsm.El('Vsm__AnaPill'), fetch = (Vsm__Data && Vsm__Data.fetch) || {};
        if (Vsm__Fetching) { pill.className = 'Vsm__Pill is-light is-warn'; pill.textContent = 'Fetching from the server…'; }
        else if (Vsm__Loading && !Vsm__Data) { pill.className = 'Vsm__Pill is-light'; pill.textContent = 'Loading…'; }
        else if (!Vsm__Data) { pill.className = 'Vsm__Pill is-light is-bad'; pill.textContent = 'Not loaded'; }
        else if (fetch.t) {
            pill.className = 'Vsm__Pill is-light is-good';
            pill.textContent = 'Fetched ' + Vsm__Clock(fetch.t * 1000) + ' · ' + (fetch.received ? fetch.received + ' file(s) updated' : 'up to date');
        } else {
            pill.className = 'Vsm__Pill is-light ' + (Vsm__Data.files && Vsm__Data.files.count ? 'is-warn' : 'is-bad');
            pill.textContent = Vsm__Data.files && Vsm__Data.files.count ? 'This PC’s copy: not fetched yet' : 'No ledger on this PC yet';
        }
        pill.title = Vsm__AutoError ? 'Last automatic fetch: ' + Vsm__AutoError : '';
        Vsm.El('Vsm__BtnAnaFetch').disabled = Vsm__Fetching;
        Vsm.El('Vsm__BtnAnaFetch').textContent = Vsm__Fetching ? 'Fetching…' : 'Fetch from server';
        if (m) {
            var staff = Vsm__Distinct(m.cur, Vsm__StaffKey), clients = Vsm__Distinct(m.cur, Vsm__ClientKey);
            Vsm.El('Vsm__AnaCounts').textContent = Vsm__N(m.cur.length, 'event') + ' · ' + Vsm__N(staff, 'signed-in person', 'signed-in people') + ' · ' +
                Vsm__N(clients, 'client device') + (m.mineHidden ? ' · ' + Charts.Num(m.mineHidden) + ' of yours hidden' : '');
            Vsm.El('Vsm__AnaCounts').title = 'Drawn in ' + m.ms + ' ms';
        }
        var errs = [];
        if (Vsm__Data && Vsm__Data.truncated) errs.push('⚠ ' + Charts.Num(Vsm__Data.truncated) + ' older events were left out (the newest ' + Charts.Num(Vsm__Data.events.length) + ' are counted).');
        Vsm.El('Vsm__AnaErrors').textContent = errs.join(' ');
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Chips: the days dragged, and each thing a click narrowed (✕ takes it off)
    // ------------------------------------------------------------
    function Vsm__RenderChips(m) {
        var box = Vsm.El('Vsm__AnaChips');
        box.textContent = '';
        var chip = function(text, key, title) {
            var c = document.createElement('span'), x = document.createElement('button');
            c.className = 'Vsm__AnaChip';
            c.title = title || '';
            c.appendChild(document.createTextNode(text));
            x.type = 'button';
            x.dataset.anaUnchip = key;
            x.title = 'Take this off';
            x.setAttribute('aria-label', 'Take off ' + text);
            x.textContent = '×';
            c.appendChild(x);
            box.appendChild(c);
        };
        if (m && m.p.ranged) chip('Days: ' + m.p.rangeLabel, 'range', 'Dragged or clicked on Activity');
        Object.keys(Vsm__Facets).forEach(function(k) { chip(Vsm__FacetDefs[k].name + ': ' + Vsm__Facets[k].label, k); });
        if (box.children.length > 1) {
            var all = document.createElement('button');
            all.className = 'Vsm__BtnSmall';
            all.dataset.anaUnchip = 'all';
            all.textContent = 'Clear all';
            box.appendChild(all);
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Fill the App, Audience and Period Lists From the Data (keeps each choice)
    // ------------------------------------------------------------
    function Vsm__FillSelects() {
        var apps = {};
        Vsm__Events.forEach(function(e) { if (e.App) apps[e.App] = true; });
        (Vsm__Data.links || []).forEach(function(l) { if (l.App) apps[l.App] = true; });
        var sel = Vsm.El('Vsm__AnaApp'), keep = sel.value;
        sel.innerHTML = '<option value="">All apps</option>' + Object.keys(apps).sort().map(function(a) { return '<option>' + Vsm.Esc(a) + '</option>'; }).join('');
        sel.value = apps[keep] ? keep : '';
        var who = Vsm.El('Vsm__AnaWho'), keepWho = who.value || Vsm.Store('AnalyticsWho') || '';
        who.innerHTML = '<option value="">Everyone</option><option value="staff">Staff (signed in)</option><option value="external">Clients (no sign-in)</option>' +
            (Vsm__Data.levels || []).filter(function(l) { return l.Rank < 5; }).map(function(l) {
                return '<option value="level:' + Vsm.Esc(l.Code) + '">' + Vsm.Esc(l.Rank + ' · ' + l.Name) + '</option>';
            }).join('');
        who.value = keepWho;
        if (who.value !== keepWho) who.value = '';
        var period = Vsm.El('Vsm__AnaPeriod'), keepPeriod = period.value;
        var months = Vsm__Data.months || [];
        var opt = function(prefix, mo, note) { return '<option value="' + prefix + Vsm.Esc(mo.Month) + '">' + Vsm.Esc(Vsm__MonthName(mo.Month) + ' · ' + note) + '</option>'; };
        var live = months.filter(function(mo) { return mo.LiveDays; }).map(function(mo) { return opt('m:', mo, Vsm__N(mo.LiveDays, 'day')); });
        var old = months.filter(function(mo) { return mo.ArchivedDays && !mo.LiveDays; }).map(function(mo) { return opt('a:', mo, mo.ArchivedDays + ' days, archived'); });
        period.innerHTML = Vsm__PeriodHtml + (live.length ? '<optgroup label="Months">' + live.join('') + '</optgroup>' : '') +
            (old.length ? '<optgroup label="Archived months (loaded on their own)">' + old.join('') + '</optgroup>' : '');
        period.value = keepPeriod;
        if (period.value !== keepPeriod) period.value = '30';
    }
    // ------------------------------------------------------------


    // FUNCTION | Show in Ledger: tab 05 on the same events (the strongest narrowing as its search)
    // ------------------------------------------------------------
    function Vsm__ShowInLedger() {
        var f = Vsm__Facets, find = f.person ? f.person.value : f.link ? f.link.value : f.project ? f.project.value :
                f.visitor ? f.visitor.value.replace(/^(d|ip):/, '') : f.ip ? f.ip.value : Vsm.El('Vsm__AnaSearch').value.trim();
        var p = Vsm__Model ? Vsm__Model.p : Vsm__Period();
        var back = Math.ceil((Date.now() - p.r0) / 864e5);
        var period = /^[ma]:/.test(p.value) && !p.ranged ? 'm:' + p.value.slice(2) : back <= 1 ? '1' : back <= 7 ? '7' : back <= 30 ? '30' : back <= 90 ? '90' : '0';
        if (!Vsm.Activity || !Vsm.Activity.ShowInLedger) { Vsm.Toast('Tab 05 is not available.', true); return; }
        Vsm.Activity.ShowInLedger({ find: find, app: Vsm.El('Vsm__AnaApp').value, who: Vsm.El('Vsm__AnaWho').value, period: period,
                                    hideMe: Vsm.El('Vsm__AnaHideMe').checked });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Load and Fetch
// -----------------------------------------------------------------------------

    // FUNCTION | Load the PC's Copy: every live day, or one archived month (no connection)
    // ------------------------------------------------------------
    Analytics.Load = function() {
        var period = Vsm.El('Vsm__AnaPeriod').value, source = /^a:\d{4}-\d{2}$/.test(period) ? period : 'live';
        var query = source === 'live' ? 'days=0' : 'month=' + encodeURIComponent(source.slice(2));
        Vsm__Loading = true;
        Vsm.El('Vsm__AnaBody').classList.add('is-loading');
        Vsm__RenderBar();
        return fetch('/api/activity?' + query + '&limit=' + Vsm__Limit, { cache: 'no-store' }).then(function(r) {
            if (!r.ok) throw new Error('HTTP ' + r.status + (r.status === 404 ? ': restart the manager server' : ''));
            return r.json();
        }).then(function(d) {
            if (!d.ok) throw new Error(d.error || 'no data');
            var events = d.events || [];
            Vsm__Prepare(events);
            Vsm__S().LearnMyDevices(events);
            Vsm__Data = d;
            Vsm__Events = events;
            Vsm__Source = source;
            Vsm__FillSelects();
            Vsm__Loading = false;
            Vsm.El('Vsm__AnaBody').classList.remove('is-loading');
            Vsm__Render();
            return d;
        }).catch(function(err) {
            Vsm__Loading = false;
            Vsm.El('Vsm__AnaBody').classList.remove('is-loading');
            Vsm__RenderBar();
            Vsm.Toast('Could not load the user analytics (' + err.message + ').', true);
            return null;
        });
    };
    // ------------------------------------------------------------


    // FUNCTION | Fetch the Server's New Lines (tab 05's job: one read-only session), Then Reload
    // ------------------------------------------------------------
    Analytics.Fetch = function(auto) {
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
            return Analytics.Load();
        });
    };

    function Vsm__FetchIfStale() {
        var t = Vsm__Data && Vsm__Data.fetch && Vsm__Data.fetch.t;
        if (Vsm.Tab === 'analytics' && document.visibilityState === 'visible' && Vsm__Source === 'live' && (!t || Date.now() - t * 1000 > Vsm__StaleMs)) Analytics.Fetch(true);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Events and Start-Up
// -----------------------------------------------------------------------------

    // FUNCTION | Clicks in Tab 06: Table buttons, section links, chip crosses
    // ------------------------------------------------------------
    function Vsm__OnClick(e) {
        var tab = Vsm.El('Vsm__TabAnalytics');
        if (!tab || !tab.contains(e.target)) return;
        var t = e.target.closest('[data-ana-table]');
        if (t) {
            var id = t.dataset.anaTable;
            Vsm__TableOn[id] = !Vsm__TableOn[id];
            Vsm__Render();
            return;
        }
        var go = e.target.closest('[data-ana-go]');
        if (go) {
            var sec = Vsm.El('Vsm__AnaSection__' + go.dataset.anaGo);
            if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }
        var un = e.target.closest('[data-ana-unchip]');
        if (un) {
            var k = un.dataset.anaUnchip;
            if (k === 'all') { Vsm__Facets = {}; Vsm__Range = null; }
            else if (k === 'range') Vsm__Range = null;
            else delete Vsm__Facets[k];
            Vsm__Render();
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Wire Up Tab 06
    // ------------------------------------------------------------
    Analytics.Init = function() {
        Vsm__PeriodHtml = Vsm.El('Vsm__AnaPeriod').innerHTML;
        var period = Vsm.Store('AnalyticsPeriod');
        if (period && Vsm.El('Vsm__AnaPeriod').querySelector('option[value="' + period + '"]')) Vsm.El('Vsm__AnaPeriod').value = period;
        var hide = Vsm.Store('AnalyticsHideMe');
        Vsm.El('Vsm__AnaHideMe').checked = hide == null ? true : hide === '1';     // <-- On unless switched off: the developer's own tests drown the picture
        document.addEventListener('click', Vsm__OnClick);
        Vsm.El('Vsm__BtnAnaFetch').addEventListener('click', function() { Analytics.Fetch(false); });
        Vsm.El('Vsm__BtnAnaLedger').addEventListener('click', Vsm__ShowInLedger);
        Vsm.El('Vsm__AnaPeriod').addEventListener('change', function() {
            var v = this.value, archived = /^a:/.test(v);
            if (/^\d+$/.test(v)) Vsm.Store('AnalyticsPeriod', v);
            Vsm__Range = null;
            if ((archived ? v : 'live') !== Vsm__Source) Analytics.Load(); else Vsm__Render();
        });
        Vsm.El('Vsm__AnaWho').addEventListener('change', function() { Vsm.Store('AnalyticsWho', this.value); Vsm__Render(); });
        Vsm.El('Vsm__AnaApp').addEventListener('change', Vsm__Render);
        Vsm.El('Vsm__AnaHideMe').addEventListener('change', function() { Vsm.Store('AnalyticsHideMe', this.checked ? '1' : '0'); Vsm__Render(); });
        var typing = null;
        Vsm.El('Vsm__AnaSearch').addEventListener('input', function() {
            window.clearTimeout(typing);
            typing = window.setTimeout(Vsm__Render, 250);
        });
        var body = Vsm.El('Vsm__AnaBody');
        body.addEventListener('scroll', function() { Charts.Tip.Hide(); }, { passive: true });
        if (window.ResizeObserver) {                                           // <-- Redraw at the new width (charts are drawn to their card's pixels)
            new ResizeObserver(function() {
                if (Vsm.Tab !== 'analytics' || !Vsm__Data || Math.abs(body.clientWidth - Vsm__Drawn) < 12) return;
                window.clearTimeout(Vsm__Resizing);
                Vsm__Resizing = window.setTimeout(Vsm__Render, 150);
            }).observe(body);
        }
        Vsm__Timer = window.setInterval(Vsm__FetchIfStale, 60e3);              // <-- Every minute: fetch when the copy is 5 min old
    };

    Analytics.Show = function() {
        if (!Charts || !Charts.Ready()) { Vsm__Render(); return; }
        if (!Vsm__Data) { Analytics.Load().then(function() { Vsm__FetchIfStale(); }); return; }
        if (Vsm__Dirty || Math.abs(Vsm.El('Vsm__AnaBody').clientWidth - Vsm__Drawn) >= 12) Vsm__Render();
        Vsm__FetchIfStale();
    };

    Analytics.Render = function() { Vsm__Render(); };
    Analytics.Model = function() { return Vsm__Model; };                       // <-- For checks: the numbers last drawn
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

})();
