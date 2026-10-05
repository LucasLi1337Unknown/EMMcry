# EMM😭 next milestones

0.1 is a real, executable vertical slice. Keep the established names, extensions, tokens and dynamic programs compatible.

1. Improve translation formatting and preserve comments; build an editor grammar and a formatter from the IR.
2. Add semantic validation before C++ emission: reserved built-ins, common name mistakes, better expression locations and module export rules.
3. Replace process-lifetime arena retention with tracing collection and explicit runtime roots. Stress-test long-running closures and cyclic records.
4. Add structured errors and stack traces, grapheme-aware string operations, deeper collection APIs and a reusable standard-library module layer.
5. Specify project manifests and dependency locks; add reproducible native builds and platform CI. Do not invent a license on Lucas's behalf.
6. Add optional annotations without changing default dynamic typing.
7. Implement an independently testable network module, then structured tasks/async and a narrow C FFI. Design and implement their contracts together.

First stress program: five-card poker. Next stress programs: a CLI task database, a small HTTP client once networking exists, and a long-running simulation once collection exists.

The poker score format is a test contract: `[category, tiebreakers...]`, categories 0–8, lexicographically higher wins, suits never break ties, and Ace-low straights score as five-high.
