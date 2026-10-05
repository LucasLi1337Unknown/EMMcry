# EMM😭 language specification — working version 0.1

The supplied canon in CANON.md remains the source for names and established spellings. This document formalizes missing rules and identifies the implemented subset. Both syntaxes share the same semantics and IR.

## Lexical rules

Source is UTF-8. Files end in `.emm` or `.cry`. Tokens use longest matching: `......` is one while token, not two variable declarations. Punctuation order matters. Whitespace, including line breaks, separates tokens where necessary but does not otherwise terminate statements. Semicolons are optional separators. Prefix keywords make consecutive statements unambiguous. A bare return without a value is permitted immediately before `}` or `;`; otherwise write `!... ..` / `↩️ 🕳️` explicitly.

Identifiers use Unicode XID characters and `_`, or one complete emoji grapheme cluster. Identifiers are case-sensitive and are not Unicode-normalized. Multi-emoji names require a joined grapheme or an ordinary Unicode identifier; adjoining unrelated emoji form separate tokens. Emoji keyword variation selectors are optional; emoji identifier selectors remain part of their identity. Skin tones and ZWJ sequences are kept intact. Source line and column diagnostics count Unicode code points, starting at 1, rather than terminal display cells.

Strings use double quotes with JSON escapes, including `\n`, `\"`, `\\` and `\uXXXX`. Literal newlines must be escaped. Strings are not rewritten during translation. Integers are decimal signed 64-bit values; the sign is a unary operator. Floats use a decimal fraction or exponent and must be finite. Adjacent `--` means false, so write `x - -1` if you mean subtraction of a negative number. Neither `++` nor `--` increments or decrements a variable.

`//` starts a line comment in either language; 😭 also accepts `💬`. A comment inside a quoted string is ordinary string data.

## Core spellings

| Meaning | EMM | 😭 |
|---|---|---|
| Variable | `...` | 🍼 |
| Constant | `....` | 🗿 |
| Assignment | `!` | ✏️ |
| Read line | `...?` | 👂 |
| Print line | `...!` | 😭 |
| If / else-if / else | `??` / `???` / `????` | 🤔 / 🧐 / 😐 |
| While / for-each | `......` / `.....` | 🔁 / 🔂 |
| Function / return / call marker | `??...` / `!...` / `...??` | 🧩 / ↩️ / 📞 |
| Import | `<<` | 📥 |
| Break / continue / exit | `!!` / `!?` / `!!!` | 🛑 / ⏩ / 💀 |
| True / false / null | `++` / `--` / `..` | ✅ / ❌ / 🕳️ |
| Blocks and records | `{` / `}` | 🫴 / 🫷 |
| List literal | `[...]` | `[...]` or `📦[...]` |
| Try / catch / throw (new) | `?:` / `?!!` / `!!?` | 🛟 / 🪤 / 💥 |

ASCII operators and structural punctuation may also be used in `.cry`. This keeps data access, parameter lists and numbers practical; emoji spellings are available for every keyword and arithmetic/logical operation.

| Operator | Emoji equivalent |
|---|---|
| `+ - * / %` | ➕ ➖ ✖️ ➗ 🔢 |
| `=` | 🟰 |
| `== !=` | 🟰🟰 🚫🟰 |
| `> < >= <=` | ▶️ ◀️ ▶️🟰 ◀️🟰 |
| `&&` / `||` / `~` | 🤝 / 🤷 / 🚫 |

ASCII `&&`, `||`, `~` are EMM's formal AND, OR, NOT spellings. These and emoji equivalents normalize to the same IR operators.

## Grammar outline

```text
program     := statement*
block       := '{' statement* '}'
declare     := (VAR | CONST) identifier '=' expression
assign      := SET (identifier | property | index) '=' expression
print       := PRINT expression
input       := INPUT identifier
condition   := IF expression block (ELIF expression block)* (ELSE block)?
while       := WHILE expression block
for         := FOR identifier ':' expression block
function    := FN identifier '(' parameters? ')' block
return      := RETURN expression?
import      := IMPORT string ':' identifier
try         := TRY block CATCH identifier block
throw       := THROW expression
call        := CALL? expression '(' arguments? ')'
array       := '[' expressions? ']'
record      := '{' (key ':' expression) (',' key ':' expression)* '}'
property    := expression '.' identifier
index       := expression '[' expression ']'
```

Literal record keys may be identifiers or strings. Duplicate literal keys and duplicate parameters are rejected. An empty record is `{}`. Empty arrays are `[]`. Array literals permit a trailing comma. A function call marker is the canonical style; unmarked postfix calls are also accepted as a practical extension. Passing a function without calling it uses its identifier with no parentheses.

