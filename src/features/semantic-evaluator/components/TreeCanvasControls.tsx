import { useControls, useTransformComponent } from "react-zoom-pan-pinch";
import styles from "./ParseTree.module.css";

export default function TreeCanvasControls() {
    const { instance, setTransform, centerView, zoomIn, zoomOut } = useControls();
    const scale = useTransformComponent(({ state }) => state.scale);
    const move = (x: number, y: number) =>
        setTransform(instance.state.positionX + x, instance.state.positionY + y, instance.state.scale, 0);
    const fitTree = () => {
        const wrapper = instance.wrapperComponent;
        const content = instance.contentComponent;
        if (!wrapper || !content) return;
        const scale = Math.min(2,
            wrapper.clientWidth / content.offsetWidth,
            wrapper.clientHeight / content.offsetHeight,
        ) * 0.9;
        centerView(scale, 250, "easeOut");
    };

    return (
        <div className={styles.treeControls} aria-label="Controles del árbol sintáctico">
            <div className={styles.treeNavigation}>
                <button className={styles.treeUp} type="button" onClick={() => move(0, 35)} aria-label="Mover árbol arriba">↑</button>
                <button className={styles.treeLeft} type="button" onClick={() => move(35, 0)} aria-label="Mover árbol a la izquierda">←</button>
                <button className={styles.treeCenter} type="button" onClick={fitTree} aria-label="Centrar árbol">◎</button>
                <button className={styles.treeRight} type="button" onClick={() => move(-35, 0)} aria-label="Mover árbol a la derecha">→</button>
                <button className={styles.treeDown} type="button" onClick={() => move(0, -35)} aria-label="Mover árbol abajo">↓</button>
            </div>
            <div className={styles.treeZoom}>
                <button type="button" onClick={() => zoomOut(0.25, 150)} aria-label="Alejar árbol">−</button>
                <span>{Math.round(scale * 100)}%</span>
                <button type="button" onClick={() => zoomIn(0.25, 150)} disabled={scale >= 2} aria-label="Acercar árbol">+</button>
            </div>
        </div>
    );
}
