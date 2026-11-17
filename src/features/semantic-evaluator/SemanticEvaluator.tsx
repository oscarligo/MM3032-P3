import { useEffect, useRef, useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import Whiteboard from "./components/Whiteboard";
import Lexer from "./components/Lexer";
import FormulaInput from "./components/FormulaInput";
import ParseTree from "./components/ParseTree";
import Evaluation from "./components/Evaluation";
import ParticipantBadge from "./components/ParticipantBadge";
import { useParserVisualization } from "./hooks/useParserVisualization";
import { useI18nContext } from "../../i18n/i18n-react";
import CanvasControls from "../../components/layout/CanvasControls";
import styles from "./SemanticEvaluator.module.css";
import { createParticipantAudio } from "../../lib/participant-audio";


export default function SemanticEvaluator() {
    const { LL } = useI18nContext();
    const parser = useParserVisualization();
    const [showParticipant, setShowParticipant] = useState(false);
    const participantVisible = useRef(false);

    useEffect(() => {
        const sounds = createParticipantAudio();
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.defaultPrevented || event.repeat || event.isComposing
                || event.ctrlKey || event.altKey || event.metaKey
                || event.key.toLowerCase() !== "m") return;
            const target = event.target;
            if (target instanceof HTMLElement
                && (target.isContentEditable || target.closest("input, textarea, select, [role='textbox']"))) return;
            participantVisible.current = !participantVisible.current;
            setShowParticipant(participantVisible.current);
            sounds.play(participantVisible.current);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            sounds.stop();
        };
    }, []);

    return (
        <div className={styles.canvasShell}>
            <TransformWrapper
                initialScale={0.5}
                minScale={0.1}
                maxScale={1.5}
                centerOnInit
                limitToBounds={false}
                wheel={{ step: 0.005, excluded: ["nested-tree-canvas", "subtle-scrollbar"] }}
                panning={{ velocityDisabled: true, excluded: ["nested-tree-canvas", "subtle-scrollbar", "button", "summary", "input", "textarea", "select", "a"] }}
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
                            className={styles.centerBoard}
                        >
                            <FormulaInput
                                formula={parser.formula}
                                interpretationFormula={parser.isComplete ? parser.formula : undefined}
                            />
                            {showParticipant && <ParticipantBadge />}
                        </Whiteboard>
                        <Whiteboard
                            width="40rem"
                            height="33.0rem"
                            minHeight="33.0rem"
                            padding="var(--space-lg)"
                            className={styles.secondaryBoard}
                            ariaLabel={LL.semanticEvaluator.rightBoard()}
                        >
                            <Evaluation formula={parser.formula} />
                        </Whiteboard>
                    </div>
                </TransformComponent>
                <CanvasControls />
            </TransformWrapper>
        </div>
    );
}
