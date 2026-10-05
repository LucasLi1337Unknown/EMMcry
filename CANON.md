You are continuing an existing programming-language project called **EMM😭** created by Lucas Li. Do NOT restart the design from scratch. Treat everything below as established project canon and continue building from it.

# 1. LANGUAGE FAMILY

The overall programming-language family is officially named:

**EMM😭**

It contains two sister programming languages:

### EMM
- Official name: **EMM**
- Official source extension: **`.emm`**
- Its syntax is primarily based on punctuation/symbols.
- It is intended to look like the conversational `...`, `...?`, `????`, etc. exchange that originally inspired the language.

### 😭
- Official name: **😭**
- Official source extension: **`.cry`**
- `.cry` is used because an emoji is unsuitable as a practical source-code file extension.
- Its syntax is based primarily on emojis.

EMM and 😭 should have the same capabilities. They are two syntactic representations of the same underlying language model and should eventually compile into the same intermediate representation.

Conceptually:

EMM `.emm` ─┐
             ├─→ EMM😭 IR → compiler/runtime → executable
😭 `.cry` ───┘

The languages should eventually support automatic translation between `.emm` and `.cry` wherever possible.

# 2. DESIGN PHILOSOPHY

EMM😭 is funny and intentionally unusual, but it must NOT be fake.

It should eventually be possible to implement a real compiler/interpreter and write substantial programs with it.

Core philosophy:

**Ridiculous to look at, internally consistent.**

Do not make the language difficult merely for the sake of difficulty like Malbolge. Once syntax is defined, it should behave predictably.

If the language needs a feature that has not been defined yet, DESIGN IT YOURSELF in a way consistent with the existing language. Do not constantly stop and ask Lucas how every tiny feature should work.

Only ask Lucas when there is a genuinely major creative decision that cannot reasonably be inferred.

# 3. CURRENT CORE EMM SYNTAX

Current established constructs include:

`...` → declare variable

`....` → declare constant

`!` → assignment/change existing value

`...?` → input

`...!` → output/print

`??` → if

`???` → else-if

`????` → else

`......` → while loop

`.....` → for loop

`??...` → function declaration

`!...` → return

`...??` → function call

`[...]` → array/list

`<<` → import/module inclusion

`//` → comment

`!!` → break

`!?` → continue

`!!!` → terminate/exit program

`++` → true

`--` → false

`..` → null/nothing

Blocks currently use:

`{` and `}`

Examples:

```emm
... age = 13
... name = "Lucas"

?? age >= 13
{
    ...! "allowed"
}
????
{
    ...! "no"
}
```

Function:

```emm
??... add(a, b)
{
    !... a + b
}

... answer = ...?? add(5, 7)
...! answer
```

Loop:

```emm
... i = 1

...... i <= 10
{
    ...! i
    ! i = i + 1
}
```

Whitespace generally does not affect program semantics except where required to separate otherwise ambiguous tokens.

Tokens that differ in punctuation order are NOT automatically equivalent. For example, `...?` and `?...` may represent entirely different constructs.

# 4. CURRENT 😭 SYNTAX

Established equivalents include:

🍼 → variable declaration

🗿 → constant

✏️ → assignment/change

👂 → input

😭 → output

🤔 → if

🧐 → else-if

😐 → else

🔁 → while

🔂 → for

🧩 → function declaration

↩️ → return

📞 → function call

📦 → array/list concept

📥 → import

💬 → comment concept

🛑 → break

⏩ → continue

💀 → terminate program

✅ → true

❌ → false

🕳️ → null

🫴 → `{`

🫷 → `}`

Example:

```cry
🍼👦 = 13

🤔 👦 ▶️🟰 13
🫴
    😭 "allowed"
🫷
😐
🫴
    😭 "no"
🫷
```

Emoji variables are allowed and encouraged in 😭.

Numbers and string literals are allowed because they represent data rather than language keywords.

# 5. OPERATORS

EMM currently uses familiar symbolic arithmetic/comparison operators where useful:

`+`
`-`
`*`
`/`
`%`

`==`
`!=`
`>`
`<`
`>=`
`<=`

Logical operations currently include concepts equivalent to:

AND
OR
NOT

😭 equivalents should use sensible emoji/symbolic representations, with previously discussed examples including:

➕
➖
✖️
➗
🟰
🟰🟰
🚫🟰
▶️
◀️
▶️🟰
◀️🟰
🤝
🤷
🚫

Keep these coherent when formalizing the lexer/parser.

# 6. DATA

The language needs to support at minimum:

- integers
- floating-point numbers
- strings
- booleans
- null
- arrays/lists
- objects/records
- functions

Objects/records have already been used conceptually:

```emm
... card =
{
    rank: 14,
    suit: "S"
}
```

Property access:

```emm
card.rank
```

Array indexing:

```emm
hand[0]
```

Nested access:

```emm
hand[i].rank
```

The language should eventually be capable of more advanced structures as needed.

# 7. STANDARD LIBRARY / BUILT-INS

Earlier prototypes temporarily used names such as:

`@random`
`@length`
`@min`

These were placeholders rather than necessarily final syntax.

