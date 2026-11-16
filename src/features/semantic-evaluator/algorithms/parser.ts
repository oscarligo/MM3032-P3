import { Formula, Term } from "../types";
import { Token, tokenize, TokenType } from "./lexer";
import { FormulaSyntaxError, type ParseErrorPayload } from "./parse-errors";

/*
    Clase FormulaParser que implementa un parser para fórmulas de lógica
    de primer orden usando descenso recursivo (Top-Down). Cada nivel de
    precedencia de operadores está estratificado en métodos gramaticales dedicados:
      - parseImplication (→, asociativo a la derecha)
      - parseDisjunction (∨, asociativo a la izquierda)
      - parseConjunction (∧, asociativo a la izquierda)
      - parseUnary (¬, ∀, ∃)
      - parsePrimary (átomos predicativos y subexpresiones entre paréntesis)

    La clase mantiene un cursor para recorrer la lista de tokens y un mapa
    de conteo de variables ligadas (se obtienen al parsear los cuantificadores)
    para manejar el alcance de los cuantificadores y soportar sombreado (shadowing).
    Se incluye además un método de conveniencia para parsear directamente
    desde una cadena de entrada.
*/

export type ParserCall = {
    rule: string;
    // Posición del primer token que consume esta llamada
    start: number;
};

export type ParserTrace = {
    cursor: number;
    token: Token;
    callStack: ParserCall[];
    activeScopeVars: string[];
};

export class FormulaParser {
    public readonly nodeTokens = new WeakMap<Formula | Term, number>();
    private callStack: ParserCall[] = [];

    private inRule<T>(name: string, parse: () => T): T {
        this.callStack.push({ rule: name, start: this.cursor });
        try {
            return parse();
        } finally {
            this.callStack.pop();
        }
    }

    private atToken<T extends Formula | Term>(node: T, cursor: number): T {
        this.nodeTokens.set(node, cursor);
        return node;
    }

    private tokens: Token[];
    private cursor: number = 0;
    // Mapa de frecuencias de variables ligadas para soportar anidamiento y sombreado (shadowing)
    private boundVarCounts: Map<string, number> = new Map();

    constructor(
        tokens: Token[],
        private onRead?: (trace: ParserTrace) => void,
        private constantSymbols: ReadonlySet<string> = new Set()
    ) {
        this.tokens = tokens;
    }

    // Obtener el token actual sin avanzar
    private peek(): Token {
        return this.tokens[this.cursor];
    }

    // Avanzar al siguiente token y devolver el token actual
    private advance(): Token {
        const token = this.peek();
        this.onRead?.({
            cursor: this.cursor,
            token,
            callStack: this.callStack.map((call) => ({ ...call })),
            activeScopeVars: [...this.boundVarCounts.keys()],
        });
        if (token.type !== "EOF") {
            this.cursor++;
        }
        return token;
    }

    // Verificar que el token actual sea del tipo esperado, lanzar error si no coincide
    private expect(type: TokenType, payload?: ParseErrorPayload): Token {
        const token = this.peek();
        if (token.type !== type) {
            throw new FormulaSyntaxError(payload ?? {
                code: "UNEXPECTED_TOKEN",
                value: token.value,
                type: token.type,
                position: token.position,
            });
        }
        return this.advance();
    }

    private isFormulaToken(token: Token): boolean {
        return ["LPAREN", "NOT", "FORALL", "EXISTS"].includes(token.type);
    }

    private startsFormula(token: Token): boolean {
        return token.type === "IDENT" || this.isFormulaToken(token);
    }

    private parseArguments(container: string, openPosition: number, allowEmpty: boolean): Term[] {
        if (this.peek().type === "RPAREN") {
            if (!allowEmpty) {
                throw new FormulaSyntaxError({
                    code: "ZERO_ARITY_FUNCTION",
                    identifier: container,
                    position: openPosition,
                });
            }
            this.advance();
            return [];
        }

        const args: Term[] = [];
        while (true) {
            const token = this.peek();
            if (this.isFormulaToken(token)) {
                throw new FormulaSyntaxError({
                    code: "FORMULA_IN_TERM_POSITION",
                    token: token.value || token.type,
                    position: token.position,
                });
            }
            if (token.type !== "IDENT") {
                throw new FormulaSyntaxError({
                    code: "EXPECTED_TERM_IDENTIFIER",
                    found: token.value || token.type,
                    position: token.position,
                });
            }

            args.push(this.parseTerm());
            const next = this.peek();
            if (next.type === "RPAREN") {
                this.advance();
                return args;
            }
            if (next.type === "EOF") {
                throw new FormulaSyntaxError({ code: "UNCLOSED_PARENTHESIS", position: openPosition });
            }
            if (next.type === "COMMA") {
                const comma = this.advance();
                if (["RPAREN", "EOF"].includes(this.peek().type)) {
                    throw new FormulaSyntaxError({
                        code: "TRAILING_COMMA",
                        container,
                        position: comma.position,
                    });
                }
                continue;
            }
            if (next.type === "IDENT") {
                throw new FormulaSyntaxError({
                    code: "MISSING_ARGUMENT_COMMA",
                    container,
                    position: next.position,
                });
            }
            throw new FormulaSyntaxError({
                code: "FORMULA_IN_TERM_POSITION",
                token: next.value || next.type,
                position: next.position,
            });
        }
    }

