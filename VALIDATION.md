# Validation — 2026-10-05

## Language showcase and arcade

- 15 native compiler tests passed again after adding the browser games.
- 9 browser-VM test groups passed: all seven lessons, source/compiled-asset hashes, merge and undo rules, board exhaustion/victory, 100 dungeon seeds with reachable exits, combat/leveling/potions/stairs/loss/victory, 100 poker rounds without duplicate cards, 1,010 independent poker oracle comparisons, and bounded execution/faults.
- All three game sources separately compiled and executed with the native C++ backend. Additional harnesses verified merging and score, poker outcomes, and potion use.
- The original native poker suite additionally checks 1,010 hands in each syntax. Across native and browser runs there are 3,030 reference hand comparisons.

UI checks and GitHub Pages deployment are recorded separately after publication. The source layout includes responsive CSS and reduced-motion behavior. Compiler and VM checks are not a substitute for a rendered UI check.

## Initial compiler release

All 15 tests passed in the final run (28.660 seconds). Tested on Linux with Python 3.12 and the installed GCC-compatible C++ compiler. macOS instructions are provided; a macOS run has not been performed in this environment.

Native executables were compiled and executed in both dialects. Poker evaluation agreed with an independent Python reference on 1,010 hands per dialect, including every category and both Ace-low straight cases. A separate interactive poker run accepted a draw, rejected invalid positions, and exited successfully.

Coverage includes closures, recursion, scopes, collections, integer boundaries, Unicode/emoji identifiers, NUL strings and record keys, input/output, files, modules and isolation, translation round trips, runtime faults, and exit codes.

Command: `python3 -m unittest discover -s tests -v`
