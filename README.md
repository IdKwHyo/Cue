# Cue

A desktop companion for interview conversations and online assessment questions, with one-button screen capture, question detection, editable answers, and voice in both directions.

Cue starts as a small, draggable, always-on-top control bar. **Cue ↓** opens the answer popup; **−** collapses it. Scan opens the popup automatically. Question editing and the detected-question queue sit inside a disclosure, and settings open only when requested. There is no dashboard.

The interface uses warm ivory, tobacco brown, and restrained editorial typography. It is an original design, inspired by the quiet polish requested for this project.

## Run on your Mac

After installing Node.js, you can also double-click `Start-Cue.command`. It installs the pinned dependencies on first launch and starts Cue.

Install Node.js 22 or newer. Run these commands in Terminal:

```sh
git clone https://github.com/IdKwHyo/Cue.git
cd Cue
npm ci
npm start
```

1. Open **Settings** and enter your **Gemini API key** for answers and screenshot analysis. Get one at https://aistudio.google.com/apikey. The model ID is editable; use a model available to your account.
2. For FreeFlow-based dictation, enter a **Groq API key** from https://console.groq.com/keys. Or switch Dictation provider to Gemini if you prefer one provider.
3. Enable **Remember keys using OS encryption** if you want Cue to retain your keys. Otherwise keys live only in the running process. An environment variable can also provide a key: `GEMINI_API_KEY`, `GEMINI_MODEL`, or `GROQ_API_KEY`.
4. When macOS asks, allow Screen Recording and Microphone access. You may need to quit and reopen Cue after granting Screen Recording. While running from source, macOS may identify the permission requester as Electron.

This delivery is source code, not a signed or notarized macOS installer. Installing dependencies downloads Electron. `npm ci` must run normally, with install scripts enabled, to obtain its runtime.

## One button, one screenshot

Click **Scan screen**, or press **⌘⇧Space** on Mac / **Ctrl+Shift+Space** on Windows and Linux.

Cue captures the display under your pointer, briefly hiding its own window so the question underneath is visible. It does not start a continuous screen-sharing session.

- **Assessments:** Gemini extracts readable questions and exact answer choices into the queue. The first question is answered automatically by default; turn this off in Settings to review extraction first. A screenshot with a diagram stays attached to each extracted question in memory.
- **Interviews:** the captured question is sent directly for an interview-style response.
- **Several monitors:** put your pointer over the display you want before using the shortcut. Clicking the button captures the display containing that button. Native mapping is checked; Cue errors rather than silently choosing an unrelated display when it cannot match one.
- **Screen Recording denied:** enable Cue/Electron under System Settings → Privacy & Security → Screen Recording, then reopen the app.

The first request needs a configured key. If you scan before setup, the image is retained in the current question while you add the key. You can then choose Get answer or scan again to create a question queue.

## Screen sharing and capture troubleshooting

