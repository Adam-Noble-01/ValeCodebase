// =============================================================================
// VALEVISION AURA - APP UTILS - PANELS
// =============================================================================
//
// FILE       : Na__AppUtils__Panels__.js
// NAMESPACE  : Na__Panels
// MODULE     : App Utils - Panels
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The side panels' folding sections, and the grips that resize the
//              panels: ValeVision 3D's Layout Editor's, in AURA's look
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - A SECTION is a header (its title, a little count, a chevron) over a body.
//   A click on the header folds it or opens it; the state is kept in this
//   browser per section id, so a panel opens as it was left.
// - A GRIP on a panel's inner edge drags the panel wider or narrower (the
//   Layout Editor's 6 px grip: the pointer captured, nothing on the page
//   selected while it drags). The width is a CSS custom property on the tab
//   (each tab its own), clamped and kept in this browser. With the grip
//   focused the arrow keys move it (Shift: further), Home puts it back, as
//   does a double-click.
// - Browser storage is only a convenience: a private window just forgets.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0 (AURA 0.3.0)
// - Initial build: the 3D Environment's panel and the sheets' two panels.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__Dom__El, Na__Dom__Icon } from './Na__AppUtils__Dom__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__Panels__STORE_PREFIX = 'ValeVisionAura__Panels:';
    const Na__Panels__KEY_STEP_PX  = 16;                                       // <-- An arrow key's nudge; Shift moves four times as far

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Kept in This Browser
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read and Write One Remembered Value
    // ------------------------------------------------------------
    function Na__Panels__Recall(key, fallback) {
        try {
            const value = window.localStorage.getItem(Na__Panels__STORE_PREFIX + key);
            return value === null ? fallback : value;
        } catch (error) { return fallback; }
    }

    function Na__Panels__Remember(key, value) {
        try { window.localStorage.setItem(Na__Panels__STORE_PREFIX + key, String(value)); }
        catch (error) { /* private window: the panels are not remembered */ }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Folding Sections
// -----------------------------------------------------------------------------

    // FUNCTION | A Folding Section: { root, head, body, meta, IsOpen(), SetOpen(open) }
    // ------------------------------------------------------------
    // spec: { id, title, open (true unless false: the first time only), className,
    // onToggle(open) }. The body is built by the caller; meta is a little count
    // or status beside the title ("3 points").
    // ------------------------------------------------------------
    function Na__Panels__Section(parent, spec) {
        const open = Na__Panels__Recall(`fold-${spec.id}`, spec.open === false ? '0' : '1') === '1';
        const bodyId = `aura-section-${spec.id}`;
        const root = Na__Dom__El('section', `aura-section${spec.className ? ' ' + spec.className : ''}${open ? '' : ' is-folded'}`, null, { dataset: { section: spec.id } });
        const head = Na__Dom__El('button', 'aura-section__head', null, { type: 'button', 'aria-expanded': String(open), 'aria-controls': bodyId });
        head.appendChild(Na__Dom__El('span', 'aura-section__title', spec.title));
        const meta = Na__Dom__El('span', 'aura-section__meta');
        head.appendChild(meta);
        head.appendChild(Na__Dom__Icon('down', 'aura-section__chevron'));
        const body = Na__Dom__El('div', 'aura-section__body', null, { id: bodyId });
        root.appendChild(head);
        root.appendChild(body);
        if (parent) parent.appendChild(root);

        const api = {
            root, head, body, meta,
            IsOpen: () => !root.classList.contains('is-folded'),
            SetOpen: (next) => {
                const now = !!next;
                if (api.IsOpen() === now) return;
                root.classList.toggle('is-folded', !now);
                head.setAttribute('aria-expanded', String(now));
                Na__Panels__Remember(`fold-${spec.id}`, now ? '1' : '0');
                if (typeof spec.onToggle === 'function') spec.onToggle(now);
            }
        };
        head.addEventListener('click', () => api.SetOpen(!api.IsOpen()));
        return api;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Resizable Panels
// -----------------------------------------------------------------------------

    // FUNCTION | A Grip That Resizes a Panel: { Set(px), Width() }
    // ------------------------------------------------------------
    // spec: { grip, panel, host, cssVar, side ('left': the grip on the panel's
    // right edge; 'right': on its left), id, label, min, max, initial,
    // onResize(px) }. The width is written to host's cssVar, which the tab's
    // grid reads.
    // ------------------------------------------------------------
    function Na__Panels__Resizable(spec) {
        const grip = spec.grip;
        const sign = spec.side === 'left' ? 1 : -1;                             // <-- Dragging right widens a left panel, narrows a right one
        let current = spec.initial;

        const set = (px, remember) => {
            current = Math.round(Math.min(spec.max, Math.max(spec.min, Number(px) || spec.initial)));
            spec.host.style.setProperty(spec.cssVar, `${current}px`);
            grip.setAttribute('aria-valuenow', String(current));
            if (remember !== false) Na__Panels__Remember(`width-${spec.id}`, current);
            if (typeof spec.onResize === 'function') spec.onResize(current);
            return current;
        };

        grip.setAttribute('role', 'separator');
        grip.setAttribute('aria-orientation', 'vertical');
        grip.setAttribute('aria-label', `Resize the ${spec.label || 'side'} panel`);
        grip.setAttribute('aria-valuemin', String(spec.min));
        grip.setAttribute('aria-valuemax', String(spec.max));
        grip.setAttribute('tabindex', '0');
        grip.title = 'Drag to resize. Double-click puts it back.';

        let drag = null;
        grip.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            drag = { pointerId: e.pointerId, x: e.clientX, width: spec.panel.getBoundingClientRect().width };
            try { grip.setPointerCapture(e.pointerId); } catch (error) { /* a synthetic pointer */ }
            document.body.classList.add('aura-is-resizing');
            e.preventDefault();
        });
        grip.addEventListener('pointermove', (e) => {
            if (!drag || e.pointerId !== drag.pointerId) return;
            set(drag.width + sign * (e.clientX - drag.x), false);
        });
        const end = (e) => {
            if (!drag || e.pointerId !== drag.pointerId) return;
            try { grip.releasePointerCapture(e.pointerId); } catch (error) { /* already released */ }
            drag = null;
            document.body.classList.remove('aura-is-resizing');
            Na__Panels__Remember(`width-${spec.id}`, current);
        };
        grip.addEventListener('pointerup', end);
        grip.addEventListener('pointercancel', end);
        grip.addEventListener('dblclick', () => set(spec.initial));
        grip.addEventListener('keydown', (e) => {
            const step = Na__Panels__KEY_STEP_PX * (e.shiftKey ? 4 : 1);
            if (e.key === 'ArrowLeft') set(current - sign * step);
            else if (e.key === 'ArrowRight') set(current + sign * step);
            else if (e.key === 'Home') set(spec.initial);
            else return;
            e.preventDefault();
            e.stopPropagation();                                               // <-- The arrows are the grip's here, never the camera's or the sheet's
        });

        set(parseFloat(Na__Panels__Recall(`width-${spec.id}`, String(spec.initial))), false);
        return { Set: set, Width: () => current };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Panels__Section,
        Na__Panels__Resizable
    };

// endregion -------------------------------------------------------------------
