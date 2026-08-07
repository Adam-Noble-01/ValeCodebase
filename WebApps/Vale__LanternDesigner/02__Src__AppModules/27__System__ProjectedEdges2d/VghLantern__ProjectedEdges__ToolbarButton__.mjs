/* =============================================================================
   VGHLANTERN - PROJECTED EDGES | TOOLBAR BUTTON
   =============================================================================

   FILE       : VghLantern__ProjectedEdges__ToolbarButton__.mjs
   NAMESPACE  : VghLantern
   MODULE     : ProjectedEdges - ToolbarButton
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The control that starts a render and then shows or hides it
   CREATED    : 06-Aug-2026

   DESCRIPTION:
   - Injects a render button into every toolbar listed in config, from the outside.
     Neither the Lantern Editor nor the Drawing Editor carries any knowledge of this
     feature, and neither needs a config key for it.
   - Both hosts rebuild their toolbars wholesale from innerHTML, so each button is
     re-injected by a MutationObserver rather than placed once. The observer only
     acts when its button is MISSING, which is what keeps it from re-triggering on
     its own insertion.

   ---------------------------------------------------------------------------

   WHERE THE BUTTONS GO, AND WHY THEY DO NOT LOOK ALIKE

       Lantern Editor    The floating viewport cluster beside Split 2D and Fit.
                         This is where a configuration is being worked on, so the
                         linework is wanted while the form is still moving.

       Drawing Editor    Immediately left of Download PDF, on the right hand end of
                         the row beside the other whole-sheet action.

   Each button adopts its HOST'S button classes rather than importing this module's
   styling into someone else's panel. The viewport cluster is a small white pill on
   a floating card; the sheet toolbar is a full-size control next to a solid brand
   button. A single appearance would be wrong in one of the two places, so the
   classes are named per target in config and the labels are shortened for the
   cluster, which sits over the drawing.

   ---------------------------------------------------------------------------

   THE THREE STATES, AND WHY THIS IS NOT A PLAIN TOGGLE

   A toggle implies the thing behind it is cheap. This one is not - several seconds
   per view across every view on screen - so the control has to be honest about
   which press costs something and which does not:

       RENDER    No result for the lantern on screen. Pressing it projects, and
                 that is the press that costs. Also the state a lantern edit
                 returns the button to, because the previous result no longer
                 describes what is drawn.

       HIDE      Rendered and on screen. Pressing it hides the layer instantly and
                 keeps the result.

       SHOW      Rendered and hidden. Pressing it brings the same result straight
                 back with no work at all.

   ============================================================================= */

import {
    VghLantern__ProjectedEdges__ConfigAccess__Section
} from './VghLantern__ProjectedEdges__ConfigAccess__.mjs';

import {
    VghLantern__ProjectedEdges__Pipeline__RenderAll,
    VghLantern__ProjectedEdges__Pipeline__Show,
    VghLantern__ProjectedEdges__Pipeline__Hide,
    VghLantern__ProjectedEdges__Pipeline__Status
} from './VghLantern__ProjectedEdges__Pipeline__.mjs';

import {
    VghLantern__ProjectedEdges__ProgressOverlay__Open,
    VghLantern__ProjectedEdges__ProgressOverlay__Update,
    VghLantern__ProjectedEdges__ProgressOverlay__Close
} from './VghLantern__ProjectedEdges__ProgressOverlay__.mjs';

