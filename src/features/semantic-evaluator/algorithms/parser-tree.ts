import type { Formula, Term } from "../types";

type NodeKind = "operator" | "quantifier" | "atom" | "variable" | "const" | "placeholder";

export type RenderTreeNode = {
    id: string;
    nodeIndex: number;
    label: string;
    roleTag?: string;
    nodeType: NodeKind;
    variableClass?: "bound" | "free";
    isActive: boolean;
    children: RenderTreeNode[];
};

const SUBSCRIPT_DIGITS: Record<string, string> = {
    "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
    "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
};

const toSubscript = (value: number) =>
    String(value).replace(/\d/g, (digit) => SUBSCRIPT_DIGITS[digit]);

export const collectPredicateArities = (formula: Formula) => {
    const predicateArities = new Map<string, Set<number>>();
    const visit = (current: Formula) => {
        if (current.kind === "atom") {
            const arities = predicateArities.get(current.predicate) ?? new Set<number>();
            arities.add(current.args.length);
            predicateArities.set(current.predicate, arities);
            return;
        }
        if (current.kind === "not") return visit(current.inner);
        if (current.kind === "forall" || current.kind === "exists") return visit(current.inner);
        visit(current.left);
        visit(current.right);
    };
    visit(formula);
    return predicateArities;
};

export const predicateAritySubscript = (
    predicateArities: ReadonlyMap<string, ReadonlySet<number>>,
    predicate: string,
    arity: number,
) => (predicateArities.get(predicate)?.size ?? 0) > 1 ? toSubscript(arity) : "";

export function buildVisualTree(
    formula: Formula,
    nodeTokens: WeakMap<Formula | Term, number>,
    cursor: number
): RenderTreeNode | undefined {
    let placeholderCounter = 0;
    const predicateArities = collectPredicateArities(formula);

    const makePlaceholder = (roleTag?: string): RenderTreeNode => ({
        id: `placeholder-${placeholderCounter++}`,
        nodeIndex: -1,
        label: "?",
        roleTag,
        nodeType: "placeholder",
        isActive: false,
        children: [],
    });

    const buildTerm = (
        term: Term,
        currentBound: ReadonlySet<string>,
        roleTag?: string
    ): RenderTreeNode => {
        const currentIndex = nodeTokens.get(term)!;
        const isActive = currentIndex === cursor - 1;

        if (term.kind === "func") {
            return {
                id: `node-${currentIndex}`,
                nodeIndex: currentIndex,
                label: term.name,
                roleTag,
                nodeType: "atom",
                isActive,
                children: term.args.filter((arg) => nodeTokens.get(arg)! < cursor).map((arg, i) =>
                    buildTerm(arg, currentBound, `Arg. ${i + 1}`)
                ),
            };
        }

        if (term.kind === "const") {
            return {
                id: `node-${currentIndex}`,
                nodeIndex: currentIndex,
                label: term.name,
                roleTag: roleTag ? `${roleTag} (Const)` : "Constante",
                nodeType: "const",
                isActive,
                children: [],
            };
        }

        const isBound = currentBound.has(term.name);
        return {
            id: `node-${currentIndex}`,
            nodeIndex: currentIndex,
            label: term.name,
            roleTag: isBound ? "Var. ligada" : "Var. libre",
            nodeType: "variable",
            variableClass: isBound ? "bound" : "free",
            isActive,
            children: [],
        };
    };

    const buildFormula = (
        f: Formula,
        currentBound: ReadonlySet<string>,
        roleTag?: string
    ): RenderTreeNode => {
        const currentIndex = nodeTokens.get(f)!;
        if (currentIndex >= cursor) {
            // A binary operator is discovered only after its left operand.
            if (f.kind === "and" || f.kind === "or" || f.kind === "implies") {
                return buildFormula(f.left, currentBound, roleTag);
            }
            return makePlaceholder(roleTag);
        }
        const isActive = currentIndex === cursor - 1;

        if (f.kind === "atom") {
            const aritySubscript = predicateAritySubscript(predicateArities, f.predicate, f.args.length);
            return {
                id: `node-${currentIndex}`,
                nodeIndex: currentIndex,
                label: `${f.predicate}${aritySubscript}`,
                roleTag: roleTag ?? "Predicado",
                nodeType: "atom",
                isActive,
                children: f.args.filter((arg) => nodeTokens.get(arg)! < cursor).map((arg, i) =>
                    buildTerm(arg, currentBound, `Arg. ${i + 1}`)
                ),
            };
        }

        if (f.kind === "not") {
            return {
                id: `node-${currentIndex}`,
                nodeIndex: currentIndex,
                label: "¬",
                roleTag,
                nodeType: "operator",
                isActive,
                children: [buildFormula(f.inner, currentBound, "Negada")],
            };
        }

        if (f.kind === "forall" || f.kind === "exists") {
            const symbol = f.kind === "forall" ? "∀" : "∃";
            const variable = currentIndex + 1 < cursor ? f.variable : "";
            const nestedBound = new Set(currentBound);
            if (variable) nestedBound.add(variable);
            return {
                id: `node-${currentIndex}`,
                nodeIndex: currentIndex,
                label: `${symbol}${variable}`,
                roleTag,
                nodeType: "quantifier",
                isActive,
                children: [
                    buildFormula(f.inner, nestedBound, `Alcance ${symbol}${variable}`),
                ],
            };
        }

        const symbol = f.kind === "and" ? "∧" : f.kind === "or" ? "∨" : "→";
        const leftRole =
            f.kind === "implies"
                ? "Antecedente"
                : f.kind === "and"
                  ? "Conjunto izq."
                  : "Disyunto izq.";
        const rightRole =
            f.kind === "implies"
                ? "Consecuente"
                : f.kind === "and"
                  ? "Conjunto der."
                  : "Disyunto der.";

        return {
            id: `node-${currentIndex}`,
            nodeIndex: currentIndex,
            label: symbol,
            roleTag,
            nodeType: "operator",
            isActive,
            children: [
                buildFormula(f.left, currentBound, leftRole),
                buildFormula(f.right, currentBound, rightRole),
            ],
        };
    };

    if (cursor === 0) return undefined;
    const tree = buildFormula(formula, new Set(), "Raíz");
    return tree.nodeType === "placeholder" ? undefined : tree;
}

