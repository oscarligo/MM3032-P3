import type { Formula } from "../types";
import { FormulaParser, type ParserCall, type ParserTrace } from "./parser";
import type { Token, TokenType } from "./lexer";
import { tokenizeWithSteps } from "./lexer-steps";
import { buildVisualTree, type RenderTreeNode } from "./parser-tree";

/*
    Adaptador entre FormulaParser y la visualización paso a paso. Ejecuta el parser
    normal con onRead, conserva una instantánea de la pila y transforma cada lectura
    en una decisión pedagógica independiente de los textos traducidos de la interfaz.

    Las llamadas de precedencia que no participan en la fórmula se ocultan para evitar
    ruido. operatorCalls distingue la regla que realmente consumió cada conectivo y
    nodeTokens permite reconstruir, para cada cursor, únicamente la parte del árbol que
    ya fue descubierta. El resultado final sigue siendo el mismo AST del parser normal.
*/

export type CallStep = {
    rule: string;
    kind: "formula" | "implicationRoot" | "implicationBody" | "implicationGroup" | "implicationRight"
        | "disjunction" | "conjunction" | "negation"
        | "universal" | "existential" | "unary" | "group" | "predicate" | "term";
    token: string;
    // Solo en niveles binarios: operador observado y si esta llamada fue la que lo consumió.
    operator?: string;
    consumes?: boolean;
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
const describeCall = (
    callStack: ParserCall[],
    index: number,
    tokens: Token[],
    operatorCalls: ReadonlySet<string>
): CallStep => {
    const { rule, start } = callStack[index];
    const first = tokens[start];
    const quantifierText = (callStart: number) => `${tokens[callStart].value}${tokens[callStart + 1]?.value ?? ""}`;
    switch (rule) {
        case "unary":
            if (first.type === "NOT") return { rule, kind: "negation", token: first.value };
            if (first.type === "FORALL" || first.type === "EXISTS") {
                return {
                    rule,
                    kind: first.type === "FORALL" ? "universal" : "existential",
                    token: quantifierText(start),
                };
            }
            return { rule, kind: "unary", token: first.value || first.type };
        case "primary":
            return first.type === "LPAREN"
                ? { rule, kind: "group", token: first.value }
                : { rule, kind: "predicate", token: first.value };
        case "term":
            return { rule, kind: "term", token: first.value };
        case "implication": {
            // El contexto lo da quien invocó esta llamada: raíz, cuerpo de cuantificador, paréntesis u operando derecho
            const parent = callStack[index - 1];
            const base = { rule, operator: OPERATOR_SYMBOL[rule], consumes: operatorCalls.has(`${rule}:${start}`) };
            if (parent?.rule === "unary") return { ...base, kind: "implicationBody", token: quantifierText(parent.start) };
            if (parent?.rule === "primary") return { ...base, kind: "implicationGroup", token: tokens[parent.start].value };
            if (parent?.rule === "implication") return { ...base, kind: "implicationRight", token: OPERATOR_SYMBOL[rule] };
            return { ...base, kind: "implicationRoot", token: "" };
        }
        case "disjunction":
        case "conjunction":
            return {
                rule,
                kind: rule,
                token: OPERATOR_SYMBOL[rule],
                operator: OPERATOR_SYMBOL[rule],
                consumes: operatorCalls.has(`${rule}:${start}`),
            };
        default:
            return { rule, kind: "formula", token: "" };
    }
};

const relevantCalls = (callStack: ParserCall[], tokens: Token[], operatorCalls: ReadonlySet<string>): CallStep[] =>
    callStack
        .map((call, index) => ({ call, index }))
        .filter(({ call }) => {
            const triggers = RULE_TRIGGERS[call.rule];
            return !triggers || tokens.some((token) => triggers.includes(token.type));
        })
        .map(({ index }) => describeCall(callStack, index, tokens, operatorCalls));

export function parseTokensWithSteps(tokens: Token[], constantSymbols: ReadonlySet<string> = new Set()): ParserStepsResult {
    const trace: ParserTrace[] = [];
    const parser = new FormulaParser(tokens, (step) => trace.push(step), constantSymbols);
    const formula = parser.parse();
    const steps = trace.map<ParserStep>(({ cursor, token, callStack, activeScopeVars }) => ({
        stage: "parser",
        cursor,
        currentToken: token.value || token.type,
        tokenType: token.type,
        callStack: relevantCalls(callStack, tokens, parser.operatorCalls),
        decision: decisionFor(token, callStack, tokens[cursor - 1]),
        activeScopeVars,
        // El token señalado es el siguiente por leer; solo los anteriores pertenecen al árbol visible.
        tree: buildVisualTree(formula, parser.nodeTokens, cursor),
    }));

    return { formula, tokens, steps };
}

export function parseFormulaWithSteps(input: string, constantSymbols: ReadonlySet<string> = new Set()): ParserStepsResult {
    const { tokens } = tokenizeWithSteps(input);
    return parseTokensWithSteps(tokens, constantSymbols);
}
