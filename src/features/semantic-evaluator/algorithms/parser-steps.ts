import type { Formula } from "../types";
import { FormulaParser, type ParserTrace } from "./parser";
import type { Token, TokenType } from "./lexer";
import { tokenizeWithSteps } from "./lexer-steps";
import { buildVisualTree, type RenderTreeNode } from "./parser-tree";

export type ParserStep = {
    stage: "parser";
    cursor: number;
    currentToken: string;
    tokenType: TokenType;
    callStack: string[];
    decision: string;
    activeScopeVars: string[];
    tree?: RenderTreeNode;
};

export type ParserStepsResult = {
    formula: Formula;
    tokens: Token[];
    steps: ParserStep[];
};

const decisionFor = (token: Token, callStack: string[], previous?: Token): string => {
    switch (token.type) {
        case "FORALL": return "open-universal-quantifier";
        case "EXISTS": return "open-existential-quantifier";
        case "NOT": return "build-negation";
        case "IMPLIES": return "build-implication";
        case "OR": return "build-disjunction";
        case "AND": return "build-conjunction";
        case "LPAREN": return "open-group";
        case "RPAREN": return "close-group";
        case "COMMA": return "next-argument";
        case "EOF": return "finish-formula";
        case "IDENT":
            return previous?.type === "FORALL" || previous?.type === "EXISTS"
                ? "bind-variable"
                : callStack[callStack.length - 1] === "term"
                    ? "read-term"
                    : "build-predicate";
    }
};

export function parseTokensWithSteps(tokens: Token[]): ParserStepsResult {
    const trace: ParserTrace[] = [];
    const parser = new FormulaParser(tokens, (step) => trace.push(step));
    const formula = parser.parse();
    const steps = trace.map<ParserStep>(({ cursor, token, callStack, activeScopeVars }) => ({
        stage: "parser",
        cursor,
        currentToken: token.value || token.type,
        tokenType: token.type,
        callStack,
        decision: decisionFor(token, callStack, tokens[cursor - 1]),
        activeScopeVars,
        // The circled token is next to read; only earlier tokens belong in the tree.
        tree: buildVisualTree(formula, parser.nodeTokens, cursor),
    }));

    return { formula, tokens, steps };
}

export function parseFormulaWithSteps(input: string): ParserStepsResult {
    const { tokens } = tokenizeWithSteps(input);
    return parseTokensWithSteps(tokens);
}
