# EMM😭 — Lucas Li's punctuation and emoji language family

**Ridiculous to look at, internally consistent.**

**Learn it, run it, play what it builds:** the root [`index.html`](index.html) is an interactive language showcase with seven runnable lessons and three games. Start with the [step-by-step guide](GUIDE.md).

This working implementation continues Lucas's established design. EMM (`.emm`) and 😭 (`.cry`) feed the same IR. `emmc` produces native executables through a C++17 backend; the resulting program does not need Python installed to run. A browser VM executes the same compiler IR for the arcade. Python is used by the compiler frontend.

## The arcade — games actually written in EMM

| Game | Gameplay | Real source |
|---|---|---|
| COKKING Catacombs | Five generated dungeon floors, turn-based enemies, weapon upgrades, potions, gold, leveling, a final boss and escape | [dungeon.emm](games/dungeon.emm) |
| 2048: Dot by Dot | Directional sliding, one-merge-per-move rules, score, one-step undo, win and game-over detection | [merge.emm](games/merge.emm) |
| Punctuation Poker | Five-card draw, hold/swap decisions, dealer strategy, all nine categories and complete tiebreakers | [poker.emm](games/poker.emm), [pokerlib.emm](examples/pokerlib.emm) |

Open `index.html` directly, or use GitHub Pages once enabled for this repository. Each game's state and rules are authored in `.emm`. `scripts/build_web.py` parses them with the actual compiler frontend and bundles their shared IR. The JavaScript adapter handles DOM rendering, SVG art and user input. It does **not** independently reimplement the game rules. **Inspect the actual source** on the page shows the source and its SHA-256 hash.

After changing an EMM game, run `python3 scripts/build_web.py` and reload the page. The page intentionally uses static assets and classic scripts, so local `file://` use works without a server. Lesson progress and 2048 best score stay on the current device. No account, backend or tracking service is involved. Web fonts are optional; offline use falls back to system fonts.

```emm
??... add(a, b)
{
    !... a + b
}
...! ...?? add(5, 7)
```

```cry
🧩 add(a, b)
🫴
    ↩️ a ➕ b
🫷
😭 📞 add(5, 7)
```

## Start on macOS or Linux

Requires Python 3.10+ and a GCC/Clang-compatible C++17 compiler. On a Mac, install Apple's Command Line Tools with `xcode-select --install` if `c++` is unavailable.

```sh
git clone https://github.com/LucasLi1337Unknown/EMMcry.git
cd EMMcry
python3 -m venv .venv
. .venv/bin/activate
python3 -m pip install -r requirements.txt
chmod +x emmc
./emmc examples/hello.emm -o hello
./hello
./emmc examples/hello.cry -o hello-cry --run
./emmc examples/core.emm -o core --run
./emmc examples/poker.emm -o poker --run
```

Poker deals a shuffled deck, lets you replace selected cards once, evaluates player and dealer hands, and compares full tiebreakers. It includes all nine categories and the A-2-3-4-5 straight. It is a programming demonstration without betting.

## Translation and inspection

```sh
./emmc --translate examples/core.emm examples/core.cry
./emmc --translate examples/core.cry examples/core-roundtrip.emm
./emmc examples/core.emm --emit-ir -o core.ir.json
./emmc examples/core.emm --emit-cpp -o core.cpp
c++ -std=c++17 -O2 core.cpp -o core
```

Translation validates syntax and preserves literal data and identifier spelling. It normalizes formatting and drops comments. Keep translated modules beside their originals, because relative import paths retain their spelling. An identifier reserved by the destination syntax produces a diagnostic instead of silently changing meaning.

## Included now

- Signed 64-bit integers, floating-point numbers, strings, booleans and null.
- Mutable variables, shallow constants, lexical scopes and first-class functions.
- Recursion, closures, conditions, while/for loops, break and continue.
- Lists, records, indexed/property access and assignment.
- Shared IR, native compilation and translation in both directions.
- Local modules, console input, files, arguments and environment access.
- Recoverable runtime errors and useful source locations.
- 33 symbol-spelled built-ins for collections, strings, math and system access.
- Unicode-aware source lexing, including ZWJ emoji identifiers and flags.
- End-to-end tests in both syntaxes and an independent poker oracle.

## Validate

```sh
python3 -m unittest discover -s tests -v
node tests/test_web.cjs
# Optional DOM interaction tests require Node 24.15+:
npm ci
npm run test:ui
```

The native suite compiles and executes both dialects, verifies translation round trips, exercises runtime semantics, and compares 1,010 poker hands per dialect against an independent Python evaluator. Browser VM tests execute all seven lessons, verify that source hashes match compiled assets, test 100 generated dungeons for reachable exits, check combat and victory, check 2048 merge/undo rules, and compare another 1,010 poker hands with stored independent reference scores. DOM tests exercise the actual interface's lesson buttons, syntax toggles, game tabs, keyboard, poker interactions and source inspector. They do not claim to validate visual browser layout. Tests use temporary directories and synthetic data. The included GitHub Actions workflow runs these checks and verifies generated assets stay up to date.

## Honest 0.1 limits

This is a working compiler slice, not a finished modern language. Runtime objects and scopes have automatic arena ownership and are released at program exit. Unreachable allocations are not collected during execution yet, so long-running programs can grow memory. Windows/MSVC is not supported by this initial backend. Modules must form an acyclic graph. Source emoji segmentation uses Unicode graphemes; string indexing currently uses Unicode scalar values, rather than displayed graphemes. Networking, async/concurrency, FFI, package registries and optional type annotations are designed as future work, not available APIs.

Read [GUIDE.md](GUIDE.md) for the learning path, [SPEC.md](SPEC.md) for grammar and semantics, [ROADMAP.md](ROADMAP.md) for next steps, and [CANON.md](CANON.md) for Lucas's supplied handoff brief. The provided brief is the basis for this implementation's syntax and identity. Share programs or language ideas in Issues, and in Discussions when that repository feature is enabled.

Created by Lucas Li. EMM `.emm`, 😭 `.cry`, family **EMM😭**.
