import { useI18nContext } from "../../../i18n/i18n-react";
import type { Explanation } from "../algorithms/explanation";
import styles from "./Justification.module.css";

const tupleText = (tuple: string[]) => tuple.length === 1 ? tuple[0] : `(${tuple.join(", ")})`;

function useReasonText() {
    const { LL } = useI18nContext();
    return (node: Explanation): string => {
        const { reason, value } = node;
        const side = (name: string) => name === "left" ? LL.evaluation.left() : LL.evaluation.right();
        switch (reason.type) {
            case "atom":
                if (reason.tuple.length === 0) {
                    return value
                        ? LL.evaluation.atomTrue({ symbol: reason.predicate })
                        : LL.evaluation.atomFalse({ symbol: reason.predicate });
                }
                return value
                    ? LL.evaluation.atomMember({ tuple: tupleText(reason.tuple), symbol: reason.predicate })
                    : LL.evaluation.atomNotMember({ tuple: tupleText(reason.tuple), symbol: reason.predicate });
            case "not":
                return value ? LL.evaluation.notTrue() : LL.evaluation.notFalse();
            case "and":
                return value ? LL.evaluation.andTrue() : LL.evaluation.andFalse({ side: side(reason.side) });
            case "or":
                return value ? LL.evaluation.orTrue({ side: side(reason.side) }) : LL.evaluation.orFalse();
            case "implies":
                if (!value) return LL.evaluation.impliesFalse();
                return reason.side === "left" ? LL.evaluation.impliesTrueLeft() : LL.evaluation.impliesTrueRight();
            case "witness":
                return LL.evaluation.witness({ variable: reason.variable, element: reason.element });
            case "counterexample":
                return LL.evaluation.counterexample({ variable: reason.variable, element: reason.element });
            case "complete": {
                const params = { count: reason.elements.length, elements: `{${reason.elements.join(", ")}}` };
                return reason.quantifier === "forall"
                    ? LL.evaluation.completeForall(params)
                    : LL.evaluation.completeExists(params);
            }
        }
    };
}

function Step({ node, reasonText, trueLabel, falseLabel }: {
    node: Explanation;
    reasonText: (node: Explanation) => string;
    trueLabel: string;
    falseLabel: string;
}) {
    return (
        <li className={styles.step}>
            <span className={styles.stepLine}>
                <span className={styles.formula}>{node.formula}</span>
                <span className={node.value ? styles.true : styles.false}>
                    {node.value ? trueLabel : falseLabel}
                </span>
            </span>
            <span className={styles.reason}>{reasonText(node)}</span>
            {node.children.length > 0 && (
                <ul className={styles.steps}>
                    {node.children.map((child, index) => (
                        <Step key={index} node={child} reasonText={reasonText} trueLabel={trueLabel} falseLabel={falseLabel} />
                    ))}
                </ul>
            )}
        </li>
    );
}

export default function Justification({ explanation }: { explanation: Explanation }) {
    const { LL } = useI18nContext();
    const reasonText = useReasonText();
    const trueLabel = LL.evaluation.trueVerdict();
    const falseLabel = LL.evaluation.falseVerdict();

    return (
        <section className={styles.justification} aria-label={LL.evaluation.justification()}>
            <p className={`${styles.verdict} ${explanation.value ? styles.true : styles.false}`}>
                {explanation.value ? trueLabel : falseLabel}
            </p>
            <div className={`${styles.body} subtle-scrollbar`}>
                <ul className={styles.steps}>
                    <Step node={explanation} reasonText={reasonText} trueLabel={trueLabel} falseLabel={falseLabel} />
                </ul>
            </div>
        </section>
    );
}
