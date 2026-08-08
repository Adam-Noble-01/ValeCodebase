/* =============================================================================
   NAAUDIO - HUD OVERLAY | MODE INDICATOR
   =============================================================================

   FILE       : NaAudio__Hud__ModeIndicator__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Hud - ModeIndicator
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Say, unmissably, whether the space is in Build or Play
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - A two-position switch at the top centre of the viewport, plus a coloured rule
     across the whole top edge.
   - Clicking either half switches. Tab toggles.

   ---------------------------------------------------------------------------

   WHY IT IS THIS PROMINENT

   Everywhere else in this application the interface is deliberately quiet, and this
   deliberately is not. A modal interface has one failure that outweighs its benefits:
   acting in the mode you are not in.

   Here that failure is expensive and silent. In Build the user clicks a step expecting
   to toggle it and nothing happens, which is merely confusing. In Play they reach to
   move a module and edit its pattern instead, which is data loss with no undo. Neither
   announces itself.

   So the mode is stated in three places at once - a switch that names both options, a
   full-width coloured rule, and the pointer cursor itself. That is more than a quiet
   interface would normally allow, and it is the right trade against a mistake the user
   cannot see themselves making.

   The rule across the top edge matters most of the three. The switch is small and sits
   where the eye is not; the rule is in peripheral vision the whole time, so the mode is
   known without being read.

   ============================================================================= */

import {
    NaAudio__Mode,
    NaAudio__Mode__Presentation,
    NaAudio__ModeManager__Current,
    NaAudio__ModeManager__Set
} from '../01__AppCore/NaAudio__AppCore__ModeManager__.mjs';
import {
    NaAudio__Event,
    NaAudio__EventBus__Subscribe
} from '../01__AppCore/NaAudio__AppCore__EventBus__.mjs';

// =============================================================================
// REGION | Mode Indicator
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Element References
    // ------------------------------------------------------------
    let switchElement  =  null;
    let ruleElement    =  null;
    let hintElement    =  null;
    const buttons      =  {};                                                // <-- Mode name -> button element
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Construction
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build One Half of the Switch
    // ------------------------------------------------------------
    function NaAudio__ModeIndicator__BuildButton(mode) {
        const presentation  =  NaAudio__Mode__Presentation[mode];

        const button  =  document.createElement('button');
        button.className    =  'NaAudio__ModeSwitch__Button NaAudio__ModeSwitch__Button--' + mode;
        button.textContent  =  presentation.Label;
        button.title        =  presentation.Hint + '   (Tab)';
        button.addEventListener('click', function () { NaAudio__ModeManager__Set(mode); });

        buttons[mode]  =  button;
        return button;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Mode Indicator
    // ------------------------------------------------------------
    export function NaAudio__ModeIndicator__Build(mountElement) {
        // THE RULE
        // A bare coloured bar across the top edge. Deliberately not a panel: it carries
        // no text and asks for no attention, it simply changes the colour of the frame
        // the whole space sits inside.
        ruleElement  =  document.createElement('div');
        ruleElement.className  =  'NaAudio__ModeRule';
        mountElement.appendChild(ruleElement);

        // THE SWITCH
        switchElement  =  document.createElement('div');
        switchElement.className  =  'NaAudio__ModeSwitch';

        switchElement.appendChild(NaAudio__ModeIndicator__BuildButton(NaAudio__Mode.Build));
        switchElement.appendChild(NaAudio__ModeIndicator__BuildButton(NaAudio__Mode.Play));

        hintElement  =  document.createElement('span');
        hintElement.className  =  'NaAudio__ModeSwitch__Hint';
        switchElement.appendChild(hintElement);

        mountElement.appendChild(switchElement);

        NaAudio__EventBus__Subscribe(NaAudio__Event.ModeChanged, function (payload) {
            NaAudio__ModeIndicator__Apply(payload.Mode);
        });

        NaAudio__ModeIndicator__Apply(NaAudio__ModeManager__Current());
        return switchElement;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Reflect a Mode in the Switch, the Rule and the Hint
    // ------------------------------------------------------------
    function NaAudio__ModeIndicator__Apply(mode) {
        const presentation  =  NaAudio__Mode__Presentation[mode];

        for (const name of Object.keys(buttons)) {
            buttons[name].classList.toggle('NaAudio__ModeSwitch__Button--active', name === mode);
        }

        // One class on the rule and one on the switch, rather than inline colours. The
        // palette lives in the stylesheet, and writing hexes from JavaScript would put a
        // second copy of it somewhere nobody would think to look.
        ruleElement.className    =  'NaAudio__ModeRule NaAudio__ModeRule--' + mode;
        switchElement.className  =  'NaAudio__ModeSwitch NaAudio__ModeSwitch--' + mode;

        hintElement.textContent  =  presentation.Hint;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
