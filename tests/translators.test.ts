import Lexer from "../src/lexer";
import LoopParser from "../src/loop/parser";
import WhileParser from "../src/while/parser";
import GotoParser from "../src/goto/parser";
import LoopInterpreter from "../src/loop/interpreter";
import WhileInterpreter from "../src/while/interpreter";
import GotoInterpreter from "../src/goto/interpreter";
import { LoopToWhileTranslator } from "../src/translators/loopToWhile";
import { WhileToGotoTranslator } from "../src/translators/whileToGoto";
import { GotoToWhileTranslator } from "../src/translators/gotoToWhile";
import type { Program as LoopProgram } from "../src/loop/ast";
import type { Program as WhileProgram } from "../src/while/ast";
import type { Program as GotoProgram } from "../src/goto/ast";

function parseLoop(code: string): LoopProgram {
    return new LoopParser(new Lexer(code).tokenize()).parse();
}

function parseWhile(code: string): WhileProgram {
    return new WhileParser(new Lexer(code).tokenize()).parse();
}

function parseGoto(code: string): GotoProgram {
    return new GotoParser(new Lexer(code).tokenize()).parse();
}

function runLoop(prog: LoopProgram, vars?: Map<string, number>): Map<string, number> {
    return new LoopInterpreter().evaluate(prog, vars ? { initialVariables: vars } : undefined);
}

function runWhile(prog: WhileProgram, vars?: Map<string, number>): Map<string, number> {
    return new WhileInterpreter().evaluate(prog, vars ? { initialVariables: vars } : undefined);
}

function runGoto(prog: GotoProgram, vars?: Map<string, number>): Map<string, number> {
    return new GotoInterpreter().evaluate(prog, vars ? { initialVariables: vars } : undefined);
}

describe("LOOP → WHILE: basic correctness", () => {
    test("simple increment loop", () => {
        const code = `
            x0 := 4;
            x1 := 0;
            LOOP x0 DO
                x1 := x1 + 1;
            END
        `;
        const translated = new LoopToWhileTranslator().translate(parseLoop(code));
        const result = runWhile(translated);
        expect(result.get("x1")).toBe(4);
    });

    test("nested loops – multiplication 3 × 4", () => {
        const code = `
            x0 := 3;
            x1 := 4;
            x2 := 0;
            LOOP x0 DO
                LOOP x1 DO
                    x2 := x2 + 1;
                END
            END
        `;
        const translated = new LoopToWhileTranslator().translate(parseLoop(code));
        const result = runWhile(translated);
        expect(result.get("x2")).toBe(12);
    });

    test("zero iterations – body never executes", () => {
        const code = `
            x0 := 0;
            x1 := 7;
            LOOP x0 DO
                x1 := x1 + 1;
            END
        `;
        const translated = new LoopToWhileTranslator().translate(parseLoop(code));
        const result = runWhile(translated);
        expect(result.get("x1")).toBe(7);
    });

    test("sequential loops – 3 + 2 iterations", () => {
        const code = `
            x0 := 3;
            x1 := 0;
            LOOP x0 DO
                x1 := x1 + 1;
            END
            x2 := 2;
            LOOP x2 DO
                x1 := x1 + 1;
            END
        `;
        const translated = new LoopToWhileTranslator().translate(parseLoop(code));
        const result = runWhile(translated);
        expect(result.get("x1")).toBe(5);
    });

    test("loop counter is not modified by the body", () => {
        const code = `
            x0 := 5;
            x1 := 0;
            LOOP x0 DO
                x1 := x1 + 1;
                x0 := 0;
            END
        `;
        const translated = new LoopToWhileTranslator().translate(parseLoop(code));
        const result = runWhile(translated);
        expect(result.get("x1")).toBe(5);
        expect(result.get("x0")).toBe(0);
    });

    test("monus (truncated subtraction) – result is 0, not negative", () => {
        const code = `
            x0 := 2;
            x1 := 7;
            x2 := x0 - x1;
        `;
        const translated = new LoopToWhileTranslator().translate(parseLoop(code));
        const result = runWhile(translated);
        expect(result.get("x2")).toBe(0);
    });

    test("fresh variable does not clash with existing high-index variables", () => {
        const code = `
            x0 := 2;
            x1 := 0;
            x2 := 0;
            x3 := 0;
            x4 := 0;
            LOOP x0 DO
                x1 := x1 + 1;
            END
        `;
        const translated = new LoopToWhileTranslator().translate(parseLoop(code));
        const result = runWhile(translated);
        expect(result.get("x1")).toBe(2);
        expect(result.get("x2")).toBe(0);
        expect(result.get("x3")).toBe(0);
        expect(result.get("x4")).toBe(0);
    });

    test("deeply nested loops – x0^2 via squaring 3×3", () => {
        const code = `
            x0 := 3;
            x1 := 3;
            x2 := 0;
            LOOP x0 DO
                LOOP x1 DO
                    x2 := x2 + 1;
                END
            END
        `;
        const translated = new LoopToWhileTranslator().translate(parseLoop(code));
        const result = runWhile(translated);
        expect(result.get("x2")).toBe(9);
    });
});

