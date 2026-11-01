import Whiteboard from "./components/Whiteboard";
import Lexer from "./components/Lexer";
import FormulaInput from "./components/FormulaInput";
import { useI18nContext } from "../../i18n/i18n-react";
import styles from "./SemanticEvaluator.module.css";


export default function SemanticEvaluator() {
    const { LL } = useI18nContext();

    return (
        <div className={styles.boards}>
            <Whiteboard
                width="100%"
                minHeight="22rem"
                padding="var(--space-lg)"
                ariaLabel={LL.semanticEvaluator.leftBoard()}
            >
                <Lexer />
            </Whiteboard>
            <Whiteboard
                width="100%"
                minHeight="var(--whiteboard-min-height)"
                ariaLabel={LL.semanticEvaluator.centerBoard()}
            >
                <FormulaInput />
            </Whiteboard>
            <Whiteboard
                width="100%"
                minHeight="22rem"
                padding="var(--space-lg)"
                ariaLabel={LL.semanticEvaluator.rightBoard()}
            />
        </div>
    );
}
