import { Formula, Term } from "../types";
import { Token, tokenize, TokenType } from "./lexer";

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

export type ParserTrace = {
    cursor: number;
    token: Token;
    callStack: string[];
    activeScopeVars: string[];
};

export class FormulaParser {
    public readonly nodeTokens = new WeakMap<Formula | Term, number>();
    private callStack: string[] = [];

    private inRule<T>(name: string, parse: () => T): T {
        this.callStack.push(name);
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

    constructor(tokens: Token[], private onRead?: (trace: ParserTrace) => void) {
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
            callStack: [...this.callStack],
            activeScopeVars: [...this.boundVarCounts.keys()],
        });
        if (token.type !== "EOF") {
            this.cursor++;
        }
        return token;
    }

    // Verificar si el token actual coincide con el tipo esperado y avanzar si es así
    private match(type: TokenType): boolean {
        if (this.peek().type === type) {
            this.advance();
            return true;
        }
        return false;
    }

    // Verificar que el token actual sea del tipo esperado, lanzar error si no coincide
    private expect(type: TokenType, errorMessage?: string): Token {
        const token = this.peek();
        if (token.type !== type) {
            throw new Error(
                errorMessage ??
                `Error de sintaxis: se esperaba '${type}', pero se encontró '${token.type}' (valor: '${token.value}')`
            );
        }
        return this.advance();
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
            const ident = this.expect("IDENT", "Se esperaba un identificador para el término").value;

            // Si viene seguido de '(', es una función: f(t1, t2)
            if (this.match("LPAREN")) {
                const args: Term[] = [];
                if (!this.match("RPAREN")) {
                    do {
                        args.push(this.parseTerm());
                    } while (this.match("COMMA"));
                    this.expect("RPAREN", `Se esperaba ')' al cerrar los argumentos de la función '${ident}'`);
                }
                return this.atToken({ kind: "func", name: ident, args }, start);
            }

            // Convención semántica:
            // 1. Si está ligada por ∀ o ∃ en el alcance actual, es una variable.
            // 2. Si empieza con u..z (minúscula o mayúscula), se toma como variable libre por convención estándar.
            // 3. De lo contrario (a..t, dígitos, etc.), se asume constante.
            if (this.isBound(ident) || /^[u-zU-Z]/.test(ident)) {
                return this.atToken({ kind: "var", name: ident }, start);
            }
            // De lo contrario, se asume constante.
            return this.atToken({ kind: "const", name: ident }, start);
        });
    }

    // Entrypoint para parsear una fórmula completa desde la lista de tokens
    public parse(): Formula {
        return this.inRule("formula", () => {
            const formula = this.parseImplication();
            this.expect("EOF", `Tokens no reconocidos tras el final de la fórmula: '${this.peek().value}'`);
            return formula;
        });
    }

    // Nivel 1 (Precedencia más baja): Implicación (→)
    // Asociativo a la derecha: A → B → C se agrupa como A → (B → C)
    private parseImplication(): Formula {
        return this.inRule("implication", () => {
            const left = this.parseDisjunction();

            const operator = this.cursor;
            if (this.match("IMPLIES")) {
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
                this.advance();
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
                this.advance();
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
            if (this.match("NOT")) {
                const inner = this.parseUnary();
                return this.atToken({ kind: "not", inner }, start);
            }

            // Cuantificador Universal
            if (this.match("FORALL")) {
                const varToken: Token = this.expect("IDENT", "Se esperaba el identificador de la variable tras '∀'");
                const variable: string = varToken.value;

                this.pushBoundVar(variable);
                const inner = this.parseImplication();
                this.popBoundVar(variable);

                return this.atToken({ kind: "forall", variable, inner }, start);
            }

            // Cuantificador Existencial
            if (this.match("EXISTS")) {
                const varToken: Token = this.expect("IDENT", "Se esperaba el identificador de la variable tras '∃'");
                const variable: string = varToken.value;

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
            if (this.match("LPAREN")) {
                const inner = this.parseImplication();
                this.expect("RPAREN", "Se esperaba ')' de cierre");
                return inner;
            }

            // Predicado atómico: P(t1, t2) o predicado 0-ario P
            if (token.type === "IDENT") {
                this.advance();
                const predicate = token.value;
                const args: Term[] = [];

                if (this.match("LPAREN")) {
                    if (!this.match("RPAREN")) {
                        do {
                            args.push(this.parseTerm());
                        } while (this.match("COMMA"));
                        this.expect("RPAREN", `Se esperaba ')' al cerrar argumentos del predicado '${predicate}'`);
                    }
                }

                return this.atToken({ kind: "atom", predicate, args }, start);
            }

            throw new Error(`Token inesperado al inicio de la expresión: '${token.value}' (${token.type})`);
        });
    }
}

// Función helper de conveniencia para parsear directo desde un string
export function parseFormula(input: string): Formula {
    const tokens = tokenize(input);
    const parser = new FormulaParser(tokens);
    return parser.parse();
}
