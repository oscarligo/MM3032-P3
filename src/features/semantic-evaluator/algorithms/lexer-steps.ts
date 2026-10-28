import { Token, TokenType } from "./lexer";

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

    const addToken = (token: Token, cursor: number, matchedText: string) => {
        tokens.push(token);
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
            throw new Error(`Carácter inesperado en la entrada: '${char}' en posición ${i}`);
        }
    }

    addToken({ type: "EOF", value: "" }, i, "");
    return { tokens, steps };
}