    // Registrar la entrada de una variable ligada al alcance actual
    private pushBoundVar(name: string): void {
        this.boundVarCounts.set(name, (this.boundVarCounts.get(name) ?? 0) + 1);
    }

    // Retirar una ocurrencia de variable ligada al salir del alcance del cuantificador
    private popBoundVar(name: string): void {
        const count = this.boundVarCounts.get(name) ?? 0;
        if (count <= 1) {
            this.boundVarCounts.delete(name);
        } else {
            this.boundVarCounts.set(name, count - 1);
        }
    }

    // Comprobar si un identificador está ligado en el alcance actual
    private isBound(name: string): boolean {
        return this.boundVarCounts.has(name);
    }

    // Parsear un término (variable, constante o función)
    // Función recursiva que maneja la gramática de términos:
    private parseTerm(): Term {
        return this.inRule("term", () => {
            const start = this.cursor;
            const token = this.peek();
            if (token.type !== "IDENT") {
                if (this.isFormulaToken(token)) {
                    throw new FormulaSyntaxError({
                        code: "FORMULA_IN_TERM_POSITION",
                        token: token.value || token.type,
                        position: token.position,
                    });
                }
                throw new FormulaSyntaxError({
                    code: "EXPECTED_TERM_IDENTIFIER",
                    found: token.value || token.type,
                    position: token.position,
                });
            }
            const identToken = this.advance();
            const ident = identToken.value;

            // Si viene seguido de '(', es una función: f(t1, t2)
            if (this.peek().type === "LPAREN") {
                if (/^[A-Z]/.test(ident)) {
                    throw new FormulaSyntaxError({
                        code: "FORMULA_IN_TERM_POSITION",
                        token: ident,
                        position: identToken.position,
                    });
                }
                const open = this.advance();
                const args = this.parseArguments(ident, open.position, false);
                return this.atToken({ kind: "func", name: ident, args }, start);
            }

            if (this.isBound(ident) || !this.constantSymbols.has(ident)) {
                return this.atToken({ kind: "var", name: ident }, start);
            }
            return this.atToken({ kind: "const", name: ident }, start);
        });
    }

    // Entrypoint para parsear una fórmula completa desde la lista de tokens
    public parse(): Formula {
        return this.inRule("formula", () => {
            if (this.peek().type === "EOF") {
                throw new FormulaSyntaxError({ code: "EMPTY_INPUT" });
            }
            const formula = this.parseImplication();
            const remaining = this.peek();
            if (remaining.type !== "EOF") {
                if (this.startsFormula(remaining)) {
                    throw new FormulaSyntaxError({
                        code: "MISSING_BINARY_CONNECTIVE",
                        found: remaining.value || remaining.type,
                        position: remaining.position,
                    });
                }
                throw new FormulaSyntaxError({
                    code: "UNEXPECTED_TOKEN",
                    value: remaining.value,
                    type: remaining.type,
                    position: remaining.position,
                });
            }
            return formula;
        });
    }

    // Nivel 1 (Precedencia más baja): Implicación (→)
    // Asociativo a la derecha: A → B → C se agrupa como A → (B → C)
    private parseImplication(): Formula {
        return this.inRule("implication", () => {
            const left = this.parseDisjunction();

            const operator = this.cursor;
            if (this.peek().type === "IMPLIES") {
                const operatorToken = this.advance();
                if (["EOF", "RPAREN"].includes(this.peek().type)) {
                    throw new FormulaSyntaxError({ code: "MISSING_OPERAND", operator: operatorToken.value, position: operatorToken.position });
                }
                const right = this.parseImplication();
                return this.atToken({ kind: "implies", left, right }, operator);
            }

            return left;
        });
    }

    // Nivel 2: Disyunción (∨)
    // Asociativo a la izquierda: A ∨ B ∨ C se agrupa como (A ∨ B) ∨ C
    private parseDisjunction(): Formula {
        return this.inRule("disjunction", () => {
            let left = this.parseConjunction();

            while (this.peek().type === "OR") {
                const operator = this.cursor;
                const operatorToken = this.advance();
                if (["EOF", "RPAREN"].includes(this.peek().type)) {
                    throw new FormulaSyntaxError({ code: "MISSING_OPERAND", operator: operatorToken.value, position: operatorToken.position });
                }
                const right = this.parseConjunction();
                left = this.atToken({ kind: "or", left, right }, operator);
            }

            return left;
        });
    }

