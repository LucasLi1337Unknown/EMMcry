# Learn EMM😭, from Hello World to your first game

EMM (`.emm`) and 😭 (`.cry`) express the same language. Start with EMM, then translate your program to see the emoji version. The root `index.html` runs verified lessons and three games directly in your browser. It can be opened locally; it does not need an account or a server.

## Stage 0 — Set up the compiler

On macOS, install the Command Line Tools if `c++ --version` is unavailable:

```sh
xcode-select --install
```

Install Python 3 if needed, then:

```sh
git clone https://github.com/LucasLi1337Unknown/EMMcry.git
cd EMMcry
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
```

The compiler is Python; its native backend generates C++ and invokes `c++`. Your resulting program does not require Python to run. The exact steps are intended for macOS/Linux. Linux is tested in this release; a Mac run has not been performed here.

## Stage 1 — Hello World

Create a plain text file named `hello.emm`:

```emm
...! "Hello, World!"
```

Compile and execute:

```sh
python3 emmc.py hello.emm -o hello
./hello
```

Expected result: `Hello, World!`. Change the text and compile again. The printer adds a newline.

Translate the same program:

```sh
python3 emmc.py --translate hello.emm hello.cry
```

Your `.cry` file contains `😭 "Hello, World!"`. Compile it the same way. Same program, different spelling.

## Stage 2 — Variables and changing values

```emm
... name = "Lucas"
... age = 13
! age = age + 1
...! name + " is " + ...?? $4(age)
```

Result: `Lucas is 14`. `...` declares, `!` assigns, `$4` converts to text. Make this your own name and age. To read a whole line into an existing variable:

```emm
... answer = ""
...! "What is your name?"
...? answer
...! "Hello, " + answer
```

## Stage 3 — Decisions

```emm
... score = 85
?? score >= 80 { ...! "We ARE COKKING" }
??? score >= 60 { ...! "Keep going" }
???? { ...! "Try again" }
```

Try 40, 70, and 90. Only the first matching branch runs. Conditions require booleans, such as comparisons—not merely a nonzero number.

## Stage 4 — Loops

```emm
... total = 0
..... i : ...?? $9(1, 6)
{
    ! total = total + i
}
...! total
```

Result: `15`. The integer range includes its start and excludes its end. Change it to add 1 through 100. While loops use `......`; `!!` breaks and `!?` continues.

## Stage 5 — Functions and recursion

```emm
??... factorial(n)
{
    ?? n <= 1 { !... 1 }
    !... n * ...?? factorial(n - 1)
}
...! ...?? factorial(6)
```

Result: `720`. `??...` creates a function, `...??` calls it, and `!...` returns. Try `factorial(10)`. Large factorials eventually exceed signed 64-bit integers and raise a fault.

## Stage 6 — Build game state

```emm
... hero = {name: "Lucas", hp: 20}
... inventory = ["potion", "key"]
! hero.hp = hero.hp - 3
...?? $7(inventory, "treasure")
...! hero.name + ": " + ...?? $4(hero.hp) + " HP"
...! inventory
```

Records provide named fields; lists provide zero-indexed elements. Try writing a `heal(hero, amount)` function that changes HP, then returns the hero. The language already has enough to model a turn-based game.

## Stage 7 — Errors and modules

```emm
?: { ...! 10 / 0 }
?!! error { ...! "Caught: " + error }
...! "Still running."
```

Modules let you reuse larger code. Create `math.emm` containing a function, then import it as `<< "math.emm" : math` and call `...?? math.yourFunction(...)`. Modules expose their top-level declarations. Paths resolve relative to the importing file.

## Stage 8 — Play and change a real game

Open `index.html` and choose a game. Use **Inspect the actual source** to see its real EMM implementation.

| Game | Source | What to inspect first |
|---|---|---|
| COKKING Catacombs | `games/dungeon.emm` | `act`, `enemyTurn`, `room`, `gain` |
| 2048: Dot by Dot | `games/merge.emm` | `merge`, `move`, `undo`, `available` |
| Punctuation Poker | `games/poker.emm` and `examples/pokerlib.emm` | `draw`, `evaluate`, `compare` |

Try these changes:

1. Dungeon: change the starting HP or potion strength. Find both starting hero records in `dungeon.emm`; one initializes the module, the other resets an expedition.
2. 2048: change the winning threshold from 2048 to 1024 in both victory checks.
3. Poker: change how the dealer decides which cards to hold, without changing the evaluator.

Rebuild the browser bundle after every source change:

```sh
python3 scripts/build_web.py
```

Reload `index.html`. The JavaScript interface renders the board and sends actions to the VM. The generated bundle is compiled from those `.emm` files; do not edit `web/compiled.js` by hand. Shader effects, layout, SVG sprites/cards, and input handlers are presentation code; gameplay rules are EMM.

The browser games require a browser to render their interface. You can compile their EMM sources natively to verify their initialization, but the CLI will not open a graphical window. For an interactive native program, run the text-poker example:

```sh
python3 emmc.py examples/poker.emm -o poker --run
```

## Stage 9 — Prove your changes still work

```sh
python3 -m unittest discover -s tests -v
node tests/test_web.cjs
```

Python checks both native syntaxes and the poker oracle. Node checks the compiled browser lessons and game rules. See `SPEC.md` for detailed semantics, built-in symbols, limits, and future work. Suggest language improvements in Issues; use Discussions for questions and showing what you made when that repository feature is enabled.
