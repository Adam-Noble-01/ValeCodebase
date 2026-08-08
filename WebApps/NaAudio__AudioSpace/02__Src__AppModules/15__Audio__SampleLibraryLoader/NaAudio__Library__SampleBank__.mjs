/* =============================================================================
   NAAUDIO - AUDIO LIBRARY | SAMPLE BANK
   =============================================================================

   FILE       : NaAudio__Library__SampleBank__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Library - SampleBank
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Query the catalogue, fetch and decode audio, hold the decoded cache
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - Sits on top of the generated indexes loaded by NaAudio__AppCore__ConfigLoader
     and gives the rest of the application two things: catalogue queries, and
     decoded AudioBuffers.
   - Nothing else in AudioSPACE calls fetch or decodeAudioData for audio. Nothing
     else knows what a library folder path looks like.

   ---------------------------------------------------------------------------

   WHY THE CATALOGUE IS A FILE AND NOT A DIRECTORY SCAN

   A static host - GitHub Pages, or a plain file server - has no directory listing.
   There is no way for a browser to ask what is in a folder. The generated index is
   therefore not a convenience or a cache; it IS the library as far as the runtime is
   concerned, and an asset absent from it does not exist.

   That is why the build utility is the only sanctioned way to add material, and why
   the indexes carry DoNotEditByHand. A file dropped into a bank folder without
   regenerating the index is invisible, and the failure mode - a sample that is
   obviously there but cannot be selected - is genuinely baffling if you do not know
   this rule.

   ---------------------------------------------------------------------------

   THE DECODE CACHE

   decodeAudioData is destructive: it detaches the ArrayBuffer it is handed. A second
   decode from the same buffer therefore throws, so the cache stores the decoded
   AudioBuffer and the in-flight promise, never the raw bytes.

   Caching the PROMISE rather than only the result matters. Two spatial modules
   binding the same kick on the same frame both ask for it before either has
   finished; without a shared promise that is two fetches and two decodes of
   identical bytes. Deduplicating on the promise makes the second caller await the
   first caller's work.

   ============================================================================= */

import { AudioNumber }             from '../03__AppUtils/NaAudio__AppUtils__ConfigAccess__.mjs';
import {
    NaAudio__ConfigLoader__LibraryIndex
} from '../01__AppCore/NaAudio__AppCore__ConfigLoader__.mjs';
import * as AudioHost              from '../10__Audio__WebAudioEngine/NaAudio__Engine__AudioHost__.mjs';
import {
    NaAudio__Event,
    NaAudio__EventBus__Publish
} from '../01__AppCore/NaAudio__AppCore__EventBus__.mjs';

