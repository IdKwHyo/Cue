# Cue Chess — prototype
Separate Electron overlay variant built on Cue's existing capture implementation. The original Cue remains unchanged.

## Requirements
- Node.js 22+, npm dependencies from the parent repository (`npm ci`)
- Stockfish installed locally (on macOS: `brew install stockfish`).
- If Stockfish is not on PATH, set `STOCKFISH_PATH` to its executable.

## Run
```sh
node scripts/start-chess.cjs
```

Paste a **FEN** and click Analyze. The local UCI engine returns a candidate move, search depth and evaluation. Capture screen uses Cue's existing capture module, but **does not yet extract the board position automatically**. No live tracking is implemented. This is an initial, honest foundation rather than a completed computer-vision assistant.

Only use engine suggestions for permitted practice, bot games, puzzles, and post-game analysis, not rated/live human games where engine assistance is prohibited.
