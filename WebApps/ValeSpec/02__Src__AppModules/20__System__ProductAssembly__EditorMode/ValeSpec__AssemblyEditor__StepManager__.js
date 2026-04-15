/* =============================================================================
   VALESPEC - ASSEMBLY EDITOR STEP MANAGER
   =============================================================================

   FILE       : ValeSpec__AssemblyEditor__StepManager__.js
   NAMESPACE  : ValeSpec
   MODULE     : AssemblyEditor - StepManager
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Sequential step wizard controller for the Assembly Editor
   CREATED    : 2026

   DESCRIPTION:
   - Manages ordered step state (active, completed, collapsed)
   - Renders horizontal progress bar with numbered step pills
   - Creates collapsible step card containers for each configurator section
   - Handles expand/collapse transitions and auto-advance on selection
   - Provides API for sub-modules to register step cards and summaries

   ============================================================================= */

// =============================================================================
// REGION | Assembly Editor Step Manager Module
// =============================================================================

const ValeSpec__AssemblyEditor__StepManager = (function() {

    // MODULE CONSTANTS | Step Definitions
    // ------------------------------------------------------------
    const STEP_DEFS  =  [
        { Id: 'doorType',    Number: 1,  Title: 'Door Type',              ShortTitle: 'Door Type'  },
        { Id: 'dimensions',  Number: 2,  Title: 'Quantity & Dimensions',  ShortTitle: 'Qty & Dims' },
        { Id: 'hinges',      Number: 3,  Title: 'Hinge Projection',       ShortTitle: 'Hinges'     },
        { Id: 'levers',      Number: 4,  Title: 'Lever Specification',    ShortTitle: 'Levers'     },
        { Id: 'hooks',       Number: 5,  Title: 'Cabin Hooks',            ShortTitle: 'Hooks'      },
        { Id: 'misc',        Number: 6,  Title: 'Miscellaneous',          ShortTitle: 'Misc'       }
    ];
    // ------------------------------------------------------------


    // MODULE VARIABLES | State
    // ------------------------------------------------------------
    let ValeSpec__StepManager__ContainerEl      =  null;   // <-- Parent controls panel
    let ValeSpec__StepManager__ProgressBarEl    =  null;   // <-- Progress bar wrapper
    let ValeSpec__StepManager__StepsWrapperEl   =  null;   // <-- Step cards vertical stack
    let ValeSpec__StepManager__StepCards        =  {};     // <-- Map of stepId -> { headerEl, bodyEl, cardEl, summaryEl }
    let ValeSpec__StepManager__ActiveStepId     =  null;   // <-- Currently expanded step id
    let ValeSpec__StepManager__CompletedSteps   =  {};     // <-- Map of stepId -> boolean
    let ValeSpec__StepManager__SummaryCallbacks =  {};     // <-- Map of stepId -> function returning summary text
    let ValeSpec__StepManager__Initialised      =  false;  // <-- Prevents double-init
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Progress Bar
    // ------------------------------------------------------------
    function ValeSpec__StepManager__BuildProgressBar() {
        ValeSpec__StepManager__ProgressBarEl  =  document.createElement('div');
        ValeSpec__StepManager__ProgressBarEl.className  =  'ValeSpec__AssemblyEditor__StepProgressBar';
        ValeSpec__StepManager__ProgressBarEl.id         =  'ValeSpec__AssemblyEditor__StepProgressBar';

        for (var i = 0; i < STEP_DEFS.length; i++) {
            var step  =  STEP_DEFS[i];

            if (i > 0) {
                var connector  =  document.createElement('div');
                connector.className  =  'ValeSpec__AssemblyEditor__StepConnector';
                connector.dataset.afterStep  =  STEP_DEFS[i - 1].Id;
                ValeSpec__StepManager__ProgressBarEl.appendChild(connector);
            }

            var pill  =  document.createElement('div');
            pill.className      =  'ValeSpec__AssemblyEditor__StepPill';
            pill.dataset.stepId =  step.Id;
            pill.title          =  step.Title;

            var numberSpan  =  document.createElement('span');
            numberSpan.className    =  'ValeSpec__AssemblyEditor__StepPill__Number';
            numberSpan.textContent  =  step.Number;

            var labelSpan  =  document.createElement('span');
            labelSpan.className    =  'ValeSpec__AssemblyEditor__StepPill__Label';
            labelSpan.textContent  =  step.ShortTitle;

            pill.appendChild(numberSpan);
            pill.appendChild(labelSpan);

            pill.addEventListener('click', (function(sid) {
                return function() { ValeSpec__StepManager__GoToStep(sid); };
            })(step.Id));

            ValeSpec__StepManager__ProgressBarEl.appendChild(pill);
        }

        ValeSpec__StepManager__ContainerEl.appendChild(ValeSpec__StepManager__ProgressBarEl);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Steps Wrapper
    // ------------------------------------------------------------
    function ValeSpec__StepManager__BuildStepsWrapper() {
        ValeSpec__StepManager__StepsWrapperEl  =  document.createElement('div');
        ValeSpec__StepManager__StepsWrapperEl.className  =  'ValeSpec__AssemblyEditor__StepsWrapper';
        ValeSpec__StepManager__StepsWrapperEl.id         =  'ValeSpec__AssemblyEditor__StepsWrapper';
        ValeSpec__StepManager__ContainerEl.appendChild(ValeSpec__StepManager__StepsWrapperEl);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Refresh Summary Text for a Step
    // ------------------------------------------------------------
    function ValeSpec__StepManager__RefreshSummary(stepId) {
        var entry  =  ValeSpec__StepManager__StepCards[stepId];
        if (!entry) return;
        var cb  =  ValeSpec__StepManager__SummaryCallbacks[stepId];
        if (cb) {
            entry.summaryEl.textContent  =  cb();
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Expand a Step Card
    // ------------------------------------------------------------
    function ValeSpec__StepManager__ExpandStep(stepId) {
        var entry  =  ValeSpec__StepManager__StepCards[stepId];
        if (!entry) return;
        entry.cardEl.classList.add('ValeSpec__AssemblyEditor__StepCard--active');
        entry.cardEl.classList.remove('ValeSpec__AssemblyEditor__StepCard--collapsed');
        entry.chevronEl.innerHTML        =  '&#9650;';
        entry.summaryEl.style.display    =  'none';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Collapse a Step Card
    // ------------------------------------------------------------
    function ValeSpec__StepManager__CollapseStep(stepId) {
        var entry  =  ValeSpec__StepManager__StepCards[stepId];
        if (!entry) return;
        entry.cardEl.classList.remove('ValeSpec__AssemblyEditor__StepCard--active');
        entry.cardEl.classList.add('ValeSpec__AssemblyEditor__StepCard--collapsed');
        entry.chevronEl.innerHTML      =  '&#9660;';
        entry.summaryEl.style.display  =  '';
        ValeSpec__StepManager__RefreshSummary(stepId);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Update Progress Bar State
    // ------------------------------------------------------------
    function ValeSpec__StepManager__UpdateProgressBar() {
        if (!ValeSpec__StepManager__ProgressBarEl) return;

        var pills  =  ValeSpec__StepManager__ProgressBarEl.querySelectorAll('.ValeSpec__AssemblyEditor__StepPill');
        for (var i = 0; i < pills.length; i++) {
            var sid  =  pills[i].dataset.stepId;
            pills[i].classList.remove('ValeSpec__AssemblyEditor__StepPill--active');
            pills[i].classList.remove('ValeSpec__AssemblyEditor__StepPill--completed');

            if (sid === ValeSpec__StepManager__ActiveStepId) {
                pills[i].classList.add('ValeSpec__AssemblyEditor__StepPill--active');
            }
            if (ValeSpec__StepManager__CompletedSteps[sid]) {
                pills[i].classList.add('ValeSpec__AssemblyEditor__StepPill--completed');
            }
        }

        var connectors  =  ValeSpec__StepManager__ProgressBarEl.querySelectorAll('.ValeSpec__AssemblyEditor__StepConnector');
        for (var j = 0; j < connectors.length; j++) {
            var afterId  =  connectors[j].dataset.afterStep;
            if (ValeSpec__StepManager__CompletedSteps[afterId]) {
                connectors[j].classList.add('ValeSpec__AssemblyEditor__StepConnector--filled');
            } else {
                connectors[j].classList.remove('ValeSpec__AssemblyEditor__StepConnector--filled');
            }
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Toggle Step Expand/Collapse
    // ------------------------------------------------------------
    function ValeSpec__StepManager__ToggleStep(stepId) {
        if (ValeSpec__StepManager__ActiveStepId === stepId) {
            ValeSpec__StepManager__CollapseStep(stepId);
            ValeSpec__StepManager__ActiveStepId  =  null;
        } else {
            if (ValeSpec__StepManager__ActiveStepId) ValeSpec__StepManager__CollapseStep(ValeSpec__StepManager__ActiveStepId);
            ValeSpec__StepManager__ExpandStep(stepId);
            ValeSpec__StepManager__ActiveStepId  =  stepId;
        }
        ValeSpec__StepManager__UpdateProgressBar();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Create a Step Card
    // ------------------------------------------------------------
    function ValeSpec__StepManager__CreateStepCard(stepDef) {
        var card  =  document.createElement('div');
        card.className       =  'ValeSpec__AssemblyEditor__StepCard';
        card.id              =  'ValeSpec__AssemblyEditor__StepCard__' + stepDef.Id;
        card.dataset.stepId  =  stepDef.Id;

        var header  =  document.createElement('div');
        header.className  =  'ValeSpec__AssemblyEditor__StepCard__Header';

        var numberBadge  =  document.createElement('span');
        numberBadge.className    =  'ValeSpec__AssemblyEditor__StepCard__Number';
        numberBadge.textContent  =  stepDef.Number;

        var titleEl  =  document.createElement('span');
        titleEl.className    =  'ValeSpec__AssemblyEditor__StepCard__Title';
        titleEl.textContent  =  stepDef.Title;

        var summaryEl  =  document.createElement('span');
        summaryEl.className    =  'ValeSpec__AssemblyEditor__StepCard__Summary';
        summaryEl.textContent  =  '';

        var chevron  =  document.createElement('span');
        chevron.className  =  'ValeSpec__AssemblyEditor__StepCard__Chevron';
        chevron.innerHTML  =  '&#9660;';

        header.appendChild(numberBadge);
        header.appendChild(titleEl);
        header.appendChild(summaryEl);
        header.appendChild(chevron);

        header.addEventListener('click', (function(sid) {
            return function() { ValeSpec__StepManager__ToggleStep(sid); };
        })(stepDef.Id));

        var body  =  document.createElement('div');
        body.className  =  'ValeSpec__AssemblyEditor__StepCard__Body';

        var footer  =  document.createElement('div');
        footer.className  =  'ValeSpec__AssemblyEditor__StepCard__Footer';

        var nextIdx  =  -1;
        for (var j = 0; j < STEP_DEFS.length; j++) {
            if (STEP_DEFS[j].Id === stepDef.Id) { nextIdx = j + 1; break; }
        }

        if (nextIdx < STEP_DEFS.length) {
            var nextBtn  =  document.createElement('button');
            nextBtn.className    =  'ValeSpec__AssemblyEditor__StepCard__NextBtn';
            nextBtn.textContent  =  'Next \u00BB';
            nextBtn.addEventListener('click', (function(nid) {
                return function() { ValeSpec__StepManager__GoToStep(nid); };
            })(STEP_DEFS[nextIdx].Id));
            footer.appendChild(nextBtn);
        }

        body.appendChild(footer);
        card.appendChild(header);
        card.appendChild(body);

        ValeSpec__StepManager__StepCards[stepDef.Id]  =  {
            cardEl    : card,
            headerEl  : header,
            bodyEl    : body,
            summaryEl : summaryEl,
            footerEl  : footer,
            chevronEl : chevron
        };

        ValeSpec__StepManager__StepsWrapperEl.appendChild(card);
        return body;
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialise Step Manager
    // ------------------------------------------------------------
    function ValeSpec__StepManager__Init(container) {
        if (ValeSpec__StepManager__Initialised) return;
        ValeSpec__StepManager__ContainerEl  =  container;
        if (!ValeSpec__StepManager__ContainerEl) return;

        ValeSpec__StepManager__BuildProgressBar();
        ValeSpec__StepManager__BuildStepsWrapper();

        ValeSpec__StepManager__Initialised  =  true;
        console.log('[ValeSpec__StepManager] Initialised.');
    }
    // ------------------------------------------------------------


    // FUNCTION | Create Step Card and Return Body Element
    // ------------------------------------------------------------
    function ValeSpec__StepManager__CreateStep(stepId) {
        var stepDef  =  null;
        for (var i = 0; i < STEP_DEFS.length; i++) {
            if (STEP_DEFS[i].Id === stepId) { stepDef = STEP_DEFS[i]; break; }
        }
        if (!stepDef) return null;
        return ValeSpec__StepManager__CreateStepCard(stepDef);
    }
    // ------------------------------------------------------------


    // FUNCTION | Navigate to a Step
    // ------------------------------------------------------------
    function ValeSpec__StepManager__GoToStep(stepId) {
        if (ValeSpec__StepManager__ActiveStepId) ValeSpec__StepManager__CollapseStep(ValeSpec__StepManager__ActiveStepId);
        ValeSpec__StepManager__ExpandStep(stepId);
        ValeSpec__StepManager__ActiveStepId  =  stepId;
        ValeSpec__StepManager__UpdateProgressBar();

        var entry  =  ValeSpec__StepManager__StepCards[stepId];
        if (entry && entry.cardEl) {
            entry.cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Mark Step as Completed
    // ------------------------------------------------------------
    function ValeSpec__StepManager__MarkCompleted(stepId, isComplete) {
        ValeSpec__StepManager__CompletedSteps[stepId]  =  !!isComplete;
        var entry  =  ValeSpec__StepManager__StepCards[stepId];
        if (entry) {
            if (isComplete) {
                entry.cardEl.classList.add('ValeSpec__AssemblyEditor__StepCard--completed');
            } else {
                entry.cardEl.classList.remove('ValeSpec__AssemblyEditor__StepCard--completed');
            }
        }
        ValeSpec__StepManager__UpdateProgressBar();
    }
    // ------------------------------------------------------------


    // FUNCTION | Register Summary Callback for a Step
    // ------------------------------------------------------------
    function ValeSpec__StepManager__RegisterSummary(stepId, callback) {
        ValeSpec__StepManager__SummaryCallbacks[stepId]  =  callback;
    }
    // ------------------------------------------------------------


    // FUNCTION | Advance to Next Step After Current
    // ------------------------------------------------------------
    function ValeSpec__StepManager__AdvanceFromStep(currentStepId) {
        ValeSpec__StepManager__MarkCompleted(currentStepId, true);
        var nextIdx  =  -1;
        for (var i = 0; i < STEP_DEFS.length; i++) {
            if (STEP_DEFS[i].Id === currentStepId) { nextIdx = i + 1; break; }
        }
        if (nextIdx >= 0 && nextIdx < STEP_DEFS.length) {
            ValeSpec__StepManager__GoToStep(STEP_DEFS[nextIdx].Id);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Step Body Element by Id
    // ------------------------------------------------------------
    function ValeSpec__StepManager__GetStepBody(stepId) {
        var entry  =  ValeSpec__StepManager__StepCards[stepId];
        return entry ? entry.bodyEl : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Active Step Id
    // ------------------------------------------------------------
    function ValeSpec__StepManager__GetActiveStepId() {
        return ValeSpec__StepManager__ActiveStepId;
    }
    // ------------------------------------------------------------


    // FUNCTION | Refresh All Summaries
    // ------------------------------------------------------------
    function ValeSpec__StepManager__RefreshAllSummaries() {
        for (var sid in ValeSpec__StepManager__SummaryCallbacks) {
            ValeSpec__StepManager__RefreshSummary(sid);
        }
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__StepManager__Init               : ValeSpec__StepManager__Init,
        ValeSpec__StepManager__CreateStep         : ValeSpec__StepManager__CreateStep,
        ValeSpec__StepManager__GoToStep           : ValeSpec__StepManager__GoToStep,
        ValeSpec__StepManager__MarkCompleted      : ValeSpec__StepManager__MarkCompleted,
        ValeSpec__StepManager__RegisterSummary    : ValeSpec__StepManager__RegisterSummary,
        ValeSpec__StepManager__AdvanceFromStep    : ValeSpec__StepManager__AdvanceFromStep,
        ValeSpec__StepManager__GetStepBody        : ValeSpec__StepManager__GetStepBody,
        ValeSpec__StepManager__GetActiveStepId    : ValeSpec__StepManager__GetActiveStepId,
        ValeSpec__StepManager__RefreshAllSummaries: ValeSpec__StepManager__RefreshAllSummaries
    };

})();

// endregion ===================================================================

window.ValeSpec__AssemblyEditor__StepManager  =  ValeSpec__AssemblyEditor__StepManager;
