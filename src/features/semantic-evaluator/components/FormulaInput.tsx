import { useRef, useState } from "react";
import { useI18nContext } from "../../../i18n/i18n-react";
import { useFormulaStore } from "../../../store/store_formula";
import type { Formula } from "../types";
import { analyzeFormula } from "../algorithms/interpretation";
import InterpretationInput from "./InterpretationInput";
import icon from "../../../assets/icon.svg";
import styles from "./FormulaInput.module.css";

const LOGIC_SYMBOLS = ["∀", "∃", "¬", "∧", "∨", "→", "(", ")", ","];

export default function FormulaInput({ formula: parsedFormula, interpretationFormula }: { formula?: Formula; interpretationFormula?: Formula }) {
    const { LL } = useI18nContext();
    const formula = useFormulaStore((state) => state.formula);
    const setFormula = useFormulaStore((state) => state.setFormula);
    const constantSymbols = useFormulaStore((state) => state.constantSymbols);
    const toggleConstantSymbol = useFormulaStore((state) => state.toggleConstantSymbol);
    const [isEditingInterpretation, setIsEditingInterpretation] = useState(false);
    const [isInterpretationConfirmed, setIsInterpretationConfirmed] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const termSymbols = parsedFormula
        ? [...analyzeFormula(parsedFormula).freeVariables, ...analyzeFormula(parsedFormula).constants].sort()
        : [];
    const insertSymbol = (symbol: string) => {
        const input = inputRef.current;
        const start = input?.selectionStart ?? formula.length;
        const end = input?.selectionEnd ?? start;
        setFormula(`${formula.slice(0, start)}${symbol}${formula.slice(end)}`);
        window.requestAnimationFrame(() => {
            input?.focus();
            input?.setSelectionRange(start + symbol.length, start + symbol.length);
        });
    };

    return (
        <div className={`${styles.slideWrapper} ${!interpretationFormula ? styles.inputSlide : ""}`}>
            {interpretationFormula && (
                <div className={styles.topBar}>
                    <span>{LL.semanticEvaluator.example()}</span>
                    <button
                        className={styles.topBarEdit}
                        type="button"
                        onClick={() => {
                            setIsInterpretationConfirmed(isEditingInterpretation);
                            setIsEditingInterpretation(!isEditingInterpretation);
                        }}
                    >
                        {isEditingInterpretation ? LL.interpretation.done() : LL.interpretation.edit()}
                    </button>
                </div>
            )}
            
            <div className={styles.mainContent}>
                {interpretationFormula ? (
                    <InterpretationInput
                        formula={interpretationFormula}
                        isEditing={isEditingInterpretation}
                        isConfirmed={isInterpretationConfirmed}
                    />
                ) : <section className={styles.objective}>
                    <h1>{LL.semanticEvaluator.objective()}</h1>
                    <div className={styles.cardsRow}>
                        <div className={styles.card}>
                            <label className={styles.label} htmlFor="formula-input">{LL.semanticEvaluator.objectiveAnalyze()}</label>
                            <input
                                ref={inputRef}
                                id="formula-input"
                                className={styles.input}
                                value={formula}
                                onChange={(event) => setFormula(event.target.value)}
                                spellCheck={false}
                            />
                            <p className={styles.objectiveText}>{LL.semanticEvaluator.objectiveResult()}</p>
                        </div>
                        <div className={styles.toolsPanel}>
                            <div className={styles.symbolKeyboard} role="group" aria-label={LL.semanticEvaluator.logicKeyboard()}>
                                {LOGIC_SYMBOLS.map((symbol) => (
                                    <button
                                        key={symbol}
                                        type="button"
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={() => insertSymbol(symbol)}
                                        aria-label={LL.semanticEvaluator.insertSymbol({ symbol })}
                                    >
                                        {symbol}
                                    </button>
                                ))}
                            </div>
                            {termSymbols.length > 0 && (
                                <fieldset className={styles.constantSelector} aria-label={LL.lexer.constantSelection()}>
                                    <span className={styles.constantTitle}>{LL.lexer.constantSelection()}</span>
                                    {termSymbols.map((symbol) => (
                                        <label key={symbol}>
                                            <input
                                                type="checkbox"
                                                checked={constantSymbols.includes(symbol)}
                                                onChange={() => toggleConstantSymbol(symbol)}
                                            />
                                            <span>{symbol}</span>
                                        </label>
                                    ))}
                                </fieldset>
                            )}
                        </div>
                    </div>
                </section>}
            </div>

            <div className={styles.bottomBar}>
                <img className={styles.footerIcon} src={icon} alt="" />
                <span className={styles.footerSeparator} aria-hidden="true" />
                <span>{LL.semanticEvaluator.title()}</span>
            </div>
        </div>
    );
}
