/* =============================================================================
   NAAUDIO - APP CORE | EVENT BUS
   =============================================================================

   FILE       : NaAudio__AppCore__EventBus__.mjs
   NAMESPACE  : NaAudio
   MODULE     : AppCore - EventBus
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : One publish and subscribe channel shared by every subsystem
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - Four subsystems have to talk without knowing about each other: the audio
     engine, the 3D pipeline, the spatial modules and the HUD. This is where they
     do it.
   - Event names are published as a frozen vocabulary below rather than written as
     string literals at the call site, so a typo is a thrown reference error at
     load rather than an event that silently never fires.

   ---------------------------------------------------------------------------

   THE RULE THAT KEEPS THIS USEFUL

   The bus carries STATE CHANGES and USER INTENT. It does not carry per-frame
   data and it never carries an audio-rate event.

   A step firing on the sequencer is scheduled ahead of time on the audio clock
   and animated by the render loop reading the module's own state. It does not
   travel through here. If it did, a sixteen-step pattern at 140 BPM across four
   lanes would push several hundred synchronous handler chains a second through a
   Map iteration, and both the audio timing and the frame time would suffer for
   no benefit whatsoever.

   Anything at frame rate or audio rate is a direct call or a shared object read.
   The bus is for 'the transport started', 'a module was selected', 'the library
   finished loading'.

   ============================================================================= */