When formalizing EMM, preserve its symbol-heavy identity. If a standard-library operation needs a symbol-based spelling, design one consistently.

The standard library should eventually cover normal general-purpose programming requirements, including:

- random numbers
- collection length
- min/max
- strings
- math
- files
- time
- collections
- sorting
- networking where appropriate
- system interaction
- error handling

Do not limit the language merely because an early prototype did not define something.

# 8. TYPES

Early EMM examples used dynamic typing:

```emm
... x = 100
! x = "bro"
! x = ++
```

The design may later include optional explicit type annotations if useful.

Maintain compatibility with simple dynamically typed programs unless a later project decision explicitly changes this.

# 9. MEMORY

Prefer automatic memory management for normal EMM😭 programs rather than forcing users to manually allocate/free everything.

The implementation strategy may evolve with the compiler.

# 10. COMPILATION

EMM😭 is intended to become a real compiled language.

A practical first implementation may transpile/compile through C or C++ before producing a native executable.

Longer term, an EMM😭 intermediate representation or VM/native backend may be created.

The compiler can be called:

**`emmc`**

Conceptual usage:

```bash
emmc main.emm -o main
emmc main.cry -o main
```

The compiler detects which sister language is being used from the source extension.

Possible translation feature:

```bash
emmc --translate main.emm main.cry
```

and vice versa.

# 11. ERROR MESSAGES

Compiler errors are allowed to preserve some EMM personality while still being genuinely useful.

Example style:

```text
EMM0017:
You wrote ?...
Did you mean ...?

No, these are not the same.
```

Humor is welcome, but errors MUST still clearly identify:
- error code
- source file
- line/column where possible
- offending token
- expected syntax
- useful correction

# 12. POKER TEST PROGRAM

A text-based poker program has been used as an early stress test for EMM.

The language has already demonstrated the conceptual ability to:

- create arrays
- create card records
- access `.rank` and `.suit`
- loop
- call functions
- evaluate conditions
- sort hands
- count matching ranks
- detect poker combinations
- compare player/dealer results

The hand evaluator recognizes:

High Card
One Pair
Two Pair
Three of a Kind
Straight
Flush
Full House
Four of a Kind
Straight Flush

It also needs to support the A-2-3-4-5 low-Ace straight correctly.

This poker example proved that EMM should support sufficiently rich arrays, records, loops, functions, comparisons, and return values.

# 13. LANGUAGE COMPLETENESS

Before claiming EMM😭 is finished, make sure the language design accounts for the normal requirements of a modern general-purpose programming language.

This includes areas such as:

- lexical grammar
- parsing rules
- operator precedence
- variable scope
- lexical/block scope
- function scope
- closures where appropriate
- recursion
- types and conversions
- arrays/collections
- records/objects
- functions
- modules
- imports
- standard library
- file I/O
- exceptions/errors
- runtime errors
- memory management
- Unicode
- command-line arguments
- environment/system access
- networking
- concurrency/async if eventually supported
- compiler diagnostics
- package/project structure
- interoperability/FFI if eventually supported

If you discover something necessary that has not yet been defined, DESIGN IT YOURSELF and add it consistently to the specification.

You do NOT need to report every tiny missing feature to Lucas before designing it.

# 14. UNICODE

EMM😭 should be Unicode-aware.

😭 especially depends on correct Unicode/emoji tokenization.

Do not naïvely assume one Unicode code point equals one displayed emoji. Emoji sequences, variation selectors, and joined emoji may require proper grapheme-aware tokenization.

# 15. SOURCE EXTENSIONS

These are OFFICIAL and should not be changed:

**EMM → `.emm`**

**😭 → `.cry`**

Overall family → **EMM😭**

Do not rename `.cry` to an emoji extension.

# 16. PROJECT ORIGIN / LORE

The project was created by Lucas Li during a conversation with ChatGPT.

The original inspiration came from an absurd conversation where Lucas repeatedly sent things such as:

`...?`

`...`

`??`

`......`

and ChatGPT responded similarly.

Lucas realized this looked like programming-language syntax and decided to create a real compiled language from it.

That became EMM.

Then the idea expanded into an emoji-only sister language named 😭.

Together they became EMM😭.

The project is intentionally humorous, but Lucas wants the underlying language and compiler to be genuinely functional.

# 17. YOUR JOB IN THIS WORK CHAT

Continue developing EMM😭 as an actual programming-language project.

Do not repeatedly ask Lucas to re-explain information contained here.

When you find missing language functionality:
1. Determine whether it can reasonably be designed from the existing philosophy.
2. If yes, design it yourself.
3. Keep it consistent with both EMM and 😭.
4. Update the language specification/code accordingly.
5. Only ask Lucas when a decision fundamentally changes the identity or direction of the language.

When implementing the compiler, prioritize the smallest working vertical slice first:

source file
→ lexer
→ parser
→ AST/IR
→ execution/compilation
→ working Hello World
→ variables/math
→ conditions
→ loops
→ functions
→ arrays/objects
→ larger programs such as Poker

Treat **EMM😭, EMM `.emm`, and 😭 `.cry` as established names and canon.**

Do not restart the project.

Continue from here.