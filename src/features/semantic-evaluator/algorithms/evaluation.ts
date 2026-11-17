import type { Formula, InterpretationDefinition, Term } from "../types";
import { MAX_CARTESIAN_ENTRIES } from "./interpretation";

export type EvaluationMap = {
    caseFormula: Formula;
    variables: string[];
    variableLabels: ReadonlyMap<string, string>;
    rowVariables: string[];
    columnVariables: string[];
    rowAssignments: string[][];
    columnAssignments: string[][];
    results: Array<Array<boolean | null>>;
};

const scopeFormulaForCases = (formula: Formula) => {
    let bindingIndex = 0;
    const rawLabels = new Map<string, string>();

    const visitTerm = (term: Term, bindings: ReadonlyMap<string, string>): Term => {
        if (term.kind === "var") {
            const name = bindings.get(term.name) ?? term.name;
            rawLabels.set(name, term.name);
            return { ...term, name };
        }
        if (term.kind === "func") {
            return { ...term, args: term.args.map((argument) => visitTerm(argument, bindings)) };
        }
        return term;
    };

    const visit = (current: Formula, bindings: ReadonlyMap<string, string>): Formula => {
        if (current.kind === "atom") {
            return { ...current, args: current.args.map((term) => visitTerm(term, bindings)) };
        }
        if (current.kind === "not") return { ...current, inner: visit(current.inner, bindings) };
        if (current.kind === "forall" || current.kind === "exists") {
            const variable = `@bound:${bindingIndex++}:${current.variable}`;
            const nestedBindings = new Map(bindings);
            nestedBindings.set(current.variable, variable);
            rawLabels.set(variable, current.variable);
            return { ...current, variable, inner: visit(current.inner, nestedBindings) };
        }
        return {
            ...current,
            left: visit(current.left, bindings),
            right: visit(current.right, bindings),
        };
    };

    return { formula: visit(formula, new Map()), rawLabels };
};

const subscript = (value: number) =>
    String(value).replace(/\d/g, (digit) => "₀₁₂₃₄₅₆₇₈₉"[Number(digit)]);

const buildVariableLabels = (variables: string[], rawLabels: ReadonlyMap<string, string>) => {
    const counts = new Map<string, number>();
    variables.forEach((variable) => {
        const label = rawLabels.get(variable) ?? variable;
        counts.set(label, (counts.get(label) ?? 0) + 1);
    });
    const indexes = new Map<string, number>();
    return new Map(variables.map((variable) => {
        const label = rawLabels.get(variable) ?? variable;
        const index = (indexes.get(label) ?? 0) + 1;
        indexes.set(label, index);
        return [variable, counts.get(label) === 1 ? label : `${label}${subscript(index)}`];
    }));
};

const collectVariables = (formula: Formula, variables = new Set<string>()): Set<string> => {
    const visitTerm = (term: Term) => {
        if (term.kind === "var") variables.add(term.name);
        if (term.kind === "func") term.args.forEach(visitTerm);
    };
    if (formula.kind === "atom") formula.args.forEach(visitTerm);
    else if (formula.kind === "not") collectVariables(formula.inner, variables);
    else if (formula.kind === "forall" || formula.kind === "exists") {
        variables.add(formula.variable);
        collectVariables(formula.inner, variables);
    } else {
        collectVariables(formula.left, variables);
        collectVariables(formula.right, variables);
    }
    return variables;
};

export const evaluationCellCount = (
    formula: Formula,
    domainSize: number,
    environment: Readonly<Record<string, string>> = {}
) => {
    const { formula: caseFormula } = scopeFormulaForCases(formula);
    return [...collectVariables(caseFormula)].reduce(
        (size, variable) => size * (environment[variable] ? 1 : domainSize),
        1
    );
};

export const evaluateTerm = (term: Term, interpretation: InterpretationDefinition, environment: ReadonlyMap<string, string>): string | null => {
    if (term.kind === "var") return environment.get(term.name) ?? null;
    if (term.kind === "const") return interpretation.constants[term.name] ?? null;
    const args = term.args.map((argument) => evaluateTerm(argument, interpretation, environment));
    if (args.some((value) => value === null)) return null;
    return interpretation.functions[`${term.name}/${term.args.length}`]?.rows
        .find((row) => row.args.every((value, index) => value === args[index]))?.result ?? null;
};

