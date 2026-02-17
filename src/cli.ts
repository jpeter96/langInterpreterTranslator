#!/usr/bin/env node
// CLI for running and translating LOOP, WHILE, and GOTO programs

import * as fs from 'fs';
import * as path from 'path';

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
import type { Program as WhileProgram } from "./while/ast";
import type { Program as GotoProgram } from "./goto/ast";

type ParsedArgs = {
    filePath: string;
    variables: Map<string, number>;
    verbose: boolean;
    verify: boolean;
    translateTo: 'while' | 'goto' | null;
};

function detectLanguage(filePath: string): string | null {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.loop': return 'loop';
        case '.while': return 'while';
        case '.goto': return 'goto';
        default: return null;
    }
}

function resolveFile(filePath: string): string {
    if (fs.existsSync(filePath)) return filePath;
    const inExamples = path.join('examples', filePath);
    if (fs.existsSync(inExamples)) return inExamples;
    return filePath;
}

function parseArgs(args: string[]): ParsedArgs {
    const variables = new Map<string, number>();
    let filePath = "";
    let verbose = false;
    let verify = false;
    let translateTo: 'while' | 'goto' | null = null;

    for (const arg of args) {
        if (arg === "-verbose") {
            verbose = true;
        } else if (arg === "-verify") {
            verify = true;
        } else if (arg === "-t2while" || arg === "-t2w") {
            translateTo = 'while';
        } else if (arg === "-t2goto" || arg === "-t2g") {
            translateTo = 'goto';
        } else if (arg.startsWith("-")) {
            const match = arg.match(/-([a-zA-Z0-9_]+)=(\d+)/);
            if (match && match[1] && match[2]) {
                variables.set(match[1], parseInt(match[2]));
            }
        } else if (!filePath) {
            filePath = arg;
        }
    }

    return { filePath, variables, verbose, verify, translateTo };
}

function printResult(result: Map<string, number>, label?: string) {
    console.log(label ? `\n${label}:` : "\nResult:");
    const sortedKeys = Array.from(result.keys()).sort((a, b) => {
        const aNum = parseInt(a.replace(/\D/g, '')) || 0;
        const bNum = parseInt(b.replace(/\D/g, '')) || 0;
        return aNum - bNum;
    });
    for (const key of sortedKeys) {
        console.log(`  ${key} = ${result.get(key)}`);
    }
}

function compareResults(a: Map<string, number>, b: Map<string, number>): boolean {
    const allKeys = new Set([...a.keys(), ...b.keys()]);
    for (const key of allKeys) {
        if ((a.get(key) ?? 0) !== (b.get(key) ?? 0)) return false;
    }
    return true;
}

function exprToCode(expr: any): string {
    switch (expr.type) {
        case "number": return String(expr.value);
        case "variable": return expr.name;
        case "binaryOp": return `${exprToCode(expr.left)} ${expr.operator} ${exprToCode(expr.right)}`;
        default: return "";
    }
}

function condToCode(cond: any): string {
    return `${exprToCode(cond.left)} ${cond.operator} ${exprToCode(cond.right)}`;
}

function stmtToWhileCode(stmt: any, indent: string): string {
    switch (stmt.type) {
        case "assignment":
            return `${indent}${stmt.variable} := ${exprToCode(stmt.value)};`;
        case "while": {
            const body = stmt.body.map((s: any) => stmtToWhileCode(s, indent + "  ")).join("\n");
            return `${indent}WHILE ${condToCode(stmt.condition)} DO\n${body}\n${indent}END`;
        }
        case "if": {
            let code = `${indent}IF ${condToCode(stmt.condition)} THEN\n`;
            code += stmt.thenBody.map((s: any) => stmtToWhileCode(s, indent + "  ")).join("\n");
            if (stmt.elseBody && stmt.elseBody.length > 0) {
                code += `\n${indent}ELSE\n`;
                code += stmt.elseBody.map((s: any) => stmtToWhileCode(s, indent + "  ")).join("\n");
            }
            code += `\n${indent}END`;
            return code;
        }
        default: return "";
    }
}

function whileToCode(ast: WhileProgram): string {
    return ast.statements.map(stmt => stmtToWhileCode(stmt, "")).join("\n");
}

function gotoToCode(ast: GotoProgram): string {
    return ast.instructions.map(instr => {
        const label = instr.label ? `${instr.label}: ` : "    ";
        switch (instr.statement.type) {
            case "assignment":
                return `${label}${instr.statement.variable} := ${exprToCode(instr.statement.value)};`;
            case "goto":
                return `${label}GOTO ${instr.statement.label};`;
            case "if_goto":
                return `${label}IF ${condToCode(instr.statement.condition)} THEN GOTO ${instr.statement.label};`;
            case "halt":
                return `${label}HALT;`;
            default: return "";
        }
    }).join("\n");
}

