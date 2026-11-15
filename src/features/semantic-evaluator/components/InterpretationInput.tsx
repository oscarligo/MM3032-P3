import { useEffect, useMemo, useState } from "react";
import { useI18nContext } from "../../../i18n/i18n-react";
import { useFormulaStore } from "../../../store/store_formula";
import { useInterpretationStore } from "../../../store/store_interpretation";
import {
    analyzeFormula,
    canAddPredicateTuple,
    cleanDomain,
    cleanPredicateRows,
    domainState,
    functionRowsForDomain,
    symbolLabel,
    updatePredicateTuple,
    type FunctionRow,
    type SymbolInfo,
} from "../algorithms/interpretation";
import type { Formula, InterpretationDefinition } from "../types";
import InterpretationCarousel from "./InterpretationCarousel";
import styles from "./InterpretationInput.module.css";

export default function InterpretationInput({ formula, isEditing, isConfirmed }: {
    formula: Formula;
    isEditing: boolean;
    isConfirmed: boolean;
}) {
    const { LL } = useI18nContext();
    const formulaText = useFormulaStore((state) => state.formula);
    const setInterpretationDefinition = useInterpretationStore((state) => state.setDefinition);

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

        setDomain(cleanDomain);
        setPredicateRows(cleanPredicateRows);
        setDuplicatePredicates({});
    }, [isEditing]);

    const { options, hasDuplicates: duplicateDomain } = domainState(domain);
    const domainSignature = options.join("\u0000");

    const interpretationDefinition = useMemo<InterpretationDefinition | undefined>(() => {
        const constantsComplete = symbols.constants.every((symbol) => options.includes(constants[symbol]));
        const functionsComplete = symbols.functions.every((fn) => {
            const rows = functionRows[fn.key] ?? [];
            return rows.length === options.length ** fn.arity
                && rows.every((row) => row.args.every((value) => options.includes(value)) && options.includes(row.result));
        });
        const predicatesComplete = symbols.predicates.every((predicate) =>
            !duplicatePredicates[predicate.key]
            && (predicateRows[predicate.key] ?? []).every((tuple) =>
                tuple.length === predicate.arity && tuple.every((value) => options.includes(value))
            )
        );
        const environmentComplete = symbols.freeVariables.every((variable) => options.includes(environment[variable]));

        if (options.length === 0 || duplicateDomain || !constantsComplete || !functionsComplete
            || !predicatesComplete || !environmentComplete) return undefined;

        return {
            domain: options,
            constants: Object.fromEntries(symbols.constants.map((symbol) => [symbol, constants[symbol]])),
            functions: Object.fromEntries(symbols.functions.map((fn) => [fn.key, {
                arity: fn.arity,
                rows: functionRows[fn.key] ?? [],
            }])),
            predicates: Object.fromEntries(symbols.predicates.map((predicate) => [predicate.key, {
                arity: predicate.arity,
                rows: predicateRows[predicate.key] ?? [],
                truth: predicateTruth[predicate.key] ?? false,
            }])),
            environment: Object.fromEntries(symbols.freeVariables.map((variable) => [variable, environment[variable]])),
        };
    }, [constants, domainSignature, duplicateDomain, duplicatePredicates, environment, functionRows, predicateRows, predicateTruth, symbols]);

    useEffect(
        () => setInterpretationDefinition(isConfirmed ? interpretationDefinition : undefined),
        [interpretationDefinition, isConfirmed, setInterpretationDefinition]
    );
    useEffect(() => () => setInterpretationDefinition(undefined), [setInterpretationDefinition]);

    useEffect(() => {
        setFunctionRows((current) => Object.fromEntries(symbols.functions.map((fn) => {
            const previousResults = new Map(
                (current[fn.key] ?? []).map((row) => [row.args.join("\u0000"), row.result])
            );
            const rows = functionRowsForDomain(options, fn.arity).map((row) => ({
                ...row,
                result: previousResults.get(row.args.join("\u0000")) ?? "",
            }));
            return [fn.key, rows];
        })));
    }, [domainSignature, symbols.functions]);

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
        const update = updatePredicateTuple(rows, rowIndex, valueIndex, nextValue);

        setDuplicatePredicates((values) => ({ ...values, [key]: update.duplicate }));
        if (update.duplicate) return;

        setPredicateRows((current) => ({
            ...current,
            [key]: update.rows,
        }));
    };

    const canAddPredicateRow = (key: string) => {
        const rows = predicateRows[key] ?? [];
        return canAddPredicateTuple(rows, options.length > 0);
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

            <div className={`${styles.interpretationLayout} ${symbols.functions.length > 0 ? styles.hasFunctions : ""} ${symbols.freeVariables.length > 0 ? styles.hasEnvironment : ""}`}>
                <InterpretationCarousel
                    className={styles.interpretationsPanel}
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
                    <span className={styles.constantSymbol}>
                        {constant}
                        <sup>ℐ</sup>
                    </span>
                    <span>≝</span>
                    {editableValue(
                        isEditing,
                        constants[constant] ?? "",
                        (value) => handleConstantChange(constant, value),
                        constant
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

                {symbols.functions.length > 0 && <InterpretationCarousel
                    className={styles.functionsPanel}
                    previousLabel={LL.procedure.previous()}
                    nextLabel={LL.procedure.next()}
                    pageSize={1}
                >
            {symbols.functions.map((fn) => (
                <div className={`${styles.mathLine} ${styles.functionDefinition}`} key={fn.key}>
                    <strong className={styles.functionSymbol}>
                        {symbolLabel(fn, symbols.functions)}
                        <sup>ℐ</sup>
                    </strong>
                    <span>:</span>
                    <strong>𝒟<sup>{fn.arity}</sup></strong>
                    <span>→</span>
                    <strong>𝒟</strong>
                    <span className={styles.functionDefinitionLabel}>definida por:</span>
                    <span className={styles.functionMappings}>
                        {(functionRows[fn.key] ?? []).map((row, rowIndex) => (
                            <span className={styles.functionApplication} key={row.args.join("\u0000")}>
                                {rowIndex === 0 && (
                                    <span className={styles.functionMapPrefix}>
                                        <strong className={styles.functionSymbol}>
                                            {symbolLabel(fn, symbols.functions)}<sup>ℐ</sup>
                                        </strong>
                                        <span>≝ {"{"}</span>
                                    </span>
                                )}
                                <span>({row.args.join(", ")}) ↦ [</span>
                                {editableValue(
                                    true,
                                    row.result,
                                    (value) => updateFunctionResult(fn.key, rowIndex, value),
                                    `${fn.name} ${LL.interpretation.result()}`
                                )}
                                <span>]{rowIndex < (functionRows[fn.key]?.length ?? 0) - 1 && ","}</span>
                                {rowIndex === (functionRows[fn.key]?.length ?? 0) - 1 && <span>{"}"}</span>}
                            </span>
                        ))}
                    </span>
                </div>
            ))}
                </InterpretationCarousel>}

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
