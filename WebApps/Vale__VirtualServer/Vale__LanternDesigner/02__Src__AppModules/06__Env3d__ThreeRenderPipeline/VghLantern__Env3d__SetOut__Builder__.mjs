/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | SETTING OUT - BUILDER
   =============================================================================

   FILE       : VghLantern__Env3d__SetOut__Builder__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - SetOut Builder
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Draw a SettingOutModel as coloured construction and datum lines
   CREATED    : 31-Jul-2026

   DESCRIPTION:
   - The 3D counterpart of the geometry layer's SettingOutModel. It draws datums,
     construction triangles and centrelines, and computes none of them.
   - Consumes ONLY the published setting-out model. It never reaches into the
     solved skeleton, because a construction view that re-derived its own geometry
     would be checking itself rather than the engine.
   - Every entity is drawn in the style its own Class and Family select, so adding
     a datum family to the model and a style to the config is the whole of adding
     a new line class.

   ---------------------------------------------------------------------------

   WHAT EACH CLASS DRAWS

       Datum         Outlines  - the perimeter traced at that exact level
                     RunLines  - an open run, the ridge being the case
                     Planes    - a sloped face outline, the glazing plane

       Construction  All three legs of the right angled triangle: the hypotenuse
                     (the real member), the plan run, and the vertical rise. The
                     run and the rise are the two that do not exist as metal, and
                     are the two that show where a wrong datum came from.

       Centreline    The member axis, exactly as the solver placed it.

   ---------------------------------------------------------------------------

   ONE BUFFER PER STYLE
   Stamped segments from every entity sharing a style accumulate into one bucket
   and become a single object, so a lantern with sixty glazing bars draws its
   centrelines in one call rather than sixty.

   ============================================================================= */

import {
    VghLantern__Env3d__SetOut__DashStamp__Polyline,
    VghLantern__Env3d__SetOut__DashStamp__Ring
} from './VghLantern__Env3d__SetOut__DashStamp__.mjs';

import {
    VghLantern__Env3d__SetOut__LineFactory__Build,
    VghLantern__Env3d__SetOut__LineFactory__Style,
    VghLantern__Env3d__SetOut__LineFactory__StyleKey,
    VghLantern__Env3d__SetOut__LineFactory__Pattern,
    VghLantern__Env3d__SetOut__LineFactory__SeedResolution
} from './VghLantern__Env3d__SetOut__LineFactory__.mjs';

import { VghLantern__Env3d__ConfigAccess__Section } from './VghLantern__Env3d__ConfigAccess__.mjs';

