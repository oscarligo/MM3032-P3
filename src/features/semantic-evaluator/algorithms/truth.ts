import type { Formula, InterpretationDefinition, Term } from "../types";
import { evaluateFormulaInEnvironment } from "./evaluation";

export type TruthStep = {
    expression: string;
    result: boolean | null;
    isAtom: boolean;
};

export type TruthTrace = {
    originalExpression: string;
    assignment: Array<{ variable: string; value: string }>;
    steps: TruthStep[];
};

const originalTermToText = (term: Term): string =>
    term.kind === "func"
        ? `${term.name}(${term.args.map(originalTermToText).join(", ")})`
        : term.name;

const formulaWithoutQuantifiers = (formula: Formula): string => {
    if (formula.kind === "atom") {
        return formula.args.length > 0
            ? `${formula.predicate}(${formula.args.map(originalTermToText).join(", ")})`
            : formula.predicate;
    }
    if (formula.kind === "not") return `¬${formulaWithoutQuantifiers(formula.inner)}`;
    if (formula.kind === "forall" || formula.kind === "exists") {
        return formulaWithoutQuantifiers(formula.inner);
    }
    const operator = formula.kind === "and" ? "∧" : formula.kind === "or" ? "∨" : "→";
    return `(${formulaWithoutQuantifiers(formula.left)} ${operator} ${formulaWithoutQuantifiers(formula.right)})`;
};

const termToText = (term: Term, environment: ReadonlyMap<string, string>): string => {
    if (term.kind === "var") return environment.get(term.name) ?? term.name;
    if (term.kind === "const") return term.name;
    return `${term.name}(${term.args.map((argument) => termToText(argument, environment)).join(", ")})`;
};

const formulaToText = (formula: Formula, environment: ReadonlyMap<string, string>): string => {
    if (formula.kind === "atom") {
        return formula.args.length > 0
            ? `${formula.predicate}(${formula.args.map((term) => termToText(term, environment)).join(", ")})`
            : formula.predicate;
    }
    if (formula.kind === "not") return `¬${formulaToText(formula.inner, environment)}`;
    if (formula.kind === "forall" || formula.kind === "exists") {
        return formulaToText(formula.inner, environment);
    }
    const operator = formula.kind === "and" ? "∧" : formula.kind === "or" ? "∨" : "→";
    return `(${formulaToText(formula.left, environment)} ${operator} ${formulaToText(formula.right, environment)})`;
};

export const buildTruthTrace = (
    formula: Formula,
    interpretation: InterpretationDefinition,
    rowVariables: string[],
    rowAssignment: string[],
    columnVariables: string[],
    columnAssignment: string[],
    trueLabel: string
): TruthTrace => {
    const assignment = [
        ...rowVariables.map((variable, index) => ({ variable, value: rowAssignment[index] })),
        ...columnVariables.map((variable, index) => ({ variable, value: columnAssignment[index] })),
    ];
    const environment = new Map(Object.entries(interpretation.environment));
    assignment.forEach(({ variable, value }) => environment.set(variable, value));
    const steps: TruthStep[] = [];

    const valueLabel = (value: boolean | null) => value === null ? "-" : value ? trueLabel : "F";

    const visit = (current: Formula): boolean | null => {
        if (current.kind === "forall" || current.kind === "exists") {
            return visit(current.inner);
        }
        let expression: string;
        if (current.kind === "atom") {
            expression = formulaToText(current, environment);
        } else if (current.kind === "not") {
            expression = `¬${valueLabel(visit(current.inner))}`;
        } else {
            const left = visit(current.left);
            const right = visit(current.right);
            const operator = current.kind === "and" ? "∧" : current.kind === "or" ? "∨" : "→";
            expression = `(${valueLabel(left)} ${operator} ${valueLabel(right)})`;
        }
        const result = evaluateFormulaInEnvironment(current, interpretation, environment);
        steps.push({
            expression,
            result,
            isAtom: current.kind === "atom",
        });
        return result;
    };

    visit(formula);
    return { originalExpression: formulaWithoutQuantifiers(formula), assignment, steps };
};
