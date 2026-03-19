/// <reference types="vitest/globals" />
import WhileInterpreter from "../src/while/interpreter";
import WhileParser from "../src/while/parser";
import Lexer from "../src/lexer";

describe("WHILE Interpreter", () => {
    test("simple while loop", () => {
        const code = `
            x0 := 5;
            x1 := 0;
            WHILE x0 != 0 DO
                x1 := x1 + 1;
                x0 := x0 - 1;
            END
        `;
        const lexer = new Lexer(code);
        const parser = new WhileParser(lexer.tokenize());
        const interpreter = new WhileInterpreter();
        const result = interpreter.evaluate(parser.parse());
        
        expect(result.get("x1")).toBe(5);
    });

    test("IF-THEN-ELSE", () => {
        const code = `
            x0 := 1;
            x1 := 0;
            x2 := 0;
            IF x0 = 1 THEN
                x1 := 1;
            ELSE
                x1 := 2;
            END
            
            IF x0 = 0 THEN
                x2 := 1;
            ELSE
                x2 := 2;
            END
        `;
        const lexer = new Lexer(code);
        const parser = new WhileParser(lexer.tokenize());
        const interpreter = new WhileInterpreter();
        const result = interpreter.evaluate(parser.parse());
        
        expect(result.get("x1")).toBe(1);
        expect(result.get("x2")).toBe(2);
    });

    test("condition false initially skips loop", () => {
        const code = `
            x0 := 0;
            x1 := 10;
            WHILE x0 != 0 DO
                x1 := x1 + 1;
            END
        `;
        const lexer = new Lexer(code);
        const parser = new WhileParser(lexer.tokenize());
        const interpreter = new WhileInterpreter();
        const result = interpreter.evaluate(parser.parse());
        
        expect(result.get("x1")).toBe(10);
    });

    test("nested IF statements", () => {
        const code = `
            x0 := 1;
            x1 := 1;
            x2 := 0;
            IF x0 = 1 THEN
                IF x1 = 1 THEN
                    x2 := 1;
                ELSE
                    x2 := 2;
                END
            ELSE
                x2 := 3;
            END
        `;
        const lexer = new Lexer(code);
        const parser = new WhileParser(lexer.tokenize());
        const interpreter = new WhileInterpreter();
        const result = interpreter.evaluate(parser.parse());
        
        expect(result.get("x2")).toBe(1);
    });

    test("comparison operators (<=, >=)", () => {
        const code = `
            x0 := 5;
            x1 := 0;
            x2 := 0;
            IF x0 >= 5 THEN
                x1 := 1;
            END
            IF x0 <= 4 THEN
                x2 := 1;
            END
        `;
        const lexer = new Lexer(code);
        const parser = new WhileParser(lexer.tokenize());
        const interpreter = new WhileInterpreter();
        const result = interpreter.evaluate(parser.parse());
        
        expect(result.get("x1")).toBe(1);
        expect(result.get("x2")).toBe(0);
    });

    test("infinite loop detection", () => {
        const code = `
            x0 := 1;
            WHILE x0 != 0 DO
                x0 := 1;
            END
        `;
        const lexer = new Lexer(code);
        const parser = new WhileParser(lexer.tokenize());
        const interpreter = new WhileInterpreter();
        
        expect(() => {
            interpreter.evaluate(parser.parse());
        }).toThrow("Infinite loop detected");
    });

    test("integer division", () => {
        const code = `
            x0 := 10;
            x1 := 3;
            x2 := 0;
            WHILE x0 >= x1 DO
                x0 := x0 - x1;
                x2 := x2 + 1;
            END
        `;
        const lexer = new Lexer(code);
        const parser = new WhileParser(lexer.tokenize());
        const interpreter = new WhileInterpreter();
        const result = interpreter.evaluate(parser.parse());
        
        expect(result.get("x2")).toBe(3);
        expect(result.get("x0")).toBe(1);
    });
});

describe("WHILE with initial variables", () => {
    test("x0 is overwritten but x1-xn are locked", () => {
        const code = `
            x0 := 10;
            x1 := 3;
            x2 := 0;
            WHILE x0 >= x1 DO
                x0 := x0 - x1;
                x2 := x2 + 1;
            END
        `;
        const lexer = new Lexer(code);
        const parser = new WhileParser(lexer.tokenize());
        const interpreter = new WhileInterpreter();

        const initialVars = new Map([["x0", 15], ["x1", 5]]);
        const result = interpreter.evaluate(parser.parse(), { initialVariables: initialVars });

        // x0 is result var — overwritten to 10; x1 is locked at 5
        // 10/5 = 2 iterations, x0=0
        expect(result.get("x2")).toBe(2);
        expect(result.get("x0")).toBe(0);
    });

    test("countdown with initial var", () => {
        const code = `
            x0 := 10;
            x1 := 0;
            WHILE x0 != 0 DO
                x1 := x1 + 1;
                x0 := x0 - 1;
            END
        `;
        const lexer = new Lexer(code);
        const parser = new WhileParser(lexer.tokenize());
        const interpreter = new WhileInterpreter();

        const initialVars = new Map([["x0", 3]]);
        const result = interpreter.evaluate(parser.parse(), { initialVariables: initialVars });

        // x0 := 10 overwrites initial value, so 10 iterations
        expect(result.get("x1")).toBe(10);
        expect(result.get("x0")).toBe(0);
    });

    test("IF with initial var", () => {
        const code = `
            x0 := 0;
            x1 := 0;
            IF x0 = 5 THEN
                x1 := 1;
            ELSE
                x1 := 2;
            END
        `;
        const lexer = new Lexer(code);
        const parser = new WhileParser(lexer.tokenize());
        const interpreter = new WhileInterpreter();

        const initialVars = new Map([["x0", 5]]);
        const result = interpreter.evaluate(parser.parse(), { initialVariables: initialVars });

        // x0 := 0 overwrites initial value, so IF x0=5 is false
        expect(result.get("x1")).toBe(2);
    });
});
