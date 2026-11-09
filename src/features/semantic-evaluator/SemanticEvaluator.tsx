import { useRef, useState, type PointerEvent, type WheelEvent } from "react";
import Whiteboard from "./components/Whiteboard";
import Lexer from "./components/Lexer";
import FormulaInput from "./components/FormulaInput";
import ParseTree from "./components/ParseTree";
import { useParserVisualization } from "./hooks/useParserVisualization";
import { useI18nContext } from "../../i18n/i18n-react";
import { useCanvasStore } from "../../store/store_canvas";
import styles from "./SemanticEvaluator.module.css";


export default function SemanticEvaluator() {
    const { LL } = useI18nContext();
    const parser = useParserVisualization();
    const zoom = useCanvasStore((state) => state.zoom);
    const position = useCanvasStore((state) => state.position);
    const changeZoom = useCanvasStore((state) => state.changeZoom);
    const move = useCanvasStore((state) => state.move);
    const [isDragging, setIsDragging] = useState(false);
    const dragPoint = useRef<{ x: number; y: number } | null>(null);

    const isInteractive = (target: EventTarget) =>
        (target as HTMLElement).closest("button, input, textarea, select, a, [contenteditable='true']");
    const startDrag = (event: PointerEvent<HTMLDivElement>) => {
        if (event.button !== 0 || isInteractive(event.target)) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        dragPoint.current = { x: event.clientX, y: event.clientY };
        setIsDragging(true);
    };
    const drag = (event: PointerEvent<HTMLDivElement>) => {
        if (!dragPoint.current) return;
        move(
            event.clientX - dragPoint.current.x,
            event.clientY - dragPoint.current.y,
        );
        dragPoint.current = { x: event.clientX, y: event.clientY };
    };
    const stopDrag = (event: PointerEvent<HTMLDivElement>) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        dragPoint.current = null;
        setIsDragging(false);
    };
    const navigateWithWheel = (event: WheelEvent<HTMLDivElement>) => {
        if (isInteractive(event.target)) return;
        event.preventDefault();
        if (event.ctrlKey || event.metaKey) {
            changeZoom(event.deltaY > 0 ? -0.1 : 0.1);
            return;
        }
        move(-event.deltaX, -event.deltaY);
    };

    return (
        <div className={styles.canvasShell}>
            <div
                id="canvas-viewport"
                className={`${styles.canvasViewport} ${isDragging ? styles.dragging : ""}`}
                aria-label="Lienzo de pizarras: arrastra para navegar"
                onPointerDown={startDrag}
                onPointerMove={drag}
                onPointerUp={stopDrag}
                onPointerCancel={stopDrag}
                onWheel={navigateWithWheel}
            >
                <div
                    id="canvas-scene"
                    className={styles.canvasScene}
                    style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})` }}
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
                </div>
            </div>
        </div>
    );
}
