import type { Formula } from "../types";
import { FormulaParser, type ParserCall, type ParserTrace } from "./parser";
import type { Token, TokenType } from "./lexer";
import { tokenizeWithSteps } from "./lexer-steps";
import { buildVisualTree, type RenderTreeNode } from "./parser-tree";

export type CallStep = {
    rule: string;
    kind: "formula" | "implication" | "disjunction" | "conjunction" | "negation"
        | "universal" | "existential" | "unary" | "group" | "predicate" | "term";
    token: string;
};

export type ParserStep = {
    stage: "parser";
    cursor: number;
    currentToken: string;
    tokenType: TokenType;
    callStack: CallStep[];
    decision: string;
    activeScopeVars: string[];
    tree?: RenderTreeNode;
};

export type ParserStepsResult = {
    formula: Formula;
    tokens: Token[];
    steps: ParserStep[];
};

const decisionFor = (token: Token, callStack: ParserCall[], previous?: Token): string => {
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
                : callStack[callStack.length - 1]?.rule === "term"
                    ? "read-term"
                    : "build-predicate";
    }
};

// Cada nivel de precedencia solo se muestra si la cadena contiene alguno de sus operadores.
const RULE_TRIGGERS: Record<string, TokenType[]> = {
    implication: ["IMPLIES"],
    disjunction: ["OR"],
    conjunction: ["AND"],
    unary: ["NOT", "FORALL", "EXISTS"],
};

const OPERATOR_SYMBOL: Record<string, string> = { implication: "→", disjunction: "∨", conjunction: "∧" };

// Describe cada llamada según el token con el que comienza, para que la explicación dependa de la cadena.
const describeCall = ({ rule, start }: ParserCall, tokens: Token[]): CallStep => {
    const first = tokens[start];
    switch (rule) {
        case "unary":
            if (first.type === "NOT") return { rule, kind: "negation", token: first.value };
            if (first.type === "FORALL" || first.type === "EXISTS") {
                return {
                    rule,
                    kind: first.type === "FORALL" ? "universal" : "existential",
                    token: `${first.value}${tokens[start + 1]?.value ?? ""}`,
                };
            }
            return { rule, kind: "unary", token: first.value || first.type };
        case "primary":
            return first.type === "LPAREN"
                ? { rule, kind: "group", token: first.value }
                : { rule, kind: "predicate", token: first.value };
        case "term":
            return { rule, kind: "term", token: first.value };
        case "implication":
        case "disjunction":
        case "conjunction":
            return { rule, kind: rule, token: OPERATOR_SYMBOL[rule] };
        default:
            return { rule, kind: "formula", token: "" };
    }
};

const relevantCalls = (callStack: ParserCall[], tokens: Token[]): CallStep[] =>
    callStack
        .filter(({ rule }) => {
            const triggers = RULE_TRIGGERS[rule];
            return !triggers || tokens.some((token) => triggers.includes(token.type));
        })
        .map((call) => describeCall(call, tokens));

export function parseTokensWithSteps(tokens: Token[], constantSymbols: ReadonlySet<string> = new Set()): ParserStepsResult {
    const trace: ParserTrace[] = [];
    const parser = new FormulaParser(tokens, (step) => trace.push(step), constantSymbols);
    const formula = parser.parse();
    const steps = trace.map<ParserStep>(({ cursor, token, callStack, activeScopeVars }) => ({
        stage: "parser",
        cursor,
        currentToken: token.value || token.type,
        tokenType: token.type,
        callStack: relevantCalls(callStack, tokens),
        decision: decisionFor(token, callStack, tokens[cursor - 1]),
        activeScopeVars,
        // The circled token is next to read; only earlier tokens belong in the tree.
        tree: buildVisualTree(formula, parser.nodeTokens, cursor),
    }));

    return { formula, tokens, steps };
}

export function parseFormulaWithSteps(input: string, constantSymbols: ReadonlySet<string> = new Set()): ParserStepsResult {
    const { tokens } = tokenizeWithSteps(input);
    return parseTokensWithSteps(tokens, constantSymbols);
}
