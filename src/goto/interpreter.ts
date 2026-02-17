import type { Program, Instruction, Statement, Expression, Condition, BinaryExpression } from "./ast";

type EvalOptions = {
    initialVariables?: Map<string, number>;
    verbose?: boolean;
};

class GotoInterpreter {
    private variables: Map<string, number>;
    private labelMap: Map<string, number>;
    private lockedVariables: Set<string>;
    private verbose: boolean;

    constructor() {
        this.variables = new Map();
        this.labelMap = new Map();
        this.lockedVariables = new Set();
        this.verbose = false;
    }

    public setVariable(name: string, value: number): void {
        this.variables.set(name, value);
    }

    public evaluate(program: Program, options?: EvalOptions | Map<string, number>): Map<string, number> {
        this.variables.clear();
        this.labelMap.clear();
        this.lockedVariables.clear();

        let initialVariables: Map<string, number> | undefined;
        if (options instanceof Map) {
            initialVariables = options;
            this.verbose = false;
        } else if (options) {
            initialVariables = options.initialVariables;
            this.verbose = options.verbose ?? false;
        } else {
            this.verbose = false;
        }

        if (initialVariables) {
            for (const [name, value] of initialVariables) {
                this.variables.set(name, value);
                this.lockedVariables.add(name);
            }
        }

        program.instructions.forEach((instr, index) => {
            if (instr.label) {
                if (this.labelMap.has(instr.label)) {
                    throw new Error(`Duplicate label: ${instr.label}`);
                }
                this.labelMap.set(instr.label, index);
            }
        });

        let pc = 0;
        const instructions = program.instructions;
        let safetyCounter = 0;

        while (pc < instructions.length) {
            if (safetyCounter++ > 1_000_000) throw new Error("Infinite loop detected (safety limit: 1,000,000 steps)");

            const instr = instructions[pc];
            if (!instr) break;

            if (this.verbose) {
                const label = instr.label ? `${instr.label}: ` : "";
                console.log(`  [${pc}] ${label}${this.stmtToString(instr.statement)}`);
            }

            let jumped = false;

            switch (instr.statement.type) {
                case "assignment": {
                    const value = this.evaluateExpression(instr.statement.value);
                    if (this.lockedVariables.has(instr.statement.variable)) {
                        this.lockedVariables.delete(instr.statement.variable);
                        if (this.verbose) {
                            console.log(`       -> skipped (using CLI value)`);
                        }
                    } else {
                        this.variables.set(instr.statement.variable, value);
                        if (this.verbose) {
                            console.log(`       -> ${instr.statement.variable} = ${value}`);
                        }
                    }
                    break;
                }
                case "goto":
                    pc = this.getLabelIndex(instr.statement.label);
                    jumped = true;
                    if (this.verbose) {
                        console.log(`       -> jump to ${instr.statement.label} (pc=${pc})`);
                    }
                    break;
                case "if_goto": {
                    const condTrue = this.evaluateCondition(instr.statement.condition);
                    if (condTrue) {
                        pc = this.getLabelIndex(instr.statement.label);
                        jumped = true;
                        if (this.verbose) {
                            console.log(`       -> true, jump to ${instr.statement.label} (pc=${pc})`);
                        }
                    } else {
                        if (this.verbose) {
                            console.log(`       -> false, continue`);
                        }
                    }
                    break;
                }
                case "halt":
                    if (this.verbose) {
                        console.log(`       -> HALT`);
                    }
                    return this.variables;
            }

            if (!jumped) pc++;
        }

        return this.variables;
    }

    private stmtToString(stmt: Statement): string {
        switch (stmt.type) {
            case "assignment":
                return `${stmt.variable} := ${this.exprToString(stmt.value)}`;
            case "goto":
                return `GOTO ${stmt.label}`;
            case "if_goto":
                return `IF ${this.condToString(stmt.condition)} THEN GOTO ${stmt.label}`;
            case "halt":
                return "HALT";
        }
    }

    private condToString(cond: Condition): string {
        return `${this.exprToString(cond.left)} ${cond.operator} ${this.exprToString(cond.right)}`;
    }

    private exprToString(expr: Expression): string {
        switch (expr.type) {
            case "number": return String(expr.value);
            case "variable": return expr.name;
            case "binaryOp": return `(${this.exprToString(expr.left)} ${expr.operator} ${this.exprToString(expr.right)})`;
        }
    }

    private getLabelIndex(label: string): number {
        const index = this.labelMap.get(label);
        if (index === undefined) throw new Error(`Undefined label: ${label}`);
        return index;
    }

    private evaluateExpression(expression: Expression): number {
        switch (expression.type) {
            case "number": return expression.value;
            case "variable": return this.getVariableValue(expression.name);
            case "binaryOp": return this.evaluateBinaryExpression(expression);
        }
    }

    private evaluateBinaryExpression(expression: BinaryExpression): number {
        const left = this.evaluateExpression(expression.left);
        const right = this.evaluateExpression(expression.right);
        switch (expression.operator) {
            case "+": return left + right;
            case "-": return Math.max(0, left - right); // monus: no negative values
        }
    }

    private evaluateCondition(condition: Condition): boolean {
        const left = this.evaluateExpression(condition.left);
        const right = this.evaluateExpression(condition.right);
        switch (condition.operator) {
            case "=": return left === right;
            case "!=": return left !== right;
            case "<": return left < right;
            case ">": return left > right;
            case "<=": return left <= right;
            case ">=": return left >= right;
        }
    }

    private getVariableValue(name: string): number {
        return this.variables.get(name) || 0;
    }
}

export = GotoInterpreter;
