import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import Whiteboard from "./components/Whiteboard";
import Lexer from "./components/Lexer";
import FormulaInput from "./components/FormulaInput";
import ParseTree from "./components/ParseTree";
import { useParserVisualization } from "./hooks/useParserVisualization";
import { useI18nContext } from "../../i18n/i18n-react";
import CanvasControls from "../../components/layout/CanvasControls";
import styles from "./SemanticEvaluator.module.css";


export default function SemanticEvaluator() {
    const { LL } = useI18nContext();
    const parser = useParserVisualization();

    return (
        <div className={styles.canvasShell}>
            <TransformWrapper
                initialScale={0.5}
                minScale={0.5}
                maxScale={1.5}
                centerOnInit
                limitToBounds={false}
                wheel={{ step: 0.005, excluded: ["nested-tree-canvas"] }}
                panning={{ velocityDisabled: true, excluded: ["nested-tree-canvas", "button", "input", "textarea", "select", "a"] }}
                doubleClick={{ disabled: true }}
                onInit={({ centerView }) => {
                    window.requestAnimationFrame(() => window.requestAnimationFrame(() => centerView(0.5, 0)));
                }}
            >
                <TransformComponent
                    wrapperClass={styles.canvasViewport}
                    contentClass={styles.canvasScene}
                    wrapperStyle={{ width: "100%", height: "100%" }}
                    wrapperProps={{ id: "canvas-viewport", "aria-label": "Lienzo de pizarras: arrastra para navegar" }}
                >
                    <div className={styles.boards}>
                    <Whiteboard
                        width="40rem"
                        height="33.0rem"
                        minHeight="33.0rem"
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
                        id="canvas-center-board"
                        width="55rem"
                        height="38rem"
                        minHeight="38rem"
                        ariaLabel={LL.semanticEvaluator.centerBoard()}
                    >
                        <FormulaInput />
                    </Whiteboard>
                    <Whiteboard
                        width="40rem"
                        height="33.0rem"
                        minHeight="33.0rem"
                        padding="var(--space-lg)"
                        className={styles.secondaryBoard}
                        ariaLabel={LL.semanticEvaluator.rightBoard()}
                    />
                    </div>
                </TransformComponent>
                <CanvasControls />
            </TransformWrapper>
        </div>
    );
}
