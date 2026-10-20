/* =============================================================================
   VGHLANTERN - APP CORE | INFO TOOLTIP
   =============================================================================

   FILE       : VghLantern__AppCore__InfoTooltip__.js
   NAMESPACE  : VghLantern
   MODULE     : AppCore - InfoTooltip
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The Vale info tooltip and its "i" bubble, for use anywhere in the app
   CREATED    : 20-Oct-2026

   DESCRIPTION:
   - Adam (20-Oct-2026): "Reduce as much complex and distracting text and
     complexity from the menu as possible but have all the info in quickly
     accessible places for inexperienced users or employees learning the
     system." So the explanation moves out of the panel and into a tooltip, and
     a small "i" bubble says where it is.
   - Why not the browser's own title tooltip: it runs the text in one long line
     across the screen in the system's font and grey box ("see how ugly the
     current tooltips are"). This one is a Vale panel: white, a Vale blue rule
     and title, the "i" again in its header so it reads as information, and a
     reading column held to a comfortable width (MaxWidthPx in config).
   - ANY element carrying data-vgh-tip="<tip key>" shows the tip of that key, on
     hover (after a short delay), on keyboard focus, or on a tap or click (which
     pins it until the next tap, Escape, or a scroll). IconMarkup(key, label)
     returns the "i" bubble with the attribute already on it, which is the usual
     way to add one.
   - The words live in config, one entry per key (Na__InfoTooltip__Config.json ->
     __Tips: { Title, Paragraphs }), so help text is written and corrected in one
     place and never in a module. A key with no entry shows nothing and logs once.
   - One panel for the whole app, appended to <body> on first use and positioned
     fixed against the viewport, so no scrolling container or overflow rule can
     clip it. Delegated listeners on the document, bound once from Init, so
     markup rebuilt by innerHTML (the editor panel, every render) needs nothing
     re-bound.
   - The panel ignores the pointer (pointer-events none): it is read, not used,
     and it must never sit between the pointer and the control under it.

   ============================================================================= */

// =============================================================================
// REGION | Info Tooltip Module
// =============================================================================