Desktop windows enable Electron's `setContentProtection(true)` by default. Windows 10 version 2004 and later can exclude the window from captures; older Windows versions may show a black rectangle. On macOS, newer sharing apps using ScreenCaptureKit can capture protected windows. Linux does not support Electron capture protection. **This is not a guarantee of invisibility.** Check the actual outgoing share preview in your sharing application. See [Electron's documentation](https://www.electronjs.org/docs/latest/api/browser-window#winsetcontentprotectionenable).

If `Failed to get sources` occurs, Cue records permission status, OS/Electron version, executable path, display mapping, and the original exception in `capture.log` under Electron's user-data directory. **Settings → Open capture diagnostics** opens that file. Diagnostics contain no screenshots, audio, API keys, or question text. Logs rotate at approximately 1 MB.

On macOS, if Electron capture fails and permission is not denied/restricted, Cue attempts the system `/usr/sbin/screencapture` tool for the selected display rectangle, then deletes its temporary PNG. This uses the same OS permission controls. If both methods fail, the popup gives permission and restart instructions plus the underlying reason. A successful fallback is also recorded. Real-device verification is still needed for your Mac.

## Questions and conversations

- Separate assessment and interview workspaces retain their own questions and drafts.
- Assessment types: multiple choice, written responses, numerical reasoning, coding, situational judgment, and automatic detection.
- Ask for a hint, review your own draft, or generate an answer.
- Use **Keep the thought going** to ask a follow-up within the same question. Each question retains its own follow-up thread.
- Interview prompts receive the previous eight conversational turns. Assessment questions remain isolated, except for explicit follow-ups within that question.
- Editing a question marks its previous answer as outdated.
- Copy answers, edit questions and drafts, or request a draft review inside **Question & detected questions**.
- **⌘/Ctrl+Enter** generates an answer. Context and session import/export are in Settings → **Context & saved sessions**.
- The sample session is explicitly labeled; its answer is a local fixture, not a live AI response.

Answers complete before display in this version; token-by-token streaming is not implemented. Screen extraction can misread content. Check labels, units, diagrams, and words such as NOT and EXCEPT before relying on the result.

## Voice input: FreeFlow-based dictation

[FreeFlow](https://github.com/zachlatta/freeflow) is a macOS **speech-to-text** app, not a text-to-speech engine. Cue adapts its Groq/Whisper request flow and conservative silence-hallucination filter into JavaScript. Attribution and the MIT notice are in `THIRD_PARTY.md` and `licenses/FreeFlow-LICENSE.txt`.

Click **Mic** on the bar, speak, then **Stop**. Open **Question & detected questions** to check the transcript. The transcript is inserted into the question so you can check it before requesting an answer. Recordings automatically stop at 90 seconds. You can choose Whisper Large V3 Turbo or Whisper Large V3 and supply custom vocabulary for names and terminology. Spoken languages are preserved rather than forced to the answer language.

Cue does not bundle FreeFlow's Swift application or its global Fn-key/accessibility hooks. It implements the selected transcription behavior within Cue. If you already use the actual FreeFlow app, its dictation can also type into Cue's question or draft fields normally. Cue does not record other applications' system audio or the remote participant's audio directly.

## Voice output: Read aloud

**Read aloud** speaks the answer and its displayed follow-ups. On macOS it uses the built-in `say` service and the system voice, without sending answer text to a separate TTS provider. Press **Stop reading** to stop. Set up your preferred installed voice in macOS voice settings.

Other platforms and the browser edition use the browser's speech-synthesis engine. Available voices and offline behavior depend on the platform/browser. Playback is user-triggered, never automatic.

## Session data and keys

- Questions, drafts, answers, follow-up threads, profile context, flags and settings such as preferred language are saved in the app's local browser storage. This session text is **not encrypted** at rest. Clear a workspace or remove the app's data if you need to erase it.
- Export creates a portable JSON file. Import appends validated questions, up to 100 per workspace, instead of silently overwriting work.
- Images and audio are memory-only and excluded from session exports. They must be attached again after restarting. Profile context and draft text are included in exports; treat exports as personal data.
- Selected question data, images, relevant history and context go to Gemini when requested. Recordings go to Groq when that dictation provider is selected, otherwise Gemini.
- On supported desktop systems, saved keys use Electron `safeStorage` / OS encryption. On Linux, insecure `basic_text` storage is rejected. The renderer cannot read saved API keys through the settings interface.
- No analytics or Cue-hosted server. Provider retention and billing depend on your provider/account; “local workspace” does not mean local AI inference.

## Browser edition

```sh
npm run web
```

Open http://127.0.0.1:4317. This needs only Node; you can run it before installing Electron dependencies. It binds to loopback only, checks origin/Host, and requires a session token for API actions. API keys are memory-only in this edition. The browser must show its screen-selection picker on each capture; **native one-button capture is a desktop feature**.

## Checks and packaging

```sh
npm test
npm run build:mac
```

The macOS command targets Apple Silicon. For Intel builds, run `npx electron-builder --mac --x64` on a suitable build machine. Windows and Linux targets are also configured; platform-specific builds and capture behavior require testing on those systems. Signing/notarization require your own signing credentials and are not configured here.

See `VERIFICATION.md` for the exact checks performed and remaining device/live-provider checks. The screenshots in `docs/` show the initial dashboard and are retained as historical previews; the current app uses the compact overlay. Run the browser harness to create current screenshots in `test-results/`.

## Implementation map

- `core/assistant.cjs`: bounded prompt construction, Gemini calls, extraction validation, timeouts.
- `core/speech.cjs`: FreeFlow-derived Groq/Whisper transcription adapter and silence filtering.
- `core/service.cjs`: configuration, secret ownership, provider routing, cancellation.
- `desktop/`: native capture/shortcut, isolated preload, encrypted key storage, native read-aloud.
- `ui/`: dependency-free interface, safe text rendering, local sessions, microphone capture.
- `server.cjs`: optional same-origin loopback browser adapter.
- `test/`: public-interface regression tests with mocked providers.

Reference inspiration: [OpenCluely](https://github.com/TechyCSR/OpenCluely). Cue is a separate implementation rather than a drop-in upstream patch. This repository contains Cue; the upstream OpenCluely repository is unchanged.
