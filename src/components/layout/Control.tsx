import { useEffect } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
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

    const playPauseLabel = isPlaying ? LL.procedure.pause() : LL.procedure.play();

    return (
        <footer className={styles.controls} aria-label={LL.procedure.controls()}>
            <span className={styles.progress}>
                {LL.procedure.progress({ current: Math.min(stepIndex + 1, totalSteps), total: totalSteps })}
            </span>
            <div className={styles.actions}>
                <button
                    type="button"
                    onClick={previous}
                    disabled={stepIndex < 0}
                    aria-label={LL.procedure.previous()}
                    title={LL.procedure.previous()}
                >
                    <ChevronLeft size={24} strokeWidth={2.2} aria-hidden="true" />
                </button>
                <button
                    type="button"
                    onClick={restart}
                    disabled={stepIndex < 0 && !isPlaying}
                    aria-label={LL.procedure.restart()}
                    title={LL.procedure.restart()}
                >
                    <RotateCcw size={22} strokeWidth={2.2} aria-hidden="true" />
                </button>
                <button
                    type="button"
                    onClick={togglePlaying}
                    aria-label={playPauseLabel}
                    title={playPauseLabel}
                >
                    {isPlaying ? (
                        <Pause size={22} strokeWidth={2.2} aria-hidden="true" />
                    ) : (
                        <Play size={22} strokeWidth={2.2} aria-hidden="true" />
                    )}
                </button>
                <button
                    type="button"
                    onClick={next}
                    disabled={stepIndex >= totalSteps - 1}
                    aria-label={LL.procedure.next()}
                    title={LL.procedure.next()}
                >
                    <ChevronRight size={24} strokeWidth={2.2} aria-hidden="true" />
                </button>
            </div>
        </footer>
    );
}
