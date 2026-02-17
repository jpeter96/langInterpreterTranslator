# LOOP, WHILE, and GOTO Interpreters and Translators

Command-line tool that runs LOOP, WHILE, and GOTO programs (as in computability theory) and translates between these languages. You can execute programs, translate them, and verify that original and translated versions yield the same results.

**Requirements:** Node.js (for building and running). No other dependencies at runtime.

## Setup

```bash
npm install
npm run build
```

To use the `lang` command from anywhere (optional):

```bash
npm link
```

Otherwise run via `node dist/cli.js` or add a script in `package.json`.

## Usage

```bash
lang <file> [options]
```

The file can be a path to a `.loop`, `.while`, or `.goto` file. If you pass only a filename (e.g. `multiply.loop`), the tool looks in the current directory and then in `examples/`. Language is inferred from the file extension.

**Typical flow:** Create a new file (e.g. `myprogram.loop`), write the program in the syntax below, save it, then run `lang myprogram.loop` or `lang examples/myprogram.loop`. Use `-x1=5` etc. to set initial values, `-t2while` or `-t2goto` to translate, and `-verify` to check that the translation is correct.

### Options

| Option | Description |
|--------|-------------|
| `-x0=5`, `-x1=3`, ... | Set initial variables (overwrite defaults). Unset variables start at 0. |
| `-t2while`, `-t2w` | Translate the program to WHILE and print the result. |
| `-t2goto`, `-t2g` | Translate the program to GOTO and print the result. |
| `-verify` | After translating, run both original and translated program and compare variable values. Use with `-t2while` or `-t2goto`. |
| `-verbose` | Print step-by-step execution (variable state and control flow). |
| `-help`, `-h` | Show usage and examples. |

### Examples

Run a program (with optional initial values):

```bash
lang multiply_input.loop -x0=3 -x1=4
lang countdown.goto
```

Translate to another language:

```bash
lang multiply.loop -t2while
lang multiply.loop -t2goto
lang divide.while -t2goto
lang countdown.goto -t2while
```

Translate and check that results match:

```bash
lang multiply.loop -t2while -verify
lang divide.while -t2goto -verify
```

Run with step-by-step output:

```bash
lang countdown.goto -verbose
```

## Program syntax (writing your own programs)

Save your program in a file with extension `.loop`, `.while`, or `.goto` so the tool detects the language. The parser is strict: use exactly the keywords and punctuation below.

### LOOP (file ending in `.loop`)

- **Variables:** `x0`, `x1`, `x2`, ... (natural numbers, initially 0 unless you set them with `-x0=5` etc.).
- **Assignment:** `variable := expression;`  
  Expression is a number, a variable, or `variable + number` / `variable - number` (subtraction is monus: result is never negative).  
  Example: `x0 := 5;` or `x1 := x0 + 1;` or `x2 := x1 - 1;`
- **Loop:** `LOOP variable DO` … `END`  
  The body runs exactly as many times as the value of the variable **at loop entry** (changing that variable inside the body does not change the count).
- **Statements:** One per line; each assignment ends with `;`. You can nest LOOPs.

Minimal example (adds `x1` to `x0` and leaves the result in `x0`; run e.g. with `-x0=3 -x1=4` to get 7):

```text
LOOP x1 DO
  x0 := x0 + 1;
END
```

### WHILE (file ending in `.while`)

- Same variables and assignments as LOOP.
- **While loop:** `WHILE condition DO` … `END`  
  Condition is an expression, a comparison, and an expression. Comparisons: `=`, `!=`, `<`, `>`, `<=`, `>=`.  
  Example: `WHILE x0 != 0 DO` … `END` or `WHILE x0 >= x1 DO` … `END`
- **If:** `IF condition THEN` … `END` or `IF condition THEN` … `ELSE` … `END`
- The interpreter stops after 1000 loop iterations and reports a possible infinite loop.

Minimal example (countdown):

```text
x0 := 10;
WHILE x0 != 0 DO
  x0 := x0 - 1;
END
```

### GOTO (file ending in `.goto`)

- Same variables and assignments as LOOP/WHILE.
- **Labels:** Optional. Write a name (e.g. `M1`, `M2`) followed by a colon at the start of a line. Labels are used as jump targets.
- **Statements:** Each instruction can have an optional label, then one of:
  - `variable := expression;`
  - `GOTO label;`
  - `IF variable = number THEN GOTO label;`
  - `HALT;`
- The program must eventually execute `HALT` (otherwise behaviour is undefined). Instructions are executed in order unless a jump changes the flow.

Minimal example (countdown in `x0`):

```text
M1: IF x0 = 0 THEN GOTO M2;
    x0 := x0 - 1;
    GOTO M1;
M2: HALT;
```

You can put your files in `examples/` or anywhere else; if you pass a path, the tool loads that file. Convention: many programs use `x0` as output and `x1`, `x2`, ... as inputs; you set them with `-x0=...`, `-x1=...`, etc.

## Translators

| From | To | How |
|------|-----|-----|
| LOOP | WHILE | Direct (each LOOP becomes a WHILE with a fresh counter variable). |
| LOOP | GOTO | LOOP → WHILE → GOTO. |
| WHILE | GOTO | Direct (loops and conditionals become labels and jumps). |
| GOTO | WHILE | Direct (program counter simulation: one WHILE loop dispatching on the current instruction index). |

This reflects the usual hierarchy: every LOOP program can be expressed in WHILE and in GOTO; WHILE and GOTO have the same expressive power. There is no translator from WHILE to LOOP because LOOP is strictly less expressive.

## Project structure

```
src/
  lexer.ts           Shared tokenizer for all three languages
  token.ts           Token types
  cli.ts             Command-line interface
  index.ts           Entry point (optional)
  loop/              LOOP: ast.ts, parser.ts, interpreter.ts
  while/             WHILE: ast.ts, parser.ts, interpreter.ts
  goto/              GOTO: ast.ts, parser.ts, interpreter.ts
  translators/       loopToWhile.ts, whileToGoto.ts, gotoToWhile.ts
examples/            Sample .loop, .while, .goto programs
tests/               Jest tests for interpreters (and translation behaviour via verification)
```

## Tests

```bash
npm run build
npm test
```

Unit tests run the three interpreters on small programs and check final variable values. Translation behaviour is tested by running programs, translating them, and comparing results (same idea as `-verify`).

There is also a CLI flow test suite (`tests/cli-flow.test.ts`) that runs the real CLI end-to-end: multiple programs per language, with and without initial values, all translation directions, and `-verify` / `-verbose`. It uses the same syntax as in the README (including minimal LOOP/WHILE/GOTO programs written to a temp dir). Run it with `npm test` (after `npm run build`).

## License

MIT.
