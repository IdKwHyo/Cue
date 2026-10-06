# Verification — Cue 0.1.0

Checked 6 October 2026 in a Linux workspace. This is a source release, not a notarized desktop binary.

## Overlay update

- `npm test`: **21 tests passed**, including four new capture tests for display selection, focus-preserving restoration, native fallback after enumeration failure, actionable denied-permission errors, and retry after failure.
- Updated browser harness passed: collapsed toolbar; scan → extraction → answer popup; screenshot retention; safe HTML rendering; contextual follow-up; direct interview capture; settings sizing; collapse; no horizontal overflow at 700, 420, and 320 pixels; no uncaught JavaScript errors.
- axe-core WCAG 2 A/AA check on the populated overlay: **zero detected violations**.
- Native capture, native fallback, permission prompts, window positioning and share exclusion remain unverified on actual macOS hardware. Browser capture/provider checks use mocks; these do not prove the reported Mac failure is resolved.
- The previous full-dashboard UI was replaced by the compact overlay. Earlier UI checks below describe the initial version and are retained as history; the current harness covers the overlay.

## Initial version checks

- `npm test`: **17 tests**, covering request validation, assessment isolation, bounded interview/follow-up history, image handling, extraction parsing, provider failures, truncation, cancellation, settings secrecy, loopback origin/token checks, safe Markdown, portable session filtering, FreeFlow-derived silence handling, Groq multipart uploads, and native TTS subprocess semantics.
- Browser interaction checks: question queues; sample loading; flags; draft editing; reviewed state; outdated-answer warning; persistence after reload; independent workspaces; settings and secret exclusion; AI response/error rendering; contextual follow-ups.
- Capture workflow at the renderer/desktop seam: one click triggers extraction, creates two question items, preserves their screenshot, and requests an answer for the first. Interview capture dispatches directly to answering. **Desktop capture and provider responses were mocked for this check.**
- Voice interaction check: record/stop constructs a transcription request, inserts its transcript into the question, and dispatches Read aloud. **Microphone and browser speech engine were mocked.**
- Responsive layout: no horizontal page overflow at 1440, 1024, 768, and 320 CSS pixels. Mobile session controls remain accessible.
- Browser JavaScript: no uncaught errors during checked workflows.
- Automated axe-core check of the populated desktop assessment screen, WCAG 2 A/AA tags: **zero detected violations** after correcting contrast and keyboard access to the scrollable answer. This is not a claim of complete WCAG conformance or a substitute for manual assistive-technology testing.
- Dependency installation and Node syntax checks succeeded. Runtime source has no npm production dependencies. `npm audit --omit=dev` found zero reported vulnerabilities at check time.

## Still needs real-device / live-account verification

- Native Electron launch, macOS Screen Recording permissions, multi-monitor mapping, global-shortcut availability, and actual screenshot capture.
- Microphone hardware, native macOS `say` playback, voice availability, and macOS keychain behavior.
- Real Gemini and Groq requests with the user's keys, model access, quotas, latency and response quality. All automated provider tests used fixtures; no real key was supplied.
- Signed/notarized macOS packaging, Windows and Linux installers, and their platform-specific capture/audio behavior.
- Full screen-reader traversal, high zoom, and all settings/error/loading-state accessibility combinations.

## Build-tool note

The development/build dependency tree reported eight moderate findings associated with a transitive `sprintf-js` denial-of-service advisory. No high/critical finding was reported by the configured high-severity gate. These are not runtime application dependencies. Review the current Electron builder dependency tree before production distribution; no force downgrade or silent dependency override was applied.

## Reproduce

Run the core suite with `npm test`. The optional browser harness is `test/browser-check.cjs`. Install Playwright and axe-core separately if needed:

```sh
npm install --no-save --package-lock=false playwright axe-core
npx playwright install chromium
node test/browser-check.cjs
```

The browser harness starts an ephemeral loopback server, runs against fixtures, and saves screenshots under `test-results/`. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to use an existing Chromium executable. The included `docs/` screenshots are sample views of the checked interface.
