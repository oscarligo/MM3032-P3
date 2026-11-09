import Whiteboard from "./components/Whiteboard";
import Lexer from "./components/Lexer";
import FormulaInput from "./components/FormulaInput";
import ParseTree from "./components/ParseTree";
import { useParserVisualization } from "./hooks/useParserVisualization";
import { useI18nContext } from "../../i18n/i18n-react";
import styles from "./SemanticEvaluator.module.css";


export default function SemanticEvaluator() {
    const { LL } = useI18nContext();
    const parser = useParserVisualization();

    return (
        <div className={styles.boards}>
            <Whiteboard
                width="100%"
                height="24rem"
                minHeight="24rem"
                padding="var(--space-lg)"
                className={styles.procedureBoard}
                ariaLabel={LL.semanticEvaluator.leftBoard()}
            >
                <div className={styles.lexerArea}>
                    <Lexer />
                </div>
                <ParseTree mode="procedure" visualization={parser} />
            </Whiteboard>
            <Whiteboard
                width="100%"
                height="var(--whiteboard-min-height)"
                minHeight="var(--whiteboard-min-height)"
                ariaLabel={LL.semanticEvaluator.centerBoard()}
            >
                <FormulaInput />
            </Whiteboard>
            <Whiteboard
                width="100%"
                height="24rem"
                minHeight="24rem"
                padding="var(--space-lg)"
                className={styles.secondaryBoard}
                ariaLabel={LL.semanticEvaluator.rightBoard()}
            />
        </div>
    );
}
