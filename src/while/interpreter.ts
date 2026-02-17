import type { Program, Statement, Expression, BinaryExpression, Condition } from "./ast";

type EvalOptions = {
    initialVariables?: Map<string, number>;
    verbose?: boolean;
};

class WhileInterpreter {
    private variables: Map<string, number>;
    private lockedVariables: Set<string>;
    private verbose: boolean;

    constructor() {
        this.variables = new Map();
        this.lockedVariables = new Set();
        this.verbose = false;
    }

    public setVariable(name: string, value: number): void {
        this.variables.set(name, value);
    }

    public evaluate(program: Program, options?: EvalOptions | Map<string, number>): Map<string, number> {
        this.variables.clear();
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

        for (const statement of program.statements) {
            this.executeStatement(statement);
        }
        return this.variables;
    }

    private executeStatement(statement: Statement): void {
        switch (statement.type) {
            case "assignment": {
                const value = this.evaluateExpression(statement.value);
                if (this.lockedVariables.has(statement.variable)) {
                    this.lockedVariables.delete(statement.variable);
                    if (this.verbose) {
                        console.log(`  [skip] ${statement.variable} := ${value} (using CLI value)`);
                    }
                } else {
                    const oldValue = this.variables.get(statement.variable) ?? 0;
                    this.variables.set(statement.variable, value);
                    if (this.verbose) {
                        console.log(`  ${statement.variable} := ${value} (was ${oldValue})`);
                    }
                }
                break;
            }
            case "while": {
                let safetyCounter = 0;
                let iteration = 0;
                if (this.verbose) {
                    console.log(`  WHILE ${this.conditionToString(statement.condition)}`);
                }
                while (this.evaluateCondition(statement.condition)) {
                    if (safetyCounter++ > 1_000_000) throw new Error("Infinite loop detected (safety limit: 1,000,000 iterations)");
                    iteration++;
                    if (this.verbose) {
                        console.log(`    iteration ${iteration}`);
                    }
                    for (const bodyStatement of statement.body) {
                        this.executeStatement(bodyStatement);
                    }
                }
                if (this.verbose && iteration === 0) {
                    console.log(`    (condition false, skipped)`);
                }
                break;
            }
            case "if": {
                const condTrue = this.evaluateCondition(statement.condition);
                if (this.verbose) {
                    console.log(`  IF ${this.conditionToString(statement.condition)} -> ${condTrue}`);
                }
                if (condTrue) {
                    for (const stmt of statement.thenBody) {
                        this.executeStatement(stmt);
                    }
                } else if (statement.elseBody) {
                    for (const stmt of statement.elseBody) {
                        this.executeStatement(stmt);
                    }
                }
                break;
            }
        }
    }

    private conditionToString(cond: Condition): string {
        const left = this.exprToString(cond.left);
        const right = this.exprToString(cond.right);
        return `${left} ${cond.operator} ${right}`;
    }

    private exprToString(expr: Expression): string {
        switch (expr.type) {
            case "number": return String(expr.value);
            case "variable": return expr.name;
            case "binaryOp": return `(${this.exprToString(expr.left)} ${expr.operator} ${this.exprToString(expr.right)})`;
        }
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

export = WhileInterpreter;
