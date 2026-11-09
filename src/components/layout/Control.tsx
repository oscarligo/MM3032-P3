import { useEffect } from "react";
import { useI18nContext } from "../../i18n/i18n-react";
import { useProcedureStore } from "../../store/store_control";
import styles from "./Control.module.css";

export default function Control() {
    const { LL } = useI18nContext();
    const totalSteps = useProcedureStore((state) => state.totalSteps);
    const stepIndex = useProcedureStore((state) => state.stepIndex);
    const isPlaying = useProcedureStore((state) => state.isPlaying);
    const previous = useProcedureStore((state) => state.previous);
    const next = useProcedureStore((state) => state.next);
    const restart = useProcedureStore((state) => state.restart);
    const togglePlaying = useProcedureStore((state) => state.togglePlaying);

    useEffect(() => {
        if (!isPlaying) return;
        if (stepIndex >= totalSteps - 1) {
            next();
            return;
        }
        const timer = window.setTimeout(next, 650);
        return () => window.clearTimeout(timer);
    }, [isPlaying, next, stepIndex, totalSteps]);

    if (totalSteps === 0) return null;

    return (
        <footer className={styles.controls} aria-label={LL.procedure.controls()}>
            <span className={styles.progress}>
                {LL.procedure.progress({ current: Math.min(stepIndex + 1, totalSteps), total: totalSteps })}
            </span>
            <div className={styles.actions}>
                <button type="button" onClick={previous} disabled={stepIndex < 0}>{LL.procedure.previous()}</button>
                <button type="button" onClick={restart} disabled={stepIndex < 0 && !isPlaying}>{LL.procedure.restart()}</button>
                <button type="button" onClick={togglePlaying}>{isPlaying ? LL.procedure.pause() : LL.procedure.play()}</button>
                <button type="button" onClick={next} disabled={stepIndex >= totalSteps - 1}>{LL.procedure.next()}</button>
            </div>
        </footer>
    );
}
