import { useEffect, useRef } from "react";
import { TegakiRenderer } from "tegaki/react";
import caveat from "tegaki/fonts/caveat";
import rough from "roughjs";
import { useI18nContext } from "../../../i18n/i18n-react";
import type { ParserVisualization } from "../hooks/useParserVisualization";
import type { RenderTreeNode } from "../algorithms/parser-tree";
import styles from "./ParseTree.module.css";

type ParseTreeProps = {
    mode: "text" | "tree" | "procedure";
    visualization: ParserVisualization;
};

const FAST_TEGAKI = { glyphGap: 0, stagger: { advance: 0.02, duration: 0.1 } } as const;

const Chalk = ({ children }: { children: string | number }) => (
    <TegakiRenderer font={caveat} reducedMotion="user" timing={FAST_TEGAKI}>
        {String(children)}
    </TegakiRenderer>
);

const StaticChalk = ({ children }: { children: string | number }) => (
    <TegakiRenderer font={caveat} reducedMotion="always">
        {String(children)}
    </TegakiRenderer>
);

function TreeNodeView({ node }: { node: RenderTreeNode }) {
    return (
        <li className={styles.treeItem}>
            {node.roleTag && (
                <span className={styles.roleTag}>
                    <StaticChalk>{node.roleTag}</StaticChalk>
                </span>
            )}
            <span
                data-tree-node
                data-node-type={node.nodeType}
                data-var-scope={node.variableClass ?? ""}
                data-active={node.isActive ? "true" : "false"}
                className={`${styles.node} ${styles[node.nodeType]} ${
                    node.variableClass ? styles[node.variableClass] : ""
                } ${node.isActive ? styles.activeNode : ""}`}
            >
                <Chalk>{node.label}</Chalk>
            </span>
            {node.children.length > 0 && (
                <ul className={styles.subTree}>
                    {node.children.map((child) => (
                        <TreeNodeView key={child.id} node={child} />
                    ))}
                </ul>
            )}
        </li>
    );
}

function SketchTreeCanvas({ visualTree }: { visualTree: RenderTreeNode }) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const wrap = wrapRef.current;
        const canvas = canvasRef.current;
        if (!wrap || !canvas) return;

        const draw = () => {
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            const width = wrap.scrollWidth;
            const height = wrap.scrollHeight;
            canvas.width = width;
            canvas.height = height;
            ctx.clearRect(0, 0, width, height);

            const wrapRect = wrap.getBoundingClientRect();
            const scaleX = wrapRect.width > 0 ? wrapRect.width / wrap.offsetWidth : 1;
            const scaleY = wrapRect.height > 0 ? wrapRect.height / wrap.offsetHeight : 1;

            const style = getComputedStyle(wrap);
            const inkColor = style.getPropertyValue("--color-whiteboard-ink").trim() || style.color;
            const annotationColor = style.getPropertyValue("--color-annotation").trim() || "#e11d48";

            const rc = rough.canvas(canvas);
            const nodes = wrap.querySelectorAll<HTMLElement>("[data-tree-node]");

            nodes.forEach((nodeEl, idx) => {
                const r = nodeEl.getBoundingClientRect();
                const x = (r.left - wrapRect.left) / scaleX;
                const y = (r.top - wrapRect.top) / scaleY;
                const w = r.width / scaleX;
                const h = r.height / scaleY;
                const cx = x + w / 2;
                const cy = y + h / 2;

                const type = nodeEl.dataset.nodeType;
                const scope = nodeEl.dataset.varScope;
                const isActive = nodeEl.dataset.active === "true";
                const seed = idx + 10;

                const strokeColor = isActive
                    ? annotationColor
                    : type === "quantifier" || scope === "free"
                      ? annotationColor
                      : inkColor;
                const strokeWidth = isActive ? 2.4 : 1.6;

                if (type === "placeholder") {
                    rc.circle(cx, cy, Math.max(w, h, 32), {
                        stroke: annotationColor,
                        strokeWidth: 1.4,
                        roughness: 2.0,
                        strokeLineDash: [4, 4],
                        seed,
                    });
                } else if (type === "operator" || type === "quantifier") {
                    rc.ellipse(cx, cy, Math.max(w + 18, 42), Math.max(h + 12, 38), {
                        stroke: strokeColor,
                        strokeWidth,
                        roughness: 1.6,
                        bowing: 1.3,
                        seed,
                    });
                } else if (scope === "free") {
                    rc.rectangle(x - 5, y - 3, w + 10, h + 6, {
                        stroke: annotationColor,
                        strokeWidth,
                        roughness: 1.8,
                        strokeLineDash: [5, 4],
                        seed,
                    });
                } else if (scope === "bound") {
                    rc.ellipse(cx, cy, w + 16, h + 10, {
                        stroke: strokeColor,
                        strokeWidth,
                        roughness: 1.5,
                        seed,
                    });
                } else {
                    rc.line(x - 2, y + h + 2, x + w + 2, y + h + 2, {
                        stroke: strokeColor,
                        strokeWidth,
                        roughness: 1.5,
                        seed,
                    });
                }

                const li = nodeEl.parentElement;
                const ul = li?.querySelector<HTMLElement>(":scope > ul");
                if (ul) {
                    const childLis = Array.from(ul.children) as HTMLElement[];
                    childLis.forEach((childLi, cIdx) => {
                        const childNode = childLi.querySelector<HTMLElement>(":scope > [data-tree-node]");
                        if (!childNode) return;

                        const cr = childNode.getBoundingClientRect();
                        const childCx = (cr.left - wrapRect.left) / scaleX + cr.width / (2 * scaleX);
                        const childTop = (cr.top - wrapRect.top) / scaleY;

                        rc.line(cx, y + h + 5, childCx, childTop - 22, {
                            stroke: inkColor,
                            strokeWidth: 1.5,
                            roughness: 1.5,
                            bowing: 1.2,
                            seed: seed * 10 + cIdx,
                        });
                    });
                }
            });
        };

        const timer = window.setTimeout(draw, 35);
        const observer = new ResizeObserver(draw);
        observer.observe(wrap);

        return () => {
            window.clearTimeout(timer);
            observer.disconnect();
        };
    }, [visualTree]);

    return (
        <div ref={wrapRef} className={styles.treeCanvasWrap} data-fit-content>
            <canvas ref={canvasRef} className={styles.roughCanvas} />
            <ul className={styles.tree}>
                <TreeNodeView node={visualTree} />
            </ul>
        </div>
    );
}