function translate(code: string, from: string, to: string): { code: string; ast: any } {
    if (from === 'loop' && to === 'while') {
        const loopAst = new LoopParser(new Lexer(code).tokenize()).parse();
        const whileAst = new LoopToWhileTranslator().translate(loopAst);
        return { code: whileToCode(whileAst), ast: whileAst };
    }
    if (from === 'loop' && to === 'goto') {
        const loopAst = new LoopParser(new Lexer(code).tokenize()).parse();
        const whileAst = new LoopToWhileTranslator().translate(loopAst);
        const gotoAst = new WhileToGotoTranslator().translate(whileAst);
        return { code: gotoToCode(gotoAst), ast: gotoAst };
    }
    if (from === 'while' && to === 'goto') {
        const whileAst = new WhileParser(new Lexer(code).tokenize()).parse();
        const gotoAst = new WhileToGotoTranslator().translate(whileAst);
        return { code: gotoToCode(gotoAst), ast: gotoAst };
    }
    if (from === 'goto' && to === 'while') {
        const gotoAst = new GotoParser(new Lexer(code).tokenize()).parse();
        const whileAst = new GotoToWhileTranslator().translate(gotoAst);
        return { code: whileToCode(whileAst), ast: whileAst };
    }
    throw new Error(`Cannot translate from ${from.toUpperCase()} to ${to.toUpperCase()}`);
}

function run(code: string, lang: string, variables: Map<string, number>, verbose: boolean): Map<string, number> {
    if (verbose) console.log("\nExecution:");
    switch (lang) {
        case 'loop': {
            const ast = new LoopParser(new Lexer(code).tokenize()).parse();
            return new LoopInterpreter().evaluate(ast, { initialVariables: variables, verbose });
        }
        case 'while': {
            const ast = new WhileParser(new Lexer(code).tokenize()).parse();
            return new WhileInterpreter().evaluate(ast, { initialVariables: variables, verbose });
        }
        case 'goto': {
            const ast = new GotoParser(new Lexer(code).tokenize()).parse();
            return new GotoInterpreter().evaluate(ast, { initialVariables: variables, verbose });
        }
        default:
            throw new Error(`Unknown language: ${lang}`);
    }
}

function runAst(ast: any, lang: string, variables: Map<string, number>, verbose: boolean): Map<string, number> {
    if (verbose) console.log("\nExecution:");
    switch (lang) {
        case 'while':
            return new WhileInterpreter().evaluate(ast, { initialVariables: variables, verbose });
        case 'goto':
            return new GotoInterpreter().evaluate(ast, { initialVariables: variables, verbose });
        default:
            throw new Error(`Cannot run AST for ${lang}`);
    }
}

function printHelp() {
    console.log("LOOP/WHILE/GOTO Interpreter & Translator");
    console.log("");
    console.log("Usage: lang <file> [options]");
    console.log("");
    console.log("Place your .loop, .while, and .goto files in the examples/ folder.");
    console.log("");
    console.log("Options:");
    console.log("  -x0=5 -x1=10     Set initial variables (override program values)");
    console.log("  -t2while, -t2w   Translate to WHILE (both options are the same)");
    console.log("  -t2goto, -t2g    Translate to GOTO (both options are the same)");
    console.log("  -verify          Run original and translated, compare results");
    console.log("  -verbose         Show step-by-step execution");
    console.log("  -help            Show this help");
    console.log("");
    console.log("Examples:");
    console.log("  lang multiply.loop                  Run with initial values");
    console.log("  lang multiply.loop -x0=5 -x1=10     Run with overridden values");
    console.log("  lang multiply.loop -verbose         Run with verbose output");
    console.log("  lang divide.while -t2goto           Translate WHILE to GOTO");
    console.log("  lang countdown.goto -t2while        Translate GOTO to WHILE");
    console.log("  lang multiply.loop -t2goto -verify  Translate to GOTO and verify results");
    console.log("");
    console.log("Enjoy exploring computability theory!");
    console.log("");
}

function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 1 || args.includes("-help") || args.includes("-h") || args.includes("--help")) {
        printHelp();
        process.exit(args.length < 1 ? 1 : 0);
    }

    const { filePath, variables, verbose, verify, translateTo } = parseArgs(args);

    if (!filePath) {
        console.error("No file specified.");
        process.exit(1);
    }

    const resolvedPath = resolveFile(filePath);
    const language = detectLanguage(resolvedPath);
    
    if (!language) {
        console.error("Cannot detect language. Use .loop, .while, or .goto extension.");
        process.exit(1);
    }

    try {
        const code = fs.readFileSync(path.resolve(resolvedPath), 'utf-8');

        console.log(`[${language.toUpperCase()}] ${path.basename(resolvedPath)}`);
        if (variables.size > 0) {
            console.log(`Initial: ${Array.from(variables.entries()).map(([k, v]) => `${k}=${v}`).join(", ")}`);
        }
        console.log(`\n${code.trim()}`);

        if (translateTo) {
            if (language === translateTo) {
                console.error(`Already in ${translateTo.toUpperCase()}.`);
                process.exit(1);
            }

            const translated = translate(code, language, translateTo);
            console.log(`\n[Translated to ${translateTo.toUpperCase()}]`);
            console.log(translated.code);

            if (verify) {
                if (verbose) console.log(`\n[Running ${language.toUpperCase()}]`);
                const originalResult = run(code, language, variables, verbose);
                
                if (verbose) console.log(`\n[Running ${translateTo.toUpperCase()}]`);
                const translatedResult = runAst(translated.ast, translateTo, variables, verbose);

                printResult(originalResult, `${language.toUpperCase()} result`);
                printResult(translatedResult, `${translateTo.toUpperCase()} result`);
                
                const match = compareResults(originalResult, translatedResult);
                console.log(`\nVerification: ${match ? "PASSED" : "FAILED"}`);
            }
            return;
        }

        const result = run(code, language, variables, verbose);
        printResult(result);

    } catch (error: any) {
        console.error("Error:", error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
