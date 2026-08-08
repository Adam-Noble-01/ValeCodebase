/* =============================================================================
   NAAUDIO - SPATIAL FRAMEWORK | LOCK STATE
   =============================================================================

   FILE       : NaAudio__Spatial__LockState__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Spatial - LockState
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The working and locked dual state from the design manifest
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - Locking a module silences its output with a ramp, stops its per-frame update and
     stops its transport scheduling. Unlocking restores all three.
   - Both halves of the manifest's specification are honoured: the computational one
     (a locked module stops burning CPU on generation) and the visual one (a locked
     module gains a visible cage on all six sides, dims and desaturates).

   ---------------------------------------------------------------------------

   WHAT IS BUILT AND WHAT IS NOT - READ THIS BEFORE EXTENDING

   The design manifest specifies three things happen when a module locks:

       1. Live algorithmic generation stops, conserving CPU and RAM.
          BUILT. NaAudio__ModuleBase__Update and __Schedule are simply not called,
          which is the whole mechanism, and the module's output bus is ramped to
          silence.

       2. Playback switches seamlessly to a rendered audio sample of the last
          generated output.
          NOT BUILT. This needs an OfflineAudioContext bounce of the module's output,
          storage for the result, and a crossfade from live to bounce timed so the
          switch is inaudible. The hooks are marked below.

       3. A captured animation state loops, so the interface stays informative.
          NOT BUILT. Currently the animation freezes on its last pose, which is
          honest but not what the manifest asks for. It needs a recorded parameter
          track played back in sync with the bounce - and it has to be the SAME clock
          as the bounce, or the visual and the audio drift apart over a few bars,
          which would be worse than a frozen pose.

   Points 2 and 3 are deliberately absent rather than stubbed. This is also why
   AutoLockEnabled is false in config: automatic locking is the right long-term
   behaviour, but until the bounce-and-replay path exists an auto-locked module simply
   goes quiet, and a DAW that silences your work while you are looking elsewhere is
   not a DAW anybody would use twice.

   ============================================================================= */

import { SpatialNumber, AudioSection }             from '../03__AppUtils/NaAudio__AppUtils__ConfigAccess__.mjs';
import * as AudioHost                                from '../10__Audio__WebAudioEngine/NaAudio__Engine__AudioHost__.mjs';
import {
    NaAudio__Event,
    NaAudio__EventBus__Publish
} from '../01__AppCore/NaAudio__AppCore__EventBus__.mjs';

// =============================================================================
// REGION | Lock State
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Audio Silencing
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Ramp a Module's Output Bus to Silence or Back
    // ------------------------------------------------------------
    // Ramped rather than switched, because a gain step on a signal that is currently
    // mid-waveform is an audible click - and on a module carrying a sustained pad it is
    // a loud one.
    function NaAudio__LockState__RampBus(module, targetGain) {
        if (!module.Bus) return;

        const now   =  AudioHost.NaAudio__AudioHost__Now();
        const ramp  =  SpatialNumber('LockState', 'SilenceRampSeconds');
        const gain  =  module.Bus.Output.gain;

        gain.cancelScheduledValues(now);
        gain.setValueAtTime(gain.value, now);
        gain.linearRampToValueAtTime(Math.max(targetGain, 0.0001), now + ramp);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Lock and Unlock
// -----------------------------------------------------------------------------

    // FUNCTION | Set a Module's Lock State
    // ------------------------------------------------------------
    export function NaAudio__LockState__Set(module, isLocked) {
        if (!module || module.IsLocked === isLocked) return;

        module.IsLocked  =  isLocked;

        if (isLocked) {
            NaAudio__LockState__Lock(module);
        } else {
            NaAudio__LockState__Unlock(module);
        }

        // The visual transition is driven from module.LockBlend by
        // NaAudio__ModuleBase__Update over TransitionSeconds. It is not applied here,
        // so a lock is one state write and the fade is a frame-rate concern - not a
        // per-frame call chain through this module.

        NaAudio__EventBus__Publish(NaAudio__Event.ModuleLockChanged, {
            ModuleId : module.ModuleId,
            IsLocked : isLocked
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Lock a Module
    // ------------------------------------------------------------
    function NaAudio__LockState__Lock(module) {
        NaAudio__LockState__RampBus(module, 0);

        if (module.Type && typeof module.Type.OnLockChanged === 'function') {
            module.Type.OnLockChanged(module, true);                            // <-- The type silences its own generators and voices
        }

        // HOOK - RENDERED BOUNCE
        // Point 2 of the manifest's lock specification lands here. When it does:
        //   * bounce module.Bus.Output through an OfflineAudioContext for
        //     BounceTailSeconds past the loop point,
        //   * store the buffer against module.ModuleId,
        //   * start it looping in place of the live output,
        //   * crossfade rather than cutting, or the switch is audible.
        // BounceOnLock in config gates it and is currently false.
        if (AudioSection('ModuleLocking').BounceOnLock === true) {
            console.info('[NaAudio LockState] BounceOnLock is enabled in config but the bounce path is not built yet. Module "' + module.ModuleId + '" locked to silence instead. See the hook note in NaAudio__Spatial__LockState__.mjs.');
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Unlock a Module
    // ------------------------------------------------------------
    function NaAudio__LockState__Unlock(module) {
        NaAudio__LockState__RampBus(module, 1);

        if (module.Type && typeof module.Type.OnLockChanged === 'function') {
            module.Type.OnLockChanged(module, false);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Toggle a Module's Lock State
    // ------------------------------------------------------------
    export function NaAudio__LockState__Toggle(module) {
        if (!module) return false;
        NaAudio__LockState__Set(module, !module.IsLocked);
        return module.IsLocked;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Automatic Locking
// -----------------------------------------------------------------------------

    // FUNCTION | Whether Automatic Locking Is Enabled
    // ------------------------------------------------------------
    // Read by the HUD so it can say so, rather than the setting being invisible.
    export function NaAudio__LockState__AutoLockEnabled() {
        return AudioSection('ModuleLocking').AutoLockEnabled === true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Lock Every Module That Has Been Idle Too Long
    // ------------------------------------------------------------
    // The automatic locking pass. Wired to nothing at present because
    // AutoLockEnabled is false - see the note in the file header on why that is the
    // right default until the bounce path exists.
    //
    // 'Idle' is defined as not selected and not hovered for AutoLockAfterIdleSeconds.
    // Note what that definition does NOT include: whether the module is making sound.
    // A pad module the user is happily listening to while working elsewhere is idle by
    // this measure and would be silenced. Fixing that is part of the same piece of work
    // as the bounce, and is the second reason this is off.
    export function NaAudio__LockState__AutoLockPass(modules, nowSeconds) {
        if (!NaAudio__LockState__AutoLockEnabled()) return 0;

        const idleLimit  =  AudioSection('ModuleLocking').AutoLockAfterIdleSeconds;
        let   locked     =  0;

        for (let i = 0; i < modules.length; i++) {
            const module  =  modules[i];
            if (module.IsLocked || module.IsSelected || module.IsHovered) {
                module.LastTouchedAt  =  nowSeconds;
                continue;
            }

            if (module.LastTouchedAt === undefined) {
                module.LastTouchedAt  =  nowSeconds;
                continue;
            }

            if (nowSeconds - module.LastTouchedAt >= idleLimit) {
                NaAudio__LockState__Set(module, true);
                locked += 1;
            }
        }

        return locked;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
