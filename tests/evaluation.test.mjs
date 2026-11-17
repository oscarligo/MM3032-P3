import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";
import { createServer } from "vite";

const server = await createServer({ server: { middlewareMode: true, watch: null } });
let evaluation;
let parseFormula;
let buildTruthTrace;
try {
    evaluation = await server.ssrLoadModule(resolve("src", "features", "semantic-evaluator", "algorithms", "evaluation.ts"));
    ({ parseFormula } = await server.ssrLoadModule(resolve("src", "features", "semantic-evaluator", "algorithms", "parser.ts")));
    ({ buildTruthTrace } = await server.ssrLoadModule(resolve("src", "features", "semantic-evaluator", "algorithms", "truth.ts")));
} finally {
    await server.close();
}

const interpretation = {
    domain: ["0", "1"],
    constants: {},
    functions: {},
    predicates: { "P/1": { arity: 1, rows: [["0"]], truth: false } },
    environment: {},
};

test("quantifiers override existing assignments without mutating the caller's environment", () => {
    const environment = new Map([["x", "0"]]);
    assert.equal(evaluation.evaluateFormulaInEnvironment(parseFormula("∀x P(x)"), interpretation, environment), false);
    environment.set("x", "1");
    assert.equal(evaluation.evaluateFormulaInEnvironment(parseFormula("∃x P(x)"), interpretation, environment), true);
    assert.deepEqual([...environment], [["x", "1"]]);
});

test("nested quantifiers shadow and restore assignments for sibling subformulas", () => {
    assert.equal(evaluation.evaluateUnderInterpretation(parseFormula("∀x ∃x P(x)"), interpretation), true);
    assert.equal(evaluation.evaluateUnderInterpretation(parseFormula("∃x ∀x P(x)"), interpretation), false);
    const formula = parseFormula("P(x) ∧ ((∃x ¬P(x)) ∧ P(x))");
    assert.equal(evaluation.evaluateUnderInterpretation(formula, { ...interpretation, environment: { x: "0" } }), true);
    assert.equal(evaluation.evaluateUnderInterpretation(formula, { ...interpretation, environment: { x: "1" } }), false);
});

test("table cells and their traces evaluate concrete cases without quantifiers", () => {
    for (const source of ["∀x P(x)", "∃x P(x)", "∀x ∃x P(x)"]) {
        const formula = parseFormula(source);
        const map = evaluation.buildEvaluationMap(formula, interpretation);
        for (const [rowIndex, row] of map.results.entries()) {
            for (const [columnIndex, result] of row.entries()) {
                const expected = map.rowAssignments[rowIndex][0] === "0";
                assert.equal(result, expected, source);
                const trace = buildTruthTrace(
                    formula, interpretation,
                    map.rowVariables, map.rowAssignments[rowIndex],
                    map.columnVariables, map.columnAssignments[columnIndex], "V"
                );
                assert.equal(trace.steps.at(-1).result, result, source);
                assert.equal(trace.originalExpression, `P(${map.rowAssignments[rowIndex][0]})`);
                assert.equal(trace.steps.at(-1).expression, `P(${map.rowAssignments[rowIndex][0]})`);
                assert.doesNotMatch(trace.originalExpression, /[∀∃]/);
            }
        }
    }
});

test("truth traces break down constants and function applications", () => {
    const formula = parseFormula("P(f(a))", new Set(["a"]));
    const detailedInterpretation = {
        ...interpretation,
        constants: { a: "0" },
        functions: { "f/1": { arity: 1, rows: [{ args: ["0"], result: "1" }, { args: ["1"], result: "0" }] } },
    };
    const trace = buildTruthTrace(formula, detailedInterpretation, [], [], [], [], "V");

    assert.deepEqual(trace.steps.map(({ expression }) => expression), ["a = 0", "f(0) = 1", "P(1)"]);
});

test("unquantified traces still show atomic and connective steps", () => {
    const trace = buildTruthTrace(
        parseFormula("P(x) ∧ ¬P(y)"), interpretation,
        ["x"], ["0"], ["y"], ["1"], "V"
    );
    assert.deepEqual(trace.steps.map(({ result }) => result), [true, false, true, true]);
});

test("a parenthesized quantifier body does not absorb a following implication", () => {
    const formula = parseFormula("∀x (∃y (P(f(x,y))) → Q(a,y,b))", new Set(["a", "b"]));

    assert.equal(formula.kind, "forall");
    assert.equal(formula.inner.kind, "implies");
    assert.equal(formula.inner.left.kind, "exists");
    assert.equal(formula.inner.left.inner.kind, "atom");
    assert.equal(formula.inner.right.kind, "atom");
    assert.equal(formula.inner.right.predicate, "Q");
});

test("an unparenthesized quantifier binds only the following unary formula", () => {
    const formula = parseFormula("∀x (∃y P(f(x,y)) → ∃y Q(a,y,b))", new Set(["a", "b"]));

    assert.equal(formula.kind, "forall");
    assert.equal(formula.inner.kind, "implies");
    assert.equal(formula.inner.left.kind, "exists");
    assert.equal(formula.inner.left.inner.kind, "atom");
    assert.equal(formula.inner.right.kind, "exists");
    assert.equal(formula.inner.right.inner.kind, "atom");
});

test("a predicate symbol cannot be reused as a term", () => {
    assert.throws(
        () => parseFormula("P(f(P,y))"),
        (error) => error?.payload?.code === "FORMULA_IN_TERM_POSITION" && error.payload.token === "P"
    );
});
