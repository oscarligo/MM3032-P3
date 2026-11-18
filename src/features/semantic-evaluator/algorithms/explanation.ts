import type { Formula, InterpretationDefinition, Term } from "../types";
import { evaluateTerm } from "./evaluation";

/*
    Evaluación semántica con justificación. holds calcula el valor bajo una interpretación
    finita y crea un entorno nuevo al ligar cada variable, por lo que los cuantificadores
    internos sombrean a los externos sin mutar el entorno recibido.

    explainFormula produce un árbol mínimo de evidencia: aprovecha el cortocircuito de
    los conectivos y, para cuantificadores, conserva el primer testigo o contraejemplo
    decisivo. Solo cuando ningún elemento decide por sí solo registra que se recorrió el
    dominio completo. Las fórmulas mostradas sustituyen variables activas, pero preservan
    el nombre ligado dentro del alcance de su propio cuantificador.
*/

type Env = ReadonlyMap<string, string>;

export type Side = "left" | "right" | "both";

export type ExplanationReason =
    | { type: "atom"; predicate: string; tuple: string[] }
    | { type: "not" }
    | { type: "and" | "or" | "implies"; side: Side }
    | { type: "witness" | "counterexample"; variable: string; element: string }
    | { type: "complete"; quantifier: "forall" | "exists"; elements: string[] };

export type Explanation = {
    formula: string;
    value: boolean;
    reason: ExplanationReason;
    children: Explanation[];
};

const bind = (environment: Env, variable: string, value: string): Env =>
    new Map(environment).set(variable, value);

const termValue = (term: Term, interpretation: InterpretationDefinition, environment: Env) => {
    const value = evaluateTerm(term, interpretation, environment);
    if (value === null) throw new Error(`No se pudo evaluar el término '${term.name}'`);
    return value;
};

const termText = (term: Term, environment: Env): string => {
    if (term.kind === "var") return environment.get(term.name) ?? term.name;
    if (term.kind === "const") return term.name;
    return `${term.name}(${term.args.map((argument) => termText(argument, environment)).join(", ")})`;
};

const formulaText = (formula: Formula, environment: Env): string => {
    if (formula.kind === "atom") {
        return formula.args.length > 0
            ? `${formula.predicate}(${formula.args.map((term) => termText(term, environment)).join(", ")})`
            : formula.predicate;
    }
    if (formula.kind === "not") return `¬${formulaText(formula.inner, environment)}`;
    if (formula.kind === "forall" || formula.kind === "exists") {
        const inner = new Map(environment);
        inner.delete(formula.variable);
        return `${formula.kind === "forall" ? "∀" : "∃"}${formula.variable} ${formulaText(formula.inner, inner)}`;
    }
    const operator = formula.kind === "and" ? "∧" : formula.kind === "or" ? "∨" : "→";
    return `(${formulaText(formula.left, environment)} ${operator} ${formulaText(formula.right, environment)})`;
};

const holds = (formula: Formula, interpretation: InterpretationDefinition, environment: Env): boolean => {
    switch (formula.kind) {
        case "atom": {
            const predicate = interpretation.predicates[`${formula.predicate}/${formula.args.length}`];
            if (!predicate) throw new Error(`Predicado sin interpretación: '${formula.predicate}'`);
            if (formula.args.length === 0) return predicate.truth;
            const args = formula.args.map((term) => termValue(term, interpretation, environment));
            return predicate.rows.some((tuple) => tuple.every((value, index) => value === args[index]));
        }
        case "not":
            return !holds(formula.inner, interpretation, environment);
        case "and":
            return holds(formula.left, interpretation, environment) && holds(formula.right, interpretation, environment);
        case "or":
            return holds(formula.left, interpretation, environment) || holds(formula.right, interpretation, environment);
        case "implies":
            return !holds(formula.left, interpretation, environment) || holds(formula.right, interpretation, environment);
        case "forall":
            return interpretation.domain.every((value) =>
                holds(formula.inner, interpretation, bind(environment, formula.variable, value)));
        case "exists":
            return interpretation.domain.some((value) =>
                holds(formula.inner, interpretation, bind(environment, formula.variable, value)));
    }
};

export const explainFormula = (
    formula: Formula,
    interpretation: InterpretationDefinition,
    environment: Env = new Map(Object.entries(interpretation.environment))
): Explanation => {
    const text = formulaText(formula, environment);
    const explain = (current: Formula, env: Env = environment) => explainFormula(current, interpretation, env);

    switch (formula.kind) {
        case "atom": {
            const tuple = formula.args.map((term) => termValue(term, interpretation, environment));
            return {
                formula: text,
                value: holds(formula, interpretation, environment),
                reason: { type: "atom", predicate: formula.predicate, tuple },
                children: [],
            };
        }
        case "not": {
            const inner = explain(formula.inner);
            return { formula: text, value: !inner.value, reason: { type: "not" }, children: [inner] };
        }
        case "and": {
            const left = explain(formula.left);
            if (!left.value) return { formula: text, value: false, reason: { type: "and", side: "left" }, children: [left] };
            const right = explain(formula.right);
            return right.value
                ? { formula: text, value: true, reason: { type: "and", side: "both" }, children: [left, right] }
                : { formula: text, value: false, reason: { type: "and", side: "right" }, children: [right] };
        }
        case "or": {
            const left = explain(formula.left);
            if (left.value) return { formula: text, value: true, reason: { type: "or", side: "left" }, children: [left] };
            const right = explain(formula.right);
            return right.value
                ? { formula: text, value: true, reason: { type: "or", side: "right" }, children: [right] }
                : { formula: text, value: false, reason: { type: "or", side: "both" }, children: [left, right] };
        }
        case "implies": {
            const left = explain(formula.left);
            if (!left.value) return { formula: text, value: true, reason: { type: "implies", side: "left" }, children: [left] };
            const right = explain(formula.right);
            return right.value
                ? { formula: text, value: true, reason: { type: "implies", side: "right" }, children: [right] }
                : { formula: text, value: false, reason: { type: "implies", side: "both" }, children: [left, right] };
        }
        case "forall":
        case "exists": {
            const isForall = formula.kind === "forall";
            // Un ∀ se decide con el primer elemento que lo falla y un ∃ con el primero que lo cumple.
            const decisive = interpretation.domain.find((value) =>
                holds(formula.inner, interpretation, bind(environment, formula.variable, value)) !== isForall);
            if (decisive === undefined) {
                return {
                    formula: text,
                    value: isForall,
                    reason: { type: "complete", quantifier: formula.kind, elements: interpretation.domain },
                    children: [],
                };
            }
            return {
                formula: text,
                value: !isForall,
                reason: {
                    type: isForall ? "counterexample" : "witness",
                    variable: formula.variable,
                    element: decisive,
                },
                children: [explain(formula.inner, bind(environment, formula.variable, decisive))],
            };
        }
    }
};
