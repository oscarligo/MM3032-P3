
/*
    Analizador léxico para fórmulas de lógica de primer orden. Recorre la entrada
    una sola vez, ignora espacios y normaliza las variantes ASCII y LaTeX admitidas
    al símbolo lógico Unicode correspondiente.

    Cada token conserva la posición inicial en la cadena original para que el parser
    pueda producir errores localizados. Los identificadores aceptan letras, dígitos y
    guion bajo después del primer carácter. Al final siempre se agrega EOF; cualquier
    carácter que no pertenezca al lenguaje detiene el recorrido con FormulaSyntaxError.
*/
import { FormulaSyntaxError } from "./parse-errors";

// Categorías léxicas consumidas por el parser descendente recursivo.
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

// Convierte la entrada en tokens normalizados sin decidir todavía el rol de los identificadores.
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
