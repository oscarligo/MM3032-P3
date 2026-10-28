import { Formula, Term } from "../types";
import { Token, tokenize, TokenType } from "./tokenizer";

/*
    Clase FormulaParser que implementa un parser para fórmulas de lógica 
    de primer orden usando el algoritmo de Pratt. Contiene métodos para 
    parsear términos, fórmulas y manejar la precedencia de operadores lógicos.
    La clase mantiene un cursor para recorrer la lista de tokens y un conjunto
    de variables ligadas (se obtienen al parsear los cuantificadores) para manejar el alcance de los cuantificadores.
    Se incluyen métodos para parsear prefijos (negación, cuantificadores,
    paréntesis) e infijos (conjunción, disyunción, implicación), 
    así como un método de conveniencia para parsear directamente 
    desde una cadena de entrada.

*/


// Niveles de precedencia para operadores lógicos
const Precedence = {
    LOWEST: 0, // Nivel más bajo, usado para iniciar el parseo  
    IMPLIES: 1, 
    OR: 2,      
    AND: 3,     
    NOT: 4,     
} as const;

export class FormulaParser {
    private tokens: Token[] 
    private cursor: number = 0 
    private boundVars: Set<string> = new Set() // Conjunto de variables ligadas.

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    // Obtener el token actual sin avanzar
    private peek(): Token {
        return this.tokens[this.cursor];
    }

    // Avanzar al siguiente token y devolver el token actual
    private advance(): Token {
        const token = this.peek();
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

    
    // Parsear un término (variable, constante o función)
    // Funcion recursiva que maneja la gramática de términos:
    private parseTerm(): Term {
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
            return { kind: "func", name: ident, args };
        }

        // Convención semántica:
        // 1. Si está ligada por ∀ o ∃, es una variable.
        // 2. Si empieza con u..z (minúscula o mayúscula), se toma como variable libre por convención estándar.
        // 3. De lo contrario (a..t, dígitos, etc.), se asume constante.
        if (this.boundVars.has(ident) || /^[u-zU-Z]/.test(ident)) {
            return { kind: "var", name: ident };
        }
        // De lo contrario, se asume constante.
        return { kind: "const", name: ident };
    }

    // Entrypoint para parsear una fórmula completa desde la lista de tokens
    public parse(): Formula {
        const formula = this.parseExpression(Precedence.LOWEST);
        this.expect("EOF", `Tokens no reconocidos tras el final de la fórmula: '${this.peek().value}'`);
        return formula;
    }

    // Algoritmo de Pratt para fórmulas
    private parseExpression(minPrecedence: number): Formula {
        let left = this.parsePrefix();

        while (true) {
            const currentToken = this.peek();
            const prec: number | null = this.getInfixPrecedence(currentToken.type);

            // Si el siguiente token no es operador binario 
            // o su precedencia es menor, se detiene.
            if (prec === null || prec < minPrecedence) {
                break;
            }

            this.advance();
            left = this.parseInfix(currentToken.type, left, prec);
        }

        return left;
    }

    // Función que parsea la parte prefija de la expresión, 
    // incluyendo negación, cuantificadores, paréntesis 
    // y predicados atómicos
    private parsePrefix(): Formula {
        const token = this.peek();

        // Negación
        if (this.match("NOT")) {
            const inner = this.parseExpression(Precedence.NOT);
            return { kind: "not", inner };
        }

        // Cuantificador Universal
        if (this.match("FORALL")) {
            const varToken: Token = this.expect("IDENT", "Se esperaba el identificador de la variable tras '∀'");
            const variable: string = varToken.value;

            this.boundVars.add(variable);
            const inner = this.parseExpression(Precedence.LOWEST);
            this.boundVars.delete(variable);

            return { kind: "forall", variable, inner };
        }

        // Cuantificador Existencial
        if (this.match("EXISTS")) {
            const varToken: Token = this.expect("IDENT", "Se esperaba el identificador de la variable tras '∃'");
            const variable: string = varToken.value;

            this.boundVars.add(variable);
            const inner = this.parseExpression(Precedence.LOWEST);
            this.boundVars.delete(variable);

            return { kind: "exists", variable, inner };
        }

        // Paréntesis
        if (this.match("LPAREN")) {
            const inner = this.parseExpression(Precedence.LOWEST);
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

            return { kind: "atom", predicate, args };
        }

        throw new Error(`Token inesperado al inicio de la expresión: '${token.value}' (${token.type})`);
    }

    // Función que parsea la parte infija de la expresión,
    // incluyendo conjunción, disyunción e implicación
    private parseInfix(op: TokenType, left: Formula, precedence: number): Formula {
        switch (op) {
            case "AND": {
                // Asociativo a la izquierda
                const right = this.parseExpression(precedence + 1);
                return { kind: "and", left, right };
            }
            case "OR": {
                // Asociativo a la izquierda
                const right = this.parseExpression(precedence + 1);
                return { kind: "or", left, right };
            }
            case "IMPLIES": {
                // Asociativo a la derecha
                const right = this.parseExpression(precedence);
                return { kind: "implies", left, right };
            }
            default:
                throw new Error(`Operador binario desconocido: '${op}'`);
        }
    }

    private getInfixPrecedence(type: TokenType): number | null {
        switch (type) {
            case "IMPLIES":
                return Precedence.IMPLIES;
            case "OR":
                return Precedence.OR;
            case "AND":
                return Precedence.AND;
            default:
                return null;
        }
    }
}

// Función helper de conveniencia para parsear directo desde un string
export function parseFormula(input: string): Formula {
    const tokens = tokenize(input);
    const parser = new FormulaParser(tokens);
    return parser.parse();
}
