import { useI18nContext } from "../../../i18n/i18n-react";
import { useFormulaStore } from "../../../store/store_formula";
import icon from "../../../assets/icon.svg";
import styles from "./FormulaInput.module.css";

export default function FormulaInput() {
    const { LL } = useI18nContext();
    const formula = useFormulaStore((state) => state.formula);
    const setFormula = useFormulaStore((state) => state.setFormula);

    return (
        <div className={styles.slideWrapper}>
            <div className={styles.topBar}>
                <span>Ejemplo</span>
            </div>
            
            <div className={styles.mainContent}>
                <div className={styles.card}>
                    <label className={styles.label} htmlFor="formula-input">{LL.lexer.inputLabel()}</label>
                    <input 
                        id="formula-input" 
                        className={styles.input} 
                        value={formula} 
                        onChange={(event) => setFormula(event.target.value)} 
                        spellCheck={false} 
                    />
                </div>
            </div>

            <div className={styles.bottomBar}>
                <img className={styles.footerIcon} src={icon} alt="" />
                <span className={styles.footerSeparator} aria-hidden="true" />
                <span>Evaluador semántico</span>
            </div>
        </div>
    );
}