export default function ParseTree({ mode, visualization }: ParseTreeProps) {
    const { LL } = useI18nContext();

    if (visualization.error) {
        return (
            <p className={styles.error} role="alert">
                <Chalk>{`${LL.parser.invalid()}: ${visualization.error}`}</Chalk>
            </p>
        );
    }
    if (!visualization.hasStarted) {
        return (
            <p className={styles.waiting}>
                <Chalk>{LL.parser.waiting()}</Chalk>
            </p>
        );
    }

    const step = visualization.currentStep;
    const decisionText = step ? {
        "open-universal-quantifier": LL.parser.openUniversal(),
        "open-existential-quantifier": LL.parser.openExistential(),
        "build-negation": LL.parser.buildNegation(),
        "build-implication": LL.parser.buildImplication(),
        "build-disjunction": LL.parser.buildDisjunction(),
        "build-conjunction": LL.parser.buildConjunction(),
        "open-group": LL.parser.openGroup(),
        "close-group": LL.parser.closeGroup(),
        "next-argument": LL.parser.nextArgument(),
        "finish-formula": LL.parser.finishFormula(),
        "bind-variable": LL.parser.bindVariable(),
        "read-term": LL.parser.readTerm(),
        "build-predicate": LL.parser.buildPredicate(),
    }[step.decision] ?? step.decision : "";

    return (
        <section className={styles.container}>
            <div className={styles.fitContent} data-fit-content>
                {step && (
                    <aside className={styles.chalkNotes}>
                        <div className={styles.noteSection}>
                            <StaticChalk>{`${LL.parser.currentToken()}:`}</StaticChalk>
                            <div className={styles.chalkIndent}>
                                <span className={styles.focusFormula} key={`focus-${step.cursor}`}>
                                    <Chalk>{step.currentToken}</Chalk>
                                </span>
                            </div>
                        </div>

                        <div className={styles.noteSection}>
                            <StaticChalk>{`${LL.parser.decision()}:`}</StaticChalk>
                            <div className={styles.chalkIndent}>
                                <p className={styles.explanationText} key={`decision-${step.cursor}`}>
                                    <Chalk>{decisionText}</Chalk>
                                </p>
                            </div>
                        </div>

                        <div className={styles.noteSection}>
                            <StaticChalk>{`${LL.parser.functionHistory()}:`}</StaticChalk>
                            <div className={styles.chalkIndent}>
                                <span className={styles.callPath}><Chalk>{step.callStack.join(" → ")}</Chalk></span>
                            </div>
                        </div>

                        <div className={styles.noteSection}>
                            <StaticChalk>{`${LL.parser.bound()}:`}</StaticChalk>
                            <div className={styles.chalkIndent}>
                                <span className={styles.accentValue}>
                                    <Chalk>
                                        {step.activeScopeVars.length > 0
                                            ? `{ ${step.activeScopeVars.join(", ")} }`
                                            : "∅"}
                                    </Chalk>
                                </span>
                            </div>
                        </div>
                    </aside>
                )}

                {mode === "text" ? (
                    <div className={styles.textView}>
                        <Chalk>{visualization.structureText}</Chalk>
                    </div>
                ) : (
                    <div className={styles.treeArea}>
                        {visualization.visibleTree ? (
                            <>
                                <SketchTreeCanvas
                                    visualTree={visualization.visibleTree}
                                />
                                <footer className={styles.legend}>
                                    <span className={styles.legendBound}>
                                        <StaticChalk>{`◯ ${LL.parser.bound()}`}</StaticChalk>
                                    </span>
                                    <span className={styles.legendFree}>
                                        <StaticChalk>{`[ ] ${LL.parser.free()}`}</StaticChalk>
                                    </span>
                                </footer>
                            </>
                        ) : (
                            <div className={styles.buildingPlaceholder}>
                                <Chalk>{LL.parser.building()}</Chalk>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}