// =============================================================================
// REGION | Projected Edges Toolbar Button Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Button Identity and States
    // ------------------------------------------------------------
    const BUTTON_ID_PREFIX    =  'VghLantern__ProjectedEdges__RenderButton__';
    const BUTTON_MARKER_CLASS =  'VghLantern__ProjectedEdges__RenderButton';   // <-- Finds every injected button whatever host classes it wears
    const BUSY_CLASS          =  'VghLantern__ProjectedEdges__ToolButton--working';

    const STATE_RENDER        =  'render';
    const STATE_HIDE          =  'hide';
    const STATE_SHOW          =  'show';
    const STATE_WORKING       =  'working';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Where the Button Goes, By Default
    // ------------------------------------------------------------
    // These are DEFAULTS, not the only option: a Targets array in config replaces
    // this list wholesale. It lives in code because a toolbar button that vanishes
    // completely when one JSON key is missing is a worse failure than one that
    // cannot be repositioned - the control is how the feature is reached at all, so
    // its presence must not depend on config being complete.
    //
    // ObserveSelector must name an element that outlives its own contents. Both
    // hosts here are static elements of the application shell that rebuild their
    // toolbars from innerHTML, which is exactly why the button is re-injected on
    // mutation rather than placed once.
    //
    // ButtonClass and ActiveClass name the HOST's own button classes, so the control
    // looks native to the strip it lands in rather than importing this module's
    // styling into someone else's panel.
    const DEFAULT_TARGETS  =  [
        {
            // The floating viewport cluster, beside Split 2D and Fit. This is where
            // a lantern is configured, so the linework is wanted while the form is
            // still moving. Labels are shortened: the cluster sits over the drawing.
            Name            : 'LanternEditor',
            ObserveSelector : '#VghLantern__LanternEditor__PreviewPanel',
            RowSelector     : '.VghLantern__Editor__ViewportToolbar',
            InsertBefore    : null,
            SpacerClass     : null,
            ButtonClass     : 'VghLantern__Editor__ViewportToolBtn',
            ActiveClass     : 'VghLantern__Editor__ViewportToolBtn--active',
            LabelRender     : 'Render Lines',
            LabelHide       : 'Hide Lines',
            LabelShow       : 'Show Lines',
            LabelWorking    : 'Rendering'
        },
        {
            // Immediately left of Download PDF, on the right hand end of the row
            // beside the other whole-sheet action.
            Name            : 'DrawingEditor',
            ObserveSelector : '#VghLantern__DrawingEditor__Toolbar',
            RowSelector     : '.VghLantern__DrawingEditor__ToolbarRow',
            InsertBefore    : '#VghLantern__DrawingEditor__DownloadPdfButton',
            SpacerClass     : 'VghLantern__DrawingEditor__ToolSpacer',
            ButtonClass     : 'VghLantern__DrawingEditor__ToolButton VghLantern__ProjectedEdges__ToolButton',
            ActiveClass     : 'VghLantern__ProjectedEdges__ToolButton--shown'
        }
    ];
    // ------------------------------------------------------------


    // MODULE VARIABLES | One Observer Per Target
    // ------------------------------------------------------------
    const VghLantern__ProjectedEdges__ToolbarButton__Observers  =  new Map();  // <-- target name to MutationObserver
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Reads
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Injection Targets, Config Overriding the Defaults
    // ------------------------------------------------------------
    // A Targets array in config replaces the built-in list; anything else - absent,
    // not an array, or empty - falls back to it. An empty array is treated as "not
    // configured" rather than as "place no buttons", because ShowButton already
    // exists to switch the control off and a stray empty array should not silently
    // remove the only way into the feature.
    function VghLantern__ProjectedEdges__ToolbarButton__Targets() {
        const targets  =  VghLantern__ProjectedEdges__ConfigAccess__Section('Toolbar').Targets;
        return (Array.isArray(targets) && targets.length > 0) ? targets : DEFAULT_TARGETS;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Label or Title, Preferring the Target's Own Wording
    // ------------------------------------------------------------
    // Falls back to the section default, so a target only names the strings it wants
    // different. The viewport cluster overrides its labels because it sits over the
    // drawing and cannot afford a full sentence.
    function VghLantern__ProjectedEdges__ToolbarButton__Word(target, fieldName, fallback) {
        const toolbar  =  VghLantern__ProjectedEdges__ConfigAccess__Section('Toolbar');

        if (target && typeof target[fieldName] === 'string') return target[fieldName];
        if (typeof toolbar[fieldName] === 'string')          return toolbar[fieldName];
        return fallback;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Button State
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Decide Which of the Three States the Control Is In
    // ------------------------------------------------------------
    // Shared by every button, because they all drive one pipeline. Two buttons in
    // two modes can never disagree about whether the linework has been rendered.
    function VghLantern__ProjectedEdges__ToolbarButton__ResolveState() {
        const status  =  VghLantern__ProjectedEdges__Pipeline__Status();

        if (status.IsWorking) return STATE_WORKING;

        // Every covered view has a result for the lantern currently drawn. Anything
        // less - including a lantern edit that has invalidated one view - offers a
        // render rather than pretending a partial result is the drawing.
        const isComplete  =  status.Total > 0 && status.Rendered === status.Total;

        if (!isComplete) return STATE_RENDER;
        return status.IsShown ? STATE_HIDE : STATE_SHOW;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Write the Current State Onto One Button
    // ------------------------------------------------------------
    // aria-pressed is set because in two of its three states this is a toggle, and a
    // button that changes only in colour is otherwise silent to a screen reader.
    function VghLantern__ProjectedEdges__ToolbarButton__ApplyState(button) {
        const target  =  button.__VghLantern__ProjectedEdges__Target || null;
        const status  =  VghLantern__ProjectedEdges__Pipeline__Status();
        const state   =  VghLantern__ProjectedEdges__ToolbarButton__ResolveState();
        const word    =  function(field, fallback) {
            return VghLantern__ProjectedEdges__ToolbarButton__Word(target, field, fallback);
        };

        let label;
        let title;

        if (state === STATE_WORKING) {
            label  =  word('LabelWorking', 'Rendering...');
            title  =  label;
        } else if (state === STATE_HIDE) {
            label  =  word('LabelHide', 'Hide 3D Linework');
            title  =  word('TitleHide', '');
        } else if (state === STATE_SHOW) {
            label  =  word('LabelShow', 'Show 3D Linework');
            title  =  word('TitleShow', '');
        } else {
            label  =  word('LabelRender', 'Render 3D Linework');
            title  =  status.IsStale ? word('TitleStale', '') : word('TitleRender', '');
        }

        button.textContent  =  label;
        button.setAttribute('title', title);
        button.setAttribute('data-vgh-state', state);
        button.disabled  =  (state === STATE_WORKING) || status.Total === 0;

        // The active class belongs to the HOST's design system, not to this module.
        const activeClass  =  (target && target.ActiveClass) ? target.ActiveClass : '';
        if (activeClass) {
            activeClass.split(/\s+/).filter(Boolean).forEach(function(cssClass) {
                button.classList.toggle(cssClass, state === STATE_HIDE);
            });
        }

        button.classList.toggle(BUSY_CLASS, state === STATE_WORKING);
        button.setAttribute('aria-pressed', state === STATE_HIDE ? 'true' : 'false');
    }
    // ------------------------------------------------------------


    // FUNCTION | Re-Read the Pipeline and Update Every Injected Button
    // ------------------------------------------------------------
    // Exported so a 2D render can refresh the wording. Editing a dimension
    // invalidates the result, and the buttons have to stop offering to hide linework
    // that has just cleared itself off the drawing.
    export function VghLantern__ProjectedEdges__ToolbarButton__Sync() {
        const buttons  =  document.querySelectorAll('.' + BUTTON_MARKER_CLASS);
        for (let i = 0; i < buttons.length; i++) {
            VghLantern__ProjectedEdges__ToolbarButton__ApplyState(buttons[i]);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Actions
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Run a Render With the Progress Overlay Attached
    // ------------------------------------------------------------
    // Every button is synced rather than just the one pressed, because both modes
    // can be mounted at once and they share one result.
    async function VghLantern__ProjectedEdges__ToolbarButton__Render() {
        VghLantern__ProjectedEdges__ProgressOverlay__Open();
        VghLantern__ProjectedEdges__ToolbarButton__Sync();

        let failed  =  false;
        try {
            await VghLantern__ProjectedEdges__Pipeline__RenderAll(function(progress) {
                VghLantern__ProjectedEdges__ProgressOverlay__Update(progress);
            });
        } catch (renderError) {
            failed  =  true;
            console.error('[VghLantern ProjectedEdges] Render failed:', renderError);
        }

        VghLantern__ProjectedEdges__ProgressOverlay__Close({ IsError : failed });
        VghLantern__ProjectedEdges__ToolbarButton__Sync();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Handle a Press According to the State the Control Is In
    // ------------------------------------------------------------
    function VghLantern__ProjectedEdges__ToolbarButton__OnPress() {
        const state  =  VghLantern__ProjectedEdges__ToolbarButton__ResolveState();

        if (state === STATE_WORKING) return;

        if (state === STATE_HIDE) {
            VghLantern__ProjectedEdges__Pipeline__Hide();
            VghLantern__ProjectedEdges__ToolbarButton__Sync();
            return;
        }

        if (state === STATE_SHOW) {
            VghLantern__ProjectedEdges__Pipeline__Show();
            VghLantern__ProjectedEdges__ToolbarButton__Sync();
            return;
        }

        void VghLantern__ProjectedEdges__ToolbarButton__Render();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Injection
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build a Button Wearing One Target's Host Classes
    // ------------------------------------------------------------
    // The target is parked on the element rather than closed over, so ApplyState can
    // recover a button's wording and active class from the button alone - which is
    // what lets Sync update every button in the document in one sweep.
    function VghLantern__ProjectedEdges__ToolbarButton__Build(target) {
        const button  =  document.createElement('button');

        button.type       =  'button';
        button.id         =  BUTTON_ID_PREFIX + target.Name;
        button.className  =  (target.ButtonClass || '') + ' ' + BUTTON_MARKER_CLASS;

        button.__VghLantern__ProjectedEdges__Target  =  target;

        button.addEventListener('click', function(clickEvent) {
            clickEvent.preventDefault();
            clickEvent.stopPropagation();                                     // <-- The viewport cluster sits over a pannable surface
            VghLantern__ProjectedEdges__ToolbarButton__OnPress();
        });

        VghLantern__ProjectedEdges__ToolbarButton__ApplyState(button);
        return button;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Place a Button Into a Freshly Built Toolbar Row
    // ------------------------------------------------------------
    // InsertBefore names a reference element inside the row, so the button lands in
    // a chosen position rather than always at the end. Where a target declares a
    // spacer class and the row has none, one is added first - that is the case where
    // the host's own right-hand control has been switched off and the button would
    // otherwise drift left into the setup controls.
    function VghLantern__ProjectedEdges__ToolbarButton__Place(target, row, button) {
        const reference  =  target.InsertBefore ? row.querySelector(target.InsertBefore) : null;

        if (reference) {
            row.insertBefore(button, reference);
            return;
        }

        if (target.SpacerClass && !row.querySelector('.' + target.SpacerClass)) {
            const spacer      =  document.createElement('div');
            spacer.className  =  target.SpacerClass;
            row.appendChild(spacer);
        }

        row.appendChild(button);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Ensure One Target Carries Its Button
    // ------------------------------------------------------------
    // Returns without touching the DOM whenever the button is already there, which
    // is what stops the observer that calls it from reacting to its own work.
    function VghLantern__ProjectedEdges__ToolbarButton__EnsureOne(target) {
        if (!target || !target.ObserveSelector || !target.RowSelector) return;

        const host  =  document.querySelector(target.ObserveSelector);
        if (!host) return;

        const existing  =  host.querySelector('#' + BUTTON_ID_PREFIX + target.Name);

        if (VghLantern__ProjectedEdges__ConfigAccess__Section('Toolbar').ShowButton !== true) {
            if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
            return;
        }

        if (existing) return;

        const row  =  host.querySelector(target.RowSelector);
        if (!row) return;                                                     // <-- Toolbar not rendered yet, or the mode is not open

        VghLantern__ProjectedEdges__ToolbarButton__Place(
            target, row, VghLantern__ProjectedEdges__ToolbarButton__Build(target)
        );
    }
    // ------------------------------------------------------------


    // FUNCTION | Ensure Every Configured Toolbar Carries Its Button
    // ------------------------------------------------------------
    export function VghLantern__ProjectedEdges__ToolbarButton__Ensure() {
        VghLantern__ProjectedEdges__ToolbarButton__Targets()
            .forEach(VghLantern__ProjectedEdges__ToolbarButton__EnsureOne);
    }
    // ------------------------------------------------------------


    // FUNCTION | Watch Every Target Host and Re-Inject Whenever It Is Rebuilt
    // ------------------------------------------------------------
    // One observer per target. Both hosts are static elements in the application
    // shell that outlive their own contents, so the observers are attached once and
    // never need rebinding as modes come and go.
    export function VghLantern__ProjectedEdges__ToolbarButton__Attach() {
        VghLantern__ProjectedEdges__ToolbarButton__Targets().forEach(function(target) {
            if (!target || !target.Name) return;
            if (VghLantern__ProjectedEdges__ToolbarButton__Observers.has(target.Name)) return;

            const host  =  document.querySelector(target.ObserveSelector);
            if (!host) {
                console.warn('[VghLantern ProjectedEdges] Toolbar host "' + target.ObserveSelector +
                             '" not found; no render button for ' + target.Name + '.');
                return;
            }

            const observer  =  new MutationObserver(function() {
                VghLantern__ProjectedEdges__ToolbarButton__EnsureOne(target);
            });
            observer.observe(host, { childList : true, subtree : true });

            VghLantern__ProjectedEdges__ToolbarButton__Observers.set(target.Name, observer);
        });

        VghLantern__ProjectedEdges__ToolbarButton__Ensure();                  // <-- A toolbar may already be rendered
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