const evaluateFormula = (
    formula: Formula,
    interpretation: InterpretationDefinition,
    environment: ReadonlyMap<string, string>,
    instantiateQuantifiers = false
): boolean | null => {
    if (formula.kind === "atom") {
        const predicate = interpretation.predicates[`${formula.predicate}/${formula.args.length}`];
        if (!predicate) return null;
        if (formula.args.length === 0) return predicate.truth;
        const args = formula.args.map((term) => evaluateTerm(term, interpretation, environment));
        if (args.some((value) => value === null)) return null;
        return predicate.rows.some((tuple) => tuple.every((value, index) => value === args[index]));
    }
    if (formula.kind === "not") {
        const value = evaluateFormula(formula.inner, interpretation, environment, instantiateQuantifiers);
        return value === null ? null : !value;
    }
    if (formula.kind === "and" || formula.kind === "or" || formula.kind === "implies") {
        const left = evaluateFormula(formula.left, interpretation, environment, instantiateQuantifiers);
        const right = evaluateFormula(formula.right, interpretation, environment, instantiateQuantifiers);
        if (formula.kind === "and") return left === false || right === false ? false : left === true && right === true ? true : null;
        if (formula.kind === "or") return left === true || right === true ? true : left === false && right === false ? false : null;
        return left === false || right === true ? true : left === true && right === false ? false : null;
    }

    if (instantiateQuantifiers && environment.has(formula.variable)) {
        return evaluateFormula(formula.inner, interpretation, environment, true);
    }

    const results = interpretation.domain.map((value) => {
        const nested = new Map(environment);
        nested.set(formula.variable, value);
        return evaluateFormula(formula.inner, interpretation, nested, instantiateQuantifiers);
    });
    if (formula.kind === "forall") return results.includes(false) ? false : results.every((value) => value === true) ? true : null;
    return results.includes(true) ? true : results.every((value) => value === false) ? false : null;
};

const assignments = (
    domain: string[],
    variables: string[],
    environment: Readonly<Record<string, string>>
): string[][] => {
    let values: string[][] = [[]];
    for (const variable of variables) {
        const choices = environment[variable] === undefined ? domain : [environment[variable]];
        values = values.flatMap((assignment) => choices.map((value) => [...assignment, value]));
    }
    return values;
};

export const buildEvaluationMap = (formula: Formula, interpretation: InterpretationDefinition): EvaluationMap => {
    const { formula: caseFormula, rawLabels } = scopeFormulaForCases(formula);
    const variables = [...collectVariables(caseFormula)];
    if (evaluationCellCount(formula, interpretation.domain.length, interpretation.environment) > MAX_CARTESIAN_ENTRIES) {
        throw new RangeError(`Evaluation map exceeds ${MAX_CARTESIAN_ENTRIES} cells`);
    }
    const variableLabels = buildVariableLabels(variables, rawLabels);
    const rowVariableCount = variables.length === 1 ? 1 : Math.floor(variables.length / 2);
    const rowVariables = variables.slice(0, rowVariableCount);
    const columnVariables = variables.slice(rowVariables.length);
    const rowAssignments = assignments(interpretation.domain, rowVariables, interpretation.environment);
    const columnAssignments = assignments(interpretation.domain, columnVariables, interpretation.environment);
    const results = rowAssignments.map((rowValues) => columnAssignments.map((columnValues) => {
        const environment = new Map(Object.entries(interpretation.environment));
        rowVariables.forEach((variable, index) => environment.set(variable, rowValues[index]));
        columnVariables.forEach((variable, index) => environment.set(variable, columnValues[index]));
        return evaluateFormula(caseFormula, interpretation, environment, true);
    }));
    return { caseFormula, variables, variableLabels, rowVariables, columnVariables, rowAssignments, columnAssignments, results };
};

