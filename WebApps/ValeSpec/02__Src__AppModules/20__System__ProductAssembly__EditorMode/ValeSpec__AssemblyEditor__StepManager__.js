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
    let _containerEl       =  null;                                          // <-- Parent controls panel
    let _progressBarEl     =  null;                                          // <-- Progress bar wrapper
    let _stepsWrapperEl    =  null;                                          // <-- Step cards vertical stack
    let _stepCards         =  {};                                            // <-- Map of stepId -> { headerEl, bodyEl, cardEl, summaryEl }
    let _activeStepId      =  null;                                          // <-- Currently expanded step id
    let _completedSteps    =  {};                                            // <-- Map of stepId -> boolean
    let _summaryCallbacks  =  {};                                            // <-- Map of stepId -> function returning summary text
    let _initialised       =  false;                                         // <-- Prevents double-init
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Progress Bar
    // ------------------------------------------------------------
    function _buildProgressBar() {
        _progressBarEl  =  document.createElement('div');
        _progressBarEl.className  =  'ValeSpec__AssemblyEditor__StepProgressBar';
        _progressBarEl.id         =  'ValeSpec__AssemblyEditor__StepProgressBar';

        for (var i = 0; i < STEP_DEFS.length; i++) {
            var step  =  STEP_DEFS[i];

            if (i > 0) {
                var connector  =  document.createElement('div');
                connector.className  =  'ValeSpec__AssemblyEditor__StepConnector';
                connector.dataset.afterStep  =  STEP_DEFS[i - 1].Id;
                _progressBarEl.appendChild(connector);
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
                return function() { goToStep(sid); };
            })(step.Id));

            _progressBarEl.appendChild(pill);
        }

        _containerEl.appendChild(_progressBarEl);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Steps Wrapper
    // ------------------------------------------------------------
    function _buildStepsWrapper() {
        _stepsWrapperEl  =  document.createElement('div');
        _stepsWrapperEl.className  =  'ValeSpec__AssemblyEditor__StepsWrapper';
        _stepsWrapperEl.id         =  'ValeSpec__AssemblyEditor__StepsWrapper';
        _containerEl.appendChild(_stepsWrapperEl);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Create a Step Card
    // ------------------------------------------------------------
    function _createStepCard(stepDef) {
        var card  =  document.createElement('div');
        card.className    =  'ValeSpec__AssemblyEditor__StepCard';
        card.id           =  'ValeSpec__AssemblyEditor__StepCard__' + stepDef.Id;
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
        summaryEl.className  =  'ValeSpec__AssemblyEditor__StepCard__Summary';
        summaryEl.textContent  =  '';

        var chevron  =  document.createElement('span');
        chevron.className  =  'ValeSpec__AssemblyEditor__StepCard__Chevron';
        chevron.innerHTML  =  '&#9660;';

        header.appendChild(numberBadge);
        header.appendChild(titleEl);
        header.appendChild(summaryEl);
        header.appendChild(chevron);

        header.addEventListener('click', (function(sid) {
            return function() { _toggleStep(sid); };
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
                return function() { goToStep(nid); };
            })(STEP_DEFS[nextIdx].Id));
            footer.appendChild(nextBtn);
        }

        body.appendChild(footer);
        card.appendChild(header);
        card.appendChild(body);

        _stepCards[stepDef.Id]  =  {
            cardEl    : card,
            headerEl  : header,
            bodyEl    : body,
            summaryEl : summaryEl,
            footerEl  : footer,
            chevronEl : chevron
        };

        _stepsWrapperEl.appendChild(card);
        return body;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Toggle Step Expand/Collapse
    // ------------------------------------------------------------
    function _toggleStep(stepId) {
        if (_activeStepId === stepId) {
            _collapseStep(stepId);
            _activeStepId  =  null;
        } else {
            if (_activeStepId) _collapseStep(_activeStepId);
            _expandStep(stepId);
            _activeStepId  =  stepId;
        }
        _updateProgressBar();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Expand a Step Card
    // ------------------------------------------------------------
    function _expandStep(stepId) {
        var entry  =  _stepCards[stepId];
        if (!entry) return;
        entry.cardEl.classList.add('ValeSpec__AssemblyEditor__StepCard--active');
        entry.cardEl.classList.remove('ValeSpec__AssemblyEditor__StepCard--collapsed');
        entry.chevronEl.innerHTML  =  '&#9650;';
        entry.summaryEl.style.display  =  'none';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Collapse a Step Card
    // ------------------------------------------------------------
    function _collapseStep(stepId) {
        var entry  =  _stepCards[stepId];
        if (!entry) return;
        entry.cardEl.classList.remove('ValeSpec__AssemblyEditor__StepCard--active');
        entry.cardEl.classList.add('ValeSpec__AssemblyEditor__StepCard--collapsed');
        entry.chevronEl.innerHTML  =  '&#9660;';
        entry.summaryEl.style.display  =  '';
        _refreshSummary(stepId);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Refresh Summary Text for a Step
    // ------------------------------------------------------------
    function _refreshSummary(stepId) {
        var entry  =  _stepCards[stepId];
        if (!entry) return;
        var cb  =  _summaryCallbacks[stepId];
        if (cb) {
            entry.summaryEl.textContent  =  cb();
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Update Progress Bar State
    // ------------------------------------------------------------
    function _updateProgressBar() {
        if (!_progressBarEl) return;

        var pills  =  _progressBarEl.querySelectorAll('.ValeSpec__AssemblyEditor__StepPill');
        for (var i = 0; i < pills.length; i++) {
            var sid  =  pills[i].dataset.stepId;
            pills[i].classList.remove('ValeSpec__AssemblyEditor__StepPill--active');
            pills[i].classList.remove('ValeSpec__AssemblyEditor__StepPill--completed');

            if (sid === _activeStepId) {
                pills[i].classList.add('ValeSpec__AssemblyEditor__StepPill--active');
            }
            if (_completedSteps[sid]) {
                pills[i].classList.add('ValeSpec__AssemblyEditor__StepPill--completed');
            }
        }

        var connectors  =  _progressBarEl.querySelectorAll('.ValeSpec__AssemblyEditor__StepConnector');
        for (var j = 0; j < connectors.length; j++) {
            var afterId  =  connectors[j].dataset.afterStep;
            if (_completedSteps[afterId]) {
                connectors[j].classList.add('ValeSpec__AssemblyEditor__StepConnector--filled');
            } else {
                connectors[j].classList.remove('ValeSpec__AssemblyEditor__StepConnector--filled');
            }
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialise Step Manager
    // ------------------------------------------------------------
    function init(container) {
        if (_initialised) return;
        _containerEl  =  container;
        if (!_containerEl) return;

        _buildProgressBar();
        _buildStepsWrapper();

        _initialised  =  true;
        console.log('[ValeSpec__StepManager] Initialised.');
    }
    // ------------------------------------------------------------


    // FUNCTION | Create Step Card and Return Body Element
    // ------------------------------------------------------------
    function createStep(stepId) {
        var stepDef  =  null;
        for (var i = 0; i < STEP_DEFS.length; i++) {
            if (STEP_DEFS[i].Id === stepId) { stepDef = STEP_DEFS[i]; break; }
        }
        if (!stepDef) return null;
        return _createStepCard(stepDef);
    }
    // ------------------------------------------------------------


    // FUNCTION | Navigate to a Step
    // ------------------------------------------------------------
    function goToStep(stepId) {
        if (_activeStepId) _collapseStep(_activeStepId);
        _expandStep(stepId);
        _activeStepId  =  stepId;
        _updateProgressBar();

        var entry  =  _stepCards[stepId];
        if (entry && entry.cardEl) {
            entry.cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Mark Step as Completed
    // ------------------------------------------------------------
    function markCompleted(stepId, isComplete) {
        _completedSteps[stepId]  =  !!isComplete;
        var entry  =  _stepCards[stepId];
        if (entry) {
            if (isComplete) {
                entry.cardEl.classList.add('ValeSpec__AssemblyEditor__StepCard--completed');
            } else {
                entry.cardEl.classList.remove('ValeSpec__AssemblyEditor__StepCard--completed');
            }
        }
        _updateProgressBar();
    }
    // ------------------------------------------------------------


    // FUNCTION | Register Summary Callback for a Step
    // ------------------------------------------------------------
    function registerSummary(stepId, callback) {
        _summaryCallbacks[stepId]  =  callback;
    }
    // ------------------------------------------------------------


    // FUNCTION | Advance to Next Step After Current
    // ------------------------------------------------------------
    function advanceFromStep(currentStepId) {
        markCompleted(currentStepId, true);
        var nextIdx  =  -1;
        for (var i = 0; i < STEP_DEFS.length; i++) {
            if (STEP_DEFS[i].Id === currentStepId) { nextIdx = i + 1; break; }
        }
        if (nextIdx >= 0 && nextIdx < STEP_DEFS.length) {
            goToStep(STEP_DEFS[nextIdx].Id);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Step Body Element by Id
    // ------------------------------------------------------------
    function getStepBody(stepId) {
        var entry  =  _stepCards[stepId];
        return entry ? entry.bodyEl : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Active Step Id
    // ------------------------------------------------------------
    function getActiveStepId() {
        return _activeStepId;
    }
    // ------------------------------------------------------------


    // FUNCTION | Refresh All Summaries
    // ------------------------------------------------------------
    function refreshAllSummaries() {
        for (var sid in _summaryCallbacks) {
            _refreshSummary(sid);
        }
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        init                : init,
        createStep          : createStep,
        goToStep            : goToStep,
        markCompleted       : markCompleted,
        registerSummary     : registerSummary,
        advanceFromStep     : advanceFromStep,
        getStepBody         : getStepBody,
        getActiveStepId     : getActiveStepId,
        refreshAllSummaries : refreshAllSummaries
    };

})();

// endregion ===================================================================

window.ValeSpec__AssemblyEditor__StepManager  =  ValeSpec__AssemblyEditor__StepManager;
