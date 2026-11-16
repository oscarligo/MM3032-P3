
/*
Utilidad para tokenizar fórmulas lógicas de primer orden. 
Convierte una cadena de entrada en una lista de tokens 
que representan los elementos sintácticos de la fórmula, 
como cuantificadores, operadores lógicos, paréntesis y 
identificadores (variables, constantes y funciones).
*/
import { FormulaSyntaxError } from "./parse-errors";

// Tipos de tokens en la formula lógica de primer orden.
export type TokenType =
    | "FORALL" | "EXISTS"
    | "AND" | "OR" | "IMPLIES" | "NOT"
    | "LPAREN" | "RPAREN" | "COMMA"
    | "IDENT" | "EOF";
    
export interface Token {
    type: TokenType;
    value: string;
    position: number;
}

// Tokenizador para convertir una cadena de entrada en una lista de tokens.
export function tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;

    while (i < input.length) {
        const char = input[i];

        // Ignorar espacios en blanco
        if (/\s/.test(char)) {
            i++;
            continue;
        }

        // Símbolos lógicos Unicode o equivalentes ASCII
        if (char === "∀" || input.slice(i, i + 6) === "\\forall") {
            tokens.push({ type: "FORALL", value: "∀", position: i });
            i += char === "∀" ? 1 : 6;
        } else if (char === "∃" || input.slice(i, i + 7) === "\\exists") {
            tokens.push({ type: "EXISTS", value: "∃", position: i });
            i += char === "∃" ? 1 : 7;
        } else if (char === "∧" || char === "&") {
            tokens.push({ type: "AND", value: "∧", position: i });
            i++;
        } else if (char === "∨" || char === "|") {
            tokens.push({ type: "OR", value: "∨", position: i });
            i++;
        } else if (char === "→" || input.slice(i, i + 2) === "->") {
            tokens.push({ type: "IMPLIES", value: "→", position: i });
            i += char === "→" ? 1 : 2;
        } else if (char === "¬" || char === "~" || char === "!") {
            tokens.push({ type: "NOT", value: "¬", position: i });
            i++;
        } else if (char === "(") {
            tokens.push({ type: "LPAREN", value: "(", position: i });
            i++;
        } else if (char === ")") {
            tokens.push({ type: "RPAREN", value: ")", position: i });
            i++;
        } else if (char === ",") {
            tokens.push({ type: "COMMA", value: ",", position: i });
            i++;
        } else if (/[a-zA-Z_]/.test(char)) {
            const start = i;
            let ident = "";
            while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
                ident += input[i];
                i++;
            }
            tokens.push({ type: "IDENT", value: ident, position: start });
        } else {
            throw new FormulaSyntaxError({ code: "UNEXPECTED_CHARACTER", character: char, position: i });
        }
    }

    tokens.push({ type: "EOF", value: "", position: input.length });
    return tokens;
}
