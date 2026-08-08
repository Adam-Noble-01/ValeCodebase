# 20__Generated__UserAudioSamples

**Empty on purpose. Nothing writes here yet.**

This folder is where one-shot samples the user imports will live once AudioSPACE has a server behind it. It mirrors
`05__Data__AudioSampleLibrary`, which holds the shipped, version-controlled equivalent.

## Why it exists now

The split between SHIPPED and GENERATED is a decision that is very expensive to make late.
Every loader in the application already resolves a library root from
`NaAudio__AppConfig__Main__LibraryRegistry` or
`NaAudio__AppConfig__Main__UserDataRegistry` rather than from a hardcoded path, and
those two registries only make sense if both destinations exist.

Creating the folders now means the shape of the eventual sync is fixed and visible, and
adding a writer later is a change to one module rather than a re-plumbing.

## What currently happens

Nothing. `PersistenceMode` in
`02__Src__AppModules/02__AppData/NaAudio__AppConfig__Main__.json` is `sessionOnly`, and
a browser on a static host cannot write to disk at all. Any save UI must say so rather
than appearing to work.

## Version control

Contents are user data and are **not** committed — see the `.gitignore` beside this file.
The folder and this README are, so a fresh clone has the structure.
