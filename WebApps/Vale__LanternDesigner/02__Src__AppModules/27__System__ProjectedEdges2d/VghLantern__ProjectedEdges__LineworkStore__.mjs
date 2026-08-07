/* =============================================================================
   VGHLANTERN - PROJECTED EDGES | LINEWORK STORE
   =============================================================================

   FILE       : VghLantern__ProjectedEdges__LineworkStore__.mjs
   NAMESPACE  : VghLantern
   MODULE     : ProjectedEdges - LineworkStore
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Keep rendered linework in the project file, and know when it is stale
   CREATED    : 07-Aug-2026

   DESCRIPTION:
   - Turns the in-memory result cache into a block that lives in the project JSON,
     and turns it back again when the project is opened.
   - So a lantern rendered on Tuesday still has its linework on Thursday, on a
     different machine, without anybody pressing anything.

   ---------------------------------------------------------------------------

   WHY THIS BLOCK CARRIES A FINGERPRINT

   Stored linework is only worth having if it can be trusted, and linework that has
   outlived its geometry is worse than none: it looks authoritative and it is wrong.

   So the block records a fingerprint of the lantern it was produced from. On load
   the fingerprint is recomputed from the lantern in hand and compared. Match, and
   the linework is restored and shown. Differ, and it is ignored - the drawing shows
   nothing and the button offers a fresh render, exactly as if the file had never
   held any.

   The fingerprint covers the same blocks the in-memory cache key covers, so a change
   that would have discarded the cache mid-session also discards it across sessions.
   Sheet layout, notes and identity are excluded, which is what lets someone reopen a
   project, move a view on the sheet and still have their linework.

   ---------------------------------------------------------------------------

   ON THE SHAPE OF WHAT IS WRITTEN

   Plain numbers in plain arrays, four per segment, in drawing millimetres. Not
   packed, not encoded, not compressed - because the point of putting this in the
   project file is that something OTHER than this module can read it later, and the
   next script to want these coordinates should not have to find this file first to
   learn how to unpack them.

   The cost of that choice is size: a fully rendered lantern adds a few hundred
   kilobytes to a project. Coordinates are rounded to the same precision the SVG
   layer draws at, which is what keeps it to a few hundred rather than a few
   thousand - full double precision would roughly treble the figure and not change
   a single pixel of any drawing.

   ---------------------------------------------------------------------------

   PUBLIC API:
       BlockName()                                  -> the project block key
       Fingerprint(stageKey)                        -> short stable string
       Serialise(entries, meta)                     -> block object
       Deserialise(block, fingerprint)              -> [{ ViewKey, Segments }] or []
       DescribeBlock(block)                         -> one line for logs

   ============================================================================= */

// =============================================================================
// REGION | Projected Edges Linework Store Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Block Identity
    // ------------------------------------------------------------
    // Named in the application's lantern block convention so the schema normaliser
    // treats it like any other recorded block. SchemaVersion is written into every
    // block so that a later change of shape can be recognised rather than guessed
    // at: a reader that does not know the version it finds should ignore the block
    // and let the user render again, which costs a second and is always safe.
    const BLOCK_NAME      =  'Lantern__ProjectedLinework__Data';
    const SCHEMA_VERSION  =  1;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Stored Precision
    // ------------------------------------------------------------
    // Two decimal places of a millimetre, matching the SVG layer's own rounding.
    // Storing more would be storing digits that provably never reach a drawing.
    const STORED_DECIMALS  =  2;
    const STORED_FACTOR    =  Math.pow(10, STORED_DECIMALS);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Identity and Fingerprinting
