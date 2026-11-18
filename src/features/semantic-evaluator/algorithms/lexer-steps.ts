import { Token, TokenType } from "./lexer";
import { FormulaSyntaxError } from "./parse-errors";

/*
    Variante pedagógica del lexer que reproduce sus mismas reglas y, además de los
    tokens, registra un paso por cada fragmento leído. Cada paso guarda el cursor,
    el texto reconocido, lo que queda de la entrada y una descripción para la UI.

    Los espacios aparecen en la traza aunque no produzcan tokens. Las formas ASCII
    y LaTeX se registran como texto reconocido, pero generan el mismo valor Unicode
    normalizado que tokenize. EOF también genera un paso para cerrar la animación.
*/

export type LexerStep = {
    stage: "lexer";
    cursor: number;
    matchedText: string;
    tokenType: string;
    remaining: string;
    description: string;
};

export type LexerStepsResult = {
    tokens: Token[];
    steps: LexerStep[];
};

export function tokenizeWithSteps(input: string): LexerStepsResult {
    const tokens: Token[] = [];
    const steps: LexerStep[] = [];
    let i = 0;

    const collect = (
        cursor: number,
        matchedText: string,
        tokenType: TokenType | "WHITESPACE",
        description: string,
    ) => steps.push({
        stage: "lexer",
        cursor,
        matchedText,
        tokenType,
        remaining: input.slice(cursor + matchedText.length),
        description,
    });

    const addToken = (token: Omit<Token, "position">, cursor: number, matchedText: string) => {
        // Crear el token y su explicación en una sola operación evita que ambas secuencias diverjan.
        tokens.push({ ...token, position: cursor });
        collect(cursor, matchedText, token.type, `Se reconoció ${token.type}: '${token.value}'`);
    };

    while (i < input.length) {
        const char = input[i];

        if (/\s/.test(char)) {
            collect(i, char, "WHITESPACE", "Se ignoró un espacio en blanco");
            i++;
            continue;
        }

        if (char === "∀" || input.slice(i, i + 6) === "\\forall") {
            const matchedText = char === "∀" ? char : "\\forall";
            addToken({ type: "FORALL", value: "∀" }, i, matchedText);
            i += matchedText.length;
        } else if (char === "∃" || input.slice(i, i + 7) === "\\exists") {
            const matchedText = char === "∃" ? char : "\\exists";
            addToken({ type: "EXISTS", value: "∃" }, i, matchedText);
            i += matchedText.length;
        } else if (char === "∧" || char === "&") {
            addToken({ type: "AND", value: "∧" }, i, char);
            i++;
        } else if (char === "∨" || char === "|") {
            addToken({ type: "OR", value: "∨" }, i, char);
            i++;
        } else if (char === "→" || input.slice(i, i + 2) === "->") {
            const matchedText = char === "→" ? char : "->";
            addToken({ type: "IMPLIES", value: "→" }, i, matchedText);
            i += matchedText.length;
        } else if (char === "¬" || char === "~" || char === "!") {
            addToken({ type: "NOT", value: "¬" }, i, char);
            i++;
        } else if (char === "(") {
            addToken({ type: "LPAREN", value: "(" }, i, char);
            i++;
        } else if (char === ")") {
            addToken({ type: "RPAREN", value: ")" }, i, char);
            i++;
        } else if (char === ",") {
            addToken({ type: "COMMA", value: "," }, i, char);
            i++;
        } else if (/[a-zA-Z_]/.test(char)) {
            const start = i;
            let ident = "";
            while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
                ident += input[i];
                i++;
            }
            addToken({ type: "IDENT", value: ident }, start, ident);
        } else {
            throw new FormulaSyntaxError({ code: "UNEXPECTED_CHARACTER", character: char, position: i });
        }
    }

    addToken({ type: "EOF", value: "" }, i, "");
    return { tokens, steps };
}