    // Nivel 3: Conjunción (∧)
    // Asociativo a la izquierda: A ∧ B ∧ C se agrupa como (A ∧ B) ∧ C
    private parseConjunction(): Formula {
        return this.inRule("conjunction", () => {
            let left = this.parseUnary();

            while (this.peek().type === "AND") {
                const operator = this.cursor;
                const operatorToken = this.advance();
                if (["EOF", "RPAREN"].includes(this.peek().type)) {
                    throw new FormulaSyntaxError({ code: "MISSING_OPERAND", operator: operatorToken.value, position: operatorToken.position });
                }
                const right = this.parseUnary();
                left = this.atToken({ kind: "and", left, right }, operator);
            }

            return left;
        });
    }

    // Nivel 4: Operadores unarios prefijos (¬, ∀, ∃)
    private parseUnary(): Formula {
        return this.inRule("unary", () => {
            const start = this.cursor;
            // Negación
            if (this.peek().type === "NOT") {
                const operatorToken = this.advance();
                if (["EOF", "RPAREN"].includes(this.peek().type)) {
                    throw new FormulaSyntaxError({ code: "MISSING_OPERAND", operator: operatorToken.value, position: operatorToken.position });
                }
                const inner = this.parseUnary();
                return this.atToken({ kind: "not", inner }, start);
            }

            // Cuantificador Universal
            if (this.peek().type === "FORALL") {
                const quantifier = this.advance();
                const varToken: Token = this.expect("IDENT", {
                    code: "EXPECTED_QUANTIFIER_VARIABLE",
                    quantifier: quantifier.value,
                    position: this.peek().position,
                });
                const variable: string = varToken.value;

                if (["EOF", "RPAREN"].includes(this.peek().type)) {
                    throw new FormulaSyntaxError({ code: "MISSING_QUANTIFIER_BODY", quantifier: quantifier.value, variable, position: varToken.position });
                }

                this.pushBoundVar(variable);
                const inner = this.parseImplication();
                this.popBoundVar(variable);

                return this.atToken({ kind: "forall", variable, inner }, start);
            }

            // Cuantificador Existencial
            if (this.peek().type === "EXISTS") {
                const quantifier = this.advance();
                const varToken: Token = this.expect("IDENT", {
                    code: "EXPECTED_QUANTIFIER_VARIABLE",
                    quantifier: quantifier.value,
                    position: this.peek().position,
                });
                const variable: string = varToken.value;

                if (["EOF", "RPAREN"].includes(this.peek().type)) {
                    throw new FormulaSyntaxError({ code: "MISSING_QUANTIFIER_BODY", quantifier: quantifier.value, variable, position: varToken.position });
                }

                this.pushBoundVar(variable);
                const inner = this.parseImplication();
                this.popBoundVar(variable);

                return this.atToken({ kind: "exists", variable, inner }, start);
            }

            return this.parsePrimary();
        });
    }

    // Nivel 5 (Máxima precedencia): Expresiones primarias (paréntesis y predicados atómicos)
    private parsePrimary(): Formula {
        return this.inRule("primary", () => {
            const start = this.cursor;
            const token = this.peek();

            // Paréntesis
            if (token.type === "LPAREN") {
                const open = this.advance();
                if (this.peek().type === "RPAREN") {
                    throw new FormulaSyntaxError({ code: "EMPTY_PARENTHESES", position: open.position });
                }
                const inner = this.parseImplication();
                if (this.peek().type !== "RPAREN") {
                    throw new FormulaSyntaxError({ code: "UNCLOSED_PARENTHESIS", position: open.position });
                }
                this.advance();
                return inner;
            }

            // Predicado atómico: P(t1, t2) o predicado 0-ario P
            if (token.type === "IDENT") {
                this.advance();
                const predicate = token.value;
                const args: Term[] = [];

                if (this.peek().type === "LPAREN") {
                    const open = this.advance();
                    const parsedArgs = this.parseArguments(predicate, open.position, !/^[a-z_]/.test(predicate));
                    args.push(...parsedArgs);
                }

                return this.atToken({ kind: "atom", predicate, args }, start);
            }

            throw new FormulaSyntaxError({
                code: "UNEXPECTED_TOKEN",
                value: token.value,
                type: token.type,
                position: token.position,
            });
        });
    }
}

// Función helper de conveniencia para parsear directo desde un string
export function parseFormula(input: string, constantSymbols: ReadonlySet<string> = new Set()): Formula {
    const tokens = tokenize(input);
    const parser = new FormulaParser(tokens, undefined, constantSymbols);
    return parser.parse();
}
