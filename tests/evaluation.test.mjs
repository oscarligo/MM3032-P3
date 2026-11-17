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
    for (const source of ["∀x P(x)", "∃x P(x)"]) {
        const formula = parseFormula(source);
        const map = evaluation.buildEvaluationMap(formula, interpretation);
        for (const [rowIndex, row] of map.results.entries()) {
            for (const [columnIndex, result] of row.entries()) {
                const expected = map.rowAssignments[rowIndex][0] === "0";
                assert.equal(result, expected, source);
                const trace = buildTruthTrace(
                    map.caseFormula, interpretation,
                    map.rowVariables, map.rowAssignments[rowIndex],
                    map.columnVariables, map.columnAssignments[columnIndex], "V", map.variableLabels
                );
                assert.equal(trace.steps.at(-1).result, result, source);
                assert.equal(trace.originalExpression, `P(${map.rowAssignments[rowIndex][0]})`);
                assert.equal(trace.steps.at(-1).expression, `P(${map.rowAssignments[rowIndex][0]})`);
                assert.doesNotMatch(trace.originalExpression, /[∀∃]/);
            }
        }
    }
});

test("table keeps shadowed and free variable bindings independent", () => {
    const shadowedFormula = parseFormula("∀x ∃x P(x)");
    const shadowedMap = evaluation.buildEvaluationMap(shadowedFormula, interpretation);

    assert.deepEqual(shadowedMap.variables.map((variable) => shadowedMap.variableLabels.get(variable)), ["x₁", "x₂"]);
    assert.deepEqual(shadowedMap.results, [[true, false], [true, false]]);
    assert.deepEqual(
        [...evaluation.selectConclusionCells(shadowedMap, interpretation, true)],
        ["0:0", "1:0"]
    );
    const shadowedTrace = buildTruthTrace(
        shadowedMap.caseFormula, interpretation,
        shadowedMap.rowVariables, shadowedMap.rowAssignments[1],
        shadowedMap.columnVariables, shadowedMap.columnAssignments[0],
        "V", shadowedMap.variableLabels
    );
    assert.deepEqual(shadowedTrace.assignment, [
        { variable: "x₁", value: "1" },
        { variable: "x₂", value: "0" },
    ]);
    assert.equal(shadowedTrace.originalExpression, "P(0)");

    const mixedFormula = parseFormula("P(x) ∧ ∀x Q(x)");
    const mixedInterpretation = {
        ...interpretation,
        predicates: {
            "P/1": { arity: 1, rows: [["0"]], truth: false },
            "Q/1": { arity: 1, rows: [["0"]], truth: false },
        },
        environment: { x: "0" },
    };
    const mixedMap = evaluation.buildEvaluationMap(mixedFormula, mixedInterpretation);

    assert.deepEqual(mixedMap.variables.map((variable) => mixedMap.variableLabels.get(variable)), ["x₁", "x₂"]);
    assert.deepEqual(mixedMap.results, [[true, false], [false, false]]);
    assert.deepEqual(
        [...evaluation.selectConclusionCells(mixedMap, mixedInterpretation, false)],
        ["0:1"]
    );
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

test("conclusion evidence can mark complete stripes or one witness per stripe", () => {
    const formula = parseFormula("∀x ∃y P(x,y)");
    const falseInterpretation = {
        ...interpretation,
        predicates: { "P/2": { arity: 2, rows: [["1", "0"]], truth: false } },
    };
    const falseMap = evaluation.buildEvaluationMap(formula, falseInterpretation);
    assert.deepEqual(
        [...evaluation.selectConclusionCells(falseMap, falseInterpretation, false)],
        ["0:0", "0:1"]
    );

    const trueInterpretation = {
        ...falseInterpretation,
        predicates: { "P/2": { arity: 2, rows: [["0", "0"], ["1", "1"]], truth: false } },
    };
    const trueMap = evaluation.buildEvaluationMap(formula, trueInterpretation);
    assert.deepEqual(
        [...evaluation.selectConclusionCells(trueMap, trueInterpretation, true)],
        ["0:0", "1:1"]
    );

    const implication = parseFormula("∀x (P(x) → ∃y Q(x,y))");
    const implicationInterpretation = {
        domain: ["1", "0", "2"],
        constants: {},
        functions: {},
        predicates: {
            "P/1": { arity: 1, rows: [["0"]], truth: false },
            "Q/2": { arity: 2, rows: [["1", "1"]], truth: false },
        },
        environment: {},
    };
    const implicationMap = evaluation.buildEvaluationMap(implication, implicationInterpretation);
    assert.deepEqual(
        [...evaluation.selectConclusionCells(implicationMap, implicationInterpretation, false)],
        ["1:0", "1:1", "1:2"]
    );
});

test("conclusion evidence never leaves the free-variable environment", () => {
    const formula = parseFormula("∀x (P(x, f(a, b)) → ∃y Q(x, y, z))", new Set(["b"]));
    const domain = ["2", "1", "3"];
    const constrainedInterpretation = {
        domain,
        constants: { b: "1" },
        functions: {
            "f/2": {
                arity: 2,
                rows: domain.flatMap((left) => domain.map((right) => ({ args: [left, right], result: "1" }))),
            },
        },
        predicates: {
            "P/2": { arity: 2, rows: domain.map((x) => [x, "1"]), truth: false },
            "Q/3": { arity: 3, rows: domain.map((x) => [x, "1", "1"]), truth: false },
        },
        environment: { a: "1", z: "1" },
    };
    const map = evaluation.buildEvaluationMap(formula, constrainedInterpretation);
    const selected = evaluation.selectConclusionCells(map, constrainedInterpretation, true);

    assert.equal(evaluation.evaluateUnderInterpretation(formula, constrainedInterpretation), true);
    assert.equal(selected.size, domain.length);
    for (const id of selected) {
        const [rowIndex, columnIndex] = id.split(":").map(Number);
        const assignment = Object.fromEntries([
            ...map.rowVariables.map((variable, index) => [map.variableLabels.get(variable), map.rowAssignments[rowIndex][index]]),
            ...map.columnVariables.map((variable, index) => [map.variableLabels.get(variable), map.columnAssignments[columnIndex][index]]),
        ]);
        assert.equal(assignment.a, "1");
        assert.equal(assignment.y, "1");
        assert.equal(assignment.z, "1");
    }
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
        (error) => error?.payload?.code === "SYMBOL_ROLE_CONFLICT" && error.payload.symbol === "P"
    );
});

test("a symbol cannot change syntactic role regardless of occurrence order", () => {
    for (const [source, constants = []] of [
        ["R(P) ∧ P(x)"],
        ["P(f(x)) ∧ f(x)"],
        ["f(x) ∧ P(f(x))"],
        ["P(x) ∧ ∀P Q(x)"],
        ["P(a) ∧ ∀a Q(a)", ["a"]],
    ]) {
        assert.throws(
            () => parseFormula(source, new Set(constants)),
            (error) => error?.payload?.code === "SYMBOL_ROLE_CONFLICT",
            source
        );
    }

    assert.doesNotThrow(() => parseFormula("P(x) ∧ P(x,y)"));
});
