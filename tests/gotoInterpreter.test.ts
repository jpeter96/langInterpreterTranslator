/// <reference types="vitest/globals" />
import GotoInterpreter from "../src/goto/interpreter";
import GotoParser from "../src/goto/parser";
import Lexer from "../src/lexer";

describe("GOTO Interpreter", () => {
    test("simple countdown", () => {
        const code = `
            x0 := 5;
            M1: IF x0 = 0 THEN GOTO M2;
            x0 := x0 - 1;
            GOTO M1;
            M2: HALT;
        `;
        const lexer = new Lexer(code);
        const parser = new GotoParser(lexer.tokenize());
        const interpreter = new GotoInterpreter();
        const result = interpreter.evaluate(parser.parse());
        
        expect(result.get("x0")).toBe(0);
    });

    test("backward jump loop", () => {
        const code = `
            x0 := 3;
            x1 := 0;
            M1: IF x0 = 0 THEN GOTO M2;
            x1 := x1 + 1;
            x0 := x0 - 1;
            GOTO M1;
            M2: HALT;
        `;
        const lexer = new Lexer(code);
        const parser = new GotoParser(lexer.tokenize());
        const interpreter = new GotoInterpreter();
        const result = interpreter.evaluate(parser.parse());
        
        expect(result.get("x1")).toBe(3);
        expect(result.get("x0")).toBe(0);
    });

    test("unconditional GOTO", () => {
        const code = `
            x0 := 1;
            GOTO M1;
            x0 := 2;
            M1: HALT;
        `;
        const lexer = new Lexer(code);
        const parser = new GotoParser(lexer.tokenize());
        const interpreter = new GotoInterpreter();
        const result = interpreter.evaluate(parser.parse());
        
        expect(result.get("x0")).toBe(1);
    });

    test("forward jump skips code", () => {
        const code = `
            x0 := 1;
            GOTO M1;
            x0 := 2;
            x0 := 3;
            M1: x0 := x0 + 10;
            HALT;
        `;
        const lexer = new Lexer(code);
        const parser = new GotoParser(lexer.tokenize());
        const interpreter = new GotoInterpreter();
        const result = interpreter.evaluate(parser.parse());
        
        expect(result.get("x0")).toBe(11);
    });

    test("complex control flow", () => {
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
        const lexer = new Lexer(code);
        const parser = new GotoParser(lexer.tokenize());
        const interpreter = new GotoInterpreter();
        const result = interpreter.evaluate(parser.parse());
        
        expect(result.get("x0")).toBe(8);
    });

    test("HALT stops execution", () => {
        const code = `
            x0 := 1;
            HALT;
            x0 := 2;
        `;
        const lexer = new Lexer(code);
        const parser = new GotoParser(lexer.tokenize());
        const interpreter = new GotoInterpreter();
        const result = interpreter.evaluate(parser.parse());
        
        expect(result.get("x0")).toBe(1);
    });
});

describe("GOTO with initial variables", () => {
    test("countdown with initial var", () => {
        const code = `
            x0 := 5;
            M1: IF x0 = 0 THEN GOTO M2;
            x0 := x0 - 1;
            GOTO M1;
            M2: HALT;
        `;
        const lexer = new Lexer(code);
        const parser = new GotoParser(lexer.tokenize());
        const interpreter = new GotoInterpreter();
        
        const initialVars = new Map([["x0", 3]]);
        const result = interpreter.evaluate(parser.parse(), { initialVariables: initialVars });
        
        expect(result.get("x0")).toBe(0);
    });

    test("initial var overridden by program assignment", () => {
        const code = `
            x0 := 10;
            x1 := 0;
            M1: IF x0 = 0 THEN GOTO M2;
            x1 := x1 + 1;
            x0 := x0 - 1;
            GOTO M1;
            M2: HALT;
        `;
        const lexer = new Lexer(code);
        const parser = new GotoParser(lexer.tokenize());
        const interpreter = new GotoInterpreter();

        const initialVars = new Map([["x0", 2]]);
        const result = interpreter.evaluate(parser.parse(), { initialVariables: initialVars });

        // x0 := 10 overwrites initial value, so 10 iterations
        expect(result.get("x0")).toBe(0);
        expect(result.get("x1")).toBe(10);
    });

    test("IF condition uses program value not initial var", () => {
        const code = `
            x0 := 0;
            x1 := 0;
            IF x0 = 5 THEN GOTO M1;
            x1 := 1;
            GOTO M2;
            M1: x1 := 2;
            M2: HALT;
        `;
        const lexer = new Lexer(code);
        const parser = new GotoParser(lexer.tokenize());
        const interpreter = new GotoInterpreter();

        const initialVars = new Map([["x0", 5]]);
        const result = interpreter.evaluate(parser.parse(), { initialVariables: initialVars });

        // x0 := 0 overwrites initial value, so IF x0=5 is false
        expect(result.get("x1")).toBe(1);
    });
});
