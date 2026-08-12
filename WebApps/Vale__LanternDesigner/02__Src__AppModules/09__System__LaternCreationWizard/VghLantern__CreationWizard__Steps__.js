/* =============================================================================
   VGHLANTERN - CREATION WIZARD | STEPS
   =============================================================================

   FILE       : VghLantern__CreationWizard__Steps__.js
   NAMESPACE  : VghLantern
   MODULE     : System - CreationWizard - Steps
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Declare the wizard steps, their field bindings, validation and apply
   CREATED    : 06-Aug-2026

   DESCRIPTION:
   - The data layer of the Lantern Creation Wizard. No DOM in this file.
   - Every step writes to a field that already exists in the project file schema
     (dimensions, roof pitch, finials, identity title), so the wizard needs no
     schema change and a wizard-made lantern is indistinguishable from one built
     entirely in the editor.
   - Step order, titles, prompts and hints live in Na__CreationWizard__Config.json;
     this file only knows which block and field each step key binds to. Adding a
     future parameter is one JSON entry plus one STEP_BINDINGS entry here.
   - Bounds are read through the editor's ControlDescriptors so the wizard can
     never accept a value the editor sliders would refuse.
   - The finial step shares the editor's component option resolver, so the wizard
     cards draw the same baked front elevations as the Finials section.

   ============================================================================= */

// =============================================================================
// REGION | Creation Wizard Steps Module
// =============================================================================

