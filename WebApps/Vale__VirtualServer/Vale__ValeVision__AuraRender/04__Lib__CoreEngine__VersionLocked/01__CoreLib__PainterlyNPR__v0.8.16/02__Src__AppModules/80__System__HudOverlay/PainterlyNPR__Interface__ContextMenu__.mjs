/* =============================================================================
   PAINTERLYNPR - INTERFACE | CONTEXT MENU
   =============================================================================

   FILE       : PainterlyNPR__Interface__ContextMenu__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Interface - ContextMenu
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The app's own right-click menu, in place of the browser's: opened
                over whatever was right-clicked, with submenus, the keyboard and
                the shortcuts shown
   CREATED    : 30-Oct-2026 (v0.7.0)

   DESCRIPTION:
   - Adam, 30-Oct-2026: "build a custom context menu and disable the standard
     browser right click menu".
   - The browser's menu is cancelled everywhere but in text fields, which keep
     it for copy and paste. What the menu holds is asked of the providers
     registered (83__Hud__SceneEditing's, for the sheet and the drawer): the
     first to answer for what was right-clicked is shown.
   - The right button pans the sheet (74), so a right press that moved was a
     pan and opens nothing. Windows sends the menu event after the release,
     other systems on the press: then the menu waits for the release.
   - An item: { Label, Hint, Action, Disabled, Danger, Swatch, Checked, Submenu }
     or { Separator: true } or { Heading: 'words' }. Action runs after the menu
     has closed.
   - A WRAPPER'S SCOPE (v0.8.10): Wire({ Scope }) keeps the menu to the
     wrapper's places for the engine (ValeVision AURA: its 3D Environment's
     drawing and the Assets drawer). Outside them the browser's menu, and the
     wrapper's own menus, are left alone. The app wires no scope: the whole page.

   ============================================================================= */

import MenuConfig from './Na__Interface__ContextMenu__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';

// =============================================================================
// REGION | Interface - Context Menu
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__Interface__ContextMenu__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const MENU  =  PainterlyNPR__ConfigAccess__Section(MenuConfig, 'PainterlyNPR__ContextMenu__Config', 'Menu', ['SlopPx', 'MouseWindowMs', 'EdgePx', 'MaxHeightPx', 'SubmenuDelayMs']);
    // ------------------------------------------------------------


    // MODULE STATE | The Menus Open, the Right Press, the Providers
    // ------------------------------------------------------------
    // Levels: the open menus, the top one first. Press: the right button's last
    // press - whether it is down, how far it has moved, when it came up, and a
    // menu waiting for its release. Scope: where the menu is the engine's (null:
    // the whole page). Wired: the page's listeners are added once.
    const Menu  =  { Levels: [], Providers: [], Timer: 0, Scope: null, Wired: false, Press: { Down: false, X: 0, Y: 0, Moved: 0, UpAt: 0, Pending: null } };
    const TEXT_FIELD  =  'input:not([type=button]):not([type=checkbox]):not([type=radio]):not([type=range]), textarea, [contenteditable=""], [contenteditable="true"]';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Building a Menu