// =============================================================================
// REGION | Event Bus
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Event Vocabulary
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Published Event Names
    // ------------------------------------------------------------
    // Frozen so an accidental assignment fails loudly. Grouped by publisher.
    export const NaAudio__Event  =  Object.freeze({

        // BOOT AND CONFIG
        BootStageChanged      : 'boot:stageChanged',                          // <-- { Stage, Message }
        BootFailed            : 'boot:failed',                                // <-- { Stage, Error }
        BootComplete          : 'boot:complete',                              // <-- { DurationMs }

        // AUDIO CONTEXT AND TRANSPORT
        AudioUnlocked         : 'audio:unlocked',                             // <-- { SampleRate, BaseLatency }
        TransportStarted      : 'transport:started',                          // <-- { Bpm, AudioTime }
        TransportStopped      : 'transport:stopped',                          // <-- { AudioTime }
        TransportTempoChanged : 'transport:tempoChanged',                     // <-- { Bpm }
        TransportBarAdvanced  : 'transport:barAdvanced',                      // <-- { Bar } - bar rate, not beat rate

        // SAMPLE LIBRARY
        LibraryIndexLoaded    : 'library:indexLoaded',                        // <-- { SampleCount, LoopCount, ResponseCount }
        LibraryAssetDecoded   : 'library:assetDecoded',                       // <-- { AssetId, Seconds }
        LibraryLoadFailed     : 'library:loadFailed',                         // <-- { AssetId, Reason }

        // SPATIAL MODULES
        ModuleAdded           : 'module:added',                               // <-- { ModuleId, TypeName }
        ModuleRemoved         : 'module:removed',                             // <-- { ModuleId }
        ModuleSelected        : 'module:selected',                            // <-- { ModuleId | null }
        ModuleHovered         : 'module:hovered',                             // <-- { ModuleId | null }
        ModuleMoved           : 'module:moved',                               // <-- { ModuleId, Position }
        ModuleLockChanged     : 'module:lockChanged',                         // <-- { ModuleId, IsLocked }
        ModuleParameterSet    : 'module:parameterSet',                        // <-- { ModuleId, Parameter, Value }

        // PATCH GRAPH
        CableConnected        : 'patch:cableConnected',                       // <-- { CableId, FromModuleId, ToModuleId, SignalType }
        CableDisconnected     : 'patch:cableDisconnected',                    // <-- { CableId }

        // CAMERA AND VIEW
        CameraPresetApplied   : 'camera:presetApplied',                       // <-- { PresetKey }
        CameraFocusedModule   : 'camera:focusedModule',                       // <-- { ModuleId }

        // DIAGNOSTICS
        DiagnosticsSampled    : 'diagnostics:sampled'                         // <-- { FrameMs, VoiceCount, AudioTime } - throttled, never per frame
    });
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Subscriber Registry
    // ------------------------------------------------------------
    const SUBSCRIBERS   =  new Map();                                        // <-- Event name -> Set of handler functions
    const KNOWN_EVENTS  =  new Set(Object.values(NaAudio__Event));           // <-- For the unknown-name guard
    let   isMuted       =  false;                                            // <-- Set during teardown so late handlers cannot fire
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Subscription
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Reject an Event Name That Is Not in the Vocabulary
    // ------------------------------------------------------------
    // The whole value of publishing NaAudio__Event is lost the moment somebody
    // passes a bare string, so both Subscribe and Publish check.
    function NaAudio__EventBus__AssertKnown(eventName, caller) {
        if (KNOWN_EVENTS.has(eventName)) return;
        throw new Error('[NaAudio EventBus] ' + caller + ' called with unknown event "' + eventName + '". Add it to NaAudio__Event in NaAudio__AppCore__EventBus__.mjs rather than passing a literal.');
    }
    // ------------------------------------------------------------


    // FUNCTION | Subscribe to an Event
    // ------------------------------------------------------------
    // Returns an unsubscribe function. Callers that live and die with the app can
    // discard it; anything that can be torn down - a module shell, a HUD panel -
    // must keep it and call it, or its handler keeps firing against a dead object.
    export function NaAudio__EventBus__Subscribe(eventName, handler) {
        NaAudio__EventBus__AssertKnown(eventName, 'Subscribe');

        if (typeof handler !== 'function') {
            throw new Error('[NaAudio EventBus] Subscribe to "' + eventName + '" was passed a non-function handler.');
        }

        if (!SUBSCRIBERS.has(eventName)) SUBSCRIBERS.set(eventName, new Set());
        SUBSCRIBERS.get(eventName).add(handler);

        return function NaAudio__EventBus__Unsubscribe() {
            const handlers  =  SUBSCRIBERS.get(eventName);
            if (handlers) handlers.delete(handler);
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Subscribe to an Event for One Firing Only
    // ------------------------------------------------------------
    export function NaAudio__EventBus__SubscribeOnce(eventName, handler) {
        const unsubscribe  =  NaAudio__EventBus__Subscribe(eventName, function (payload) {
            unsubscribe();
            handler(payload);
        });
        return unsubscribe;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Publication
// -----------------------------------------------------------------------------

    // FUNCTION | Publish an Event to Every Subscriber
    // ------------------------------------------------------------
    // A throwing handler is caught and reported rather than allowed to abort the
    // publish. One broken HUD panel must not stop the audio engine hearing that
    // the transport stopped.
    export function NaAudio__EventBus__Publish(eventName, payload) {
        NaAudio__EventBus__AssertKnown(eventName, 'Publish');
        if (isMuted) return;

        const handlers  =  SUBSCRIBERS.get(eventName);
        if (!handlers || handlers.size === 0) return;

        const snapshot  =  Array.from(handlers);                              // <-- A handler may unsubscribe during the loop
        for (let i = 0; i < snapshot.length; i++) {
            try {
                snapshot[i](payload);
            } catch (error) {
                console.error('[NaAudio EventBus] Handler for "' + eventName + '" threw:', error);
            }
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Count Subscribers to an Event
    // ------------------------------------------------------------
    // Exposed for the diagnostics readout. A subscriber count that only ever grows
    // is the signature of a teardown path that forgot its unsubscribe.
    export function NaAudio__EventBus__SubscriberCount(eventName) {
        const handlers  =  SUBSCRIBERS.get(eventName);
        return handlers ? handlers.size : 0;
    }
    // ------------------------------------------------------------


    // FUNCTION | Mute and Clear the Bus
    // ------------------------------------------------------------
    export function NaAudio__EventBus__Shutdown() {
        isMuted  =  true;
        SUBSCRIBERS.clear();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