`..... i : ...?? $9(1, 11) { ...! i }` prints 1 through 10. For-each iterates a snapshot of the source array; structural mutation of the original does not change that iteration. Strings iterate scalar values. The loop variable is local to each iteration. While conditions are re-evaluated before every iteration.

## Precedence and evaluation

Highest to lowest: calls/index/property; unary `+ - ~`; `* / %`; `+ -`; `< > <= >=`; `== !=`; `&&`; `||`. Binary operators associate left to right. Parentheses override precedence. Operand and argument evaluation is left to right. `&&` and `||` short-circuit and produce booleans.

Conditions require actual booleans. Numbers, null and empty collections are not silently truthy or falsey. Type errors are recoverable runtime faults. `+` adds numbers, concatenates two strings, or concatenates two arrays. Other arithmetic requires numeric operands. `/` produces a float; `%` requires integers and follows truncation-toward-zero remainder semantics. Integer overflow is a fault. Float arithmetic must remain finite. Mixed numeric operations use floating-point arithmetic; integer-to-float conversion may lose precision. Comparisons preserve integer precision when both operands are integers.

Equality compares primitive values; integers and floats compare numerically. Lists, records and functions compare by identity. A structural/deep equality API is future work. String ordering is deterministic UTF-8 byte order, not locale collation. Record key enumeration is sorted by UTF-8 key order.

## Scope, values and functions

Each block introduces lexical scope. Lookup proceeds through enclosing scopes. A declaration may shadow an outer name but cannot redeclare a name in the same scope. Assignment changes the nearest existing binding; it cannot create a name. Variables are dynamically typed. Constants prohibit rebinding, but their list/record contents are still mutable. Built-ins and function declarations are constant bindings.

Functions are first-class, support recursion and capture lexical environments by reference. A call creates a fresh parameter scope and requires exact arity. A function without an executed return yields null. Functions capture the scope, not a frozen copy of values, so changes in that scope are visible. Forward references work only after the relevant declaration executes; no hoisting occurs. Mutual recursion works once both declarations have executed. Closures keep their environment alive through automatic arena ownership.

Lists are zero-indexed. Invalid or negative indices raise a fault. Lists and records are reference values; aliases see mutations. Record assignment may add fields; reads of missing fields raise a fault. String indexing, length and slicing use Unicode scalar values, not UTF-8 bytes or grapheme clusters. Strings are immutable. This differs deliberately from emoji *source tokenization*, which uses full grapheme clusters.

## Input, output and errors

Input reads one line into an existing mutable variable as a string. Use `$5` or `$6` to parse numeric text. End-of-file supplies an empty string. Print adds a newline. Boolean/null display uses EMM spellings `++`, `--`, `..` in both languages. Collection printing recognizes cycles.

`?: { ... } ?!! error { ... }` catches a runtime fault; `error` contains its thrown value, usually a useful string. `!!? expression` can throw any value. Runtime faults include invalid indexing, types, arity, file failures, overflow and undefined names. Return, break, continue and program exit are control flow and are not caught as faults. `!!! integer` ends the program with an exit code; ordinary operating-system exit-code limitations apply.

Compiler diagnostics use `EMM0001` for syntax, `EMM0020` for cyclic imports, `EMM0021` for import read failures and `EMM0030` for translation incompatibility. They identify source file, line, column, offending token and expected syntax where applicable. Uncaught runtime faults use `EMM1001` with a source location and reason; unexpected host-library failures use `EMM1002`. A full stack trace is future work. Runtime locations track the most recently executed statement, rather than pinpointing every subexpression.

## Modules and compilation

`<< "utility.emm" : utility` loads a module under an explicit alias. Both extensions can be imported by either syntax. Paths resolve relative to the importing file at compile time. A module executes once per process, in an isolated lexical environment that can access built-ins. Its top-level declarations become fields of the exported record. Imports may therefore expose functions, constants, variables and nested modules. Rebinding an exported field changes the exported record; it does not change the module's private lexical binding. This distinction is explicit in 0.1.

Imports must form an acyclic graph; cycles are rejected. Compilation embeds all imported source into one executable. Runtime source files are not needed. Source → tokens → shared JSON-compatible tree IR → generated C++ → platform executable. IR nodes have a tag and source location; both language frontends emit identical tags. There is no separate optimization or bytecode pass yet.

## Symbol standard library