// -----------------------------------------------------------------------------

    // FUNCTION | One Menu's Element - its title, items, rules and headings
    // ------------------------------------------------------------
    function PainterlyNPR__ContextMenu__Build(items, title, level) {
        const el  =  document.createElement('div');
        el.className  =  'PainterlyNPR__ContextMenu' + (level ? ' PainterlyNPR__ContextMenu--sub' : '');
        el.setAttribute('role', 'menu');
        el.tabIndex  =  -1;
        el.style.maxHeight  =  Math.min(MENU.MaxHeightPx, window.innerHeight - 2 * MENU.EdgePx) + 'px';
        if (title) {
            const head  =  document.createElement('div');
            head.className  =  'PainterlyNPR__ContextMenu__Title';
            head.textContent  =  title;
            el.appendChild(head);
        }
        items.forEach((item, index) => {
            if (!item) return;
            if (item.Separator) {
                const rule  =  document.createElement('div');
                rule.className  =  'PainterlyNPR__ContextMenu__Rule';
                rule.setAttribute('role', 'separator');
                el.appendChild(rule);
                return;
            }
            if (item.Heading) {
                const heading  =  document.createElement('div');
                heading.className  =  'PainterlyNPR__ContextMenu__Heading';
                heading.textContent  =  item.Heading;
                el.appendChild(heading);
                return;
            }
            const b  =  document.createElement('button');
            b.type  =  'button';
            b.className  =  'PainterlyNPR__ContextMenu__Item' + (item.Danger ? ' PainterlyNPR__ContextMenu__Item--danger' : '');
            b.setAttribute('role', 'menuitem');
            b.dataset.menuIndex  =  String(index);
            b.disabled  =  !!item.Disabled;
            if (item.Submenu) b.setAttribute('aria-haspopup', 'menu');
            if (item.Checked != null) { b.setAttribute('role', 'menuitemcheckbox'); b.setAttribute('aria-checked', String(!!item.Checked)); }
            const mark  =  document.createElement('span');
            mark.className  =  'PainterlyNPR__ContextMenu__Mark';
            if (item.Swatch) { mark.classList.add('PainterlyNPR__ContextMenu__Mark--swatch'); mark.style.background = item.Swatch; }
            else if (item.Checked) mark.textContent = '✓';
            const label  =  document.createElement('span');
            label.className  =  'PainterlyNPR__ContextMenu__Label';
            label.textContent  =  item.Label;
            const hint  =  document.createElement('span');
            hint.className  =  'PainterlyNPR__ContextMenu__Hint';
            hint.textContent  =  item.Submenu ? '▸' : (item.Hint || '');
            b.append(mark, label, hint);
            if (item.Title) b.title = item.Title;
            el.appendChild(b);
        });
        return el;
    }
    // ------------------------------------------------------------


    // FUNCTION | Place a Menu - by the pointer, or beside its parent item, inside the window
    // ------------------------------------------------------------
    function PainterlyNPR__ContextMenu__Place(el, x, y, beside) {
        el.style.left  =  '0px';
        el.style.top   =  '0px';
        const r   =  el.getBoundingClientRect();
        const W   =  window.innerWidth, H = window.innerHeight, edge = MENU.EdgePx;
        let left  =  x, top = y;
        if (beside) {
            left  =  beside.right - 2;
            top   =  beside.top - 4;
            if (left + r.width > W - edge) left = beside.left - r.width + 2;   // <-- No room on the right: the submenu opens to the left
        } else if (left + r.width > W - edge) left = x - r.width;
        if (top + r.height > H - edge) top = beside ? H - edge - r.height : y - r.height;
        el.style.left  =  Math.max(edge, Math.round(left)) + 'px';
        el.style.top   =  Math.max(edge, Math.round(top)) + 'px';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Opening and Closing
// -----------------------------------------------------------------------------

    // FUNCTION | Open a Menu at a Point - closing any that was open
    // ------------------------------------------------------------
    function PainterlyNPR__ContextMenu__Open(items, x, y, title) {
        PainterlyNPR__ContextMenu__Close();
        if (!items || !items.filter(Boolean).length) return;
        PainterlyNPR__ContextMenu__OpenLevel(items, x, y, title, null);
        const first  =  Menu.Levels[0].El.querySelector('.PainterlyNPR__ContextMenu__Item:not(:disabled)');
        Menu.Levels[0].El.focus({ preventScroll: true });
        if (first) first.classList.add('PainterlyNPR__ContextMenu__Item--hot');
    }

    function PainterlyNPR__ContextMenu__OpenLevel(items, x, y, title, beside) {
        const level  =  Menu.Levels.length;
        const el     =  PainterlyNPR__ContextMenu__Build(items, title, level);
        document.body.appendChild(el);
        PainterlyNPR__ContextMenu__Place(el, x, y, beside);
        Menu.Levels.push({ El: el, Items: items, Open: null });
        el.addEventListener('pointerover', (e) => {
            const b  =  e.target.closest('.PainterlyNPR__ContextMenu__Item');
            if (!b) return;
            PainterlyNPR__ContextMenu__Hot(level, b);
            clearTimeout(Menu.Timer);
            Menu.Timer  =  setTimeout(() => PainterlyNPR__ContextMenu__Sub(level, b), MENU.SubmenuDelayMs);
        });
        el.addEventListener('click', (e) => {
            const b  =  e.target.closest('.PainterlyNPR__ContextMenu__Item');
            if (b && !b.disabled) PainterlyNPR__ContextMenu__Choose(level, b);
        });
        el.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    // ------------------------------------------------------------


    // FUNCTION | Close Every Menu, or Those Below a Level
    // ------------------------------------------------------------
    function PainterlyNPR__ContextMenu__Close(fromLevel) {
        const from  =  fromLevel || 0;
        clearTimeout(Menu.Timer);
        while (Menu.Levels.length > from) Menu.Levels.pop().El.remove();
        if (Menu.Levels[from - 1]) Menu.Levels[from - 1].Open = null;
    }

    function PainterlyNPR__ContextMenu__IsOpen() {
        return Menu.Levels.length > 0;
    }
    // ------------------------------------------------------------


    // FUNCTION | An Item Lit, Its Submenu Opened, an Item Chosen
    // ------------------------------------------------------------
    function PainterlyNPR__ContextMenu__Hot(level, b) {
        for (const other of Menu.Levels[level].El.querySelectorAll('.PainterlyNPR__ContextMenu__Item--hot')) other.classList.remove('PainterlyNPR__ContextMenu__Item--hot');
        if (b) { b.classList.add('PainterlyNPR__ContextMenu__Item--hot'); b.scrollIntoView({ block: 'nearest' }); }
    }

    function PainterlyNPR__ContextMenu__Sub(level, b) {
        const item  =  Menu.Levels[level] && Menu.Levels[level].Items[Number(b.dataset.menuIndex)];
        if (!item) return;
        if (Menu.Levels[level].Open === b) return;
        PainterlyNPR__ContextMenu__Close(level + 1);
        if (!item.Submenu || b.disabled) return;
        Menu.Levels[level].Open  =  b;
        PainterlyNPR__ContextMenu__OpenLevel(item.Submenu, 0, 0, null, b.getBoundingClientRect());
    }

    function PainterlyNPR__ContextMenu__Choose(level, b) {
        const item  =  Menu.Levels[level].Items[Number(b.dataset.menuIndex)];
        if (!item) return;
        if (item.Submenu) {
            PainterlyNPR__ContextMenu__Sub(level, b);
            const sub  =  Menu.Levels[level + 1];
            if (sub) { const first = sub.El.querySelector('.PainterlyNPR__ContextMenu__Item:not(:disabled)'); PainterlyNPR__ContextMenu__Hot(level + 1, first); sub.El.focus({ preventScroll: true }); }
            return;
        }
        PainterlyNPR__ContextMenu__Close();
        if (item.Action) item.Action();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Keyboard
// -----------------------------------------------------------------------------

    // FUNCTION | Arrows Move, Right and Enter Open, Left and Escape Close
    // ------------------------------------------------------------
    function PainterlyNPR__ContextMenu__Key(e) {
        if (!Menu.Levels.length) return;
        const level  =  Menu.Levels.length - 1;
        const el     =  Menu.Levels[level].El;
        const items  =  [...el.querySelectorAll('.PainterlyNPR__ContextMenu__Item:not(:disabled)')];
        const hot    =  el.querySelector('.PainterlyNPR__ContextMenu__Item--hot');
        const at     =  items.indexOf(hot);
        const go     =  (i) => { if (items.length) PainterlyNPR__ContextMenu__Hot(level, items[(i + items.length) % items.length]); };
        const keys   =  {
            ArrowDown   :  () => go(at + 1),
            ArrowUp     :  () => go(at < 0 ? items.length - 1 : at - 1),
            Home        :  () => go(0),
            End         :  () => go(items.length - 1),
            ArrowRight  :  () => { if (hot && hot.getAttribute('aria-haspopup')) PainterlyNPR__ContextMenu__Choose(level, hot); },
            ArrowLeft   :  () => { if (level > 0) { PainterlyNPR__ContextMenu__Close(level); Menu.Levels[level - 1].El.focus({ preventScroll: true }); } },
            Enter       :  () => { if (hot) PainterlyNPR__ContextMenu__Choose(level, hot); },
            ' '         :  () => { if (hot) PainterlyNPR__ContextMenu__Choose(level, hot); },
            Escape      :  () => PainterlyNPR__ContextMenu__Close(),
            Tab         :  () => PainterlyNPR__ContextMenu__Close(),
        };
        const run  =  keys[e.key];
        if (!run) return;
        e.preventDefault();
        e.stopImmediatePropagation();                                         // <-- The menu's keys are the menu's: Escape closes it and clears nothing else
        run();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Wiring - the browser's menu cancelled, the app's opened
// -----------------------------------------------------------------------------

    // FUNCTION | Register a Provider - (event) => { Title, Items } or null
    // ------------------------------------------------------------
    function PainterlyNPR__ContextMenu__Register(provider) {
        Menu.Providers.push(provider);
    }
    // ------------------------------------------------------------


    // FUNCTION | Is a Target Where the Menu Is the Engine's? - the scope a wrapper gave, or the whole page
    // ------------------------------------------------------------
    // scope: an element, a list of them, or a function (target) => boolean.
    function PainterlyNPR__ContextMenu__InScope(target) {
        const scope  =  Menu.Scope;
        if (!scope) return true;
        if (typeof scope === 'function') return !!scope(target);
        return (Array.isArray(scope) ? scope : [scope]).some(el => el && el.contains && el.contains(target));
    }
    // ------------------------------------------------------------


    // FUNCTION | Wire the Page - once, at boot; options.Scope keeps it to a wrapper's places (v0.8.10)
    // ------------------------------------------------------------
    function PainterlyNPR__ContextMenu__Wire(options) {
        if (options && options.Scope) Menu.Scope = options.Scope;
        if (Menu.Wired) return;                                               // <-- Listeners once, however often it is asked
        Menu.Wired  =  true;
        const press  =  Menu.Press;
        window.addEventListener('pointerdown', (e) => {
            if (Menu.Levels.length && !e.target.closest('.PainterlyNPR__ContextMenu')) PainterlyNPR__ContextMenu__Close();
            if (e.button !== 2) return;
            Object.assign(press, { Down: true, X: e.clientX, Y: e.clientY, Moved: 0, Pending: null });
        }, true);
        window.addEventListener('pointermove', (e) => {
            if (press.Down) press.Moved = Math.max(press.Moved, Math.hypot(e.clientX - press.X, e.clientY - press.Y));
        }, true);
        window.addEventListener('pointerup', (e) => {
            if (e.button !== 2 || !press.Down) return;
            press.Down  =  false;
            press.UpAt  =  performance.now();
            const pending  =  press.Pending;
            press.Pending  =  null;
            if (pending && press.Moved < MENU.SlopPx) PainterlyNPR__ContextMenu__Open(pending.Items, pending.X, pending.Y, pending.Title);   // <-- The press's menu, now it is known to be a click
        }, true);

        window.addEventListener('contextmenu', (e) => {
            if (e.target.closest && e.target.closest(TEXT_FIELD)) return;     // <-- Text fields keep the browser's menu: copy, paste, spelling
            if (!PainterlyNPR__ContextMenu__InScope(e.target)) return;        // <-- Outside a wrapper's scope: its own menus and the browser's
            e.preventDefault();
            if (e.target.closest && e.target.closest('.PainterlyNPR__ContextMenu')) return;
            const mouse  =  press.Down || performance.now() - press.UpAt < MENU.MouseWindowMs;
            if (mouse && !press.Down && press.Moved >= MENU.SlopPx) return;    // <-- The end of a pan
            let x = e.clientX, y = e.clientY;
            if (!mouse && !x && !y && document.activeElement && document.activeElement !== document.body) {   // <-- A finger's long press has a place; the keyboard's has none
                const r  =  document.activeElement.getBoundingClientRect();     // <-- The keyboard's menu: at what has the focus
                x  =  r.left + Math.min(r.width / 2, 24);
                y  =  r.top + Math.min(r.height / 2, 16);
            }
            let found  =  null;
            for (const provider of Menu.Providers) { found = provider(e, x, y); if (found) break; }
            if (!found) { PainterlyNPR__ContextMenu__Close(); return; }
            if (press.Down) { press.Pending = { Items: found.Items, Title: found.Title, X: x, Y: y }; return; }
            PainterlyNPR__ContextMenu__Open(found.Items, x, y, found.Title);
        }, true);

        window.addEventListener('keydown', PainterlyNPR__ContextMenu__Key, true);
        window.addEventListener('blur', () => PainterlyNPR__ContextMenu__Close());
        window.addEventListener('resize', () => PainterlyNPR__ContextMenu__Close());
        window.addEventListener('wheel', (e) => { if (Menu.Levels.length && !e.target.closest('.PainterlyNPR__ContextMenu')) PainterlyNPR__ContextMenu__Close(); }, { capture: true, passive: true });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__ContextMenu__Close,
        PainterlyNPR__ContextMenu__InScope,
        PainterlyNPR__ContextMenu__IsOpen,
        PainterlyNPR__ContextMenu__Open,
        PainterlyNPR__ContextMenu__Register,
        PainterlyNPR__ContextMenu__Wire,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
