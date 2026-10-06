/* =============================================================================
   VALE VIRTUAL SERVER MANAGER - UI | TAB 04 USER ACCOUNTS
   =============================================================================

   FILE       : VirtualServerManager__Ui__Users__.js
   NAMESPACE  : Vsm.Users
   MODULE     : Ui - User Accounts
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Edit the Vale users register (Server__UserAccountData): names,
                roles, permission levels, active flag; reset passwords and sign
                people out on the live server
   CREATED    : 06-Oct-2026

   DESCRIPTION:
   - Codes (USR + 8 digits), created dates and password hashes are issued by the
     local server on save, never typed here. Hashes never reach this page.
   - New users get the temporary password from the register's rule
     (TempPasswordRule, kept only in the git-ignored register); the page shows it
     so it can be handed over.
   - Reset (back to the temporary password) and Sign out (every device, password
     kept) ask first, then change the live server at once through one engine job;
     the PC copy takes the same change, so no push is needed.
   - Users are never deleted: untick Active. Only an unsaved new row can be removed.
   - Typing updates the row's derived text only; rows are rebuilt on load, save,
     revert, add and remove (same pattern as tab 03).

   =============================================================================

   DEVELOPMENT LOG:
   06-Oct-2026 - Version 0.5.0
   - Reset and Sign out act on the server at once, each after an "are you sure"
     dialog. The staged "resets on save" is gone. Sessions column shows the last
     forced sign-out. Reloading keeps unsaved edits but takes the fresh password
     and sign-out fields.

   06-Oct-2026 - Version 0.4.3
   - Uses the shared sort system in Ui__Core__ (same headers and rules as every table).

   06-Oct-2026 - Version 0.4.2
   - Department column (select from the register's DepartmentOptions; blank allowed).

   06-Oct-2026 - Version 0.4.1
   - Click a column header to sort ascending / descending (remembered on this PC).
     Only the display is sorted; the register stays in code order.

   06-Oct-2026 - Version 0.4.0
   - Initial build.

   ============================================================================= */