describe("LOOP → WHILE: semantic equivalence with original", () => {
    test("multiplication result matches LOOP interpreter", () => {
        const code = `
            x0 := 5;
            x1 := 6;
            x2 := 0;
            LOOP x0 DO
                LOOP x1 DO
                    x2 := x2 + 1;
                END
            END
        `;
        const loopAST = parseLoop(code);
        const original = runLoop(loopAST);
        const translated = new LoopToWhileTranslator().translate(loopAST);
        const fromTranslation = runWhile(translated);

        expect(fromTranslation.get("x2")).toBe(original.get("x2"));
    });

    test("sequential assignments result matches LOOP interpreter", () => {
        const code = `
            x0 := 10;
            x1 := 3;
            x2 := x0 + x1;
            x3 := x0 - x1;
        `;
        const loopAST = parseLoop(code);
        const original = runLoop(loopAST);
        const translated = new LoopToWhileTranslator().translate(loopAST);
        const fromTranslation = runWhile(translated);

        expect(fromTranslation.get("x2")).toBe(original.get("x2"));
        expect(fromTranslation.get("x3")).toBe(original.get("x3"));
    });
});

describe("WHILE → GOTO: basic correctness", () => {
    test("simple countdown loop", () => {
        const code = `
            x0 := 5;
            x1 := 0;
            WHILE x0 != 0 DO
                x1 := x1 + 1;
                x0 := x0 - 1;
            END
        `;
        const translated = new WhileToGotoTranslator().translate(parseWhile(code));
        const result = runGoto(translated);
        expect(result.get("x1")).toBe(5);
        expect(result.get("x0")).toBe(0);
    });

    test("condition false from the start – body never executes", () => {
        const code = `
            x0 := 0;
            x1 := 42;
            WHILE x0 != 0 DO
                x1 := x1 + 1;
            END
        `;
        const translated = new WhileToGotoTranslator().translate(parseWhile(code));
        const result = runGoto(translated);
        expect(result.get("x1")).toBe(42);
    });

    test("IF-THEN – condition true, then-branch executes", () => {
        const code = `
            x0 := 3;
            x1 := 0;
            IF x0 = 3 THEN
                x1 := 1;
            END
        `;
        const translated = new WhileToGotoTranslator().translate(parseWhile(code));
        const result = runGoto(translated);
        expect(result.get("x1")).toBe(1);
    });

    test("IF-THEN – condition false, then-branch skipped", () => {
        const code = `
            x0 := 5;
            x1 := 0;
            IF x0 = 3 THEN
                x1 := 1;
            END
        `;
        const translated = new WhileToGotoTranslator().translate(parseWhile(code));
        const result = runGoto(translated);
        expect(result.get("x1")).toBe(0);
    });

    test("IF-THEN-ELSE – then-branch", () => {
        const code = `
            x0 := 1;
            x1 := 0;
            IF x0 = 1 THEN
                x1 := 10;
            ELSE
                x1 := 20;
            END
        `;
        const translated = new WhileToGotoTranslator().translate(parseWhile(code));
        const result = runGoto(translated);
        expect(result.get("x1")).toBe(10);
    });

    test("IF-THEN-ELSE – else-branch", () => {
        const code = `
            x0 := 0;
            x1 := 0;
            IF x0 = 1 THEN
                x1 := 10;
            ELSE
                x1 := 20;
            END
        `;
        const translated = new WhileToGotoTranslator().translate(parseWhile(code));
        const result = runGoto(translated);
        expect(result.get("x1")).toBe(20);
    });

    test("integer division via repeated subtraction", () => {
        const code = `
            x0 := 10;
            x1 := 3;
            x2 := 0;
            WHILE x0 >= x1 DO
                x0 := x0 - x1;
                x2 := x2 + 1;
            END
        `;
        const translated = new WhileToGotoTranslator().translate(parseWhile(code));
        const result = runGoto(translated);
        expect(result.get("x2")).toBe(3);
        expect(result.get("x0")).toBe(1);
    });
});

