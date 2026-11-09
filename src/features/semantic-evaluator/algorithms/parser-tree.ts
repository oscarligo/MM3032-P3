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

export function buildVisualTree(
    formula: Formula,
    nodeTokens: WeakMap<Formula | Term, number>,
    cursor: number
): RenderTreeNode | undefined {
    let placeholderCounter = 0;

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
            return {
                id: `node-${currentIndex}`,
                nodeIndex: currentIndex,
                label: f.predicate,
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