const VghLantern__CreationWizard__Steps = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Field Bindings per Step Key
    // ------------------------------------------------------------
    // The one place the wizard maps a step key onto the project file schema.
    // Kind decides which input the overlay renders and which validator runs.
    const STEP_BINDINGS  =  {
        length : { Kind : 'dimension', Block : 'Lantern__Dimensions__Config', Field : 'Lantern__Dimensions__Config__WidthMm',        BoundsKey : 'WidthMm',      Unit : 'mm',  Decimals : 0 },
        width  : { Kind : 'dimension', Block : 'Lantern__Dimensions__Config', Field : 'Lantern__Dimensions__Config__DepthMm',        BoundsKey : 'DepthMm',      Unit : 'mm',  Decimals : 0 },
        pitch  : { Kind : 'dimension', Block : 'Lantern__RoofPitch__Config',  Field : 'Lantern__RoofPitch__Config__PitchDegrees',    BoundsKey : 'PitchDegrees', Unit : 'deg', Decimals : 1 },
        finial : { Kind : 'cards',     Block : 'Lantern__Finials__Config',    Field : 'Lantern__Finials__Config__FinialComponentId', OptionsSource : 'components:finial' },
        name   : { Kind : 'text',      Block : 'Lantern__Identity__Config',   Field : 'Lantern__Identity__Config__Title' }
    };
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Finials Block Field Names and Form Values
    // ------------------------------------------------------------
    const FINIALS_BLOCK        =  'Lantern__Finials__Config';
    const FIELD_FIN_ENABLED    =  'Lantern__Finials__Config__Enabled';
    const FIELD_FIN_COMPONENT  =  'Lantern__Finials__Config__FinialComponentId';
    const FIELD_FIN_APEX       =  'Lantern__Finials__Config__PlaceAtApex';
    const FORM_BLOCK           =  'Lantern__Form__Config';
    const FIELD_ROOF_FORM      =  'Lantern__Form__Config__RoofForm';
    const FORM_PYRAMID         =  'Pyramid';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read the Creation Wizard Config Section
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Steps__ConfigSection() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};
        return ConfigLoader.VghLantern__ConfigLoader__GetSection('CreationWizard') || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read the Slider Bounds for a Step Binding
    // ------------------------------------------------------------
    // Bounds come from the editor's ControlDescriptors, which reads
    // Na__LanternEditor__Config.json, so the wizard and the editor sliders can
    // never disagree about what a lantern is allowed to measure.
    function VghLantern__CreationWizard__Steps__Bounds(boundsKey) {
        var Descriptors  =  window.VghLantern__LanternEditor__ControlDescriptors;
        if (!Descriptors) return { Min : 0, Max : 10000, Step : 1 };
        return Descriptors.VghLantern__ControlDescriptors__Bounds(boundsKey);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Step List Assembly
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Merge One Config Step Entry with Its Field Binding
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Steps__BuildOne(configEntry) {
        var binding  =  configEntry && configEntry.Key ? STEP_BINDINGS[configEntry.Key] : null;
        if (!binding) {
            console.warn('[VghLantern__CreationWizard__Steps] No field binding for step key:', configEntry && configEntry.Key);
            return null;
        }

        var step  =  {
            Key           : configEntry.Key,
            Kind          : binding.Kind,
            Title         : configEntry.Title  || configEntry.Key,
            Prompt        : configEntry.Prompt || '',
            Hint          : configEntry.Hint   || '',
            Block         : binding.Block,
            Field         : binding.Field,
            Unit          : binding.Unit || '',
            Decimals      : binding.Decimals || 0,
            OptionsSource : binding.OptionsSource || '',
            Placeholder   : configEntry.Placeholder || '',
            MaxLength     : (typeof configEntry.MaxLength === 'number') ? configEntry.MaxLength : 0,
            Bounds        : binding.BoundsKey ? VghLantern__CreationWizard__Steps__Bounds(binding.BoundsKey) : null
        };

        return step;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Ordered Step List for a Wizard Session
    // ------------------------------------------------------------
    // Order and enablement come from config, so reordering or disabling a step
    // is a JSON edit. The name step only exists when a lantern is being added to
    // a project that already holds one, which is why it lives outside the Steps
    // array: it is a mode decision, not a reorderable parameter.
    function VghLantern__CreationWizard__Steps__Build(includeNameStep) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var wizardCfg     =  VghLantern__CreationWizard__Steps__ConfigSection();
        if (!ConfigLoader || !wizardCfg) return [];

        var STEPS_LABEL   =  'Na__CreationWizard__Config.json -> VghLantern__CreationWizard__Config__Steps';
        var stepEntries   =  ConfigLoader.VghLantern__ConfigLoader__RequireArray(wizardCfg, 'VghLantern__CreationWizard__Config__Steps', STEPS_LABEL);
        var steps         =  [];

        for (var i = 0; i < stepEntries.length; i++) {
            var entry  =  stepEntries[i];
            if (!entry || entry.Enabled !== true) continue;

            var step  =  VghLantern__CreationWizard__Steps__BuildOne(entry);
            if (step) steps.push(step);
        }

        if (includeNameStep) {
            var nameCfg   =  wizardCfg['VghLantern__CreationWizard__Config__NameStep'] || {};
            var nameStep  =  VghLantern__CreationWizard__Steps__BuildOne({
                Key         : 'name',
                Title       : nameCfg.Title,
                Prompt      : nameCfg.Prompt,
                Hint        : nameCfg.Hint,
                Placeholder : nameCfg.Placeholder,
                MaxLength   : nameCfg.MaxLength
            });
            if (nameStep) steps.push(nameStep);
        }

        return steps;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Prefill and Formatting
// -----------------------------------------------------------------------------

    // FUNCTION | Read the Starting Values for Every Step from a Lantern
    // ------------------------------------------------------------
    // The finial value is three-state: a component id preselects that card, an
    // empty string preselects the No Finials card, and null selects nothing at
    // all - which is what a fresh default lantern carries (finials enabled but
    // no component chosen) and what forces the user to actually decide.
    function VghLantern__CreationWizard__Steps__ReadPrefill(steps, lantern) {
        var values  =  {};

        for (var i = 0; i < steps.length; i++) {
            var step   =  steps[i];
            var block  =  lantern ? lantern[step.Block] : null;

            if (step.Kind === 'cards') {
                var enabled      =  block ? block[FIELD_FIN_ENABLED] === true : false;
                var componentId  =  block ? String(block[FIELD_FIN_COMPONENT] || '') : '';
                values[step.Key] =  !enabled ? '' : (componentId !== '' ? componentId : null);
                continue;
            }

            if (step.Kind === 'text') {
                values[step.Key]  =  block ? String(block[step.Field] || '') : '';
                continue;
            }

            var raw  =  block ? block[step.Field] : null;
            values[step.Key]  =  (typeof raw === 'number' && isFinite(raw)) ? raw : (step.Bounds ? step.Bounds.Min : 0);
        }

        return values;
    }
    // ------------------------------------------------------------


    // FUNCTION | Format a Confirmed Value for the Collapsed Summary Row
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Steps__FormatValue(step, value) {
        if (!step || step.Kind !== 'dimension') return String(value === null || value === undefined ? '' : value);

        var numeric  =  Number(value);
        if (!isFinite(numeric)) return '';

        var text  =  step.Decimals > 0 ? numeric.toFixed(step.Decimals) : String(Math.round(numeric));
        return step.Unit ? text + ' ' + step.Unit : text;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Validation
// -----------------------------------------------------------------------------

    // FUNCTION | Validate and Clamp a Dimension Step Value
    // ------------------------------------------------------------
    // Same contract as the editor's CoerceValue: clamp to bounds, round to the
    // step's precision. A non-numeric entry is the only hard failure; a value
    // outside the bounds is clamped rather than rejected, because the bounds
    // are manufacturing limits, not typing tests.
    function VghLantern__CreationWizard__Steps__ValidateDimension(step, rawValue) {
        var numeric  =  parseFloat(rawValue);
        if (!isFinite(numeric)) return { Ok : false, Value : null };

        if (step.Bounds) {
            numeric  =  Math.max(step.Bounds.Min, Math.min(step.Bounds.Max, numeric));
        }

        if (step.Decimals > 0) {
            var factor  =  Math.pow(10, step.Decimals);
            numeric     =  Math.round(numeric * factor) / factor;
        } else {
            numeric     =  Math.round(numeric);
        }

        return { Ok : true, Value : numeric };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Finial Options
// -----------------------------------------------------------------------------

    // FUNCTION | Resolve the Finial Component Options for the Card Grid
    // ------------------------------------------------------------
    // Delegates to the editor's ControlDescriptors resolver, so the wizard cards
    // carry the same baked Preview2d outlines and overall heights as the
    // Finials section - one option pipeline, two surfaces.
    function VghLantern__CreationWizard__Steps__ResolveFinialOptions() {
        var Descriptors  =  window.VghLantern__LanternEditor__ControlDescriptors;
        if (!Descriptors) return [];

        return Descriptors.VghLantern__ControlDescriptors__ResolveOptions({
            OptionsSource : STEP_BINDINGS.finial.OptionsSource
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Apply to Lantern
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Write the Finial Decision onto the Finials Block
    // ------------------------------------------------------------
    // Choosing No Finials only flips Enabled off - the previously stored
    // component id is left in place, exactly as the editor's expandable toggle
    // behaves. Choosing a finial on a PYRAMID also switches the apex placement
    // on: that toggle defaults off, so a finial chosen here would otherwise be
    // stored and never drawn. A ridged roof needs no equivalent - both ridge
    // ends take a finial as soon as finials are fitted.
    function VghLantern__CreationWizard__Steps__ApplyFinial(lantern, chosenId) {
        var finialsCfg  =  lantern[FINIALS_BLOCK];
        var formCfg     =  lantern[FORM_BLOCK];
        if (!finialsCfg) return;

        if (chosenId === '') {
            finialsCfg[FIELD_FIN_ENABLED]  =  false;
            return;
        }

        finialsCfg[FIELD_FIN_ENABLED]    =  true;
        finialsCfg[FIELD_FIN_COMPONENT]  =  String(chosenId);

        if (formCfg && formCfg[FIELD_ROOF_FORM] === FORM_PYRAMID) finialsCfg[FIELD_FIN_APEX]  =  true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Write Every Confirmed Wizard Value onto a Lantern
    // ------------------------------------------------------------
    // Mutates the lantern blocks in place. Only the wizard's own fields are
    // touched; every other value keeps whatever the schema or seed template
    // put there, which is the "all other defaults as is" contract.
    function VghLantern__CreationWizard__Steps__Apply(steps, values, lantern) {
        if (!lantern) return;

        for (var i = 0; i < steps.length; i++) {
            var step   =  steps[i];
            var value  =  values[step.Key];
            var block  =  lantern[step.Block];
            if (!block) continue;

            if (step.Kind === 'cards') {
                VghLantern__CreationWizard__Steps__ApplyFinial(lantern, value);
                continue;
            }

            if (step.Kind === 'text') {
                var text  =  String(value === null || value === undefined ? '' : value).trim();
                if (step.MaxLength > 0 && text.length > step.MaxLength) text  =  text.slice(0, step.MaxLength);
                if (text !== '') block[step.Field]  =  text;                  // <-- Blank keeps the sequential tab label
                continue;
            }

            var result  =  VghLantern__CreationWizard__Steps__ValidateDimension(step, value);
            if (result.Ok) block[step.Field]  =  result.Value;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__CreationWizard__Steps__ConfigSection        : VghLantern__CreationWizard__Steps__ConfigSection,
        VghLantern__CreationWizard__Steps__Build                : VghLantern__CreationWizard__Steps__Build,
        VghLantern__CreationWizard__Steps__ReadPrefill          : VghLantern__CreationWizard__Steps__ReadPrefill,
        VghLantern__CreationWizard__Steps__FormatValue          : VghLantern__CreationWizard__Steps__FormatValue,
        VghLantern__CreationWizard__Steps__ValidateDimension    : VghLantern__CreationWizard__Steps__ValidateDimension,
        VghLantern__CreationWizard__Steps__ResolveFinialOptions : VghLantern__CreationWizard__Steps__ResolveFinialOptions,
        VghLantern__CreationWizard__Steps__Apply                : VghLantern__CreationWizard__Steps__Apply
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__CreationWizard__Steps  =  VghLantern__CreationWizard__Steps;