(function() {

    var Vsm = window.Vsm;
    var Users = Vsm.Users = {};

// -----------------------------------------------------------------------------
// REGION | State and Helpers
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Register Being Edited
    // ------------------------------------------------------------
    var Vsm__Data    = null;                                                   // <-- Last /api/users payload
    var Vsm__Draft   = null;                                                   // <-- User rows as edited (unsaved)
    var Vsm__Dirty   = false;
    var Vsm__Saving  = false;
    var Vsm__Sort    = Vsm.SortState('Users', { key: 'code', dir: 1 });        // <-- Shared sort system (Ui__Core__)
    var Vsm__ServerOwned = ['ValeUser__Password__IsTemporary', 'ValeUser__Password__SetDate',
                            'ValeUser__Session__SignedOutDate'];               // <-- Changed by users and server actions, never typed
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Table Columns (key, header, sort value)
    // ------------------------------------------------------------
    var Vsm__Columns = [
        { key: 'code',     label: 'Code',        val: function(u) { return u.ValeUser__UniqueCode || null; } },       // <-- New rows last
        { key: 'first',    label: 'First name',  val: function(u) { return Vsm.SortValue(u.ValeUser__Name__First); } },
        { key: 'last',     label: 'Surname',     val: function(u) { return Vsm.SortValue(u.ValeUser__Name__Last); } },
        { key: 'email',    label: 'Email',       val: function(u) { return Vsm.SortValue(u.ValeUser__Email__Address); } },
        { key: 'dept',     label: 'Department',  val: function(u) { return Vsm.SortValue(u.ValeUser__Employee__Department); } },
        { key: 'role',     label: 'Role',        val: function(u) { return Vsm.SortValue(u.ValeUser__Employee__Role); } },
        { key: 'level',    label: 'Permission',  val: function(u) { return Vsm__Rank(u.ValeUser__Permission__Level); } },
        { key: 'active',   label: 'Active',      val: function(u) { return u.ValeUser__Employee__IsActive ? 0 : 1; } },
        { key: 'created',  label: 'Created',     val: function(u) { return Vsm.SortValue(u.ValeUser__Account__CreatedDate); } },
        { key: 'password', label: 'Password',    val: function(u) { return u.ValeUser__Password__IsTemporary === false ? 1 : 0; } },
        { key: 'sessions', label: 'Sessions',    val: function(u) { return Vsm.SortValue(String(u.ValeUser__Session__SignedOutDate || '').slice(0, 11)); } },
        { key: 'configs',  label: 'App configs', val: function(u) { return ((Vsm__Data.app_configs || {})[u.ValeUser__UniqueCode] || []).length; } },
        { key: 'note',     label: 'Note',        val: function(u) { return Vsm.SortValue(u.ValeUser__Account__Note); } }
    ];

    function Vsm__Rank(code) {
        var lv = (Vsm__Meta('PermissionLevels') || []).find(function(l) { return l.PermissionLevel__Code === code; });
        return lv ? lv.PermissionLevel__Rank : 99;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Register Lookups
    // ------------------------------------------------------------
    function Vsm__Meta(key) { return (Vsm__Data && Vsm__Data.meta && Vsm__Data.meta['UserAccountData__ValeUsers__' + key]) || null; }

    function Vsm__Levels() {
        return (Vsm__Meta('PermissionLevels') || []).filter(function(l) { return l.PermissionLevel__HasAccount; });
    }

    function Vsm__TempFor(u) {                                                  // <-- Same rule as the engine
        var first = String(u.ValeUser__Name__First || '').replace(/[^A-Za-z0-9]/g, '');
        return String(Vsm__Meta('TempPasswordRule') || '').replace('{{UserFirstName}}', first);
    }

    function Vsm__Name(u) {
        return [u.ValeUser__Name__First, u.ValeUser__Name__Last].filter(Boolean).join(' ') || u.ValeUser__UniqueCode;
    }

    function Vsm__Options(list, current) {
        return list.map(function(o) {
            var v = typeof o === 'string' ? o : o.value, label = typeof o === 'string' ? o : o.label;
            return '<option value="' + Vsm.Esc(v) + '"' + (v === current ? ' selected' : '') + '>' + Vsm.Esc(label) + '</option>';
        }).join('');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Rendering
// -----------------------------------------------------------------------------

    // SUB HELPER FUNCTION | Password Cell (temporary password shown for hand-over; Reset asks first)
    // ------------------------------------------------------------
    function Vsm__PasswordHtml(u) {
        if (!u.ValeUser__UniqueCode) return '<code>' + Vsm.Esc(Vsm__TempFor(u)) + '</code> <span class="Vsm__Muted">on save</span>';
        var text = u.ValeUser__Password__IsTemporary
            ? '<code>' + Vsm.Esc(Vsm__TempFor(u)) + '</code> <span class="Vsm__Muted">temporary</span>'
            : '<span class="Vsm__C-ok">own password</span> <span class="Vsm__Muted">set ' + Vsm.Esc(u.ValeUser__Password__SetDate || '') + '</span>';
        return '<div class="Vsm__CellSplit"><span>' + text + '</span>' +                // <-- Reset flush right: one column of buttons
               '<button class="Vsm__BtnSmall" data-act="reset" title="Back to the temporary password and signed out everywhere, on the server now">Reset</button></div>';
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Sessions Cell (Sign out everywhere; the last forced sign-out)
    // ------------------------------------------------------------
    function Vsm__SessionsHtml(u) {
        if (!u.ValeUser__UniqueCode) return '<span class="Vsm__Muted">after save</span>';
        var last = u.ValeUser__Session__SignedOutDate;
        return '<button class="Vsm__BtnSmall" data-act="signout" title="End every session on every device, on the server now. The password stays.">Sign out</button>' +
               (last ? ' <span class="Vsm__Muted" title="Last signed out from here">' + Vsm.Esc(last.slice(0, 17)) + '</span>' : '');
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | One User Row
    // ------------------------------------------------------------
    function Vsm__Row(u, i) {
        var code = u.ValeUser__UniqueCode, configs = (Vsm__Data.app_configs || {})[code] || [];
        var levels = Vsm__Levels().map(function(l) { return { value: l.PermissionLevel__Code, label: l.PermissionLevel__Rank + ' · ' + l.PermissionLevel__Name }; });
        var input = function(f, cls, ph) {
            return '<input class="Vsm__UrlInput ' + (cls || '') + '" data-f="' + f + '" value="' + Vsm.Esc(u[f] || '') + '"' +
                   (ph ? ' placeholder="' + Vsm.Esc(ph) + '"' : '') + '>';
        };
        return '<tr data-user="' + i + '" class="' + (u.ValeUser__Employee__IsActive ? '' : 'is-inactive') + (code ? '' : ' is-new') + '">' +
            '<td class="Vsm__UserCode">' + (code ? Vsm.Esc(code) : '<span class="Vsm__Muted">new</span>') + '</td>' +
            '<td>' + input('ValeUser__Name__First', '', 'First name') + '</td>' +
            '<td>' + input('ValeUser__Name__Last', '', 'Surname') + '</td>' +
            '<td>' + input('ValeUser__Email__Address', 'is-email', 'name@valegardenhouses.com') + '</td>' +
            '<td><select class="Vsm__Select" data-f="ValeUser__Employee__Department">' +
                Vsm__Options([{ value: '', label: '—' }].concat(Vsm__Meta('DepartmentOptions') || []), u.ValeUser__Employee__Department || '') + '</select></td>' +
            '<td><select class="Vsm__Select" data-f="ValeUser__Employee__Role">' + Vsm__Options(Vsm__Meta('RoleOptions') || [], u.ValeUser__Employee__Role) + '</select></td>' +
            '<td><select class="Vsm__Select" data-f="ValeUser__Permission__Level">' + Vsm__Options(levels, u.ValeUser__Permission__Level) + '</select></td>' +
            '<td><label class="Vsm__Check"><input type="checkbox" data-f="ValeUser__Employee__IsActive"' + (u.ValeUser__Employee__IsActive ? ' checked' : '') + '> active</label></td>' +
            '<td class="Vsm__Muted">' + Vsm.Esc(u.ValeUser__Account__CreatedDate || 'on save') + '</td>' +
            '<td data-d="password">' + Vsm__PasswordHtml(u) + '</td>' +
            '<td>' + Vsm__SessionsHtml(u) + '</td>' +
            '<td>' + (configs.length ? configs.map(function(a) { return '<span class="Vsm__Chip">' + Vsm.Esc(a) + '</span>'; }).join('') : '<span class="Vsm__Muted">none yet</span>') + '</td>' +
            '<td>' + input('ValeUser__Account__Note', 'is-note', 'Note') + '</td>' +
            '<td>' + (code ? '' : '<button class="Vsm__BtnSmall" data-act="remove">Remove</button>') + '</td>' +
            '</tr>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Toolbar, Counts, Errors
    // ------------------------------------------------------------
    function Vsm__RenderBar() {
        if (!Vsm__Data) return;
        var pill = Vsm.El('Vsm__UserPill');
        pill.className = 'Vsm__Pill is-light ' + (Vsm__Dirty ? 'is-warn' : Vsm__Data.exists ? 'is-good' : 'is-bad');
        pill.textContent = Vsm__Saving ? 'Saving…'
            : !Vsm__Data.exists ? 'No register yet'
            : Vsm__Dirty ? 'Unsaved changes: press Save (or Enter)'
            : 'Saved on this PC' + (Vsm__Meta('UpdatedDate') ? ' · updated ' + Vsm__Meta('UpdatedDate') : '');
        Vsm.El('Vsm__BtnUserSave').disabled = !Vsm__Dirty || Vsm__Saving;
        Vsm.El('Vsm__BtnUserSave').textContent = Vsm__Saving ? 'Saving…' : 'Save';
        Vsm.El('Vsm__BtnUserRevert').disabled = !Vsm__Dirty || Vsm__Saving;
        Vsm.El('Vsm__BtnUserAdd').disabled = !Vsm__Data.exists;
        var rows = Vsm__Draft || [];
        var active = rows.filter(function(u) { return u.ValeUser__Employee__IsActive; }).length;
        var temp = rows.filter(function(u) { return u.ValeUser__UniqueCode && u.ValeUser__Password__IsTemporary; }).length;
        Vsm.El('Vsm__UserCounts').textContent = rows.length + ' users · ' + active + ' active · ' + temp + ' on a temporary password';
    }

    function Vsm__RenderErrors(list) {
        Vsm.El('Vsm__UserErrors').innerHTML = (list || []).map(function(e) { return '<div>⚠ ' + Vsm.Esc(e) + '</div>'; }).join('');
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Side Panel: Levels, Files, Server
    // ------------------------------------------------------------
    function Vsm__RenderSide() {
        Vsm.El('Vsm__UserLevels').innerHTML = (Vsm__Meta('PermissionLevels') || []).map(function(l) {
            return '<div class="Vsm__Level"><b>' + l.PermissionLevel__Rank + ' · ' + Vsm.Esc(l.PermissionLevel__Name) + '</b>' +
                   (l.PermissionLevel__HasAccount ? '' : ' <span class="Vsm__Muted">(no account)</span>') +
                   '<div class="Vsm__Muted">' + Vsm.Esc(l.PermissionLevel__Summary) + '</div></div>';
        }).join('');
        Vsm.El('Vsm__UserFile').textContent = Vsm__Data.rel || '';
        Vsm.El('Vsm__UserConfigsPath').textContent = Vsm__Meta('AppConfigsPath') || '';
        Vsm.El('Vsm__UserRule').textContent = Vsm__Meta('TempPasswordRule') || '';
        var server = Vsm.El('Vsm__UserServer');
        if (!Vsm__Data.mapping) {
            server.innerHTML = '<span class="Vsm__Warn">No sync mapping covers Server__UserAccountData.</span>';
        } else if (Vsm__Data.guard) {
            server.innerHTML = '<span class="Vsm__Warn">Not on the server yet.</span> ' + Vsm.Esc(Vsm__Data.guard);
        } else {
            server.innerHTML = 'Mapping <code>' + Vsm.Esc(Vsm__Data.mapping) + '</code> (project-data lane: both ways). ' +
                'Push it in tab 02 to send new users and profile changes. <b>Reset</b> and <b>Sign out</b> change the server at once. ' +
                'A push always keeps the passwords people set on the server; Collect brings them here. ' +
                'Server copy: <code>' + Vsm.Esc(Vsm__Data.root + '/' + Vsm__Data.rel) + '</code>';
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Show / Hide Rows for the Search and Inactive Filters (no rebuild)
    // ------------------------------------------------------------
    function Vsm__ApplyFilter() {
        var q = Vsm.El('Vsm__UserSearch').value.trim().toLowerCase();
        var showInactive = Vsm.El('Vsm__UserShowInactive').checked;
        document.querySelectorAll('#Vsm__UserTable tr[data-user]').forEach(function(tr) {
            var u = Vsm__Draft[Number(tr.dataset.user)] || {};
            var text = [u.ValeUser__UniqueCode, u.ValeUser__Name__First, u.ValeUser__Name__Last, u.ValeUser__Email__Address,
                        u.ValeUser__Employee__Department, u.ValeUser__Employee__Role, u.ValeUser__Permission__Level, u.ValeUser__Account__Note].join(' ').toLowerCase();
            tr.hidden = (!showInactive && !u.ValeUser__Employee__IsActive && u.ValeUser__UniqueCode) || (q && text.indexOf(q) < 0);
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Row Order for the Current Sort (the draft itself stays in code order)
    // ------------------------------------------------------------
    function Vsm__SortedIndexes() {
        var col = Vsm__Columns.find(function(c) { return c.key === Vsm__Sort.key; }) || Vsm__Columns[0];
        var code = Vsm__Columns[0].val;
        return Vsm__Draft.map(function(u, i) { return i; }).sort(function(a, b) {
            return Vsm.SortCompare(col.val(Vsm__Draft[a]), col.val(Vsm__Draft[b]), Vsm__Sort.dir) ||
                   Vsm.SortCompare(code(Vsm__Draft[a]), code(Vsm__Draft[b]), 1);   // <-- Ties: by code
        });
    }

    function Vsm__SortBy(key) {
        Vsm__Sort = Vsm.SortToggle('Users', Vsm__Sort, key);
        Users.Render();
    }
    // ------------------------------------------------------------


    // FUNCTION | Render Tab 04 (rows rebuilt only on load, save, revert, add, remove, sort)
    // ------------------------------------------------------------
    Users.Render = function() {
        if (!Vsm__Data) return;
        Vsm__RenderBar();
        Vsm__RenderErrors(Vsm__Data.errors);
        var table = Vsm.El('Vsm__UserTable');
        if (!Vsm__Data.exists) {
            table.innerHTML = '<tr><td class="Vsm__TreeEmpty">No register yet: ' + Vsm.Esc(Vsm__Data.rel) + ' is missing from the mirror.</td></tr>';
            return;
        }
        table.innerHTML = '<thead><tr>' + Vsm__Columns.map(function(c) {
                return '<th' + Vsm.SortHead(Vsm__Sort, c.key) + ' title="Sort by ' + c.label.toLowerCase() + '">' + Vsm.Esc(c.label) + '</th>';
            }).join('') + '<th></th></tr></thead><tbody>' +
            Vsm__SortedIndexes().map(function(i) { return Vsm__Row(Vsm__Draft[i], i); }).join('') + '</tbody>';
        Vsm__RenderSide();
        Vsm__ApplyFilter();
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Load, Edit, Save
// -----------------------------------------------------------------------------

    // FUNCTION | Load the Register From the Local Server (unsaved edits kept; password and sign-out fields fresh)
    // ------------------------------------------------------------
    Users.Load = function() {
        return fetch('/api/users', { cache: 'no-store' }).then(function(r) {
            if (!r.ok) throw new Error('HTTP ' + r.status + (r.status === 404 ? ': restart the manager server' : ''));
            return r.json();
        }).then(function(d) {
            Vsm__Data = d;
            if (!Vsm__Dirty) {
                Vsm__Draft = JSON.parse(JSON.stringify(d.users || []));
            } else {
                var fresh = {};
                (d.users || []).forEach(function(u) { fresh[u.ValeUser__UniqueCode] = u; });
                Vsm__Draft.forEach(function(u) {
                    var f = fresh[u.ValeUser__UniqueCode];
                    if (f) Vsm__ServerOwned.forEach(function(k) { u[k] = f[k]; });
                });
            }
            Users.Render();
        }).catch(function(err) {
            Vsm.Toast('Could not load the user accounts (' + err.message + ').', true);
        });
    };
    // ------------------------------------------------------------


    // FUNCTION | Save (codes, dates and hashes issued by the local server; always ends with a result)
    // ------------------------------------------------------------
    Users.Save = function() {
        if (Vsm__Saving || !Vsm__Dirty) return Promise.resolve(false);
        Vsm__Saving = true;
        Vsm__RenderBar();
        return Vsm.Post('/api/users', { users: Vsm__Draft }).then(function(res) {
            Vsm__Saving = false;
            if (!res || !res.ok) {
                Vsm__RenderErrors((res && res.errors) || [(res && res.error) || 'unknown error']);
                Vsm__RenderBar();
                Vsm.Toast('Not saved: ' + ((res && res.error) || 'check the rows marked above'), true);
                return false;
            }
            Vsm__Dirty = false;
            Vsm__Data = res;
            Vsm__Draft = JSON.parse(JSON.stringify(res.users || []));
            Users.Render();
            var bits = [];
            if ((res.added || []).length) bits.push('added ' + res.added.join(', '));
            if ((res.reset || []).length) bits.push('temporary password follows the new name for ' + res.reset.join(', '));
            Vsm.Toast('User accounts saved on this PC' + (bits.length ? ': ' + bits.join('; ') : '') + '. Push them in tab 02 to update the server.');
            return true;
        });
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Reset and Sign Out (on the live server, after "are you sure")
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Run the Job, Then Show What Happened
    // ------------------------------------------------------------
    function Vsm__RunAction(u, action) {
        var name = Vsm__Name(u);
        Vsm.Operate('user-' + action, { code: u.ValeUser__UniqueCode }, function(res) {
            var text = action === 'reset'
                ? name + '’s password is reset to ' + res.temp + ', and they are signed out everywhere.'
                : name + ' is signed out on every device.';
            return text + (res.pc === 'merged' ? ' This PC also has unpushed user edits: push useraccounts in tab 02 when ready.' : '');
        }).then(function() { Users.Load(); });
    }
    // ------------------------------------------------------------


    // FUNCTION | Ask First: Reset a Password
    // ------------------------------------------------------------
    function Vsm__ConfirmReset(u) {
        if (Vsm__Dirty) { Vsm.Toast('Save or revert your changes first, so the temporary password matches the saved name.', true); return; }
        var name = Vsm__Name(u);
        Vsm.OpenModal('<h2>Are you sure you want to reset ' + Vsm.Esc(name) + '’s password?</h2>' +
            '<p>Their password goes back to the temporary one, <code>' + Vsm.Esc(Vsm__TempFor(u)) + '</code>, and every device they are ' +
            'signed in on is signed out. They choose a new password when they next sign in.</p>' +
            '<p class="Vsm__Muted">This changes the live server now (one connection); no push is needed. ' +
            'Their own password is never shown, here or anywhere: only a hash is stored.</p>',
            [{ label: 'Cancel' }, { label: 'Reset password', cls: 'Vsm__BtnDanger', run: function() { Vsm__RunAction(u, 'reset'); } }]);
    }
    // ------------------------------------------------------------


    // FUNCTION | Ask First: Sign Out Everywhere
    // ------------------------------------------------------------
    function Vsm__ConfirmSignOut(u) {
        var name = Vsm__Name(u);
        Vsm.OpenModal('<h2>Are you sure you want to sign ' + Vsm.Esc(name) + ' out everywhere?</h2>' +
            '<p>Every device signed in as ' + Vsm.Esc(name) + ' is signed out at once, in every Vale app. ' +
            'Their password does not change: they sign in again with it.</p>' +
            '<p class="Vsm__Muted">This changes the live server now (one connection); no push is needed.</p>',
            [{ label: 'Cancel' }, { label: 'Sign out everywhere', cls: 'Vsm__BtnDanger', run: function() { Vsm__RunAction(u, 'signout'); } }]);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Events
// -----------------------------------------------------------------------------

    // FUNCTION | Edits in the Table (update the draft and the row's derived text only)
    // ------------------------------------------------------------
    function Vsm__OnInput(e) {
        var tr = e.target.closest && e.target.closest('tr[data-user]');
        var f = e.target.dataset && e.target.dataset.f;
        if (!tr || !f || !Vsm.El('Vsm__TabUsers').contains(tr) || !Vsm__Draft) return;
        var u = Vsm__Draft[Number(tr.dataset.user)];
        if (!u) return;
        u[f] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        if (f === 'ValeUser__Employee__IsActive') tr.classList.toggle('is-inactive', !u[f]);
        if (f === 'ValeUser__Name__First') tr.querySelector('[data-d="password"]').innerHTML = Vsm__PasswordHtml(u);
        Vsm__Dirty = true;
        Vsm__RenderBar();
    }

    function Vsm__OnKey(e) {
        if (e.key !== 'Enter' || !e.target.closest || !e.target.closest('#Vsm__UserTable')) return;
        e.preventDefault();
        Users.Save();
    }

    function Vsm__OnClick(e) {
        if (!Vsm.El('Vsm__TabUsers').contains(e.target)) return;
        var th = e.target.closest('th[data-sort]');
        if (th) { Vsm__SortBy(th.dataset.sort); return; }
        var btn = e.target.closest('[data-act]');
        var tr = btn && btn.closest('tr[data-user]');
        if (!tr) return;
        var i = Number(tr.dataset.user), u = Vsm__Draft[i];
        if (btn.dataset.act === 'remove' && !u.ValeUser__UniqueCode) {
            Vsm__Draft.splice(i, 1);
            Users.Render();
        } else if (btn.dataset.act === 'reset' && u.ValeUser__UniqueCode) {
            Vsm__ConfirmReset(u);
        } else if (btn.dataset.act === 'signout' && u.ValeUser__UniqueCode) {
            Vsm__ConfirmSignOut(u);
        }
        Vsm__RenderBar();
    }
    // ------------------------------------------------------------


    // FUNCTION | Wire Up Tab 04
    // ------------------------------------------------------------
    Users.Init = function() {
        document.addEventListener('input', Vsm__OnInput);
        document.addEventListener('change', Vsm__OnInput);
        document.addEventListener('keydown', Vsm__OnKey);
        document.addEventListener('click', Vsm__OnClick);
        Vsm.El('Vsm__BtnUserAdd').addEventListener('click', function() {
            var roles = Vsm__Meta('RoleOptions') || [];
            Vsm__Draft.push({ ValeUser__UniqueCode: '', ValeUser__Name__First: '', ValeUser__Name__Last: '', ValeUser__Email__Address: '',
                              ValeUser__Employee__Department: '',
                              ValeUser__Employee__Role: roles.indexOf('Designer') >= 0 ? 'Designer' : roles[0],
                              ValeUser__Permission__Level: 'Employee', ValeUser__Employee__IsActive: true, ValeUser__Account__Note: '' });
            Vsm__Dirty = true;
            Vsm.El('Vsm__UserSearch').value = '';
            Users.Render();
            var first = document.querySelector('#Vsm__UserTable tr[data-user="' + (Vsm__Draft.length - 1) + '"] [data-f="ValeUser__Name__First"]');
            if (first) { first.focus(); first.scrollIntoView({ block: 'nearest' }); }
        });
        Vsm.El('Vsm__BtnUserSave').addEventListener('click', function() { Users.Save(); });
        Vsm.El('Vsm__BtnUserRevert').addEventListener('click', function() { Vsm__Dirty = false; Users.Load(); });
        Vsm.El('Vsm__UserSearch').addEventListener('input', Vsm__ApplyFilter);
        Vsm.El('Vsm__UserShowInactive').addEventListener('change', Vsm__ApplyFilter);
    };

    Users.Show = function() { if (!Vsm__Dirty) Users.Load(); };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

})();
