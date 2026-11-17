import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    LocateFixed,
    Minus,
    Plus,
} from "lucide-react";
import { useControls, useTransformComponent } from "react-zoom-pan-pinch";
import styles from "./CanvasControls.module.css";

export default function CanvasControls() {
    const { instance, setTransform, centerView, zoomIn, zoomOut } = useControls();
    const scale = useTransformComponent(({ state }) => state.scale);
    const move = (x: number, y: number) =>
        setTransform(instance.state.positionX + x, instance.state.positionY + y, instance.state.scale, 0);
    const center = () => centerView(0.5, 250, "easeOut");

    return (
        <div className={styles.controls} aria-label="Controles del lienzo">
            <div className={styles.panel}>
                <button
                    type="button"
                    onClick={() => zoomOut(0.1, 150, "easeOut")}
                    disabled={scale <= 0.1}
                    aria-label="Alejar"
                    title="Alejar"
                >
                    <Minus size={22} strokeWidth={2.2} aria-hidden="true" />
                </button>
                <output aria-label="Nivel de zoom">{Math.round(scale * 100)}%</output>
                <button
                    type="button"
                    onClick={() => zoomIn(0.1, 150, "easeOut")}
                    disabled={scale >= 1.5}
                    aria-label="Acercar"
                    title="Acercar"
                >
                    <Plus size={22} strokeWidth={2.2} aria-hidden="true" />
                </button>
            </div>
            <div className={`${styles.panel} ${styles.navigation}`} aria-label="Navegar por el lienzo">
                <button
                    type="button"
                    className={styles.up}
                    onClick={() => move(0, 100)}
                    aria-label="Mover arriba"
                    title="Mover arriba"
                >
                    <ChevronUp size={24} strokeWidth={2.2} aria-hidden="true" />
                </button>
                <button
                    type="button"
                    className={styles.left}
                    onClick={() => move(100, 0)}
                    aria-label="Mover a la izquierda"
                    title="Mover a la izquierda"
                >
                    <ChevronLeft size={24} strokeWidth={2.2} aria-hidden="true" />
                </button>
                <button
                    type="button"
                    className={styles.center}
                    onClick={center}
                    aria-label="Centrar"
                    title="Centrar"
                >
                    <LocateFixed size={20} strokeWidth={2.2} aria-hidden="true" />
                </button>
                <button
                    type="button"
                    className={styles.right}
                    onClick={() => move(-100, 0)}
                    aria-label="Mover a la derecha"
                    title="Mover a la derecha"
                >
                    <ChevronRight size={24} strokeWidth={2.2} aria-hidden="true" />
                </button>
                <button
                    type="button"
                    className={styles.down}
                    onClick={() => move(0, -100)}
                    aria-label="Mover abajo"
                    title="Mover abajo"
                >
                    <ChevronDown size={24} strokeWidth={2.2} aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}
