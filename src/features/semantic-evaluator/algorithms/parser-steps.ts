import { Formula, Term } from "../types";
import { Token, TokenType } from "./lexer";
import { tokenizeWithSteps } from "./lexer-steps";

export type ParserStep = {
    stage: "parser";
    cursor: number;
    action: "call" | "match" | "shift" | "reduce" | "bind_var" | "unbind_var";
    rule: string;
    currentToken?: string;
    precedence?: number;
    description: string;
    intermediateAst?: Formula;
};

export type ParserStepsResult = {
    formula: Formula;
    steps: ParserStep[];
};

const Precedence = {
    LOWEST: 0,
    IMPLIES: 1,
    OR: 2,
    AND: 3,
    NOT: 4,
} as const;

export class FormulaParserWithSteps {
    private cursor = 0;
    private boundVars = new Set<string>();
    private steps: ParserStep[] = [];

    constructor(private tokens: Token[]) {}

    private collect(step: Omit<ParserStep, "stage" | "cursor">): void {
        this.steps.push({ stage: "parser", cursor: this.cursor, ...step });
    }

    private peek(): Token {
        return this.tokens[this.cursor];
    }

    private advance(): Token {
        const token = this.peek();
        if (token.type !== "EOF") this.cursor++;
        this.collect({
            action: "shift",
            rule: "advance",
            currentToken: token.value || token.type,
            description: `Se consumió el token ${token.type}`,
        });
        return token;
    }

    private match(type: TokenType): boolean {
        if (this.peek().type !== type) return false;
        this.collect({
            action: "match",
            rule: "match",
            currentToken: this.peek().value || this.peek().type,
            description: `El token actual coincide con ${type}`,
        });
        this.advance();
        return true;
    }

    private expect(type: TokenType, errorMessage?: string): Token {
        const token = this.peek();
        if (token.type !== type) {
            throw new Error(errorMessage ??
                `Error de sintaxis: se esperaba '${type}', pero se encontró '${token.type}' (valor: '${token.value}')`);
        }
        return this.advance();
    }

    private parseTerm(): Term {
        this.collect({
            action: "call",
            rule: "term",
            currentToken: this.peek().value,
            description: "Se inició el análisis de un término",
        });
        const ident = this.expect("IDENT", "Se esperaba un identificador para el término").value;

        if (this.match("LPAREN")) {
            const args: Term[] = [];
            if (!this.match("RPAREN")) {
                do {
                    args.push(this.parseTerm());
                } while (this.match("COMMA"));
                this.expect("RPAREN", `Se esperaba ')' al cerrar los argumentos de la función '${ident}'`);
            }
            this.collect({ action: "reduce", rule: "term → function", description: `Se construyó la función '${ident}'` });
            return { kind: "func", name: ident, args };
        }

        if (this.boundVars.has(ident) || /^[u-zU-Z]/.test(ident)) {
            this.collect({ action: "reduce", rule: "term → variable", description: `Se reconoció '${ident}' como variable` });
            return { kind: "var", name: ident };
        }
        this.collect({ action: "reduce", rule: "term → constant", description: `Se reconoció '${ident}' como constante` });
        return { kind: "const", name: ident };
    }

    public parse(): ParserStepsResult {
        this.collect({ action: "call", rule: "formula", description: "Se inició el análisis de la fórmula" });
        const formula = this.parseExpression(Precedence.LOWEST);
        this.expect("EOF", `Tokens no reconocidos tras el final de la fórmula: '${this.peek().value}'`);
        this.collect({
            action: "reduce",
            rule: "formula",
            description: "La fórmula se analizó completamente",
            intermediateAst: formula,
        });
        return { formula, steps: this.steps };
    }

