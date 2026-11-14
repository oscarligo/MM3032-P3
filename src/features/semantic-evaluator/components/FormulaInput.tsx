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
        <div className={styles.slideWrapper}>
            <div className={styles.topBar}>
                <span>{LL.semanticEvaluator.example()}</span>
                {interpretationFormula && (
                    <button
                        className={styles.topBarEdit}
                        type="button"
                        onClick={() => setIsEditingInterpretation((value) => !value)}
                    >
                        {isEditingInterpretation ? LL.interpretation.done() : LL.interpretation.edit()}
                    </button>
                )}
            </div>
            
            <div className={styles.mainContent}>
                {interpretationFormula ? (
                    <InterpretationInput
                        formula={interpretationFormula}
                        isEditing={isEditingInterpretation}
                    />
                ) : <div className={styles.card}>
                    <label className={styles.label} htmlFor="formula-input">{LL.lexer.inputLabel()}</label>
                    <input 
                        ref={inputRef}
                        id="formula-input" 
                        className={styles.input} 
                        value={formula} 
                        onChange={(event) => setFormula(event.target.value)} 
                        spellCheck={false} 
                    />
                    <div className={styles.symbolKeyboard} role="group" aria-label="Símbolos de lógica de predicados">
                        {LOGIC_SYMBOLS.map((symbol) => (
                            <button
                                key={symbol}
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => insertSymbol(symbol)}
                                aria-label={`Insertar ${symbol}`}
                            >
                                {symbol}
                            </button>
                        ))}
                    </div>
                    {termSymbols.length > 0 && (
                        <fieldset className={styles.constantSelector}>
                            <legend>{LL.lexer.constantSelection()}</legend>
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
                </div>}
            </div>

            <div className={styles.bottomBar}>
                <img className={styles.footerIcon} src={icon} alt="" />
                <span className={styles.footerSeparator} aria-hidden="true" />
                <span>{LL.semanticEvaluator.title()}</span>
            </div>
        </div>
    );
}
