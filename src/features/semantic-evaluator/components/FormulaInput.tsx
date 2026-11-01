import { useI18nContext } from "../../../i18n/i18n-react";
import { useFormulaStore } from "../../../store/store_formula";
import styles from "./FormulaInput.module.css";

export default function FormulaInput() {
    const { LL } = useI18nContext();
    const formula = useFormulaStore((state) => state.formula);
    const setFormula = useFormulaStore((state) => state.setFormula);

    return (
        <div className={styles.container}>
            <label className={styles.label} htmlFor="formula-input">{LL.lexer.inputLabel()}</label>
            <input id="formula-input" className={styles.input} value={formula} onChange={(event) => setFormula(event.target.value)} spellCheck={false} />
            <small className={styles.hint}>{LL.lexer.inputHint()}</small>
        </div>
    );
}
