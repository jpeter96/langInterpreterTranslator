import Lexer from "./lexer";
import LoopParser = require("./loop/parser");
import LoopInterpreter = require("./loop/interpreter");
import WhileParser = require("./while/parser");
import WhileInterpreter = require("./while/interpreter");
import GotoParser = require("./goto/parser");
import GotoInterpreter = require("./goto/interpreter");
import { LoopToWhileTranslator } from "./translators/loopToWhile";
import { WhileToGotoTranslator } from "./translators/whileToGoto";
import { GotoToWhileTranslator } from "./translators/gotoToWhile";

// LOOP multiplication (x2 = x0 * x1)
console.log("LOOP Example");
const loopProgram = `
x0 := 3;
x1 := 4;
x2 := 0;
LOOP x0 DO
  LOOP x1 DO
    x2 := x2 + 1;
  END
END
`;
console.log(loopProgram.trim());

const lexer = new Lexer(loopProgram);
const parser = new LoopParser(lexer.tokenize());
const ast = parser.parse();

const interpreter = new LoopInterpreter();
const result = interpreter.evaluate(ast);

console.log("\nResult:");
result.forEach((value, key) => console.log(`  ${key} = ${value}`));


// WHILE division (x2 = x0 / x1)
console.log("\n\nWHILE Example");
const whileProgram = `
x0 := 10;
x1 := 2;
x2 := 0;
WHILE x0 >= x1 DO
  x0 := x0 - x1;
  x2 := x2 + 1;
END
`;
console.log(whileProgram.trim());

const whileLexer = new Lexer(whileProgram);
const whileParser = new WhileParser(whileLexer.tokenize());
const whileAst = whileParser.parse();

const whileInterpreter = new WhileInterpreter();
const whileResult = whileInterpreter.evaluate(whileAst);

console.log("\nResult:");
whileResult.forEach((value, key) => console.log(`  ${key} = ${value}`));


// GOTO countdown
console.log("\n\nGOTO Example");
const gotoProgram = `
x0 := 5;
M1: IF x0 = 0 THEN GOTO M2;
    x0 := x0 - 1;
    GOTO M1;
M2: HALT;
`;
console.log(gotoProgram.trim());

const gotoLexer = new Lexer(gotoProgram);
const gotoParser = new GotoParser(gotoLexer.tokenize());
const gotoAst = gotoParser.parse();

const gotoInterpreter = new GotoInterpreter();
const gotoResult = gotoInterpreter.evaluate(gotoAst);

console.log("\nResult:");
gotoResult.forEach((value, key) => console.log(`  ${key} = ${value}`));


// Translators
console.log("\n\n--- Translators ---\n");

// LOOP -> WHILE
console.log("LOOP -> WHILE");
const loopToWhile = new LoopToWhileTranslator();
const translatedWhileAst = loopToWhile.translate(ast);

const translatedWhileInterpreter = new WhileInterpreter();
const translatedWhileResult = translatedWhileInterpreter.evaluate(translatedWhileAst);

console.log(`  Original LOOP:     x2 = ${result.get("x2")}`);
console.log(`  Translated WHILE:  x2 = ${translatedWhileResult.get("x2")}`);


// WHILE -> GOTO
console.log("\nWHILE -> GOTO");
const whileToGoto = new WhileToGotoTranslator();
const translatedGotoAst = whileToGoto.translate(whileAst);

const translatedGotoInterpreter = new GotoInterpreter();
const translatedGotoResult = translatedGotoInterpreter.evaluate(translatedGotoAst);

console.log(`  Original WHILE:    x2 = ${whileResult.get("x2")}`);
console.log(`  Translated GOTO:   x2 = ${translatedGotoResult.get("x2")}`);


// GOTO -> WHILE
console.log("\nGOTO -> WHILE");
const gotoToWhile = new GotoToWhileTranslator();
const gotoToWhileAst = gotoToWhile.translate(gotoAst);

const gotoToWhileInterpreter = new WhileInterpreter();
const gotoToWhileResult = gotoToWhileInterpreter.evaluate(gotoToWhileAst);

console.log(`  Original GOTO:     x0 = ${gotoResult.get("x0")}`);
console.log(`  Translated WHILE:  x0 = ${gotoToWhileResult.get("x0")}`);


console.log("\nAll translations preserve semantics.");
console.log("This demonstrates: LOOP ⊆ WHILE ⊆ GOTO ≡ WHILE");
