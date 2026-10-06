# Third-party acknowledgements

## FreeFlow

Source: https://github.com/zachlatta/freeflow

Copyright (c) 2026 Zach Latta. MIT licensed.

`core/speech.cjs` adapts the transcription request design from `Sources/TranscriptionService.swift` and the stock-phrase/segment-metadata silence filter from `TranscriptionResponseParser` in `Sources/TranscriptTextCore.swift`, inspected on 6 October 2026. The implementation is ported to JavaScript for Cue. The complete upstream license is included at `licenses/FreeFlow-LICENSE.txt`.

Cue does not contain or rebrand the complete native FreeFlow application. Its voice input is described as “FreeFlow-based” to distinguish this adapted implementation from the upstream product. FreeFlow is not the provider of Cue's text-to-speech feature.

## OpenCluely

Source and reference concept: https://github.com/TechyCSR/OpenCluely

Cue was independently implemented after inspecting the upstream README, architecture and LLM interface. No OpenCluely source or assets are redistributed in this package. The original project's name, branding and authorship are not claimed by Cue.

## Runtime and build tools

Electron and electron-builder are installed through npm under their respective licenses. They are not redistributed in this source archive. Refer to dependency package notices when distributing compiled binaries.