describe("WHILE → GOTO: semantic equivalence with original", () => {
    test("countdown result matches WHILE interpreter", () => {
        const code = `
            x0 := 8;
            x1 := 0;
            WHILE x0 != 0 DO
                x1 := x1 + 1;
                x0 := x0 - 1;
            END
        `;
        const whileAST = parseWhile(code);
        const original = runWhile(whileAST);
        const translated = new WhileToGotoTranslator().translate(whileAST);
        const fromTranslation = runGoto(translated);

        expect(fromTranslation.get("x1")).toBe(original.get("x1"));
        expect(fromTranslation.get("x0")).toBe(original.get("x0"));
    });

    test("IF-THEN-ELSE result matches WHILE interpreter", () => {
        const code = `
            x0 := 7;
            x1 := 0;
            IF x0 >= 5 THEN
                x1 := 1;
            ELSE
                x1 := 2;
            END
        `;
        const whileAST = parseWhile(code);
        const original = runWhile(whileAST);
        const translated = new WhileToGotoTranslator().translate(whileAST);
        const fromTranslation = runGoto(translated);

        expect(fromTranslation.get("x1")).toBe(original.get("x1"));
    });
});

describe("GOTO → WHILE: basic correctness", () => {
    test("simple HALT – execution stops immediately", () => {
        const code = `
            x0 := 5;
            HALT;
            x0 := 99;
        `;
        const translated = new GotoToWhileTranslator().translate(parseGoto(code));
        const result = runWhile(translated);
        expect(result.get("x0")).toBe(5);
    });

    test("backward jump simulates a counting loop", () => {
        const code = `
            x0 := 4;
            x1 := 0;
            M1: IF x0 = 0 THEN GOTO M2;
            x1 := x1 + 1;
            x0 := x0 - 1;
            GOTO M1;
            M2: HALT;
        `;
        const translated = new GotoToWhileTranslator().translate(parseGoto(code));
        const result = runWhile(translated);
        expect(result.get("x1")).toBe(4);
        expect(result.get("x0")).toBe(0);
    });

    test("forward jump skips an assignment", () => {
        const code = `
            x0 := 1;
            GOTO M1;
            x0 := 99;
            M1: x0 := x0 + 10;
            HALT;
        `;
        const translated = new GotoToWhileTranslator().translate(parseGoto(code));
        const result = runWhile(translated);
        expect(result.get("x0")).toBe(11);
    });

    test("unconditional GOTO jumps over dead code", () => {
        const code = `
            x0 := 1;
            GOTO M1;
            x0 := 2;
            M1: HALT;
        `;
        const translated = new GotoToWhileTranslator().translate(parseGoto(code));
        const result = runWhile(translated);
        expect(result.get("x0")).toBe(1);
    });

    test("complex multi-label control flow", () => {
        const code = `
            x0 := 0;
            GOTO M1;
            M3: x0 := x0 + 1;
            HALT;
            M2: x0 := x0 + 2;
            GOTO M3;
            M1: x0 := x0 + 5;
            GOTO M2;
        `;
        const translated = new GotoToWhileTranslator().translate(parseGoto(code));
        const result = runWhile(translated);
        expect(result.get("x0")).toBe(8);
    });

    test("pure assignments without jumps", () => {
        const code = `
            x0 := 3;
            x1 := 4;
            x2 := x0 + x1;
            HALT;
        `;
        const translated = new GotoToWhileTranslator().translate(parseGoto(code));
        const result = runWhile(translated);
        expect(result.get("x2")).toBe(7);
    });
});

describe("GOTO → WHILE: semantic equivalence with original", () => {
    test("countdown result matches GOTO interpreter", () => {
        const code = `
            x0 := 6;
            x1 := 0;
            M1: IF x0 = 0 THEN GOTO M2;
            x1 := x1 + 1;
            x0 := x0 - 1;
            GOTO M1;
            M2: HALT;
        `;
        const gotoAST = parseGoto(code);
        const original = runGoto(gotoAST);
        const translated = new GotoToWhileTranslator().translate(gotoAST);
        const fromTranslation = runWhile(translated);

        expect(fromTranslation.get("x1")).toBe(original.get("x1"));
        expect(fromTranslation.get("x0")).toBe(original.get("x0"));
    });

    test("conditional branch result matches GOTO interpreter", () => {
        const code = `
            x0 := 0;
            x1 := 0;
            IF x0 = 5 THEN GOTO M1;
            x1 := 1;
            GOTO M2;
            M1: x1 := 2;
            M2: HALT;
        `;
        const gotoAST = parseGoto(code);
        const gotoVars = new Map([["x0", 5]]);
        const original = runGoto(gotoAST, gotoVars);

        const translated = new GotoToWhileTranslator().translate(parseGoto(code));
        const fromTranslation = runWhile(translated, gotoVars);

        expect(fromTranslation.get("x1")).toBe(original.get("x1"));
    });
});

