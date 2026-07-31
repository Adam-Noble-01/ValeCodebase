/* =============================================================================
   VGHLANTERN - LANTERN EDITOR | CONTROL DESCRIPTORS
   =============================================================================

   FILE       : VghLantern__LanternEditor__ControlDescriptors__.js
   NAMESPACE  : VghLantern
   MODULE     : System - LanternEditor - ControlDescriptors
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Descriptor schema, option resolution and value read/write for the
                editor control panel
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - The single definition of what a control descriptor IS. Every section module
     emits descriptors in this shape and the ControlPanel renders them blindly.
   - Owns the four descriptor types: slider, toggle, select and expandable.
   - Resolves option lists from config and from the two data library indexes, so
     no section module ever hardcodes a dropdown.
   - Owns reading a value out of a lantern block and writing one back, including
     type coercion and clamping. Sections never touch the lantern object.
   - Assembles the ordered section list from Na__LanternEditor__Config.json.

   -----------------------------------------------------------------------------

   WHY A DESCRIPTOR LAYER AT ALL:
   The editor is a continuous control panel with roughly forty controls across
   seven sections. Hand-writing markup and change handlers per control would
   mean forty near-identical blocks that drift apart. Declaring each control as
   data means one renderer, one write path, one place to fix a bug.

   DESCRIPTOR SHAPE:

     {
       Key           : 'widthMm',                       unique within its section
       Type          : 'slider' | 'toggle' | 'select' | 'expandable' | 'heading'
                       | 'text' | 'textarea' | 'button',
       Label         : 'Width',
       Block         : 'Lantern__Dimensions__Config',   lantern block name
       Field         : 'Lantern__Dimensions__Config__WidthMm',
       BoundsKey     : 'WidthMm',                       ControlBounds config key
       Unit          : 'mm',
       OptionsSource : 'roofForms' | 'profiles:ridge' | 'components:finial' | ...
       Options       : [ { Value, Label, Disabled } ]   literal alternative
       AllowEmpty    : true,                            select may resolve to ''
       VisibleWhen   : function(lantern) -> boolean,
       Children      : [ descriptors ],                 expandable only
       Hint          : 'shown under the control',
       MaxLength     : 500,                             text / textarea only
       Rows          : 3,                                textarea only
       Variant       : 'danger',                         button styling hook
       Action        : function(lantern) -> void,        button only
       Confirm       : { Title, Message, ConfirmLabel }  button only, optional
     }

   Only Key, Type and Label are mandatory. Everything else is optional and the
   normaliser fills the gaps, so a section can declare a control in three lines.

   A 'heading' descriptor carries a Label and nothing else. It splits a long
   section into named subsections without introducing a nested accordion, which
   is what a section like Frame and Builders Upstand needs: two groups of controls that
   belong together and should both be visible at once.

   A 'button' descriptor has no Block/Field - it has no stored value, it only
   fires Action(lantern) when clicked. Confirm, when present, routes the click
   through the shared VghLantern__AppCore__ConfirmModal instead of firing
   immediately, which is how the Delete Lantern control avoids an accidental
   click destroying data.

   ============================================================================= */

// =============================================================================
// REGION | Control Descriptors Module
// =============================================================================

