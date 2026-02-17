// Tokenizes source code into tokens for parsing
import type { Token } from "./token";

const isWhitespace = (char: string) => /\s/.test(char);
const isLetter = (char: string) => /[a-zA-Z]/.test(char);
const isDigit = (char: string) => /[0-9]/.test(char);

class Lexer {
    private input: string;
    private position: number;

    constructor(input: string) {
        this.input = input;
        this.position = 0;
    }

    private peek(offset: number = 0): string {
        if (this.position + offset >= this.input.length) return "";
        return this.input.charAt(this.position + offset);
    }

    private advance(): string {
        return this.input.charAt(this.position++);
    }

    private skipWhitespace(): void {
        while (this.position < this.input.length && isWhitespace(this.peek())) {
            this.advance();
        }
    }

    private readNumber(): Token {
        let value = "";
        while (this.position < this.input.length && isDigit(this.peek())) {
            value += this.advance();
        }
        return { type: "number", value };
    }

    private readIdentifier(): Token {
        let value = "";
        while (this.position < this.input.length && (isLetter(this.peek()) || isDigit(this.peek()))) {
            value += this.advance();
        }
        
        const keywords = ["LOOP", "DO", "END", "WHILE", "IF", "THEN", "ELSE", "GOTO", "HALT"];
        if (keywords.includes(value)) {
            return { type: "keyword", value };
        }
        return { type: "identifier", value };
    }

    public tokenize(): Token[] {
        const tokens: Token[] = [];

        while (this.position < this.input.length) {
            this.skipWhitespace();
            if (this.position >= this.input.length) break;

            const char = this.peek();

            if (isLetter(char)) {
                tokens.push(this.readIdentifier());
            } 
            else if (isDigit(char)) {
                tokens.push(this.readNumber());
            }
            else if (char === ':' && this.peek(1) === '=') {
                this.advance(); this.advance();
                tokens.push({ type: "assign", value: ":=" });
            }
            else if (char === ':') {
                this.advance();
                tokens.push({ type: "colon", value: ":" });
            }
            else if (char === '+' || char === '-') {
                tokens.push({ type: "operator", value: this.advance() });
            }
            else if (char === '!' && this.peek(1) === '=') {
                this.advance(); this.advance();
                tokens.push({ type: "comparison", value: "!=" });
            }
            else if (char === '<' && this.peek(1) === '=') {
                this.advance(); this.advance();
                tokens.push({ type: "comparison", value: "<=" });
            }
            else if (char === '>' && this.peek(1) === '=') {
                this.advance(); this.advance();
                tokens.push({ type: "comparison", value: ">=" });
            }
            else if (char === '=') {
                this.advance();
                tokens.push({ type: "comparison", value: "=" });
            }
            else if (char === '<') {
                this.advance();
                tokens.push({ type: "comparison", value: "<" });
            }
            else if (char === '>') {
                this.advance();
                tokens.push({ type: "comparison", value: ">" });
            }
            else if (char === ';') {
                this.advance();
                tokens.push({ type: "semicolon", value: ";" });
            }
            else {
                throw new Error(`Unexpected character: ${char} at position ${this.position}`);
            }
        }

        return tokens;
    }
}

export default Lexer;
