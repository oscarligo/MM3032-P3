
/*
Utilidad para tokenizar fórmulas lógicas de primer orden. 
Convierte una cadena de entrada en una lista de tokens 
que representan los elementos sintácticos de la fórmula, 
como cuantificadores, operadores lógicos, paréntesis y 
identificadores (variables, constantes y funciones).
*/

// Tipos de tokens en la formula lógica de primer orden.
export type TokenType =
    | "FORALL" | "EXISTS"
    | "AND" | "OR" | "IMPLIES" | "NOT"
    | "LPAREN" | "RPAREN" | "COMMA"
    | "IDENT" | "EOF";
    
export interface Token {
    type: TokenType;
    value: string;
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
            tokens.push({ type: "FORALL", value: "∀" });
            i += char === "∀" ? 1 : 6;
        } else if (char === "∃" || input.slice(i, i + 7) === "\\exists") {
            tokens.push({ type: "EXISTS", value: "∃" });
            i += char === "∃" ? 1 : 7;
        } else if (char === "∧" || char === "&") {
            tokens.push({ type: "AND", value: "∧" });
            i++;
        } else if (char === "∨" || char === "|") {
            tokens.push({ type: "OR", value: "∨" });
            i++;
        } else if (char === "→" || input.slice(i, i + 2) === "->") {
            tokens.push({ type: "IMPLIES", value: "→" });
            i += char === "→" ? 1 : 2;
        } else if (char === "¬" || char === "~" || char === "!") {
            tokens.push({ type: "NOT", value: "¬" });
            i++;
        } else if (char === "(") {
            tokens.push({ type: "LPAREN", value: "(" });
            i++;
        } else if (char === ")") {
            tokens.push({ type: "RPAREN", value: ")" });
            i++;
        } else if (char === ",") {
            tokens.push({ type: "COMMA", value: "," });
            i++;
        } else if (/[a-zA-Z_]/.test(char)) {
            let ident = "";
            while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
                ident += input[i];
                i++;
            }
            tokens.push({ type: "IDENT", value: ident });
        } else {
            throw new Error(`Carácter inesperado en la entrada: '${char}' en posición ${i}`);
        }
    }

    tokens.push({ type: "EOF", value: "" });
    return tokens;
}