    private parseExpression(minPrecedence: number): Formula {
        this.collect({
            action: "call",
            rule: "expression",
            currentToken: this.peek().value || this.peek().type,
            precedence: minPrecedence,
            description: `Se inició una expresión con precedencia mínima ${minPrecedence}`,
        });
        let left = this.parsePrefix();

        while (true) {
            const token = this.peek();
            const precedence = this.getInfixPrecedence(token.type);
            if (precedence === null || precedence < minPrecedence) break;

            this.advance();
            left = this.parseInfix(token.type, left, precedence);
            this.collect({
                action: "reduce",
                rule: `expression → expression ${token.type} expression`,
                precedence,
                description: `Se redujo el operador ${token.type}`,
                intermediateAst: left,
            });
        }
        return left;
    }

    private parsePrefix(): Formula {
        const token = this.peek();
        this.collect({
            action: "call",
            rule: "prefix",
            currentToken: token.value || token.type,
            description: `Se analiza el prefijo ${token.type}`,
        });

        if (this.match("NOT")) {
            const formula: Formula = { kind: "not", inner: this.parseExpression(Precedence.NOT) };
            this.collect({ action: "reduce", rule: "prefix → NOT expression", description: "Se construyó una negación", intermediateAst: formula });
            return formula;
        }

        if (this.match("FORALL")) return this.parseQuantifier("forall");
        if (this.match("EXISTS")) return this.parseQuantifier("exists");

        if (this.match("LPAREN")) {
            const inner = this.parseExpression(Precedence.LOWEST);
            this.expect("RPAREN", "Se esperaba ')' de cierre");
            return inner;
        }

        if (token.type === "IDENT") {
            this.advance();
            const args: Term[] = [];
            if (this.match("LPAREN") && !this.match("RPAREN")) {
                do {
                    args.push(this.parseTerm());
                } while (this.match("COMMA"));
                this.expect("RPAREN", `Se esperaba ')' al cerrar argumentos del predicado '${token.value}'`);
            }
            const formula: Formula = { kind: "atom", predicate: token.value, args };
            this.collect({ action: "reduce", rule: "prefix → predicate", description: `Se construyó el predicado '${token.value}'`, intermediateAst: formula });
            return formula;
        }

        throw new Error(`Token inesperado al inicio de la expresión: '${token.value}' (${token.type})`);
    }

    private parseQuantifier(kind: "forall" | "exists"): Formula {
        const symbol = kind === "forall" ? "∀" : "∃";
        const variable = this.expect("IDENT", `Se esperaba el identificador de la variable tras '${symbol}'`).value;
        this.boundVars.add(variable);
        this.collect({ action: "bind_var", rule: kind, currentToken: variable, description: `Se ligó la variable '${variable}'` });
        const inner = this.parseExpression(Precedence.LOWEST);
        this.boundVars.delete(variable);
        this.collect({ action: "unbind_var", rule: kind, currentToken: variable, description: `Terminó el alcance de '${variable}'` });

        const formula: Formula = { kind, variable, inner };
        this.collect({
            action: "reduce",
            rule: `prefix → ${kind === "forall" ? "FORALL" : "EXISTS"} IDENT expression`,
            description: `Se construyó un cuantificador ${kind === "forall" ? "universal" : "existencial"}`,
            intermediateAst: formula,
        });
        return formula;
    }

    private parseInfix(op: TokenType, left: Formula, precedence: number): Formula {
        switch (op) {
            case "AND":
                return { kind: "and", left, right: this.parseExpression(precedence + 1) };
            case "OR":
                return { kind: "or", left, right: this.parseExpression(precedence + 1) };
            case "IMPLIES":
                return { kind: "implies", left, right: this.parseExpression(precedence) };
            default:
                throw new Error(`Operador binario desconocido: '${op}'`);
        }
    }

    private getInfixPrecedence(type: TokenType): number | null {
        switch (type) {
            case "IMPLIES": return Precedence.IMPLIES;
            case "OR": return Precedence.OR;
            case "AND": return Precedence.AND;
            default: return null;
        }
    }
}

export function parseTokensWithSteps(tokens: Token[]): ParserStepsResult {
    return new FormulaParserWithSteps(tokens).parse();
}

export function parseFormulaWithSteps(input: string): ParserStepsResult {
    return parseTokensWithSteps(tokenizeWithSteps(input).tokens);
}