// =============================================================================
// REGION | Setting Out Builder Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Entity Classes
    // ------------------------------------------------------------
    const CLASS_DATUM         =  'Datum';
    const CLASS_CONSTRUCTION  =  'Construction';
    const CLASS_CENTRELINE    =  'Centreline';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Config Gate Field Names
    // ------------------------------------------------------------
    // Each class can be switched off independently, so a reviewer chasing one
    // datum can strip the view back to just that datum.
    const CLASS_ENABLE_FIELDS  =  {
        Datum         : 'ShowDatums',
        Construction  : 'ShowConstructionTriangles',
        Centreline    : 'ShowCentrelines'
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Segment Bucketing
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Add Stamped Segments to a Style Bucket
    // ------------------------------------------------------------
    function VghLantern__Env3d__SetOut__Builder__Collect(buckets, styleKey, segments) {
        if (!segments || segments.length === 0) return;

        if (!buckets[styleKey]) buckets[styleKey]  =  [];
        for (let i = 0; i < segments.length; i++) buckets[styleKey].push(segments[i]);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Whether a Class Is Enabled by Config
    // ------------------------------------------------------------
    function VghLantern__Env3d__SetOut__Builder__IsClassEnabled(config, classKey) {
        const field  =  CLASS_ENABLE_FIELDS[classKey];
        if (!field) return false;

        return config[field] !== false;                                      // <-- Absent means enabled
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Class Builders
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Stamp Every Run a Datum Owns
    // ------------------------------------------------------------
    // A level datum is a plane, and it is drawn as the perimeter traced at that
    // exact height rather than as a single line, because that is what a level is.
    // The ridge is the exception the model already accounts for: it publishes a
    // run and no outline, since a rectangle at ridge level would trace thin air.
    function VghLantern__Env3d__SetOut__Builder__BuildDatum(buckets, datum, patternMm, styleKey) {
        const outlines  =  datum.Outlines || [];
        for (let i = 0; i < outlines.length; i++) {
            VghLantern__Env3d__SetOut__Builder__Collect(buckets, styleKey,
                VghLantern__Env3d__SetOut__DashStamp__Ring(outlines[i], patternMm));
        }

        const runLines  =  datum.RunLines || [];
        for (let i = 0; i < runLines.length; i++) {
            VghLantern__Env3d__SetOut__Builder__Collect(buckets, styleKey,
                VghLantern__Env3d__SetOut__DashStamp__Polyline(runLines[i], patternMm));
        }

        const planes  =  datum.Planes || [];
        for (let i = 0; i < planes.length; i++) {
            VghLantern__Env3d__SetOut__Builder__Collect(buckets, styleKey,
                VghLantern__Env3d__SetOut__DashStamp__Ring(planes[i].Points, patternMm));
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Stamp the Three Legs of a Construction Triangle
    // ------------------------------------------------------------
    // Drawn as one continuous run foot to head to corner and back to foot, so the
    // dash pattern carries round the triangle as a single figure rather than
    // restarting three times and reading as three unrelated lines.
    function VghLantern__Env3d__SetOut__Builder__BuildTriangle(buckets, triangle, patternMm, styleKey) {
        const corners  =  triangle.Corners;
        if (!corners || !corners.Foot || !corners.Head || !corners.Corner) return;

        VghLantern__Env3d__SetOut__Builder__Collect(buckets, styleKey,
            VghLantern__Env3d__SetOut__DashStamp__Polyline(
                [corners.Foot, corners.Head, corners.Corner, corners.Foot], patternMm
            ));
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Stamp Every Segment of a Centreline Set
    // ------------------------------------------------------------
    function VghLantern__Env3d__SetOut__Builder__BuildCentreline(buckets, centreline, patternMm, styleKey) {
        const segments  =  centreline.Segments || [];

        for (let i = 0; i < segments.length; i++) {
            VghLantern__Env3d__SetOut__Builder__Collect(buckets, styleKey,
                VghLantern__Env3d__SetOut__DashStamp__Polyline(segments[i], patternMm));
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Build Entry Point
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Record What a Style Actually Describes
    // ------------------------------------------------------------
    // Deliberately NOT the stamped segment count. A dashed datum is cut into
    // hundreds of dashes, so reporting segments against a datum would put a number
    // in the key that looks like a measurement and means nothing. What is worth
    // reporting differs by class:
    //
    //     Datum         its LEVEL, signed from the top of the builders upstand
    //     Construction  how many triangles of that kind exist
    //     Centreline    how many members it traces
    function VghLantern__Env3d__SetOut__Builder__Measure(measures, styleKey, entity) {
        if (!measures[styleKey]) {
            measures[styleKey]  =  {
                Class           : entity.Class,
                InstanceCount   : 0,
                RelativeLevelMm : null,
                RelativeRangeMm : null
            };
        }
        const measure  =  measures[styleKey];

        if (entity.Class === CLASS_DATUM) {
            measure.InstanceCount  +=  (entity.Outlines || []).length +
                                       (entity.RunLines || []).length +
                                       (entity.Planes   || []).length;

            if (entity.RelativeLevelMm !== null && entity.RelativeLevelMm !== undefined) {
                measure.RelativeLevelMm  =  entity.RelativeLevelMm;
            }
            if (entity.RelativeRangeMm) measure.RelativeRangeMm  =  entity.RelativeRangeMm;
            return;
        }

        if (entity.Class === CLASS_CENTRELINE) {
            measure.InstanceCount  +=  (entity.Segments || []).length;
            return;
        }

        measure.InstanceCount++;                                              // <-- One construction triangle
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Walk One Entity List Into the Style Buckets
    // ------------------------------------------------------------
    function VghLantern__Env3d__SetOut__Builder__WalkEntities(buckets, measures, entities, classKey, config, drawFn) {
        if (!Array.isArray(entities)) return;
        if (!VghLantern__Env3d__SetOut__Builder__IsClassEnabled(config, classKey)) return;

        for (let i = 0; i < entities.length; i++) {
            const entity  =  entities[i];
            if (!entity) continue;

            const styleKey   =  VghLantern__Env3d__SetOut__LineFactory__StyleKey(entity);
            const style      =  VghLantern__Env3d__SetOut__LineFactory__Style(styleKey);
            const patternMm  =  VghLantern__Env3d__SetOut__LineFactory__Pattern(style.Pattern);

            drawFn(buckets, entity, patternMm, styleKey);
            VghLantern__Env3d__SetOut__Builder__Measure(measures, styleKey, entity);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Build a Whole Setting Out Model Into a Target Group
    // ------------------------------------------------------------
    // Returns a manifest of what was drawn, which the overlay uses to build its
    // legend. The legend is therefore always the truth about what is on screen
    // rather than a hardcoded list that can fall out of step.
    export function VghLantern__Env3d__SetOut__Builder__Build(targetGroup, settingOutModel, surface) {
        if (!targetGroup || !settingOutModel) return [];

        const config    =  VghLantern__Env3d__ConfigAccess__Section('SetOut');
        const buckets   =  {};
        const measures  =  {};

        VghLantern__Env3d__SetOut__Builder__WalkEntities(
            buckets, measures, settingOutModel.Datums, CLASS_DATUM, config,
            VghLantern__Env3d__SetOut__Builder__BuildDatum
        );
        VghLantern__Env3d__SetOut__Builder__WalkEntities(
            buckets, measures, settingOutModel.Triangles, CLASS_CONSTRUCTION, config,
            VghLantern__Env3d__SetOut__Builder__BuildTriangle
        );
        VghLantern__Env3d__SetOut__Builder__WalkEntities(
            buckets, measures, settingOutModel.Centrelines, CLASS_CENTRELINE, config,
            VghLantern__Env3d__SetOut__Builder__BuildCentreline
        );

        const manifest   =  [];
        const styleKeys  =  Object.keys(buckets);

        for (let i = 0; i < styleKeys.length; i++) {
            const styleKey  =  styleKeys[i];
            const object3d  =  VghLantern__Env3d__SetOut__LineFactory__Build(
                buckets[styleKey], styleKey, 'VghLantern__Env3d__SetOut__' + styleKey
            );
            if (!object3d) continue;

            targetGroup.add(object3d);

            const style    =  VghLantern__Env3d__SetOut__LineFactory__Style(styleKey);
            const measure  =  measures[styleKey] || {};

            manifest.push({
                StyleKey        : styleKey,
                Label           : style.Label || styleKey,
                Colour          : style.Colour,
                Pattern         : style.Pattern || 'solid',
                Class           : measure.Class || '',
                InstanceCount   : measure.InstanceCount || 0,
                RelativeLevelMm : (measure.RelativeLevelMm === undefined) ? null : measure.RelativeLevelMm,
                RelativeRangeMm : measure.RelativeRangeMm || null
            });
        }

        VghLantern__Env3d__SetOut__LineFactory__SeedResolution(surface);
        return manifest;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
