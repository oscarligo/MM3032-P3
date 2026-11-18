import { useState } from "react";
import { TegakiRenderer } from "tegaki/react";
import caveat from "tegaki/fonts/caveat";
import { useI18nContext } from "../../../i18n/i18n-react";
import type { TruthTrace } from "../algorithms/truth";
import styles from "./Truth.module.css";

const WRITING_TIMING = { glyphGap: 0, stagger: { advance: .02, duration: .1 } } as const;

const truthLabel = (value: boolean | null, trueLabel: string) =>
    value === null ? "-" : value ? trueLabel : "F";

export default function Truth({ trace, trueLabel, onClose }: {
    trace: TruthTrace;
    trueLabel: string;
    onClose: () => void;
}) {
    const { LL } = useI18nContext();
    const [stepIndex, setStepIndex] = useState(0);
    const visibleSteps = trace.steps.slice(0, stepIndex + 1);

    return (
        <aside
            className={styles.panel}
            aria-label={LL.truth.title()}
        >
            <button className={styles.closeButton} type="button" onClick={onClose} aria-label={LL.truth.close()}>×</button>

            <section className={styles.summary}>
                <span className={styles.originalFormula}>
                    <TegakiRenderer font={caveat} reducedMotion="user" timing={WRITING_TIMING}>
                        {trace.originalExpression}
                    </TegakiRenderer>
                </span>
                {trace.assignment.length > 0 && (
                    <span className={styles.substitutions}>
                        {trace.assignment.map(({ variable, value }) => `${variable} = ${value}`).join(", ")}
                    </span>
                )}
            </section>

            <section className={styles.history}>
                {visibleSteps.map((step, index) => (
                    <span className={step.showTruthValue ? (step.result === true ? styles.trueValue : styles.falseValue) : styles.termValue} key={`${step.expression}-${index}`}>
                        {step.expression}{step.showTruthValue && ` = ${truthLabel(step.result, trueLabel)}`}
                    </span>
                ))}
            </section>

            <footer className={styles.controls}>
                <button type="button" disabled={stepIndex === 0} onClick={() => setStepIndex((index) => index - 1)}>
                    <span aria-hidden="true">←</span><span className={styles.srOnly}>{LL.truth.previous()}</span>
                </button>
                <button type="button" disabled={stepIndex === trace.steps.length - 1} onClick={() => setStepIndex((index) => index + 1)}>
                    <span aria-hidden="true">→</span><span className={styles.srOnly}>{LL.truth.next()}</span>
                </button>
            </footer>
        </aside>
    );
}