describe("Chained translations: LOOP → WHILE → GOTO", () => {
    test("simple increment: LOOP → WHILE → GOTO", () => {
        const code = `
            x0 := 5;
            x1 := 0;
            LOOP x0 DO
                x1 := x1 + 1;
            END
        `;
        const loopAST = parseLoop(code);
        const whileAST = new LoopToWhileTranslator().translate(loopAST);
        const gotoAST = new WhileToGotoTranslator().translate(whileAST);
        const result = runGoto(gotoAST);
        expect(result.get("x1")).toBe(5);
    });

    test("multiplication: LOOP → WHILE → GOTO", () => {
        const code = `
            x0 := 4;
            x1 := 3;
            x2 := 0;
            LOOP x0 DO
                LOOP x1 DO
                    x2 := x2 + 1;
                END
            END
        `;
        const loopAST = parseLoop(code);
        const whileAST = new LoopToWhileTranslator().translate(loopAST);
        const gotoAST = new WhileToGotoTranslator().translate(whileAST);
        const result = runGoto(gotoAST);
        expect(result.get("x2")).toBe(12);
    });

    test("LOOP → WHILE → GOTO result matches original LOOP interpreter", () => {
        const code = `
            x0 := 6;
            x1 := 2;
            x2 := 0;
            LOOP x0 DO
                LOOP x1 DO
                    x2 := x2 + 1;
                END
            END
        `;
        const loopAST = parseLoop(code);
        const original = runLoop(loopAST);

        const whileAST = new LoopToWhileTranslator().translate(parseLoop(code));
        const gotoAST = new WhileToGotoTranslator().translate(whileAST);
        const fromChain = runGoto(gotoAST);

        expect(fromChain.get("x2")).toBe(original.get("x2"));
    });
});

describe("Chained translations: WHILE → GOTO → WHILE (round trip)", () => {
    test("countdown: WHILE → GOTO → WHILE round trip", () => {
        const code = `
            x0 := 5;
            x1 := 0;
            WHILE x0 != 0 DO
                x1 := x1 + 1;
                x0 := x0 - 1;
            END
        `;
        const whileAST = parseWhile(code);
        const gotoAST = new WhileToGotoTranslator().translate(whileAST);
        const roundTrip = new GotoToWhileTranslator().translate(gotoAST);
        const result = runWhile(roundTrip);

        expect(result.get("x1")).toBe(5);
        expect(result.get("x0")).toBe(0);
    });

    test("IF-THEN-ELSE: WHILE → GOTO → WHILE round trip", () => {
        const code = `
            x0 := 3;
            x1 := 0;
            IF x0 >= 2 THEN
                x1 := 1;
            ELSE
                x1 := 2;
            END
        `;
        const whileAST = parseWhile(code);
        const gotoAST = new WhileToGotoTranslator().translate(whileAST);
        const roundTrip = new GotoToWhileTranslator().translate(gotoAST);
        const result = runWhile(roundTrip);

        expect(result.get("x1")).toBe(1);
    });

    test("round trip result matches original WHILE interpreter", () => {
        const code = `
            x0 := 7;
            x1 := 0;
            WHILE x0 != 0 DO
                x1 := x1 + 1;
                x0 := x0 - 1;
            END
        `;
        const whileAST = parseWhile(code);
        const original = runWhile(whileAST);

        const gotoAST = new WhileToGotoTranslator().translate(parseWhile(code));
        const roundTrip = new GotoToWhileTranslator().translate(gotoAST);
        const fromRoundTrip = runWhile(roundTrip);

        expect(fromRoundTrip.get("x1")).toBe(original.get("x1"));
        expect(fromRoundTrip.get("x0")).toBe(original.get("x0"));
    });
});

describe("End-to-end: full LOOP → WHILE → GOTO pipeline", () => {
    test("addition via LOOP – full pipeline", () => {
        const code = `
            x0 := 7;
            x1 := 3;
            x2 := x0 + x1;
        `;
        const loopAST = parseLoop(code);
        const whileAST = new LoopToWhileTranslator().translate(loopAST);
        const gotoAST = new WhileToGotoTranslator().translate(whileAST);
        const result = runGoto(gotoAST);
        expect(result.get("x2")).toBe(10);
    });

    test("zero-iteration LOOP survives full pipeline", () => {
        const code = `
            x0 := 0;
            x1 := 99;
            LOOP x0 DO
                x1 := x1 + 1;
            END
        `;
        const loopAST = parseLoop(code);
        const whileAST = new LoopToWhileTranslator().translate(loopAST);
        const gotoAST = new WhileToGotoTranslator().translate(whileAST);
        const result = runGoto(gotoAST);
        expect(result.get("x1")).toBe(99);
    });
});