const VghLantern__AppCore__InfoTooltip = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Names
    // ------------------------------------------------------------
    const ROOT_ID           =  'VghLantern__InfoTip__Root';
    const ATTR_TIP          =  'data-vgh-tip';                              // <-- The tip key an anchor shows
    const CSS_ROOT          =  'VghLantern__InfoTip';
    const CSS_VISIBLE       =  'VghLantern__InfoTip--visible';
    const CSS_ABOVE         =  'VghLantern__InfoTip--above';                 // <-- Opened above its anchor, the caret at the bottom
    const CSS_HEADER        =  'VghLantern__InfoTip__Header';
    const CSS_TITLE         =  'VghLantern__InfoTip__Title';
    const CSS_BODY          =  'VghLantern__InfoTip__Body';
    const CSS_ICON          =  'VghLantern__InfoTip__Icon';                  // <-- The "i" bubble, outlined
    const CSS_ICON_SOLID    =  'VghLantern__InfoTip__Icon--solid';           // <-- The same "i", filled, in the panel header
    const CSS_ICON_ACTIVE   =  'VghLantern__InfoTip__Icon--active';          // <-- The bubble whose tip is showing
    const CONFIG_KEY        =  'VghLantern__InfoTooltip__Config';
    const CONFIG_LABEL      =  'Na__InfoTooltip__Config.json -> VghLantern__InfoTooltip__Config__Behaviour';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The "i" Bubble
    // ------------------------------------------------------------
    // Drawn on the same 20 unit circle as the editor's selected card tick, so the
    // two read as one family of small marks. The dot and the stem are separate so
    // the stylesheet can fill one and stroke the other.
    const ICON_SVG  =  '<svg viewBox="0 0 20 20" focusable="false" aria-hidden="true">'
                    +      '<circle class="VghLantern__InfoTip__IconRing" cx="10" cy="10" r="8.75"></circle>'
                    +      '<circle class="VghLantern__InfoTip__IconDot" cx="10" cy="6.1" r="1.3"></circle>'
                    +      '<path class="VghLantern__InfoTip__IconStem" d="M10 9.2 V14.4"></path>'
                    +  '</svg>';
    // ------------------------------------------------------------


    // MODULE VARIABLES | The One Panel and What It Is Showing
    // ------------------------------------------------------------
    let VghLantern__InfoTooltip__Root         =  null;                       // <-- The panel element, made on first use
    let VghLantern__InfoTooltip__Anchor       =  null;                       // <-- The element whose tip is showing, or null
    let VghLantern__InfoTooltip__IsPinned     =  false;                      // <-- Opened by a tap or click, so hover does not close it
    let VghLantern__InfoTooltip__ShowTimer    =  null;
    let VghLantern__InfoTooltip__HideTimer    =  null;
    let VghLantern__InfoTooltip__IsBound      =  false;
    let VghLantern__InfoTooltip__Warned       =  {};                         // <-- Missing keys already reported
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Escape Text for Safe Markup Insertion
    // ------------------------------------------------------------
    function VghLantern__InfoTooltip__Escape(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Tooltip Config Block
    // ------------------------------------------------------------
    function VghLantern__InfoTooltip__Config() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var merged        =  ConfigLoader ? (ConfigLoader.VghLantern__ConfigLoader__GetMergedConfig() || {}) : {};
        return merged[CONFIG_KEY] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Behaviour Numbers, Read Through Require*
    // ------------------------------------------------------------
    function VghLantern__InfoTooltip__Behaviour() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var behaviour     =  VghLantern__InfoTooltip__Config()['VghLantern__InfoTooltip__Config__Behaviour'] || {};

        function num(key) { return ConfigLoader.VghLantern__ConfigLoader__RequireNumber(behaviour, key, CONFIG_LABEL); }

        return {
            ShowDelayMs      : num('ShowDelayMs'),
            HideDelayMs      : num('HideDelayMs'),
            MaxWidthPx       : num('MaxWidthPx'),
            OffsetPx         : num('OffsetPx'),
            ViewportMarginPx : num('ViewportMarginPx')
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Tip Entry for a Key, or Null
    // ------------------------------------------------------------
    function VghLantern__InfoTooltip__Tip(tipKey) {
        var tips  =  VghLantern__InfoTooltip__Config()['VghLantern__InfoTooltip__Config__Tips'] || {};
        var tip   =  tipKey ? tips[tipKey] : null;

        if (!tip || typeof tip !== 'object') {
            if (tipKey && !VghLantern__InfoTooltip__Warned[tipKey]) {
                VghLantern__InfoTooltip__Warned[tipKey]  =  true;
                console.warn('[VghLantern__InfoTooltip] No tip for key "' + tipKey + '" in Na__InfoTooltip__Config.json.');
            }
            return null;
        }
        return tip;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Anchor an Event Belongs To, or Null
    // ------------------------------------------------------------
    function VghLantern__InfoTooltip__AnchorOf(target) {
        if (!target || !target.closest) return null;
        return target.closest('[' + ATTR_TIP + ']');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Clear Both Timers
    // ------------------------------------------------------------
    function VghLantern__InfoTooltip__ClearTimers() {
        if (VghLantern__InfoTooltip__ShowTimer) clearTimeout(VghLantern__InfoTooltip__ShowTimer);
        if (VghLantern__InfoTooltip__HideTimer) clearTimeout(VghLantern__InfoTooltip__HideTimer);
        VghLantern__InfoTooltip__ShowTimer  =  null;
        VghLantern__InfoTooltip__HideTimer  =  null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Panel
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Make the Panel on First Use
    // ------------------------------------------------------------
    function VghLantern__InfoTooltip__EnsureRoot() {
        if (VghLantern__InfoTooltip__Root && VghLantern__InfoTooltip__Root.isConnected) return VghLantern__InfoTooltip__Root;

        var root  =  document.createElement('div');
        root.id         =  ROOT_ID;
        root.className  =  CSS_ROOT;
        root.setAttribute('role', 'tooltip');
        root.setAttribute('aria-hidden', 'true');
        document.body.appendChild(root);

        VghLantern__InfoTooltip__Root  =  root;
        return root;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Write a Tip Into the Panel
    // ------------------------------------------------------------
    // The header repeats the "i", filled, so the panel says what it is before a
    // word of it is read.
    function VghLantern__InfoTooltip__Fill(root, tip) {
        var E           =  VghLantern__InfoTooltip__Escape;
        var paragraphs  =  Array.isArray(tip.Paragraphs) ? tip.Paragraphs : [];
        var html        =  '';

        html  +=  '<div class="' + CSS_HEADER + '">';
        html  +=      '<span class="' + CSS_ICON + ' ' + CSS_ICON_SOLID + '">' + ICON_SVG + '</span>';
        html  +=      '<span class="' + CSS_TITLE + '">' + E(tip.Title || '') + '</span>';
        html  +=  '</div>';

        html  +=  '<div class="' + CSS_BODY + '">';
        for (var i = 0; i < paragraphs.length; i++) {
            html  +=  '<p>' + E(paragraphs[i]) + '</p>';
        }
        html  +=  '</div>';

        root.innerHTML  =  html;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Place the Panel Against Its Anchor
    // ------------------------------------------------------------
    // Below the anchor by preference, above it when there is no room below. The
    // panel starts a little left of the anchor so its pointer sits near its left
    // end, then is slid back inside the window; the pointer follows the anchor's
    // centre wherever the panel ends up.
    function VghLantern__InfoTooltip__Position(root, anchor, behaviour) {
        var rect      =  anchor.getBoundingClientRect();
        var viewW     =  window.innerWidth;
        var viewH     =  window.innerHeight;
        var margin    =  behaviour.ViewportMarginPx;

        root.style.maxWidth  =  Math.max(160, Math.min(behaviour.MaxWidthPx, viewW - (2 * margin))) + 'px';
        root.style.left      =  '0px';
        root.style.top       =  '0px';

        var width     =  root.offsetWidth;
        var height    =  root.offsetHeight;
        var centreX   =  rect.left + (rect.width / 2);

        var left      =  Math.min(viewW - width - margin, Math.max(margin, centreX - 24));
        var below     =  rect.bottom + behaviour.OffsetPx;
        var above     =  rect.top - behaviour.OffsetPx - height;
        var isAbove   =  (below + height > viewH - margin) && (above >= margin);

        root.style.left  =  Math.round(left) + 'px';
        root.style.top   =  Math.round(isAbove ? above : below) + 'px';
        root.style.setProperty('--VghLantern_InfoTipCaretX', Math.round(Math.min(width - 16, Math.max(16, centreX - left))) + 'px');

        if (isAbove) root.classList.add(CSS_ABOVE);
        else         root.classList.remove(CSS_ABOVE);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Show and Hide
// -----------------------------------------------------------------------------

    // FUNCTION | Show the Tip an Anchor Names
    // ------------------------------------------------------------
    function VghLantern__InfoTooltip__Show(anchor) {
        if (!anchor || !anchor.isConnected) return;

        var tip  =  VghLantern__InfoTooltip__Tip(anchor.getAttribute(ATTR_TIP));
        if (!tip) return;

        var root       =  VghLantern__InfoTooltip__EnsureRoot();
        var behaviour  =  VghLantern__InfoTooltip__Behaviour();

        if (VghLantern__InfoTooltip__Anchor && VghLantern__InfoTooltip__Anchor !== anchor) {
            VghLantern__InfoTooltip__Anchor.classList.remove(CSS_ICON_ACTIVE);
            VghLantern__InfoTooltip__Anchor.removeAttribute('aria-describedby');
        }

        VghLantern__InfoTooltip__Fill(root, tip);
        VghLantern__InfoTooltip__Position(root, anchor, behaviour);

        root.setAttribute('aria-hidden', 'false');
        root.classList.add(CSS_VISIBLE);
        anchor.classList.add(CSS_ICON_ACTIVE);
        anchor.setAttribute('aria-describedby', ROOT_ID);

        VghLantern__InfoTooltip__Anchor  =  anchor;
    }
    // ------------------------------------------------------------


    // FUNCTION | Hide the Panel
    // ------------------------------------------------------------
    function VghLantern__InfoTooltip__Hide() {
        VghLantern__InfoTooltip__ClearTimers();
        VghLantern__InfoTooltip__IsPinned  =  false;

        if (VghLantern__InfoTooltip__Anchor) {
            VghLantern__InfoTooltip__Anchor.classList.remove(CSS_ICON_ACTIVE);
            VghLantern__InfoTooltip__Anchor.removeAttribute('aria-describedby');
            VghLantern__InfoTooltip__Anchor  =  null;
        }

        if (!VghLantern__InfoTooltip__Root) return;
        VghLantern__InfoTooltip__Root.classList.remove(CSS_VISIBLE);
        VghLantern__InfoTooltip__Root.setAttribute('aria-hidden', 'true');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Delegated Listeners
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Pointer Over: Show After the Delay
    // ------------------------------------------------------------
    function VghLantern__InfoTooltip__OnPointerOver(e) {
        var anchor  =  VghLantern__InfoTooltip__AnchorOf(e.target);
        if (!anchor) return;

        if (VghLantern__InfoTooltip__HideTimer) {
            clearTimeout(VghLantern__InfoTooltip__HideTimer);
            VghLantern__InfoTooltip__HideTimer  =  null;
        }
        if (anchor === VghLantern__InfoTooltip__Anchor) return;               // <-- Already showing this one

        if (VghLantern__InfoTooltip__ShowTimer) clearTimeout(VghLantern__InfoTooltip__ShowTimer);
        VghLantern__InfoTooltip__ShowTimer  =  setTimeout(function() {
            VghLantern__InfoTooltip__ShowTimer  =  null;
            VghLantern__InfoTooltip__IsPinned   =  false;
            VghLantern__InfoTooltip__Show(anchor);
        }, VghLantern__InfoTooltip__Behaviour().ShowDelayMs);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Pointer Out: Hide After the Delay, Unless Pinned
    // ------------------------------------------------------------
    function VghLantern__InfoTooltip__OnPointerOut(e) {
        var anchor  =  VghLantern__InfoTooltip__AnchorOf(e.target);
        if (!anchor) return;
        if (e.relatedTarget && anchor.contains(e.relatedTarget)) return;      // <-- Moving between the bubble's own parts

        if (VghLantern__InfoTooltip__ShowTimer) {
            clearTimeout(VghLantern__InfoTooltip__ShowTimer);
            VghLantern__InfoTooltip__ShowTimer  =  null;
        }
        if (anchor !== VghLantern__InfoTooltip__Anchor || VghLantern__InfoTooltip__IsPinned) return;

        VghLantern__InfoTooltip__HideTimer  =  setTimeout(VghLantern__InfoTooltip__Hide, VghLantern__InfoTooltip__Behaviour().HideDelayMs);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Tap or Click: Pin It, or Close a Pinned One
    // ------------------------------------------------------------
    // A finger has no hover, so a tap is how a tip is read on a tablet, and a
    // click on the "i" on a PC keeps it open while the pointer wanders. A click
    // anywhere else closes a pinned tip.
    function VghLantern__InfoTooltip__OnClick(e) {
        var anchor  =  VghLantern__InfoTooltip__AnchorOf(e.target);

        if (!anchor) {
            if (VghLantern__InfoTooltip__IsPinned) VghLantern__InfoTooltip__Hide();
            return;
        }

        if (anchor === VghLantern__InfoTooltip__Anchor && VghLantern__InfoTooltip__IsPinned) {
            VghLantern__InfoTooltip__Hide();
            return;
        }

        VghLantern__InfoTooltip__ClearTimers();
        VghLantern__InfoTooltip__Show(anchor);
        VghLantern__InfoTooltip__IsPinned  =  VghLantern__InfoTooltip__Anchor === anchor;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Keyboard: Focus Shows, Blur Hides, Escape Closes
    // ------------------------------------------------------------
    function VghLantern__InfoTooltip__OnFocusIn(e) {
        var anchor  =  VghLantern__InfoTooltip__AnchorOf(e.target);
        if (anchor) VghLantern__InfoTooltip__Show(anchor);
    }

    function VghLantern__InfoTooltip__OnFocusOut(e) {
        var anchor  =  VghLantern__InfoTooltip__AnchorOf(e.target);
        if (anchor && anchor === VghLantern__InfoTooltip__Anchor && !VghLantern__InfoTooltip__IsPinned) {
            VghLantern__InfoTooltip__Hide();
        }
    }

    function VghLantern__InfoTooltip__OnKeyDown(e) {
        if (e.key === 'Escape' && VghLantern__InfoTooltip__Anchor) {
            VghLantern__InfoTooltip__Hide();
            return;
        }

        // The bubble is a role="button" span, so Enter and Space work it as a
        // click would, for anyone moving through the panel by keyboard.
        if ((e.key === 'Enter' || e.key === ' ') && VghLantern__InfoTooltip__AnchorOf(e.target) === e.target) {
            e.preventDefault();
            VghLantern__InfoTooltip__OnClick(e);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Bind the Delegated Listeners Once
    // ------------------------------------------------------------
    // Scrolling anything (captured, so a scrolling panel counts) or resizing the
    // window closes the tip rather than leaving it floating away from its anchor.
    function VghLantern__InfoTooltip__Init() {
        if (VghLantern__InfoTooltip__IsBound) return;

        document.addEventListener('mouseover', VghLantern__InfoTooltip__OnPointerOver);
        document.addEventListener('mouseout',  VghLantern__InfoTooltip__OnPointerOut);
        document.addEventListener('click',     VghLantern__InfoTooltip__OnClick);
        document.addEventListener('focusin',   VghLantern__InfoTooltip__OnFocusIn);
        document.addEventListener('focusout',  VghLantern__InfoTooltip__OnFocusOut);
        document.addEventListener('keydown',   VghLantern__InfoTooltip__OnKeyDown);
        window.addEventListener('scroll', function() { if (VghLantern__InfoTooltip__Anchor) VghLantern__InfoTooltip__Hide(); }, true);
        window.addEventListener('resize', function() { if (VghLantern__InfoTooltip__Anchor) VghLantern__InfoTooltip__Hide(); });

        VghLantern__InfoTooltip__IsBound  =  true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The "i" Bubble Markup
// -----------------------------------------------------------------------------

    // FUNCTION | The "i" Bubble for a Tip Key
    // ------------------------------------------------------------
    // label names what the tip is about, for a screen reader ("About Eaves
    // Datum"). extraClass places the bubble in its host's layout. A span with
    // role="button", not a <button>, so it can sit beside or over other controls
    // without nesting one button inside another.
    function VghLantern__InfoTooltip__IconMarkup(tipKey, label, extraClass) {
        var E  =  VghLantern__InfoTooltip__Escape;

        return '<span class="' + CSS_ICON + (extraClass ? ' ' + E(extraClass) : '') + '"'
             +      ' ' + ATTR_TIP + '="' + E(tipKey) + '"'
             +      ' role="button" tabindex="0"'
             +      ' aria-label="' + E('About ' + (label || 'this')) + '">'
             +      ICON_SVG
             +  '</span>';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__InfoTooltip__Init        : VghLantern__InfoTooltip__Init,
        VghLantern__InfoTooltip__IconMarkup  : VghLantern__InfoTooltip__IconMarkup,
        VghLantern__InfoTooltip__Show        : VghLantern__InfoTooltip__Show,
        VghLantern__InfoTooltip__Hide        : VghLantern__InfoTooltip__Hide
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__AppCore__InfoTooltip  =  VghLantern__AppCore__InfoTooltip;
