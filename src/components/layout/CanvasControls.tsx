import styles from "./CanvasControls.module.css";
import { useCanvasStore } from "../../store/store_canvas";

export default function CanvasControls() {
    const zoom = useCanvasStore((state) => state.zoom);
    const changeZoom = useCanvasStore((state) => state.changeZoom);
    const move = useCanvasStore((state) => state.move);
    const reset = useCanvasStore((state) => state.reset);
    const center = () => {
        reset();
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                const viewport = document.getElementById("canvas-viewport");
                const board = document.getElementById("canvas-center-board");
                if (!viewport || !board) return;

                const viewportRect = viewport.getBoundingClientRect();
                const boardRect = board.getBoundingClientRect();
                move(
                    viewportRect.left + viewportRect.width / 2 - boardRect.left - boardRect.width / 2,
                    viewportRect.top + viewportRect.height / 2 - boardRect.top - boardRect.height / 2,
                );
            });
        });
    };

    return (
        <div className={styles.controls} aria-label="Controles del lienzo">
            <div className={styles.panel}>
                <button type="button" onClick={() => changeZoom(-0.1)} disabled={zoom <= 0.5} aria-label="Alejar">−</button>
                <output aria-label="Nivel de zoom">{Math.round(zoom * 100)}%</output>
                <button type="button" onClick={() => changeZoom(0.1)} disabled={zoom >= 1.5} aria-label="Acercar">+</button>
            </div>
            <div className={`${styles.panel} ${styles.navigation}`} aria-label="Navegar por el lienzo">
                <button type="button" className={styles.up} onClick={() => move(0, 100)} aria-label="Mover arriba">↑</button>
                <button type="button" className={styles.left} onClick={() => move(100, 0)} aria-label="Mover a la izquierda">←</button>
                <button type="button" className={styles.center} onClick={center} aria-label="Centrar" title="Centrar">◎</button>
                <button type="button" className={styles.right} onClick={() => move(-100, 0)} aria-label="Mover a la derecha">→</button>
                <button type="button" className={styles.down} onClick={() => move(0, -100)} aria-label="Mover abajo">↓</button>
            </div>
        </div>
    );
}