const VghLantern__LanternEditor__ControlDescriptors = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Descriptor Type Names
    // ------------------------------------------------------------
    const TYPE_SLIDER      =  'slider';                                      // <-- Numeric range plus paired numeric entry
    const TYPE_TOGGLE      =  'toggle';                                      // <-- Boolean switch
    const TYPE_SELECT      =  'select';                                      // <-- Single choice from a resolved option list
    const TYPE_EXPANDABLE   =  'expandable';                                 // <-- Nested group revealed by its own toggle
    const TYPE_HEADING      =  'heading';                                    // <-- Subsection label, no value and no input
    const TYPE_TEXT         =  'text';                                       // <-- Single-line free text entry
    const TYPE_TEXTAREA     =  'textarea';                                   // <-- Multi-line free text entry
    const TYPE_BUTTON       =  'button';                                     // <-- Fires an Action, holds no value
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Section Builder Registry
    // ------------------------------------------------------------
    // Maps a section key from config to the module and function that builds it.
    // Declaring the binding here rather than having sections self-register keeps
    // the load order irrelevant: sections are plain builders with no side effects.
    const SECTION_BUILDERS  =  {
        'lanternInfo'      : { Global : 'VghLantern__LanternEditor__Section__LanternInfo',      Fn : 'VghLantern__Section__LanternInfo__Build'      },
        'formAndSize'      : { Global : 'VghLantern__LanternEditor__Section__FormAndSize',      Fn : 'VghLantern__Section__FormAndSize__Build'      },
        'glazingBars'      : { Global : 'VghLantern__LanternEditor__Section__GlazingBars',      Fn : 'VghLantern__Section__GlazingBars__Build'      },
        'ridgeAndHips'     : { Global : 'VghLantern__LanternEditor__Section__RidgeAndHips',     Fn : 'VghLantern__Section__RidgeAndHips__Build'     },
        'finials'          : { Global : 'VghLantern__LanternEditor__Section__Finials',          Fn : 'VghLantern__Section__Finials__Build'          },
        'buildersUpstandAndBase'      : { Global : 'VghLantern__LanternEditor__Section__BuildersUpstandAndBase',      Fn : 'VghLantern__Section__BuildersUpstandAndBase__Build'      },
        'ventilation'      : { Global : 'VghLantern__LanternEditor__Section__Ventilation',      Fn : 'VghLantern__Section__Ventilation__Build'      },
        'finishAndGlazing' : { Global : 'VghLantern__LanternEditor__Section__FinishAndGlazing', Fn : 'VghLantern__Section__FinishAndGlazing__Build' },
        'warningsAndComments' : { Global : 'VghLantern__LanternEditor__Section__WarningsAndComments', Fn : 'VghLantern__Section__WarningsAndComments__Build' }
    };
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Option Source Prefixes
    // ------------------------------------------------------------
    const SOURCE_PREFIX_PROFILES    =  'profiles:';                          // <-- profiles:<roleKey> from the profile index
    const SOURCE_PREFIX_COMPONENTS  =  'components:';                        // <-- components:<roleKey> from the component index
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the Lantern Editor Config Section
    // ------------------------------------------------------------
    function VghLantern__ControlDescriptors__EditorConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};
        return ConfigLoader.VghLantern__ConfigLoader__GetSection('LanternEditor') || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get an Arbitrary Config Section by Name
    // ------------------------------------------------------------
    function VghLantern__ControlDescriptors__ConfigSection(sectionName) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};
        return ConfigLoader.VghLantern__ConfigLoader__GetSection(sectionName) || {};
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve the Min / Max / Step Bounds for a Bounds Key
    // ------------------------------------------------------------
    // Bounds live in config so a slider can never offer a value the
    // ConstraintResolver would then reject. An unknown key yields a permissive
    // fallback rather than throwing, because a missing bound is a config
    // omission, not a reason to blank the control out.
    function VghLantern__ControlDescriptors__Bounds(boundsKey) {
        var editorCfg  =  VghLantern__ControlDescriptors__EditorConfig();
        var allBounds  =  editorCfg['VghLantern__LanternEditor__Config__ControlBounds'] || {};
        var bounds     =  boundsKey ? allBounds[boundsKey] : null;

        if (!bounds) return { Min : 0, Max : 10000, Step : 1 };

        return {
            Min  : (typeof bounds.Min  === 'number') ? bounds.Min  : 0,
            Max  : (typeof bounds.Max  === 'number') ? bounds.Max  : 10000,
            Step : (typeof bounds.Step === 'number') ? bounds.Step : 1
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Control Behaviour Settings Block
    // ------------------------------------------------------------
    function VghLantern__ControlDescriptors__Behaviour() {
        var editorCfg  =  VghLantern__ControlDescriptors__EditorConfig();
        return editorCfg['VghLantern__LanternEditor__Config__ControlBehaviour'] || {};
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Option List Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Wrap a Plain String List as Option Objects
    // ------------------------------------------------------------
    function VghLantern__ControlDescriptors__OptionsFromStrings(stringList, disabledList) {
        if (!Array.isArray(stringList)) return [];
        var disabled  =  Array.isArray(disabledList) ? disabledList : [];

        return stringList.map(function(value) {
            return {
                Value    : value,
                Label    : value,
                Disabled : disabled.indexOf(value) !== -1
            };
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Options from Profile Index Entries for a Role
    // ------------------------------------------------------------
    function VghLantern__ControlDescriptors__OptionsFromProfiles(roleKey) {
        var ProfileLoader  =  window.VghLantern__AppData__ProfileIndexLoader;
        if (!ProfileLoader) return [];

        var entries  =  ProfileLoader.VghLantern__ProfileIndexLoader__ListEntriesForRole(roleKey);

        return entries.map(function(entry) {
            return {
                Value    : entry.ProfileId,
                Label    : entry.Name || entry.ProfileId,
                Disabled : false
            };
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Options from Component Index Entries for a Role
    // ------------------------------------------------------------
    function VghLantern__ControlDescriptors__OptionsFromComponents(roleKey) {
        var ComponentLoader  =  window.VghLantern__AppData__ComponentIndexLoader;
        if (!ComponentLoader) return [];

        var entries  =  ComponentLoader.VghLantern__ComponentIndexLoader__ListEntriesForRole(roleKey);

        return entries.map(function(entry) {
            return {
                Value    : entry.AssetId,
                Label    : entry.Name || entry.AssetId,
                Disabled : false
            };
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Resolve a Named Config-Backed Option Source
    // ------------------------------------------------------------
    function VghLantern__ControlDescriptors__OptionsFromConfigSource(sourceName) {
        var roofCfg    =  VghLantern__ControlDescriptors__ConfigSection('RoofFormOptions');
        var glazeCfg   =  VghLantern__ControlDescriptors__ConfigSection('GlazingOptions');
        var finishCfg  =  VghLantern__ControlDescriptors__ConfigSection('FinishOptions');
        var editorCfg  =  VghLantern__ControlDescriptors__EditorConfig();

        if (sourceName === 'roofForms') {
            return VghLantern__ControlDescriptors__OptionsFromStrings(
                roofCfg['VghLantern__RoofForm__Options__Config__RoofForms'],
                roofCfg['VghLantern__RoofForm__Options__Config__DisabledRoofForms']);
        }

        if (sourceName === 'glazingSpecs') {
            return VghLantern__ControlDescriptors__OptionsFromStrings(
                glazeCfg['VghLantern__Glazing__Options__Config__GlazingSpecs'], []);
        }

        if (sourceName === 'glazingTints') {
            return VghLantern__ControlDescriptors__OptionsFromStrings(
                glazeCfg['VghLantern__Glazing__Options__Config__GlazingTints'], []);
        }

        if (sourceName === 'ventOperationTypes') {
            return VghLantern__ControlDescriptors__OptionsFromStrings(
                editorCfg['VghLantern__LanternEditor__Config__VentOperationTypes'], []);
        }

        if (sourceName === 'finishes') {
            var finishes  =  finishCfg['VghLantern__Finish__Options__Config__AvailableFinishes'] || [];
            return finishes.map(function(finish) {
                return { Value : finish.Name, Label : finish.Name, Disabled : false };
            });
        }

        if (sourceName === 'colourReferences') {
            return VghLantern__ControlDescriptors__OptionsFromStrings(
                finishCfg['VghLantern__Finish__Options__Config__ColourReferences'], []);
        }

        return [];
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve the Option List for a Descriptor
    // ------------------------------------------------------------
    // A literal Options array always wins, so a section can override a source.
    function VghLantern__ControlDescriptors__ResolveOptions(descriptor) {
        if (!descriptor) return [];
        if (Array.isArray(descriptor.Options) && descriptor.Options.length > 0) return descriptor.Options;

        var source  =  descriptor.OptionsSource;
        if (!source) return [];

        if (source.indexOf(SOURCE_PREFIX_PROFILES) === 0) {
            return VghLantern__ControlDescriptors__OptionsFromProfiles(source.slice(SOURCE_PREFIX_PROFILES.length));
        }
        if (source.indexOf(SOURCE_PREFIX_COMPONENTS) === 0) {
            return VghLantern__ControlDescriptors__OptionsFromComponents(source.slice(SOURCE_PREFIX_COMPONENTS.length));
        }

        return VghLantern__ControlDescriptors__OptionsFromConfigSource(source);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Descriptor Normalisation
// -----------------------------------------------------------------------------

    // FUNCTION | Fill a Sparse Descriptor Out to the Full Shape
    // ------------------------------------------------------------
    // Sections declare only what differs from the defaults. Everything the
    // renderer needs is guaranteed present after this pass.
    function VghLantern__ControlDescriptors__Normalise(descriptor) {
        if (!descriptor || !descriptor.Key) return null;

        var bounds  =  (descriptor.Type === TYPE_SLIDER)
            ? VghLantern__ControlDescriptors__Bounds(descriptor.BoundsKey)
            : null;

        var normalised  =  {
            Key           : descriptor.Key,
            Type          : descriptor.Type || TYPE_SLIDER,
            Label         : descriptor.Label || descriptor.Key,
            Block         : descriptor.Block || '',
            Field         : descriptor.Field || '',
            Unit          : descriptor.Unit || '',
            Hint          : descriptor.Hint || '',
            BoundsKey     : descriptor.BoundsKey || '',
            Min           : bounds ? bounds.Min  : null,
            Max           : bounds ? bounds.Max  : null,
            Step          : bounds ? bounds.Step : null,
            Decimals      : (typeof descriptor.Decimals === 'number') ? descriptor.Decimals : 0,
            OptionsSource : descriptor.OptionsSource || '',
            Options       : Array.isArray(descriptor.Options) ? descriptor.Options : null,
            AllowEmpty    : descriptor.AllowEmpty !== false,
            VisibleWhen   : (typeof descriptor.VisibleWhen === 'function') ? descriptor.VisibleWhen : null,
            Multiline     : descriptor.Type === TYPE_TEXTAREA,
            MaxLength     : (typeof descriptor.MaxLength === 'number') ? descriptor.MaxLength : 0,
            Rows          : (typeof descriptor.Rows === 'number') ? descriptor.Rows : 3,
            Variant       : descriptor.Variant || '',
            Action        : (typeof descriptor.Action === 'function') ? descriptor.Action : null,
            Confirm       : (descriptor.Confirm && typeof descriptor.Confirm === 'object') ? descriptor.Confirm : null,
            Children      : []
        };

        if (Array.isArray(descriptor.Children)) {
            for (var i = 0; i < descriptor.Children.length; i++) {
                var child  =  VghLantern__ControlDescriptors__Normalise(descriptor.Children[i]);
                if (child) normalised.Children.push(child);
            }
        }

        return normalised;
    }
    // ------------------------------------------------------------


    // FUNCTION | Test Whether a Descriptor Should Be Rendered
    // ------------------------------------------------------------
    function VghLantern__ControlDescriptors__IsVisible(descriptor, lantern) {
        if (!descriptor) return false;
        if (!descriptor.VisibleWhen) return true;

        try {
            return descriptor.VisibleWhen(lantern) === true;
        } catch (e) {
            console.warn('[VghLantern__ControlDescriptors] VisibleWhen threw for ' + descriptor.Key + ':', e);
            return true;                                                     // <-- Show rather than silently hide a control
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Value Read and Write
// -----------------------------------------------------------------------------

    // FUNCTION | Read the Current Value of a Descriptor from a Lantern
    // ------------------------------------------------------------
    function VghLantern__ControlDescriptors__ReadValue(lantern, descriptor) {
        if (!lantern || !descriptor || !descriptor.Block || !descriptor.Field) return null;

        var block  =  lantern[descriptor.Block];
        if (!block) return null;

        return block[descriptor.Field];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Coerce a Raw Input Value to the Descriptor's Type
    // ------------------------------------------------------------
    function VghLantern__ControlDescriptors__CoerceValue(descriptor, rawValue) {
        if (descriptor.Type === TYPE_TOGGLE || descriptor.Type === TYPE_EXPANDABLE) {
            return rawValue === true || rawValue === 'true';
        }

        if (descriptor.Type === TYPE_SELECT) {
            return String(rawValue === null || rawValue === undefined ? '' : rawValue);
        }

        if (descriptor.Type === TYPE_TEXT || descriptor.Type === TYPE_TEXTAREA) {
            var textValue  =  String(rawValue === null || rawValue === undefined ? '' : rawValue);
            if (descriptor.MaxLength > 0 && textValue.length > descriptor.MaxLength) {
                textValue  =  textValue.slice(0, descriptor.MaxLength);
            }
            return textValue;
        }

        var numeric  =  parseFloat(rawValue);
        if (!isFinite(numeric)) return null;

        if (typeof descriptor.Min === 'number') numeric  =  Math.max(descriptor.Min, numeric);
        if (typeof descriptor.Max === 'number') numeric  =  Math.min(descriptor.Max, numeric);

        if (descriptor.Decimals > 0) {
            var factor  =  Math.pow(10, descriptor.Decimals);
            return Math.round(numeric * factor) / factor;
        }

        return Math.round(numeric);
    }
    // ------------------------------------------------------------


    // FUNCTION | Write a Value into a Lantern Block
    // ------------------------------------------------------------
    // Mutates the lantern in place and reports whether anything actually changed,
    // so the caller can skip a solve and a redraw on a no-op edit. Returning a
    // result object rather than a bare boolean lets callers log the stored value,
    // which may differ from what the user typed after clamping.
    function VghLantern__ControlDescriptors__WriteValue(lantern, descriptor, rawValue) {
        if (!lantern || !descriptor || !descriptor.Block || !descriptor.Field) {
            return { DidChange : false, Value : null };
        }

        var block  =  lantern[descriptor.Block];
        if (!block) return { DidChange : false, Value : null };

        var nextValue  =  VghLantern__ControlDescriptors__CoerceValue(descriptor, rawValue);
        if (nextValue === null) return { DidChange : false, Value : block[descriptor.Field] };

        if (block[descriptor.Field] === nextValue) {
            return { DidChange : false, Value : nextValue };
        }

        block[descriptor.Field]  =  nextValue;
        return { DidChange : true, Value : nextValue };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Section Assembly
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Invoke One Section Builder
    // ------------------------------------------------------------
    function VghLantern__ControlDescriptors__BuildOneSection(sectionCfg, lantern) {
        var binding  =  SECTION_BUILDERS[sectionCfg.Key];
        if (!binding) {
            console.warn('[VghLantern__ControlDescriptors] No builder registered for section:', sectionCfg.Key);
            return null;
        }

        var module  =  window[binding.Global];
        if (!module || typeof module[binding.Fn] !== 'function') {
            console.warn('[VghLantern__ControlDescriptors] Section builder unavailable:', binding.Global);
            return null;
        }

        var rawControls  =  module[binding.Fn](lantern) || [];
        var controls     =  [];

        for (var i = 0; i < rawControls.length; i++) {
            var normalised  =  VghLantern__ControlDescriptors__Normalise(rawControls[i]);
            if (normalised) controls.push(normalised);
        }

        return {
            Key      : sectionCfg.Key,
            Label    : sectionCfg.Label || sectionCfg.Key,
            IsOpen   : sectionCfg.DefaultOpen === true,
            Controls : controls
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Full Ordered Section List for a Lantern
    // ------------------------------------------------------------
    // Order and enablement come from config, so adding or reordering a section is
    // a JSON edit. A section that yields no controls is dropped rather than
    // rendered as an empty accordion.
    function VghLantern__ControlDescriptors__BuildSections(lantern) {
        var editorCfg     =  VghLantern__ControlDescriptors__EditorConfig();
        var sectionConfig =  editorCfg['VghLantern__LanternEditor__Config__Sections'] || [];
        var sections      =  [];

        for (var i = 0; i < sectionConfig.length; i++) {
            var sectionCfg  =  sectionConfig[i];
            if (!sectionCfg || sectionCfg.Enabled === false) continue;

            var section  =  VghLantern__ControlDescriptors__BuildOneSection(sectionCfg, lantern);
            if (section && section.Controls.length > 0) sections.push(section);
        }

        return sections;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__ControlDescriptors__TypeSlider      : TYPE_SLIDER,
        VghLantern__ControlDescriptors__TypeToggle      : TYPE_TOGGLE,
        VghLantern__ControlDescriptors__TypeSelect      : TYPE_SELECT,
        VghLantern__ControlDescriptors__TypeExpandable  : TYPE_EXPANDABLE,
        VghLantern__ControlDescriptors__TypeHeading     : TYPE_HEADING,
        VghLantern__ControlDescriptors__TypeText        : TYPE_TEXT,
        VghLantern__ControlDescriptors__TypeTextarea    : TYPE_TEXTAREA,
        VghLantern__ControlDescriptors__TypeButton      : TYPE_BUTTON,

        VghLantern__ControlDescriptors__BuildSections   : VghLantern__ControlDescriptors__BuildSections,
        VghLantern__ControlDescriptors__Normalise       : VghLantern__ControlDescriptors__Normalise,
        VghLantern__ControlDescriptors__IsVisible       : VghLantern__ControlDescriptors__IsVisible,
        VghLantern__ControlDescriptors__ResolveOptions  : VghLantern__ControlDescriptors__ResolveOptions,
        VghLantern__ControlDescriptors__ReadValue       : VghLantern__ControlDescriptors__ReadValue,
        VghLantern__ControlDescriptors__WriteValue      : VghLantern__ControlDescriptors__WriteValue,
        VghLantern__ControlDescriptors__Bounds          : VghLantern__ControlDescriptors__Bounds,
        VghLantern__ControlDescriptors__Behaviour       : VghLantern__ControlDescriptors__Behaviour
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__LanternEditor__ControlDescriptors  =  VghLantern__LanternEditor__ControlDescriptors;