`$` plus an integer is the stable built-in namespace. Both languages use the same symbols. This preserves a symbol-heavy identity without needing 33 hard-to-distinguish punctuation sequences. New functions get new slots; existing slots must not be reassigned. Calls below use ordinary parentheses; canonical EMM prepends `...??`, and 😭 prepends 📞.

| Symbol | Operation |
|---|---|
| `$0(lo, hi)` | Inclusive random integer |
| `$1(value)` | Collection length / string scalar count |
| `$2(a, b)` / `$3(a, b)` | Minimum / maximum |
| `$4(value)` | Display-to-string conversion |
| `$5(text)` / `$6(text)` | Parse integer / float; `$6` also converts a number to float |
| `$7(list, value)` / `$8(list)` | Append (returns same list) / pop |
| `$9(start, end)` | Integer range, start inclusive, end exclusive |
| `$10(list)` / `$11(list)` | New sorted / shuffled copy |
| `$12(value, start, end)` | Array or string slice, end exclusive |
| `$13(record)` / `$14(record, key)` | Keys / has key |
| `$15(number)` / `$16(number)` | Absolute value / floor (floor returns float) |
| `$17(number)` / `$18(base, exponent)` | Square root / power |
| `$19(path)` / `$20(path, text)` | Read entire file / write text, replacing contents |
| `$21()` | Unix epoch milliseconds |
| `$22()` / `$23(name)` | CLI arguments excluding executable / environment value or null |
| `$24(boolean)` | Assert; returns null or raises a fault |
| `$25(value)` | Type name string |
| `$26(integer)` | Seed this runtime's pseudorandom generator |
| `$27(list, fn)` / `$28(list, fn)` | Map / filter into a new array |
| `$29(list, fn, initial)` | Left fold, callback `(accumulator, item)` |
| `$30(text, separator)` / `$31(list, separator)` | Split / join string values |
| `$32(list, less)` | New sorted copy with comparator `(a, b) -> boolean` |

Legacy `@random`, `@length`, `@min`, `@max` remain accepted aliases for compatibility with conceptual prototypes. `$` spellings are the canonical new API. Sorting comparators must define a consistent strict ordering and should not mutate the sorted collection. Range materialization is capped at 1,000,000 elements in 0.1. File/system operations run with the executable's normal user permissions.

## Memory and compatibility

Users never manually allocate or free language values. Runtime arenas own heap objects and scopes, support cycles safely, and release everything at process exit. There is no unreachable-object collection during execution in 0.1. Programs with repeated allocations can grow memory. The next runtime milestone is tracing garbage collection with explicit root tracking, preserving references and closures unchanged.

The current backend targets GCC/Clang on macOS and Linux, and uses checked integer-overflow intrinsics. It does not claim MSVC compatibility. The compiler uses the Python `regex` package's grapheme support. Native executables use only the C++ runtime and platform libraries.

## Future extension design, not implemented

## Browser execution profile

The browser arcade consumes the same parsed IR through `web/runtime.js`. `scripts/build_web.py` uses the Python compiler frontend, includes module source, and stores integer literal text to avoid JSON number rounding. Browser integers use checked signed 64-bit `BigInt`; floats use JavaScript numbers. Sources and games keep the same syntax. JavaScript presentation code sends action names into EMM functions and renders their state.

This restricted profile supports the game's language features and standard library collection/math functions. Native file/environment APIs deliberately raise faults in the browser; `$22` returns an empty argument list, and console input is supplied by a host callback. The source frontend is not shipped as an editable browser compiler: lessons are precompiled, verified examples. To change code, edit `.emm`/`.cry` locally and run the compiler or web builder.

Browser scopes/objects are owned by JavaScript's tracing collector. A per-action instruction budget and a recursion-depth limit constrain accidental runaway programs. Browser seeded random streams use a small deterministic generator and are not guaranteed to match the native C++ generator. String sort order can differ for non-BMP Unicode characters because JavaScript uses UTF-16 ordering; browser games use ASCII ranks/keys. These are explicit profile limitations rather than claims of full backend equivalence.

## Future extension design, not implemented

Optional type annotations will be additive checks over existing dynamic values and must not invalidate unannotated programs. A future package manifest will record EMM😭 version, entry file, dependency versions and lock hashes; local modules already work without a manifest. Exceptions will gain structured error records and stack traces while maintaining the existing catch construct.

Networking should use a standard-library module with explicit timeouts and recoverable errors, rather than shelling out. Async should add explicit task creation/await and structured cancellation; shared mutable access will require a defined synchronization model. FFI should begin with a narrow C ABI and explicit conversion/ownership boundaries. No tokens or built-in slots are reserved for these APIs until their contracts are implemented and tested. None is silently simulated by this release.
