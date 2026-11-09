import { useControls, useTransformComponent } from "react-zoom-pan-pinch";
import styles from "./ParseTree.module.css";

export default function TreeCanvasControls() {
    const { setTransform, centerView, zoomIn, zoomOut } = useControls();
    const state = useTransformComponent(({ state }) => state);
    const move = (x: number, y: number) =>
        setTransform(state.positionX + x, state.positionY + y, state.scale, 0);

    return (
        <div className={styles.treeControls} aria-label="Controles del árbol sintáctico">
            <div className={styles.treeNavigation}>
                <button className={styles.treeUp} type="button" onClick={() => move(0, 35)} aria-label="Mover árbol arriba">↑</button>
                <button className={styles.treeLeft} type="button" onClick={() => move(35, 0)} aria-label="Mover árbol a la izquierda">←</button>
                <button className={styles.treeCenter} type="button" onClick={() => centerView(0.5, 0)} aria-label="Centrar árbol">◎</button>
                <button className={styles.treeRight} type="button" onClick={() => move(-35, 0)} aria-label="Mover árbol a la derecha">→</button>
                <button className={styles.treeDown} type="button" onClick={() => move(0, -35)} aria-label="Mover árbol abajo">↓</button>
            </div>
            <div className={styles.treeZoom}>
                <button type="button" onClick={() => zoomOut(0.1, 0)} disabled={state.scale <= 0.5} aria-label="Alejar árbol">−</button>
                <span>{Math.round(state.scale * 100)}%</span>
                <button type="button" onClick={() => zoomIn(0.1, 0)} disabled={state.scale >= 1.8} aria-label="Acercar árbol">+</button>
            </div>
        </div>
    );
}
