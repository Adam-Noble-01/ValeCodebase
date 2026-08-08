# AudioSPACE - Shipped Audio Attribution

Every audio file that ships with AudioSPACE is open-licensed, and every one of them is
listed here. This file is the licence record for the whole shipped bank.

**If you add a file to any bank folder, add its source here.** An asset with no
attribution row is an asset nobody can safely ship.

---

## The rule that decided what is here

AudioSPACE may eventually ship commercially, so **non-commercial licences were excluded
even where the material was good.** Two collections were considered and deliberately
left out for that reason:

| Excluded | Licence | Why |
|---|---|---|
| `Tonejs/audio` `loop/` | CC BY-NC-SA 4.0 (Yotam Mann) | Non-commercial clause |
| `Tonejs/audio` `casio/` | CC BY-NC-SA 4.0 (Yotam Mann) | Non-commercial clause |

Those exclusions are also recorded in the `EXCLUDED` table of
`61__Dev__AssetAuthoring__SampleLibraryIngest/NaAudio__AssetAuthoring__SampleLibraryIngest__.py`,
so the next person to go looking for them knows they were considered.

---

## Sources

### Berklee / OLPC Sound Library
- **Licence** : CC BY 3.0 - https://creativecommons.org/licenses/by/3.0/
- **Origin** : OLPC Sound Sample Library, Berklee College of Music - http://wiki.laptop.org/go/Sound_samples
- **Obtained via** : https://github.com/Tonejs/audio (`berklee/`)
- **Used for** : `05__Data__AudioSampleLibrary/50__Tonal__SynthOneShots`, `60__Fx__ObjectHits`

### Salamander Grand Piano
- **Licence** : CC BY 3.0 - https://creativecommons.org/licenses/by/3.0/
- **Origin** : Salamander Grand Piano, by Alexander Holm
- **Obtained via** : https://github.com/Tonejs/audio (`salamander/`)
- **Used for** : `05__Data__AudioSampleLibrary/40__Tonal__GrandPiano`

### GoogleChromeLabs / web-audio-samples
- **Licence** : Apache-2.0 - https://www.apache.org/licenses/LICENSE-2.0
- **Origin** : https://github.com/GoogleChromeLabs/web-audio-samples (formerly cwilso/web-audio-samples)
- **Obtained via** : https://github.com/Tonejs/audio (`drum-samples/`, `impulse-responses/`)
- **Used for** : every drum kit, every loop, and the whole impulse response library

---

## What ships

| Bank | Files | On disk |
|---|---|---|
| `05__Data__AudioSampleLibrary` | 86 samples across 7 kits and 6 categories | 2.55 MB |
| `06__Data__AudioLoopLibrary` | 9 loops across 3 categories | 1.52 MB |
| `08__Data__ImpulseResponseLibrary` | 10 responses across 2 categories | 0.29 MB |

The bank is deliberately tiny. It exists so a first run has something to play, not as a
production sound library - see the curation-table note in the ingest script for why every
shipped file was named by hand rather than swept in.

---

## Rebuilding the bank

```
python 61__Dev__AssetAuthoring__SampleLibraryIngest/NaAudio__AssetAuthoring__SampleLibraryIngest__.py --clone
python 60__Dev__WebBuildUtils/NaAudio__BuildUtil__AudioLibraryIndex__.py
```

The first clones the upstream repositories and copies the curated subset into the bank
folders under the NaAudio naming convention. The second regenerates the catalogue indexes
from whatever is on disk. Run them in that order; an index is never hand-edited.