export const selectConclusionCells = (
    evaluationMap: EvaluationMap,
    interpretation: InterpretationDefinition,
    target: boolean
): Set<string> => {
    type CaseCell = { id: string; assignment: Map<string, string> };
    const cells: CaseCell[] = evaluationMap.results.flatMap((row, rowIndex) =>
        row.map((_, columnIndex) => ({
            id: `${rowIndex}:${columnIndex}`,
            assignment: new Map([
                ...evaluationMap.rowVariables.map((variable, index) => [variable, evaluationMap.rowAssignments[rowIndex][index]] as const),
                ...evaluationMap.columnVariables.map((variable, index) => [variable, evaluationMap.columnAssignments[columnIndex][index]] as const),
            ]),
        }))
    ).filter((cell) => Object.entries(interpretation.environment).every(
        ([variable, value]) => !cell.assignment.has(variable) || cell.assignment.get(variable) === value
    ));
    const groupsFor = (variable: string, candidates: CaseCell[]) =>
        interpretation.domain.map((value) => candidates.filter((cell) => cell.assignment.get(variable) === value));
    const atomOutcome = (current: Formula, cell?: CaseCell) => {
        if (!cell) return null;
        const environment = new Map([
            ...Object.entries(interpretation.environment),
            ...cell.assignment,
        ]);
        return evaluateFormula(current, interpretation, environment, true);
    };
    const outcome = (current: Formula, candidates: CaseCell[]): boolean | null => {
        if (current.kind === "atom") return atomOutcome(current, candidates[0]);
        if (current.kind === "not") {
            const value = outcome(current.inner, candidates);
            return value === null ? null : !value;
        }
        if (current.kind === "forall" || current.kind === "exists") {
            const values = groupsFor(current.variable, candidates).map((group) => outcome(current.inner, group));
            if (current.kind === "exists") {
                return values.includes(true) ? true : values.every((value) => value === false) ? false : null;
            }
            return values.includes(false) ? false : values.every((value) => value === true) ? true : null;
        }
        const left = outcome(current.left, candidates);
        const right = outcome(current.right, candidates);
        if (current.kind === "and") return left === false || right === false ? false : left === true && right === true ? true : null;
        if (current.kind === "or") return left === true || right === true ? true : left === false && right === false ? false : null;
        return left === false || right === true ? true : left === true && right === false ? false : null;
    };
    const combineEvidence = (
        leftFormula: Formula,
        leftCells: CaseCell[],
        rightFormula: Formula,
        rightCells: CaseCell[],
        candidates: CaseCell[]
    ) => {
        const leftVariables = [...collectVariables(leftFormula)];
        const rightVariables = [...collectVariables(rightFormula)];
        const matches = (candidate: CaseCell, evidence: CaseCell, variables: string[]) =>
            variables.every((variable) => candidate.assignment.get(variable) === evidence.assignment.get(variable));
        return [...new Map(leftCells.flatMap((leftCell) => rightCells.flatMap((rightCell) => {
            const combined = candidates.find((candidate) =>
                matches(candidate, leftCell, leftVariables)
                && matches(candidate, rightCell, rightVariables)
            );
            return combined ? [[combined.id, combined] as const] : [];
        }))).values()];
    };
    const selectEvidence = (current: Formula, candidates: CaseCell[], expected: boolean): CaseCell[] => {
        if (current.kind === "atom") {
            const selected = candidates.find((cell) => atomOutcome(current, cell) === expected) ?? candidates[0];
            return selected ? [selected] : [];
        }
        if (current.kind === "not") return selectEvidence(current.inner, candidates, !expected);
        if (current.kind === "forall" || current.kind === "exists") {
            const groups = groupsFor(current.variable, candidates);
            const needsEveryGroup = (current.kind === "forall" && expected) || (current.kind === "exists" && !expected);
            const selectedGroups = needsEveryGroup
                ? groups
                : groups.filter((group) => outcome(current.inner, group) === expected).slice(0, 1);
            return selectedGroups.flatMap((group) => selectEvidence(current.inner, group, expected));
        }

        const left = outcome(current.left, candidates);
        if (current.kind === "and") {
            return expected
                ? combineEvidence(
                    current.left, selectEvidence(current.left, candidates, true),
                    current.right, selectEvidence(current.right, candidates, true),
                    candidates
                )
                : selectEvidence(left === false ? current.left : current.right, candidates, false);
        }
        if (current.kind === "or") {
            return expected
                ? selectEvidence(left === true ? current.left : current.right, candidates, true)
                : combineEvidence(
                    current.left, selectEvidence(current.left, candidates, false),
                    current.right, selectEvidence(current.right, candidates, false),
                    candidates
                );
        }
        return expected
            ? left === false
                ? selectEvidence(current.left, candidates, false)
                : selectEvidence(current.right, candidates, true)
            : combineEvidence(
                current.left, selectEvidence(current.left, candidates, true),
                current.right, selectEvidence(current.right, candidates, false),
                candidates
            );
    };

    return new Set(selectEvidence(evaluationMap.caseFormula, cells, target).map((cell) => cell.id));
};

const termToText = (term: Term): string =>
    term.kind === "func"
        ? `${term.name}(${term.args.map(termToText).join(", ")})`
        : term.name;

export const formulaToText = (formula: Formula): string => {
    if (formula.kind === "atom") {
        return formula.args.length > 0
            ? `${formula.predicate}(${formula.args.map(termToText).join(", ")})`
            : formula.predicate;
    }
    if (formula.kind === "not") return `¬${formulaToText(formula.inner)}`;
    if (formula.kind === "forall" || formula.kind === "exists") {
        return `${formula.kind === "forall" ? "∀" : "∃"}${formula.variable} ${formulaToText(formula.inner)}`;
    }
    const operator = formula.kind === "and" ? "∧" : formula.kind === "or" ? "∨" : "→";
    return `(${formulaToText(formula.left)} ${operator} ${formulaToText(formula.right)})`;
};

export const evaluateUnderInterpretation = (
    formula: Formula,
    interpretation: InterpretationDefinition
) => evaluateFormula(formula, interpretation, new Map(Object.entries(interpretation.environment)));

export const evaluateFormulaInEnvironment = (
    formula: Formula,
    interpretation: InterpretationDefinition,
    environment: ReadonlyMap<string, string>
) => evaluateFormula(formula, interpretation, environment);

export const evaluateFormulaForCase = (
    formula: Formula,
    interpretation: InterpretationDefinition,
    environment: ReadonlyMap<string, string>
) => evaluateFormula(formula, interpretation, environment, true);

export const fitEvaluationScale = (
    viewportWidth: number,
    viewportHeight: number,
    contentWidth: number,
    contentHeight: number
) => Math.min(2, viewportWidth / contentWidth, viewportHeight / contentHeight) * .9;
