import { useControls, useTransformComponent } from "react-zoom-pan-pinch";
import styles from "./CanvasControls.module.css";

export default function CanvasControls() {
    const { setTransform, centerView, zoomIn, zoomOut } = useControls();
    const state = useTransformComponent(({ state }) => state);
    const move = (x: number, y: number) =>
        setTransform(state.positionX + x, state.positionY + y, state.scale, 0);
    const center = () => centerView(0.5, 0);

    return (
        <div className={styles.controls} aria-label="Controles del lienzo">
            <div className={styles.panel}>
                <button type="button" onClick={() => zoomOut(0.1, 0)} disabled={state.scale <= 0.5} aria-label="Alejar">−</button>
                <output aria-label="Nivel de zoom">{Math.round(state.scale * 100)}%</output>
                <button type="button" onClick={() => zoomIn(0.1, 0)} disabled={state.scale >= 1.5} aria-label="Acercar">+</button>
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
