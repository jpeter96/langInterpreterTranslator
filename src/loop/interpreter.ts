import type { Program, Statement, Expression, BinaryExpression } from "./ast";

type EvalOptions = {
    initialVariables?: Map<string, number>;
    verbose?: boolean;
};

class Interpreter {
    private variables: Map<string, number>;
    private lockedVariables: Set<string>;
    private verbose: boolean;
    private stepCounter: number;

    constructor() {
        this.variables = new Map();
        this.lockedVariables = new Set();
        this.verbose = false;
        this.stepCounter = 0;
    }

    public setVariable(name: string, value: number): void {
        this.variables.set(name, value);
    }

    public evaluate(program: Program, options?: EvalOptions | Map<string, number>): Map<string, number> {
        this.variables.clear();
        this.lockedVariables.clear();
        this.stepCounter = 0;

        // Support both Map and options object for initial variables
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
                // x0 is the result variable — never lock it
                if (name !== "x0") {
                    this.lockedVariables.add(name);
                }
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
            case "loop": {
                const iterations = this.getVariableValue(statement.counter);
                if (this.verbose) {
                    console.log(`  LOOP ${statement.counter} (${iterations} iterations)`);
                }
                for (let i = 0; i < iterations; i++) {
                    if (this.verbose) {
                        console.log(`    iteration ${i + 1}/${iterations}`);
                    }
                    for (const bodyStatement of statement.body) {
                        this.executeStatement(bodyStatement);
                    }
                }
                break;
            }
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

    private getVariableValue(name: string): number {
        return this.variables.get(name) || 0;
    }
}

export = Interpreter;
