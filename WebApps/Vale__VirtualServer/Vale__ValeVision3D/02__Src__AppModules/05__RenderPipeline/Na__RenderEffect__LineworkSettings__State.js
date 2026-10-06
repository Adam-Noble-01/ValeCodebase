// =============================================================================
// VALEVISION3D - RENDER EFFECT - LINEWORK SETTINGS STATE
// =============================================================================
//
// FILE       : Na__RenderEffect__LineworkSettings__State.js
// NAMESPACE  : Na__LineworkSettings
// MODULE     : Linework Settings State
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Session-scoped runtime thickness factors for model linework and
//              profile lines, plus the "Silly Lines" wave amplitude. Shared by
//              the live viewport render pipeline and the static image exports.
// CREATED    : 08-Jul-2026
//
// DESCRIPTION:
// - Holds three session-scoped values (no persistence by design - every new
//   session initialises to 1.00x factors and straight lines):
//     - Linework thickness factor ..... multiplies LineMaterial.linewidth on
//       every fat line inside a linework-tagged GLB root (grid lines excluded).
//     - Profile line thickness factor . multiplies the per-frame dynamic edge
//       width computed inside the profile lines effect (read via getter).
//     - Silly Lines amplitude ......... sine-wave px amplitude applied to the
//       profile lines edge sampling (0 = straight).
// - Base LineMaterial widths are stashed on material.userData on first touch
//   so repeated factor changes never compound.
// - Silly uniforms are re-applied automatically after a render engine switch
//   (the composer and profile lines pass are rebuilt by the switch).
// - A NESTED DETAIL TAG IS NOT THE WALL IT SITS IN. For the length of one
//   Layout Editor render the snapshot renderer may hand the base width
//   override a list of LineworkModifier rules (SSOT 76-79), one per tag:
//   { TagName, hidden, widthFactor, hex }. A linework node whose own name
//   begins with a TagName then draws at the override x widthFactor in the
//   rule's colour, on a cached material of its own (materials are shared
//   across nodes, so writing the width onto a shared one would drag every
//   ordinary edge with it), or is taken out of the picture when its Model
//   Layers row is off. Clearing the override puts every node back on its
//   own material and visibility. With no rules, or no node carrying one of
//   the tags, nothing differs from 1.1.0 by a single width.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__SnapshotRenderer__.js
//                   (the nested LineworkModifier rules only - ModifierRuleFor, ModifierMaterial and the
//                   modifier half of SetModelEdgeWidth and RestoreModelEdgeWidth; the rest of this module
//                   is this app's own, authored in ValeVision3D first, 08-Jul-2026)
// - Source version: 1.13.0 (TrueVision3D v2.161.0, 28-Sep-2026; read at b2aa9151) - the rules themselves
//                   are TrueVision commit 6076ec10 (21-Sep-2026), unlogged in that module's log
// - Ported on     : 02-Oct-2026 for ValeVision3D v2.71.4
// - Parity        : adapted (DR-31 (3), D-S04a-08) - TrueVision's rules, applied through this module
// - Divergences   :
//   - The rules live here and not in the snapshot renderer. TrueVision's renderer writes every line
//     material's width itself; this app's renderer goes through SetLineworkBaseOverride (DIV-1), and the
//     tiled exporter re-applies every linework width from this module when it sets its export scales,
//     which would flatten a width written anywhere else. The rule list is therefore the optional second
//     argument of SetLineworkBaseOverride and lives exactly as long as the override.
//   - A modifier edge is base x widthFactor x the user factor x the export scale (TrueVision draws the
//     Base Image weight x widthFactor), so the export compensation keeps working for it as for any edge.
//   - The cached material keeps the loader's depth-bias shader hook (onBeforeCompile and its program
//     cache key), which three's Material.copy does not carry; TrueVision's clone drops it.
//   - Applying is idempotent - every node goes back to its own material and visibility before the rules
//     are applied again, so a re-apply (export scales, the user factor) never compounds.
// - Back-port     : the depth-bias hook on the cloned material (TrueVision's SnapshotRenderer
//                   ModifierMaterial), queued for the TrueVision lane with Adam's approval (DR-36).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 02-Oct-2026 - Version 1.2.0 (v2.71.4)
// - SetLineworkBaseOverride(widthPx, modifiers): an optional list of nested
//   LineworkModifier rules for the same render - per-tag width factor,
//   colour and hidden - on cached per-tag materials, put back with the
//   override. ModifierRuleFor exported to be verifiable headlessly.
//
// 13-Sep-2026 - Version 1.1.0
// - SetLineworkBaseOverride: one width in place of every linework material's
//   stashed base for the length of a Layout Editor render (the Base Image
//   composite weight). The user factor and the export scale still multiply it.
//
// 08-Jul-2026 - Version 1.0.0
// - Initial release alongside the Advanced Linework Settings export panel UI.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Render Loop Invalidation
    // ------------------------------------------------------------
    import { Na__RenderLoop__RequestRender } from './Na__RenderLoop__Invalidation.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Silly Lines Wave Geometry
    // ------------------------------------------------------------
    const Na__LineworkSettings__SILLY_WAVELENGTH_PX = 120;   // <-- Fixed sine wavelength in pixels (amplitude is the user control)
    // ------------------------------------------------------------

    // MODULE VARIABLES | Session-Scoped Settings (No Persistence by Design)
    // ------------------------------------------------------------
    let Na__LineworkSettings__LineworkFactor   = 1.0;   // <-- Fat-line width multiplier (model linework GLBs)
    let Na__LineworkSettings__ProfileFactor    = 1.0;   // <-- Profile line edge width multiplier
    let Na__LineworkSettings__SillyAmplitudePx = 0.0;   // <-- Sine amplitude in px (0 = straight lines)
    // ------------------------------------------------------------

    // MODULE VARIABLES | Export Line Scales (Static Export Renderer Only)
    // ------------------------------------------------------------
    // Pixel-based line widths mean different RELATIVE sizes at export
    // resolutions than in the viewport. The tiled export renderer sets
    // these resolution-compensation scales for the duration of an export
    // (and resets them to 1.0 in its finally) so 1.00x on the user sliders
    // always means "exactly what the viewport shows". Profile lines and
    // fat linework need DIFFERENT scales because profile widths are
    // physical-viewport-px based while LineMaterial widths are resolved
    // against each material's load-time resolution uniform.
    // ------------------------------------------------------------
    let Na__LineworkSettings__ProfileExportScale  = 1.0; // <-- Multiplies u_edgeWidth during exports (1.0 = live viewport)
    let Na__LineworkSettings__LineworkExportScale = 1.0; // <-- Multiplies LineMaterial.linewidth during exports (1.0 = live viewport)
    // ------------------------------------------------------------

    // MODULE VARIABLES | Base Width Override (Layout Editor Snapshot Renderer Only)
    // ------------------------------------------------------------
    // One Layout Editor viewport's Base Image weight, standing in for every
    // linework material's stashed base width for the length of one render. The
    // user factor and the export scale still multiply it, so the export
    // compensation above keeps working. null = each material's own base.
    // ------------------------------------------------------------
    let Na__LineworkSettings__LineworkBaseOverride = null;
    // ------------------------------------------------------------

    // MODULE VARIABLES | Nested LineworkModifier Rules (Layout Editor Snapshot Renderer Only)
    // ------------------------------------------------------------
    // The rules handed in with the base width override, [{ TagName, hidden,
    // widthFactor, hex }], or null. The material cache is kept across renders,
    // not rebuilt per render: a render is tiled and the widths are applied
    // again for every export scale, so cloning each time would churn a GPU
    // program. What was swapped or hidden is recorded so it can be put back.
    // ------------------------------------------------------------
    let   Na__LineworkSettings__LineworkModifiers = null;
    const Na__LineworkSettings__ModifierMaterials = new Map();   // <-- source uuid | tag | hex -> cloned material
    const Na__LineworkSettings__ModifierSwapped   = new Map();   // <-- node -> its own material, put back by reference
    const Na__LineworkSettings__ModifierHidden    = new Set();   // <-- nodes taken out of this one picture
    // ------------------------------------------------------------

    // MODULE VARIABLES | Wired References
    // ------------------------------------------------------------
    let Na__LineworkSettings__Scene            = null;  // <-- Scene root for linework traversal
    let Na__LineworkSettings__GetPipelineState = null;  // <-- Pipeline state getter (profile lines pass access)
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Walk Parent Chain to Detect Linework GLB Root
    // ------------------------------------------------------------
    // Mirrors the model loader tag: linework GLB roots carry
    // userData.Na__ModelType === 'linework'. Grid lines and other fat-line
    // systems are untagged and therefore excluded from the thickness factor.
    // ------------------------------------------------------------
    function Na__LineworkSettings__IsInsideLineworkGroup(object) {
        let current = object;                                                 // <-- Start at the object itself
        while (current) {
            if (current.userData && current.userData.Na__ModelType === 'linework') {
                return true;                                                  // <-- Found linework root in ancestor chain
            }
            current = current.parent;                                         // <-- Walk up scene graph
        }
        return false;                                                         // <-- No linework ancestor found
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Which Nested Detail Tag Owns This Linework Node, If Any
    // ------------------------------------------------------------
    // Matched as a LEADING PREFIX, never a split and never an exact compare:
    // three.js rewrites node names as it loads them, stripping [ ] . : / and
    // suffixing duplicates _1, _2 - so the exporter's '<Tag>::<Material>'
    // arrives as '<Tag><Material>' and three nodes of one tag arrive as
    // '<Tag>', '<Tag>_1', '<Tag>_2'. Longest match wins so a tag that happens
    // to prefix another cannot win on list order.
    // ------------------------------------------------------------
    function Na__LineworkSettings__ModifierRuleFor(name, rules) {
        if (typeof name !== 'string' || name.length === 0) return null;
        if (!Array.isArray(rules)) return null;
        let best = null;
        for (let i = 0; i < rules.length; i++) {
            const tag = rules[i] && rules[i].TagName;
            if (typeof tag !== 'string' || tag.length === 0) continue;
            if (name.indexOf(tag) !== 0) continue;
            if (!best || tag.length > best.TagName.length) best = rules[i];
        }
        return best;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Cached Material per Source Material and Detail Tag
    // ------------------------------------------------------------
    // Keyed by the source material and the tag, so two tags sharing a source
    // material still get a width and colour each. The clone takes the rule's
    // COLOUR as well as its width, and turns vertex colours off to do it - the
    // imported linework carries SketchUp's own edge colours per vertex, which
    // would otherwise multiply the chosen colour away to nothing.
    //
    // THE DEPTH BIAS RIDES ACROSS BY HAND. The model loader gives every fat
    // line material an onBeforeCompile hook that pulls the line in front of
    // its own face (most of all through the drawings' orthographic cameras),
    // and three's Material.copy does not carry an instance's hook - so a bare
    // clone drew its detail edges without the bias, half-buried in the face.
    // ------------------------------------------------------------
    function Na__LineworkSettings__ModifierMaterial(source, rule) {
        if (!source || typeof source.clone !== 'function') return source;
        const key   = source.uuid + '|' + rule.TagName + '|' + (rule.hex || '');
        let   clone = Na__LineworkSettings__ModifierMaterials.get(key);
        if (clone) return clone;

        clone = source.clone();
        if (Object.prototype.hasOwnProperty.call(source, 'onBeforeCompile'))       clone.onBeforeCompile       = source.onBeforeCompile;        // <-- The loader's depth bias
        if (Object.prototype.hasOwnProperty.call(source, 'customProgramCacheKey')) clone.customProgramCacheKey = source.customProgramCacheKey;
        if (typeof rule.hex === 'string' && clone.color && typeof clone.color.set === 'function') {
            clone.color.set(rule.hex);
            clone.vertexColors = false;                                       // <-- Or SketchUp's own edge colours multiply it away
            clone.needsUpdate  = true;
        }
        Na__LineworkSettings__ModifierMaterials.set(key, clone);
        return clone;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Put Every Modifier Node Back on Its Own Material and Visibility
    // ------------------------------------------------------------
    // Only what this module changed: a node that was already hidden before a
    // rule hid it was never recorded, so it stays hidden.
    // ------------------------------------------------------------
    function Na__LineworkSettings__RestoreModifierNodes() {
        Na__LineworkSettings__ModifierSwapped.forEach((material, node) => { node.material = material; });
        Na__LineworkSettings__ModifierSwapped.clear();
        Na__LineworkSettings__ModifierHidden.forEach((node) => { node.visible = true; });
        Na__LineworkSettings__ModifierHidden.clear();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve the Active Profile Lines Pass
    // ------------------------------------------------------------
    function Na__LineworkSettings__ResolveProfileLinesPass() {
        const state = (typeof Na__LineworkSettings__GetPipelineState === 'function')
            ? Na__LineworkSettings__GetPipelineState()
            : null;
        return (state && state.profileLinesPassRef) ? state.profileLinesPassRef : null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Apply Silly Lines Uniforms to a Profile Lines Pass
    // ------------------------------------------------------------
    function Na__LineworkSettings__ApplySillyUniforms(pass) {
        if (!pass || !pass.material || !pass.material.uniforms) return;
        const uniforms = pass.material.uniforms;
        if (uniforms.u_sillyAmplitudePx)  uniforms.u_sillyAmplitudePx.value  = Na__LineworkSettings__SillyAmplitudePx;
        if (uniforms.u_sillyWavelengthPx) uniforms.u_sillyWavelengthPx.value = Na__LineworkSettings__SILLY_WAVELENGTH_PX;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Linework Settings State
    // ------------------------------------------------------------
    // Params:
    //   scene            {THREE.Scene}  Scene root for linework traversal
    //   getPipelineState {Function}     Returns the active render pipeline state
    // ------------------------------------------------------------
    function Na__LineworkSettings__Initialize(scene, getPipelineState) {
        Na__LineworkSettings__Scene            = scene || null;
        Na__LineworkSettings__GetPipelineState = getPipelineState || null;

        // ENGINE SWITCH | Rebuilt composer means a fresh profile lines pass
        // ------------------------------------------------------------
        window.addEventListener('na-render-engine-changed', () => {
            Na__LineworkSettings__ApplySillyUniforms(Na__LineworkSettings__ResolveProfileLinesPass()); // <-- Re-apply silly wave to the new pass
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Setters and Getters
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Apply Combined Width to All Linework Materials
    // ------------------------------------------------------------
    // Single applier shared by the user factor setter and the export
    // scale setter so the two multipliers always compose off the stashed
    // base width and never compound. Every modifier node goes back on its
    // own material and visibility first, so the rules (when a render has
    // set any) are applied afresh each time and never on top of themselves.
    // ------------------------------------------------------------
    function Na__LineworkSettings__ApplyLineworkWidths() {
        Na__LineworkSettings__RestoreModifierNodes();                         // <-- Own materials and visibility back before anything is applied
        if (!Na__LineworkSettings__Scene) return;

        const combined = Na__LineworkSettings__LineworkFactor * Na__LineworkSettings__LineworkExportScale; // <-- User factor x export compensation
        const rules    = Na__LineworkSettings__LineworkModifiers;             // <-- Nested detail tags for this render, or null

        Na__LineworkSettings__Scene.traverse((object) => {
            if (!object.isLine2 && !object.isLineSegments2)          return;  // <-- Fat lines only
            if (!Na__LineworkSettings__IsInsideLineworkGroup(object)) return; // <-- Model linework only (skip grid and helper lines)

            const material = object.material;
            if (!material || !Number.isFinite(material.linewidth)) return;

            if (!Number.isFinite(material.userData.Na__LineworkSettings__BaseWidth)) {
                material.userData.Na__LineworkSettings__BaseWidth = material.linewidth; // <-- Stash base once so factors never compound
            }
            const base = Number.isFinite(Na__LineworkSettings__LineworkBaseOverride)
                ? Na__LineworkSettings__LineworkBaseOverride                   // <-- A Layout Editor viewport's own edge width for this render
                : material.userData.Na__LineworkSettings__BaseWidth;

            // A NESTED DETAIL TAG IS NOT THE WALL IT SITS IN: its Model Layers
            // row decides its width, colour and whether it draws at all.
            const rule = rules ? Na__LineworkSettings__ModifierRuleFor(object.name, rules) : null;
            if (rule && rule.hidden === true) {
                if (object.visible !== false) {
                    Na__LineworkSettings__ModifierHidden.add(object);
                    object.visible = false;                                   // <-- Out of this one picture
                }
                return;
            }
            if (rule) {
                const own = Na__LineworkSettings__ModifierMaterial(material, rule);
                if (own !== material) {
                    Na__LineworkSettings__ModifierSwapped.set(object, material);
                    object.material = own;
                }
                const factor = (Number.isFinite(rule.widthFactor) && rule.widthFactor > 0) ? rule.widthFactor : 1;
                own.linewidth = base * factor * combined;                     // <-- The row's weight factor on this render's base
                return;
            }

            material.linewidth = base * combined;                             // <-- Apply combined width
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Linework Thickness Factor (Model Fat Lines)
    // ------------------------------------------------------------
    function Na__LineworkSettings__SetLineworkFactor(factor) {
        if (!Number.isFinite(factor) || factor <= 0) return;
        Na__LineworkSettings__LineworkFactor = factor;
        Na__LineworkSettings__ApplyLineworkWidths();                          // <-- Re-apply combined widths
        Na__RenderLoop__RequestRender();                                      // <-- Redraw viewport with new widths
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Export Line Scales (Called by the Static Export Renderer)
    // ------------------------------------------------------------
    // Set both compensation scales at export start; reset with (1, 1) in
    // the export renderer's finally. No render request - the export tile
    // loop owns the frame while these are active.
    // ------------------------------------------------------------
    function Na__LineworkSettings__SetExportScales(profileScale, lineworkScale) {
        Na__LineworkSettings__ProfileExportScale  = (Number.isFinite(profileScale)  && profileScale  > 0) ? profileScale  : 1.0;
        Na__LineworkSettings__LineworkExportScale = (Number.isFinite(lineworkScale) && lineworkScale > 0) ? lineworkScale : 1.0;
        Na__LineworkSettings__ApplyLineworkWidths();                          // <-- Push combined widths to linework materials
    }
    // ------------------------------------------------------------


    // FUNCTION | Set the Base Width Override (Called by the Layout Editor Snapshot Renderer)
    // ------------------------------------------------------------
    // Set before a viewport render, cleared with null in its finally. No render
    // request, for the same reason as the export scales: the render owns the
    // frame while this is set, and clearing it hands every material its own
    // base width back straight away.
    //
    // modifiers (optional): the viewport's nested LineworkModifier rules,
    // [{ TagName, hidden, widthFactor, hex }], as TrueVision's Viewport2d
    // Frame resolves them from the Model Layers rows. They live exactly as long
    // as the override: clearing it with null clears them too and puts every
    // detail node back on its own material and visibility. Absent, null or
    // empty means no rule, and every width is what 1.1.0 wrote.
    // ------------------------------------------------------------
    function Na__LineworkSettings__SetLineworkBaseOverride(widthPx, modifiers) {
        Na__LineworkSettings__LineworkBaseOverride = (Number.isFinite(widthPx) && widthPx > 0) ? widthPx : null;
        Na__LineworkSettings__LineworkModifiers    = (Na__LineworkSettings__LineworkBaseOverride !== null && Array.isArray(modifiers) && modifiers.length > 0)
            ? modifiers.slice()                                               // <-- This render's rules, held with the override
            : null;
        Na__LineworkSettings__ApplyLineworkWidths();                          // <-- Push the override (or each base again) to linework materials
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Profile Export Scale (Read Per Frame by Profile Lines)
    // ------------------------------------------------------------
    function Na__LineworkSettings__GetProfileExportScale() {
        return Na__LineworkSettings__ProfileExportScale;
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Profile Line Thickness Factor
    // ------------------------------------------------------------
    // The profile lines effect recomputes its dynamic edge width every
    // frame and multiplies by this factor (read via the getter below),
    // so a render request is all that is needed here.
    // ------------------------------------------------------------
    function Na__LineworkSettings__SetProfileLineFactor(factor) {
        if (!Number.isFinite(factor) || factor <= 0) return;
        Na__LineworkSettings__ProfileFactor = factor;
        Na__RenderLoop__RequestRender();                                      // <-- Next frame picks up the new factor
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Profile Line Thickness Factor (Read Per Frame)
    // ------------------------------------------------------------
    function Na__LineworkSettings__GetProfileLineFactor() {
        return Na__LineworkSettings__ProfileFactor;
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Silly Lines Wave Amplitude in Pixels
    // ------------------------------------------------------------
    function Na__LineworkSettings__SetSillyAmplitude(amplitudePx) {
        if (!Number.isFinite(amplitudePx) || amplitudePx < 0) return;
        Na__LineworkSettings__SillyAmplitudePx = amplitudePx;
        Na__LineworkSettings__ApplySillyUniforms(Na__LineworkSettings__ResolveProfileLinesPass()); // <-- Push to the live pass
        Na__RenderLoop__RequestRender();                                      // <-- Redraw viewport with new waviness
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Linework Settings API
    // ------------------------------------------------------------
    export {
        Na__LineworkSettings__Initialize,
        Na__LineworkSettings__SetLineworkFactor,
        Na__LineworkSettings__SetProfileLineFactor,
        Na__LineworkSettings__GetProfileLineFactor,
        Na__LineworkSettings__SetSillyAmplitude,
        Na__LineworkSettings__SetExportScales,
        Na__LineworkSettings__SetLineworkBaseOverride,
        Na__LineworkSettings__GetProfileExportScale,
        Na__LineworkSettings__ModifierRuleFor                                 // <-- Exported to be verifiable headlessly; the renderer passes rules, it never matches
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