// -----------------------------------------------------------------------------

    // FUNCTION | The Project Block This Module Owns
    // ------------------------------------------------------------
    export function VghLantern__ProjectedEdges__LineworkStore__BlockName() {
        return BLOCK_NAME;
    }
    // ------------------------------------------------------------


    // FUNCTION | Reduce a Stage Key to a Short Stable String
    // ------------------------------------------------------------
    // FNV-1a over the serialised lantern. Not a cryptographic hash and not trying to
    // be: it is guarding against a lantern having changed, not against somebody
    // forging one, and the failure it must avoid is a FALSE MATCH.
    //
    // Length is included alongside the hash for that reason. Two different lanterns
    // colliding on a 32 bit hash is around a one in four billion event; colliding on
    // the hash AND the exact serialised length is not something that happens by
    // accident, and the cost of the extra safety is eight characters.
    export function VghLantern__ProjectedEdges__LineworkStore__Fingerprint(stageKey) {
        if (typeof stageKey !== 'string' || stageKey.length === 0) return null;

        let hash  =  0x811c9dc5;
        for (let i = 0; i < stageKey.length; i++) {
            hash  ^=  stageKey.charCodeAt(i);
            hash   =  Math.imul(hash, 0x01000193) >>> 0;
        }

        return hash.toString(16).padStart(8, '0') + '-' + stageKey.length.toString(16);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Writing
// -----------------------------------------------------------------------------

    // SUB HELPER FUNCTION | Round One Segment Buffer for Storage
    // ------------------------------------------------------------
    function VghLantern__ProjectedEdges__LineworkStore__RoundBuffer(segments) {
        const out  =  new Array(segments.length);

        for (let i = 0; i < segments.length; i++) {
            out[i]  =  Math.round(segments[i] * STORED_FACTOR) / STORED_FACTOR;
        }

        return out;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Project Block From Rendered Results
    // ------------------------------------------------------------
    // entries is [{ ViewKey, Segments }]. meta carries whatever the caller knows
    // about the render that produced them; everything in it is recorded, because
    // the whole reason this block has a meta section is that a script written next
    // year should be able to work out where these numbers came from without asking
    // anybody.
    export function VghLantern__ProjectedEdges__LineworkStore__Serialise(entries, meta, limits) {
        const bounds  =  limits || {};
        const views   =  {};
        let   total   =  0;
        let   refused =  0;

        entries.forEach(function(entry) {
            if (!entry || !entry.Segments || entry.Segments.length < 4) return;

            const count  =  Math.floor(entry.Segments.length / 4);

            // A view too big to store is skipped rather than truncated. Half a
            // drawing restored next session would look like linework that had lost
            // detail, which is a worse answer than none: this way the button simply
            // offers a render, which is honest and takes a second.
            if (typeof bounds.MaxSegmentsPerView === 'number' && count > bounds.MaxSegmentsPerView) {
                console.warn('[VghLantern ProjectedEdges] ' + entry.ViewKey + ' has ' + count +
                             ' segments, over the ' + bounds.MaxSegmentsPerView +
                             ' storage ceiling. It will not be saved with the project.');
                refused++;
                return;
            }

            total  +=  count;

            views[entry.ViewKey]  =  {
                SegmentCount : count,
                Coordinates  : VghLantern__ProjectedEdges__LineworkStore__RoundBuffer(entry.Segments)
            };
        });

        if (Object.keys(views).length === 0) return null;

        const stamp  =  new Date();

        const block  =  {
            Meta : {
                Description         : 'Projected 3D linework, rendered from the solid model and stored so it survives between sessions. Coordinates are drawing millimetres in Env2d space (x right, y DOWN), four numbers per segment: x0, y0, x1, y1. They are already in the space the 2D viewports draw in, so they need no fitting, scaling or centring. Ignore this block entirely if LanternFingerprint does not match the lantern you are holding: the linework belongs to a shape that has since changed.',
                SchemaVersion       : SCHEMA_VERSION,
                RenderedAtIso       : stamp.toISOString(),
                RenderedAtEpochMs   : stamp.getTime(),
                RenderedAtLocal     : stamp.toString(),
                RenderedBy          : (meta && meta.RenderedBy)  || 'unknown',
                AppVersion          : (meta && meta.AppVersion)  || 'unknown',
                Backend             : (meta && meta.Backend)     || 'unknown',
                LanternFingerprint  : (meta && meta.Fingerprint) || null,
                CoordinateSpace     : 'Env2d drawing millimetres, y down',
                CoordinateOrder     : 'x0, y0, x1, y1',
                CoordinateDecimals  : STORED_DECIMALS,
                ViewCount           : Object.keys(views).length,
                ViewsRefused        : refused,
                SegmentCount        : total
            },
            Views : views
        };

        // Measured rather than estimated, because the ceiling exists to protect a
        // real localStorage quota and a guess would either waste the allowance or
        // blow through it. Serialising twice costs a few milliseconds once per
        // render, against a save that fails for the whole project.
        if (typeof bounds.MaxKilobytes === 'number') {
            const kilobytes  =  JSON.stringify(block).length / 1024;

            if (kilobytes > bounds.MaxKilobytes) {
                console.warn('[VghLantern ProjectedEdges] Rendered linework is ' + Math.round(kilobytes) +
                             ' kB, over the ' + bounds.MaxKilobytes + ' kB storage ceiling. ' +
                             'It stays on screen but will not be saved with the project.');
                return null;
            }

            block.Meta.ApproximateKilobytes  =  Math.round(kilobytes);
        }

        return block;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Reading
// -----------------------------------------------------------------------------

    // FUNCTION | Recover Rendered Linework From a Project Block
    // ------------------------------------------------------------
    // Returns an empty list rather than throwing for every reason it might decline:
    // no block, a schema it does not recognise, or a fingerprint belonging to a
    // different shape. In all three cases the correct behaviour is identical - show
    // nothing and let the user render - so they are not worth distinguishing to the
    // caller, only to the console.
    export function VghLantern__ProjectedEdges__LineworkStore__Deserialise(block, fingerprint) {
        if (!block || !block.Meta || !block.Views) return [];

        if (block.Meta.SchemaVersion !== SCHEMA_VERSION) {
            console.info('[VghLantern ProjectedEdges] Stored linework is schema v' + block.Meta.SchemaVersion +
                         ' and this build reads v' + SCHEMA_VERSION + '. Ignoring it; render again to replace it.');
            return [];
        }

        if (!fingerprint || block.Meta.LanternFingerprint !== fingerprint) {
            console.info('[VghLantern ProjectedEdges] Stored linework belongs to an earlier shape of this lantern. Ignoring it.');
            return [];
        }

        const recovered  =  [];

        Object.keys(block.Views).forEach(function(viewKey) {
            const view  =  block.Views[viewKey];
            if (!view || !Array.isArray(view.Coordinates)) return;

            const usable  =  Math.floor(view.Coordinates.length / 4) * 4;
            if (usable < 4) return;

            const segments  =  new Float32Array(usable);
            for (let i = 0; i < usable; i++) segments[i]  =  view.Coordinates[i];

            recovered.push({ ViewKey : viewKey, Segments : segments });
        });

        return recovered;
    }
    // ------------------------------------------------------------


    // FUNCTION | Describe a Stored Block in One Line
    // ------------------------------------------------------------
    export function VghLantern__ProjectedEdges__LineworkStore__DescribeBlock(block) {
        if (!block || !block.Meta) return 'no stored linework';

        return block.Meta.ViewCount + ' view(s), ' +
               block.Meta.SegmentCount + ' segments, rendered ' +
               block.Meta.RenderedAtIso + ' by ' + block.Meta.RenderedBy +
               ' [' + block.Meta.Backend + ']';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
