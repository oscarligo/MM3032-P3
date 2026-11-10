import { useEffect, useMemo, useState } from "react";
import { useI18nContext } from "../../../i18n/i18n-react";
import { useFormulaStore } from "../../../store/store_formula";
import type { Formula, Term } from "../types";
import InterpretationCarousel from "./InterpretationCarousel";
import styles from "./InterpretationInput.module.css";

type SymbolInfo = {
    key: string;
    name: string;
    arity: number;
};

type FunctionRow = {
    args: string[];
    result: string;
};

const subscript = (value: number) =>
    String(value).replace(/\d/g, (digit) => "₀₁₂₃₄₅₆₇₈₉"[Number(digit)]);

const symbolLabel = ({ name, arity }: SymbolInfo, symbols: SymbolInfo[]) =>
    symbols.filter((symbol) => symbol.name === name).length > 1
        ? `${name}${subscript(arity)}`
        : name;

function analyzeFormula(formula: Formula) {
    const constants = new Set<string>();
    const freeVariables = new Set<string>();
    const functions = new Map<string, SymbolInfo>();
    const predicates = new Map<string, SymbolInfo>();

    const visitTerm = (term: Term, bound: ReadonlySet<string>) => {
        if (term.kind === "const") {
            constants.add(term.name);
        }
        if (term.kind === "var" && !bound.has(term.name)) {
            freeVariables.add(term.name);
        }
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
        if (current.kind === "not") {
            return visit(current.inner, bound);
        }
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

export default function InterpretationInput({ formula, isEditing }: { formula: Formula; isEditing: boolean }) {
    const { LL } = useI18nContext();
    const formulaText = useFormulaStore((state) => state.formula);

    const [domain, setDomain] = useState(["0"]);
    const [constants, setConstants] = useState<Record<string, string>>({});
    const [environment, setEnvironment] = useState<Record<string, string>>({});
    const [functionRows, setFunctionRows] = useState<Record<string, FunctionRow[]>>({});
    const [predicateRows, setPredicateRows] = useState<Record<string, string[][]>>({});
    const [predicateTruth, setPredicateTruth] = useState<Record<string, boolean>>({});
    const [duplicatePredicates, setDuplicatePredicates] = useState<Record<string, boolean>>({});

    const symbols = useMemo(() => analyzeFormula(formula), [formula]);

    useEffect(() => {
        if (isEditing) return;

        setDomain((values) => {
            const completed = values.filter((value) => value.trim());
            return completed.length > 0 ? completed : [""];
        });
        setFunctionRows((rows) => Object.fromEntries(
            Object.entries(rows).map(([key, values]) => [
                key,
                values.filter((row) => row.args.every(Boolean) && Boolean(row.result)),
            ])
        ));
        setPredicateRows((rows) => Object.fromEntries(
            Object.entries(rows).map(([key, values]) => [
                key,
                values.filter((tuple) => tuple.every(Boolean)),
            ])
        ));
        setDuplicatePredicates({});
    }, [isEditing]);

    const domainValues = domain.map((value) => value.trim()).filter(Boolean);
    const duplicateDomain = new Set(domainValues).size !== domainValues.length;
    const options = [...new Set(domainValues)];

    const handleDomainChange = (index: number, nextValue: string) => {
        setDomain((values) =>
            values.map((item, itemIndex) => (itemIndex === index ? nextValue : item))
        );
    };

    const addDomainItem = () => setDomain((values) => [...values, ""]);
    const removeDomainItem = () => setDomain((values) => values.slice(0, -1));

    const handleConstantChange = (constant: string, nextValue: string) => {
        setConstants((current) => ({ ...current, [constant]: nextValue }));
    };

    const handleEnvironmentChange = (variable: string, nextValue: string) => {
        setEnvironment((current) => ({ ...current, [variable]: nextValue }));
    };

    const addFunctionRow = (fn: SymbolInfo) => {
        setFunctionRows((rows) => ({
            ...rows,
            [fn.key]: [...(rows[fn.key] ?? []), { args: Array(fn.arity).fill(""), result: "" }],
        }));
    };

    const removeFunctionRow = (key: string) => {
        setFunctionRows((rows) => ({
            ...rows,
            [key]: (rows[key] ?? []).slice(0, -1),
        }));
    };

    const updateFunctionArgument = (
        key: string,
        rowIndex: number,
        argumentIndex: number,
        nextValue: string
    ) => {
        setFunctionRows((current) => ({
            ...current,
            [key]: current[key].map((item, index) =>
                index === rowIndex
                    ? {
                            ...item,
                            args: item.args.map((arg, argIndex) =>
                                argIndex === argumentIndex ? nextValue : arg
                            ),
                        }
                    : item
            ),
        }));
    };

    const updateFunctionResult = (key: string, rowIndex: number, nextValue: string) => {
        setFunctionRows((current) => ({
            ...current,
            [key]: current[key].map((item, index) =>
                index === rowIndex ? { ...item, result: nextValue } : item
            ),
        }));
    };

    const addPredicateRow = (predicate: SymbolInfo) => {
        setDuplicatePredicates((current) => ({ ...current, [predicate.key]: false }));
        setPredicateRows((rows) => ({
            ...rows,
            [predicate.key]: [...(rows[predicate.key] ?? []), Array(predicate.arity).fill("")],
        }));
    };

    const removePredicateRow = (key: string) => {
        setDuplicatePredicates((current) => ({ ...current, [key]: false }));
        setPredicateRows((rows) => ({
            ...rows,
            [key]: (rows[key] ?? []).slice(0, -1),
        }));
    };

    const updatePredicateArgument = (
        key: string,
        rowIndex: number,
        valueIndex: number,
        nextValue: string
    ) => {
        const rows = predicateRows[key] ?? [];
        const candidate = rows[rowIndex].map((entry, entryIndex) =>
            entryIndex === valueIndex ? nextValue : entry
        );
        const duplicate = candidate.every(Boolean) && rows.some(
            (tuple, index) => index !== rowIndex && tuple.join("\u0000") === candidate.join("\u0000")
        );

        setDuplicatePredicates((values) => ({ ...values, [key]: duplicate }));
        if (duplicate) return;

        setPredicateRows((current) => ({
            ...current,
            [key]: current[key].map((item, index) => index === rowIndex ? candidate : item),
        }));
    };

    const canAddPredicateRow = (key: string) => {
        const rows = predicateRows[key] ?? [];
        return options.length > 0 && (rows.length === 0 || rows[rows.length - 1].every(Boolean));
    };

    const valueSelect = (value: string, onChange: (value: string) => void, label: string) => (
        <select
            required
            value={options.includes(value) ? value : ""}
            onChange={(event) => onChange(event.target.value)}
            aria-label={label}
        >
            <option value="">{LL.interpretation.selectValue()}</option>
            {options.map((option) => (
                <option key={option} value={option}>
                    {option}
                </option>
            ))}
        </select>
    );

    const editableValue = (
        editable: boolean,
        value: string,
        onChange: (value: string) => void,
        label: string
    ) =>
        editable && isEditing ? (
            valueSelect(value, onChange, label)
        ) : (
            <span className={styles.plainValue}>{value || "—"}</span>
        );

    const actionButtons = (
        add: () => void,
        remove: () => void,
        canAdd = true,
        canRemove = true
    ) => isEditing ? (
        <span className={styles.actions}>
            <button className={styles.add} type="button" disabled={!canAdd} onClick={add}>
                +
            </button>
            <button className={styles.remove} type="button" disabled={!canRemove} onClick={remove}>
                −
            </button>
        </span>
    ) : null;

    return (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <p className={styles.intro}>{LL.interpretation.exampleIntro()}</p>
            </div>

            <div
                className={`${styles.interpretationLayout} ${
                    symbols.freeVariables.length > 0 ? styles.withEnvironment : ""
                }`}
            >
                <InterpretationCarousel
                    previousLabel={LL.procedure.previous()}
                    nextLabel={LL.procedure.next()}
                >
            <div>
            <div className={styles.mathLine}>
                <strong>𝒟</strong>
                <span>≝</span>
                <span className={styles.inlineValues}>
                    <span>{"{"}</span>
                    {domain.map((value, index) => (
                        <span key={index}>
                            {isEditing && index === domain.length - 1 ? (
                                <input
                                    value={value}
                                    onChange={(event) => handleDomainChange(index, event.target.value)}
                                    aria-label={`${LL.interpretation.domain()} ${index + 1}`}
                                />
                            ) : (
                                <span className={styles.plainValue}>{value || "—"}</span>
                            )}
                            {index < domain.length - 1 && ","}
                        </span>
                    ))}
                    <span>{"}"}</span>
                </span>
                {actionButtons(addDomainItem, removeDomainItem, true, domain.length > 1)}
            </div>

            {options.length === 0 && (
                <p className={styles.error}>{LL.interpretation.emptyDomain()}</p>
            )}
            {duplicateDomain && (
                <p className={styles.error}>{LL.interpretation.duplicateDomain()}</p>
            )}
            </div>

            {symbols.constants.map((constant) => (
                <div className={styles.mathLine} key={constant}>
                    <strong>
                        {constant}
                        <sup>ℐ</sup>
                    </strong>
                    <span>≝</span>
                    {editableValue(
                        isEditing,
                        constants[constant] ?? "",
                        (value) => handleConstantChange(constant, value),
                        constant
                    )}
                </div>
            ))}

            {symbols.functions.map((fn) => (
                <div className={styles.mathLine} key={fn.key}>
                        {symbolLabel(fn, symbols.functions)}
                        <sup>ℐ</sup>
                    <span>≝</span>
                    <span className={styles.inlineValues}>
                        <span>{"{"}</span>
                        {(functionRows[fn.key] ?? []).map((row, rowIndex, rows) => (
                            <span className={styles.tuple} key={rowIndex}>
                                ({" "}
                                {row.args.map((argument, argumentIndex) => (
                                    <span key={argumentIndex}>
                                        {editableValue(
                                            rowIndex === rows.length - 1,
                                            argument,
                                            (value) =>
                                                updateFunctionArgument(
                                                    fn.key,
                                                    rowIndex,
                                                    argumentIndex,
                                                    value
                                                ),
                                            `${fn.name} ${LL.interpretation.argument()} ${argumentIndex + 1}`
                                        )}
                                        {argumentIndex < row.args.length - 1 && ","}
                                    </span>
                                ))}{" "}
                                ) →{" "}
                                {editableValue(
                                    rowIndex === rows.length - 1,
                                    row.result,
                                    (value) => updateFunctionResult(fn.key, rowIndex, value),
                                    `${fn.name} ${LL.interpretation.result()}`
                                )}
                                {rowIndex < rows.length - 1 && ","}
                            </span>
                        ))}
                        <span>{"}"}</span>
                    </span>
                    {actionButtons(
                        () => addFunctionRow(fn),
                        () => removeFunctionRow(fn.key),
                        options.length > 0,
                        (functionRows[fn.key]?.length ?? 0) > 0
                    )}
                </div>
            ))}

            {symbols.predicates.map((predicate) => (
                <div className={styles.predicateItem} key={predicate.key}>
                <div className={`${styles.mathLine} ${styles.predicateLine}`}>
                    <strong className={styles.predicateSymbol}>
                        {predicate.name}
                        {symbols.predicates.filter((symbol) => symbol.name === predicate.name).length > 1 && (
                            <sub>{predicate.arity}</sub>
                        )}
                        <sup>ℐ</sup>
                    </strong>
                    <span>≝</span>
                    {predicate.arity === 0 ? (
                        <label className={styles.booleanRow}>
                            {isEditing ? <input type="checkbox" checked={predicateTruth[predicate.key] ?? false} onChange={(event) => setPredicateTruth((values) => ({ ...values, [predicate.key]: event.target.checked }))} /> : null}
                            {(predicateTruth[predicate.key] ?? false) ? LL.interpretation.trueValue() : LL.interpretation.falseValue()}
                        </label>
                    ) : (
                        <>
                            <span className={styles.inlineValues}>
                                <span>{"{"}</span>
                                {(predicateRows[predicate.key] ?? []).map(
                                    (tuple, rowIndex, rows) => (
                                        <span className={styles.tuple} key={rowIndex}>
                                            {predicate.arity > 1 && <>({" "}</>}
                                            {tuple.map((value, valueIndex) => (
                                                <span key={valueIndex}>
                                                    {editableValue(
                                                        rowIndex === rows.length - 1,
                                                        value,
                                                        (next) =>
                                                            updatePredicateArgument(
                                                                predicate.key,
                                                                rowIndex,
                                                                valueIndex,
                                                                next
                                                            ),
                                                        `${predicate.name} ${LL.interpretation.argument()} ${valueIndex + 1}`
                                                    )}
                                                    {valueIndex < tuple.length - 1 && ","}
                                                </span>
                                            ))}
                                            {predicate.arity > 1 && <>{" "})</>}
                                            {rowIndex < rows.length - 1 && ","}
                                        </span>
                                    )
                                )}
                                <span>{"}"}</span>
                            </span>
                            {actionButtons(
                                () => addPredicateRow(predicate),
                                () => removePredicateRow(predicate.key),
                                canAddPredicateRow(predicate.key),
                                (predicateRows[predicate.key]?.length ?? 0) > 0
                            )}
                        </>
                    )}
                </div>
                {duplicatePredicates[predicate.key] && (
                    <p className={styles.error}>{LL.interpretation.duplicatePredicate()}</p>
                )}
                </div>
            ))}
                </InterpretationCarousel>

                {symbols.freeVariables.length > 0 && (
                    <aside className={styles.environmentPanel}>
                        <span className={styles.environmentSymbol}>
                            ℓ:
                        </span>
                        <div className={styles.environmentList}>
                            {symbols.freeVariables.map((variable) => (
                                <span className={styles.environmentEntry} key={variable}>
                                    <strong>{variable}</strong>
                                    <span>↦</span>
                                    {editableValue(
                                        isEditing,
                                        environment[variable] ?? "-",
                                        (value) => handleEnvironmentChange(variable, value),
                                        variable
                                    )}
                                </span>
                            ))}
                        </div>
                    </aside>
                )}
            </div>

            <p className={styles.question}>
                a){"  "}
                {LL.interpretation.determine()} <span className={styles.formula}>{formulaText}</span>{" "}
                {LL.interpretation.inInterpretation()}
                {symbols.freeVariables.length > 0 ? (
                    <> {LL.interpretation.underEnvironment()}</>
                ) : (
                    "."
                )}
            </p>
        </div>
    );
}