// =============================================================================
// REGION | Sample Bank
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Catalogue Tables and Decode Cache
    // ------------------------------------------------------------
    const SAMPLES_BY_ID   =  new Map();                                      // <-- AssetId -> catalogue entry
    const LOOPS_BY_ID     =  new Map();
    const RESPONSES_BY_ID =  new Map();

    const KITS_BY_ID      =  new Map();                                      // <-- KitId -> { Kit, Samples: [] }

    const DECODE_CACHE    =  new Map();                                      // <-- AssetId -> AudioBuffer
    const DECODE_PENDING  =  new Map();                                      // <-- AssetId -> Promise<AudioBuffer>

    let   isCatalogued    =  false;
    let   activeDecodes   =  0;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Catalogue Ingest
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read One Index Into a Lookup Table
    // ------------------------------------------------------------
    function NaAudio__SampleBank__IngestIndex(registryName, entriesKey, table) {
        const record  =  NaAudio__ConfigLoader__LibraryIndex(registryName);
        if (!record) return 0;

        const entries  =  record.Index[entriesKey];
        if (!Array.isArray(entries)) return 0;

        for (let i = 0; i < entries.length; i++) {
            const entry  =  entries[i];

            // The absolute URL is resolved and stored once, here. Every consumer then
            // holds a ready URL rather than reassembling a path from a root and a
            // relative fragment at each call site.
            entry.ResolvedUrl  =  record.LibraryRootUrl + entry.AudioUrl;
            table.set(entry.AssetId, entry);
        }
        return entries.length;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Group the Kit Samples by Kit
    // ------------------------------------------------------------
    function NaAudio__SampleBank__IngestKits() {
        const record  =  NaAudio__ConfigLoader__LibraryIndex('samples');
        if (!record) return 0;

        const kits  =  record.Index['NaAudio__SampleLibraryIndex__Kits'];
        if (!Array.isArray(kits)) return 0;

        for (let i = 0; i < kits.length; i++) {
            KITS_BY_ID.set(kits[i].KitId, { Kit: kits[i], Samples: [] });
        }

        for (const entry of SAMPLES_BY_ID.values()) {
            if (!entry.KitId) continue;
            const kit  =  KITS_BY_ID.get(entry.KitId);
            if (kit) kit.Samples.push(entry);
        }

        for (const kit of KITS_BY_ID.values()) {
            kit.Samples.sort((left, right) => left.SortOrder - right.SortOrder);
        }

        return kits.length;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Catalogue From the Loaded Indexes
    // ------------------------------------------------------------
    export function NaAudio__SampleBank__BuildCatalogue() {
        if (isCatalogued) return;

        const sampleCount    =  NaAudio__SampleBank__IngestIndex('samples',          'NaAudio__SampleLibraryIndex__Samples',      SAMPLES_BY_ID);
        const loopCount      =  NaAudio__SampleBank__IngestIndex('loops',            'NaAudio__LoopLibraryIndex__Loops',          LOOPS_BY_ID);
        const responseCount  =  NaAudio__SampleBank__IngestIndex('impulseResponses', 'NaAudio__ImpulseResponseIndex__Responses',  RESPONSES_BY_ID);

        NaAudio__SampleBank__IngestKits();

        isCatalogued  =  true;

        NaAudio__EventBus__Publish(NaAudio__Event.LibraryIndexLoaded, {
            SampleCount   : sampleCount,
            LoopCount     : loopCount,
            ResponseCount : responseCount
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Catalogue Queries
// -----------------------------------------------------------------------------

    // FUNCTION | Look Up Any Catalogued Asset by Id
    // ------------------------------------------------------------
    // Searches all three tables. Asset id prefixes are distinct by construction -
    // SMP, LOP, IRS - so there is no ambiguity, and a caller holding an id from a
    // saved space does not have to remember which library it came from.
    export function NaAudio__SampleBank__Entry(assetId) {
        return SAMPLES_BY_ID.get(assetId) || LOOPS_BY_ID.get(assetId) || RESPONSES_BY_ID.get(assetId) || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Every Sample in a Kit, in Voice Order
    // ------------------------------------------------------------
    export function NaAudio__SampleBank__KitSamples(kitId) {
        const kit  =  KITS_BY_ID.get(kitId);
        return kit ? kit.Samples : [];
    }
    // ------------------------------------------------------------


    // FUNCTION | Every Kit in the Catalogue
    // ------------------------------------------------------------
    export function NaAudio__SampleBank__Kits() {
        return Array.from(KITS_BY_ID.values()).map((entry) => entry.Kit);
    }
    // ------------------------------------------------------------


    // FUNCTION | The Sample in a Kit Filling a Named Voice Role
    // ------------------------------------------------------------
    // How a sequencer lane binds. The lane names a ROLE - 'kick' - and the kit
    // answers with whatever sample fills it, so swapping the whole kit under a
    // pattern leaves every lane still pointing at something sensible.
    export function NaAudio__SampleBank__KitVoice(kitId, voiceRole) {
        const samples  =  NaAudio__SampleBank__KitSamples(kitId);
        for (let i = 0; i < samples.length; i++) {
            if (samples[i].VoiceRole === voiceRole) return samples[i];
        }
        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Every Sample in a Category
    // ------------------------------------------------------------
    export function NaAudio__SampleBank__CategorySamples(categoryId) {
        const found  =  [];
        for (const entry of SAMPLES_BY_ID.values()) {
            if (entry.CategoryId === categoryId) found.push(entry);
        }
        return found.sort((left, right) => left.AssetId.localeCompare(right.AssetId));
    }
    // ------------------------------------------------------------


    // FUNCTION | The Pitched Samples of a Multisample Bank, Ordered by Pitch
    // ------------------------------------------------------------
    export function NaAudio__SampleBank__PitchedSamples(categoryId) {
        return NaAudio__SampleBank__CategorySamples(categoryId)
            .filter((entry) => typeof entry.MidiNote === 'number')
            .sort((left, right) => left.MidiNote - right.MidiNote);
    }
    // ------------------------------------------------------------


    // FUNCTION | The Nearest Sample Point to a Wanted MIDI Note
    // ------------------------------------------------------------
    // How the multisampled piano covers the gaps between its sample points. Returns
    // the entry and the semitone offset the player must resample by.
    export function NaAudio__SampleBank__NearestPitched(categoryId, midiNote) {
        const pitched  =  NaAudio__SampleBank__PitchedSamples(categoryId);
        if (pitched.length === 0) return null;

        let nearest       =  pitched[0];
        let nearestDelta  =  Infinity;

        for (let i = 0; i < pitched.length; i++) {
            const delta  =  Math.abs(pitched[i].MidiNote - midiNote);
            if (delta < nearestDelta) {
                nearestDelta  =  delta;
                nearest       =  pitched[i];
            }
        }

        return { Entry: nearest, SemitoneOffset: midiNote - nearest.MidiNote };
    }
    // ------------------------------------------------------------


    // FUNCTION | Every Loop in the Catalogue
    // ------------------------------------------------------------
    export function NaAudio__SampleBank__Loops() {
        return Array.from(LOOPS_BY_ID.values());
    }
    // ------------------------------------------------------------


    // FUNCTION | Every Impulse Response in the Catalogue
    // ------------------------------------------------------------
    export function NaAudio__SampleBank__ImpulseResponses() {
        return Array.from(RESPONSES_BY_ID.values());
    }
    // ------------------------------------------------------------


    // FUNCTION | Catalogue Counts
    // ------------------------------------------------------------
    export function NaAudio__SampleBank__Counts() {
        return {
            Samples   : SAMPLES_BY_ID.size,
            Loops     : LOOPS_BY_ID.size,
            Responses : RESPONSES_BY_ID.size,
            Kits      : KITS_BY_ID.size,
            Decoded   : DECODE_CACHE.size,
            Pending   : DECODE_PENDING.size
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Fetch and Decode
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Wait Until a Decode Slot Is Free
    // ------------------------------------------------------------
    // decodeAudioData itself runs off the main thread, but the fetches do not, and an
    // unbounded fan-out of a hundred parallel requests stalls the first paint and can
    // starve the connection. The cap is a config value.
    async function NaAudio__SampleBank__AwaitDecodeSlot() {
        const limit  =  AudioNumber('SamplePlayer', 'DecodeConcurrency');
        while (activeDecodes >= limit) {
            await new Promise((resolve) => setTimeout(resolve, 8));
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Fetch and Decode One Asset
    // ------------------------------------------------------------
    async function NaAudio__SampleBank__FetchAndDecode(entry) {
        await NaAudio__SampleBank__AwaitDecodeSlot();
        activeDecodes += 1;

        try {
            const response  =  await fetch(entry.ResolvedUrl);
            if (!response.ok) {
                throw new Error('HTTP ' + response.status + ' fetching ' + entry.AudioUrl);
            }

            const bytes   =  await response.arrayBuffer();
            const context =  AudioHost.NaAudio__AudioHost__Context();

            // decodeAudioData is promise-based in every browser this application
            // targets. The callback form is deliberately not supported here - it has
            // no error path worth using and it cannot be awaited.
            const buffer  =  await context.decodeAudioData(bytes);

            DECODE_CACHE.set(entry.AssetId, buffer);

            NaAudio__EventBus__Publish(NaAudio__Event.LibraryAssetDecoded, {
                AssetId : entry.AssetId,
                Seconds : buffer.duration
            });

            return buffer;
        } finally {
            activeDecodes -= 1;
            DECODE_PENDING.delete(entry.AssetId);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Load and Decode an Asset, Returning Its AudioBuffer
    // ------------------------------------------------------------
    export async function NaAudio__SampleBank__Load(assetId) {
        const cached  =  DECODE_CACHE.get(assetId);
        if (cached) return cached;

        const pending  =  DECODE_PENDING.get(assetId);
        if (pending) return pending;                                          // <-- Two callers on the same frame share one fetch

        const entry  =  NaAudio__SampleBank__Entry(assetId);
        if (!entry) {
            NaAudio__EventBus__Publish(NaAudio__Event.LibraryLoadFailed, {
                AssetId : assetId,
                Reason  : 'Not in any catalogue index. Regenerate with NaAudio__BuildUtil__AudioLibraryIndex__.py.'
            });
            return null;
        }

        const promise  =  NaAudio__SampleBank__FetchAndDecode(entry).catch((error) => {
            NaAudio__EventBus__Publish(NaAudio__Event.LibraryLoadFailed, {
                AssetId : assetId,
                Reason  : error.message
            });
            return null;                                                      // <-- A missing sample must not abort a whole space load
        });

        DECODE_PENDING.set(assetId, promise);
        return promise;
    }
    // ------------------------------------------------------------


    // FUNCTION | Load Several Assets in Parallel
    // ------------------------------------------------------------
    // Returns a Map of asset id to buffer, omitting anything that failed. The caller
    // gets a partial result rather than one bad asset taking the whole space down.
    export async function NaAudio__SampleBank__LoadMany(assetIds) {
        const unique  =  Array.from(new Set(assetIds.filter(Boolean)));
        const buffers =  await Promise.all(unique.map((assetId) => NaAudio__SampleBank__Load(assetId)));

        const loaded  =  new Map();
        for (let i = 0; i < unique.length; i++) {
            if (buffers[i]) loaded.set(unique[i], buffers[i]);
        }
        return loaded;
    }
    // ------------------------------------------------------------


    // FUNCTION | An Already-Decoded Buffer, or Null
    // ------------------------------------------------------------
    // Synchronous. This is what a scheduler calls: it is inside a timing-critical
    // path and cannot await anything, so an asset that is not ready yet is simply
    // silent for that step rather than blocking the clock.
    export function NaAudio__SampleBank__Buffer(assetId) {
        return DECODE_CACHE.get(assetId) || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Whether an Asset Is Decoded and Ready to Play
    // ------------------------------------------------------------
    export function NaAudio__SampleBank__IsReady(assetId) {
        return DECODE_CACHE.has(assetId);
    }
    // ------------------------------------------------------------


    // FUNCTION | Release a Decoded Buffer
    // ------------------------------------------------------------
    // Decoded audio is large - a few seconds of stereo at 48k is megabytes of float
    // data. When the eventual smart asset loading described in the design manifest
    // lands, this is the hook it unloads through.
    export function NaAudio__SampleBank__Release(assetId) {
        DECODE_CACHE.delete(assetId);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
