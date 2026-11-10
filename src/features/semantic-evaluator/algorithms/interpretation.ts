import type { Formula, Term } from "../types";

export type SymbolInfo = {
    key: string;
    name: string;
    arity: number;
};

export type FunctionRow = {
    args: string[];
    result: string;
};

const subscript = (value: number) =>
    String(value).replace(/\d/g, (digit) => "₀₁₂₃₄₅₆₇₈₉"[Number(digit)]);

export const symbolLabel = ({ name, arity }: SymbolInfo, symbols: SymbolInfo[]) =>
    symbols.filter((symbol) => symbol.name === name).length > 1
        ? `${name}${subscript(arity)}`
        : name;

export function analyzeFormula(formula: Formula) {
    const constants = new Set<string>();
    const freeVariables = new Set<string>();
    const functions = new Map<string, SymbolInfo>();
    const predicates = new Map<string, SymbolInfo>();

    const visitTerm = (term: Term, bound: ReadonlySet<string>) => {
        if (term.kind === "const") constants.add(term.name);
        if (term.kind === "var" && !bound.has(term.name)) freeVariables.add(term.name);
        if (term.kind === "func") {
            const key = `${term.name}/${term.args.length}`;
            functions.set(key, { key, name: term.name, arity: term.args.length });
            term.args.forEach((argument) => visitTerm(argument, bound));
        }
    };

    const visit = (current: Formula, bound: ReadonlySet<string>) => {
        if (current.kind === "atom") {
            const key = `${current.predicate}/${current.args.length}`;
            predicates.set(key, { key, name: current.predicate, arity: current.args.length });
            current.args.forEach((argument) => visitTerm(argument, bound));
            return;
        }
        if (current.kind === "not") return visit(current.inner, bound);
        if (current.kind === "forall" || current.kind === "exists") {
            const nested = new Set(bound);
            nested.add(current.variable);
            return visit(current.inner, nested);
        }
        visit(current.left, bound);
        visit(current.right, bound);
    };

    visit(formula, new Set());

    return {
        constants: [...constants],
        freeVariables: [...freeVariables],
        functions: [...functions.values()],
        predicates: [...predicates.values()],
    };
}

export const domainState = (domain: string[]) => {
    const values = domain.map((value) => value.trim()).filter(Boolean);
    return {
        options: [...new Set(values)],
        hasDuplicates: new Set(values).size !== values.length,
    };
};

export const cleanDomain = (domain: string[]) => {
    const completed = domain.filter((value) => value.trim());
    return completed.length > 0 ? completed : [""];
};

export const cleanFunctionRows = (rows: Record<string, FunctionRow[]>) =>
    Object.fromEntries(
        Object.entries(rows).map(([key, values]) => [
            key,
            values.filter((row) => row.args.every(Boolean) && Boolean(row.result)),
        ])
    );

export const cleanPredicateRows = (rows: Record<string, string[][]>) =>
    Object.fromEntries(
        Object.entries(rows).map(([key, values]) => [
            key,
            values.filter((tuple) => tuple.every(Boolean)),
        ])
    );

export function updatePredicateTuple(
    rows: string[][],
    rowIndex: number,
    valueIndex: number,
    nextValue: string
) {
    const candidate = rows[rowIndex].map((entry, entryIndex) =>
        entryIndex === valueIndex ? nextValue : entry
    );
    const duplicate = candidate.every(Boolean) && rows.some(
        (tuple, index) => index !== rowIndex && tuple.join("\u0000") === candidate.join("\u0000")
    );

    return {
        duplicate,
        rows: duplicate
            ? rows
            : rows.map((tuple, index) => index === rowIndex ? candidate : tuple),
    };
}

export const canAddPredicateTuple = (rows: string[][], hasDomain: boolean) =>
    hasDomain && (rows.length === 0 || rows[rows.length - 1].every(Boolean));
