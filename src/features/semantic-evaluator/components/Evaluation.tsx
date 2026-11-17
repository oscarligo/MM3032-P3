import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { TransformComponent, TransformWrapper, useControls } from "react-zoom-pan-pinch";
import rough from "roughjs";
import { TegakiRenderer } from "tegaki/react";
import caveat from "tegaki/fonts/caveat";
import { useI18nContext } from "../../../i18n/i18n-react";
import { useLocaleStore } from "../../../store/store_local";
import { useInterpretationStore } from "../../../store/store_interpretation";
import { procedureOffset, useProcedureStore } from "../../../store/store_control";
import {
    buildEvaluationMap,
    evaluateUnderInterpretation,
    fitEvaluationScale,
    formulaToText,
    selectConclusionCells,
} from "../algorithms/evaluation";
import { buildTruthTrace, type TruthTrace } from "../algorithms/truth";
import type { Formula } from "../types";
import TreeCanvasControls from "./TreeCanvasControls";
import Truth from "./Truth";
import styles from "./Evaluation.module.css";

const WRITING_TIMING = { glyphGap: 0, stagger: { advance: .025, duration: .12 } } as const;

function AutoCenter({ rowCount, columnCount, procedureOpen }: {
    rowCount: number;
    columnCount: number;
    procedureOpen: boolean;
}) {
    const { instance, centerView, setTransform } = useControls();
    const previousWidth = useRef<number | undefined>(undefined);

    useLayoutEffect(() => {
        const frame = window.requestAnimationFrame(() => {
            const wrapper = instance.wrapperComponent;
            const content = instance.contentComponent;
            if (!wrapper || !content) return;
            const width = content.offsetWidth;

            if (previousWidth.current === undefined) {
                const scale = fitEvaluationScale(
                    wrapper.clientWidth,
                    wrapper.clientHeight,
                    width,
                    content.offsetHeight
                );
                previousWidth.current = width;
                centerView(scale, 250, "easeOut");
                return;
            }

            const { positionX, positionY, scale } = instance.state;
            const widthDelta = width - previousWidth.current;
            previousWidth.current = width;
            setTransform(positionX - widthDelta * scale, positionY, scale, 0);
            window.requestAnimationFrame(() => centerView(scale, 300, "easeOut"));
        });
        return () => window.cancelAnimationFrame(frame);
    }, [centerView, columnCount, instance, procedureOpen, rowCount, setTransform]);

    return null;
}

function TruthCell({ value, trueLabel, active, onClick, conclusionMark }: {
    value: boolean | null;
    trueLabel: string;
    active: boolean;
    onClick: () => void;
    conclusionMark?: "witness" | "counterexample";
}) {
    const valueClass = value === null ? styles.pendingCell : value ? styles.trueCell : styles.falseCell;
    return (
        <td className={`${valueClass} ${active ? styles.activeCell : ""}`} data-conclusion-mark={conclusionMark}>
            <button className={styles.truthButton} data-truth-cell type="button" onClick={onClick}>
                {value === null ? "-" : value ? trueLabel : "F"}
            </button>
        </td>
    );
}

export default function Evaluation({ formula }: { formula?: Formula }) {
    const { LL } = useI18nContext();
    const locale = useLocaleStore((state) => state.locale);
    const interpretation = useInterpretationStore((state) => state.definition);
    const validationWarnings = useInterpretationStore((state) => state.validationWarnings);
    const globalStep = useProcedureStore((state) => state.stepIndex);
    const procedures = useProcedureStore((state) => state.procedures);
    const registerProcedure = useProcedureStore((state) => state.registerProcedure);
    const unregisterProcedure = useProcedureStore((state) => state.unregisterProcedure);
    const localStep = procedures.evaluation
        ? globalStep - procedureOffset(procedures, "evaluation")
        : -1;
    const showTable = Boolean(interpretation) && localStep >= 0;
    const showConclusion = Boolean(interpretation) && localStep >= 1;
    const trueLabel = locale === "es" ? "V" : "T";
    const evaluationMap = useMemo(
        () => formula && interpretation ? buildEvaluationMap(formula, interpretation) : undefined,
        [formula, interpretation]
    );
    const finalEvaluation = useMemo(
        () => formula && interpretation ? evaluateUnderInterpretation(formula, interpretation) : null,
        [formula, interpretation]
    );
    const renderedFormula = useMemo(() => formula ? formulaToText(formula) : "", [formula]);
    const usesEnvironment = Boolean(interpretation && Object.keys(interpretation.environment).length > 0);
    const [truthTrace, setTruthTrace] = useState<TruthTrace>();
    const [activeTruthCell, setActiveTruthCell] = useState<string>();
    const conclusionCellIds = useMemo(
        () => formula && evaluationMap && interpretation && finalEvaluation !== null
            ? selectConclusionCells(evaluationMap, interpretation, finalEvaluation)
            : new Set<string>(),
        [evaluationMap, finalEvaluation, formula, interpretation]
    );
    const conclusionMark = finalEvaluation === true ? "witness" : "counterexample";

    useEffect(() => {
        registerProcedure("evaluation", interpretation ? 2 : 0, 1, false);
    }, [interpretation, registerProcedure]);

    useEffect(() => () => unregisterProcedure("evaluation"), [unregisterProcedure]);

    useEffect(() => {
        setTruthTrace(undefined);
        setActiveTruthCell(undefined);
    }, [formula, interpretation]);

    const closeTruth = () => {
        setTruthTrace(undefined);
        setActiveTruthCell(undefined);
    };

    const openTruth = (rowIndex: number, columnIndex: number) => {
        if (!formula || !interpretation || !evaluationMap) return;
        const cellId = `${rowIndex}:${columnIndex}`;
        if (activeTruthCell === cellId) {
            closeTruth();
            return;
        }
        setTruthTrace(buildTruthTrace(
            evaluationMap.caseFormula,
            interpretation,
            evaluationMap.rowVariables,
            evaluationMap.rowAssignments[rowIndex],
            evaluationMap.columnVariables,
            evaluationMap.columnAssignments[columnIndex],
            trueLabel,
            evaluationMap.variableLabels
        ));
        setActiveTruthCell(cellId);
    };

    const wrapRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const conclusionCanvasRef = useRef<HTMLCanvasElement>(null);
    const tableRef = useRef<HTMLTableElement>(null);

        useLayoutEffect(() => {
        const wrap = wrapRef.current;
        const canvas = canvasRef.current;
        const tableEl = tableRef.current;
        if (!wrap || !canvas || !tableEl || !formula) return;

        const getUnscaledBox = (el: HTMLElement, root: HTMLElement) => {
            let x = 0;
            let y = 0;
            let curr: HTMLElement | null = el;
            while (curr && curr !== root) {
                x += curr.offsetLeft;
                y += curr.offsetTop;
                curr = curr.offsetParent as HTMLElement | null;
            }
            return { x, y, width: el.offsetWidth, height: el.offsetHeight };
        };

        const drawHandDrawnTable = () => {
            const wrapWidth = wrap.offsetWidth;
            const wrapHeight = wrap.offsetHeight;
            if (wrapWidth === 0 || wrapHeight === 0) return;

            const dpr = Math.max(window.devicePixelRatio || 1, 2);
            canvas.width = wrapWidth * dpr;
            canvas.height = wrapHeight * dpr;

            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, wrapWidth, wrapHeight);

            const computed = getComputedStyle(wrap);
            const inkColor = computed.getPropertyValue("--color-whiteboard-ink").trim() || "#1e293b";

            const rc = rough.canvas(canvas);
            const { x: offsetX, y: offsetY, width, height } = getUnscaledBox(tableEl, wrap);

            const theadEl = tableEl.querySelector<HTMLElement>("thead");

            if (theadEl) {
                const theadHeight = theadEl.offsetHeight;
                
                const headerBottomY = offsetY + theadHeight;
                rc.line(offsetX - 2, headerBottomY, offsetX + width + 2, headerBottomY, {
                    stroke: inkColor,
                    strokeWidth: 1.1,
                    roughness: 1.3,
                    bowing: 0.9,
                    seed: 101,
                    disableMultiStroke: true,
                });
                rc.line(offsetX - 1, headerBottomY + 2.5, offsetX + width + 1, headerBottomY + 2.5, {
                    stroke: inkColor,
                    strokeWidth: 0.7,
                    roughness: 1.4,
                    bowing: 0.9,
                    seed: 102,
                    disableMultiStroke: true,
                });

                const headerRows = Array.from(theadEl.querySelectorAll<HTMLElement>("tr"));
                headerRows.slice(0, -1).forEach((row, rowIndex) => {
                    const box = getUnscaledBox(row, wrap);
                    const y = box.y + box.height;
                    rc.line(offsetX + 2, y, offsetX + width - 2, y, {
                        stroke: inkColor,
                        strokeWidth: .65,
                        roughness: 1.2,
                        bowing: .7,
                        strokeLineDash: [5, 4],
                        seed: 200 + rowIndex,
                        disableMultiStroke: true,
                    });
                });
            }

            rc.rectangle(offsetX, offsetY, width, height, {
                stroke: inkColor,
                strokeWidth: 1.1,
                roughness: 1.35,
                bowing: 0.9,
                seed: 300,
                disableMultiStroke: true,
            });

            const axisCorner = tableEl.querySelector<HTMLElement>("[data-axis-corner]");
            if (axisCorner) {
                const box = getUnscaledBox(axisCorner, wrap);
                const separatorX = box.x;
                rc.line(separatorX, offsetY - 2, separatorX, offsetY + height + 2, {
                    stroke: inkColor,
                    strokeWidth: 1.1,
                    roughness: 1.25,
                    bowing: 0.8,
                    seed: 301,
                    disableMultiStroke: true,
                });
            }

            const firstBodyRow = tableEl.querySelector<HTMLElement>("tbody tr");
            const bodyCells = firstBodyRow
                ? Array.from(firstBodyRow.children) as HTMLElement[]
                : [];
            const axisSeparatorX = axisCorner
                ? (() => {
                    const box = getUnscaledBox(axisCorner, wrap);
                    return box.x;
                })()
                : undefined;

            bodyCells.slice(0, -1).forEach((cell, cellIndex) => {
                const box = getUnscaledBox(cell, wrap);
                const x = box.x + box.width;
                if (axisSeparatorX !== undefined && Math.abs(x - axisSeparatorX) < 1) return;
                rc.line(x, offsetY + 2, x, offsetY + height - 2, {
                    stroke: inkColor,
                    strokeWidth: .65,
                    roughness: 1.2,
                    bowing: .7,
                    strokeLineDash: [5, 4],
                    seed: 400 + cellIndex,
                    disableMultiStroke: true,
                });
            });

            const bodyRows = Array.from(tableEl.querySelectorAll<HTMLElement>("tbody tr"));
            bodyRows.slice(0, -1).forEach((row, rowIndex) => {
                const box = getUnscaledBox(row, wrap);
                const y = box.y + box.height;
                rc.line(offsetX + 2, y, offsetX + width - 2, y, {
                    stroke: inkColor,
                    strokeWidth: .65,
                    roughness: 1.2,
                    bowing: .7,
                    strokeLineDash: [5, 4],
                    seed: 500 + rowIndex,
                    disableMultiStroke: true,
                });
            });

            const emptyCells = Array.from(tableEl.querySelectorAll<HTMLElement>("[data-empty-cell]"));
            emptyCells.forEach((cell, cellIndex) => {
                const box = getUnscaledBox(cell, wrap);
                ctx.save();
                ctx.beginPath();
                ctx.rect(box.x, box.y, box.width, box.height);
                ctx.clip();
                ctx.globalAlpha = .58;
                let hatchIndex = 0;
                for (let start = box.x - box.height; start < box.x + box.width; start += 9) {
                    rc.line(start, box.y + box.height, start + box.height, box.y, {
                        stroke: inkColor,
                        strokeWidth: .55,
                        roughness: 1.3,
                        bowing: .8,
                        seed: 600 + cellIndex * 100 + hatchIndex,
                        disableMultiStroke: true,
                    });
                    hatchIndex += 1;
                }
                ctx.restore();
            });

        };

        drawHandDrawnTable();

        const observer = new ResizeObserver(drawHandDrawnTable);
        observer.observe(tableEl);
        document.fonts?.ready.then(drawHandDrawnTable);

        return () => observer.disconnect();
    }, [evaluationMap, formula, locale]);

    useEffect(() => {
        const wrap = wrapRef.current;
        const tableEl = tableRef.current;
        const canvas = conclusionCanvasRef.current;
        if (!wrap || !tableEl || !canvas) return;

        const dpr = Math.max(window.devicePixelRatio || 1, 2);
        canvas.width = wrap.offsetWidth * dpr;
        canvas.height = wrap.offsetHeight * dpr;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, wrap.offsetWidth, wrap.offsetHeight);
        if (!showConclusion) return;

        const getBox = (element: HTMLElement) => {
            let x = 0;
            let y = 0;
            let current: HTMLElement | null = element;
            while (current && current !== wrap) {
                x += current.offsetLeft;
                y += current.offsetTop;
                current = current.offsetParent as HTMLElement | null;
            }
            return { x, y, width: element.offsetWidth, height: element.offsetHeight };
        };
        const style = getComputedStyle(wrap);
        const successColor = style.getPropertyValue("--color-success").trim() || "#15803d";
        const annotationColor = style.getPropertyValue("--color-annotation").trim() || "#e11d48";
        const lines = Array.from(tableEl.querySelectorAll<HTMLElement>("[data-conclusion-mark]")).flatMap((cell, cellIndex) => {
            const box = getBox(cell);
            const color = cell.dataset.conclusionMark === "witness" ? successColor : annotationColor;
            const cellLines = [];
            let hatchIndex = 0;
            for (let start = box.x - box.height; start < box.x + box.width; start += 8) {
                const x1 = Math.max(start, box.x);
                const x2 = Math.min(start + box.height, box.x + box.width);
                cellLines.push({
                    x1,
                    y1: box.y + box.height - (x1 - start),
                    x2,
                    y2: box.y + box.height - (x2 - start),
                    color,
                    seed: 800 + cellIndex * 100 + hatchIndex,
                });
                hatchIndex += 1;
            }
            return cellLines;
        });
        const rc = rough.canvas(canvas);
        const timers: number[] = [];
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        lines.forEach((line, index) => {
            const draw = () => rc.line(line.x1, line.y1, line.x2, line.y2, {
                stroke: line.color,
                strokeWidth: 1.2,
                roughness: 1.1,
                bowing: .6,
                seed: line.seed,
                disableMultiStroke: true,
            });
            if (reducedMotion) draw();
            else timers.push(window.setTimeout(draw, index * 35));
        });

        return () => timers.forEach(window.clearTimeout);
    }, [conclusionCellIds, showConclusion]);


    return (
        <section className={styles.container}>
            <h2>
                <TegakiRenderer font={caveat} reducedMotion="always">
                    {LL.evaluation.title()}
                </TegakiRenderer>
            </h2>
            {!evaluationMap || !showTable ? (
                <div className={styles.waiting}>
                    <TegakiRenderer font={caveat} reducedMotion="user" timing={{ glyphGap: 0, stagger: { advance: .02, duration: .1 } }}>
                        {interpretation ? LL.evaluation.ready() : LL.evaluation.waiting()}
                    </TegakiRenderer>
                    {validationWarnings.length > 0 && (
                        <div className={`${styles.validationWarnings} subtle-scrollbar`} role="alert" aria-live="polite">
                            {validationWarnings.map((warning, index) => (
                                <div className={styles.validationWarning} key={`${index}-${warning}`}>
                                    <TegakiRenderer font={caveat} reducedMotion="user" timing={{ glyphGap: 0, stagger: { advance: .02, duration: .1 } }}>
                                        {`• ${warning}`}
                                    </TegakiRenderer>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className={styles.canvasPanel}>
                    <TransformWrapper
                        initialScale={.5}
                        minScale={.0000001}
                        maxScale={2}
                        centerOnInit
                        limitToBounds={false}
                        wheel={{ step: .005 }}
                        panning={{ velocityDisabled: true, excluded: ["button"] }}
                        doubleClick={{ disabled: true }}
                    >
                        <TransformComponent
                            wrapperClass={`${styles.viewport} nested-tree-canvas`}
                            contentClass={styles.canvasContent}
                            wrapperStyle={{ width: "100%", height: "100%" }}
                        >
                            <div className={`${styles.canvasStage} ${truthTrace ? styles.canvasStageOpen : ""}`}>
                                <div className={`${styles.procedureSlot} ${truthTrace ? styles.procedureSlotOpen : ""}`}>
                                    {truthTrace && <Truth trace={truthTrace} trueLabel={trueLabel} onClose={closeTruth} />}
                                </div>
                                <div ref={wrapRef} className={styles.tableCanvasWrap}>
                                <canvas ref={canvasRef} className={styles.roughCanvas} />
                                <canvas
                                    ref={conclusionCanvasRef}
                                    className={`${styles.conclusionCanvas} ${showConclusion ? styles.conclusionCanvasVisible : ""}`}
                                />
                                <table ref={tableRef} className={styles.table}>
                                    {evaluationMap.variables.length === 0 ? (
                                        <tbody>
                                            <tr><TruthCell value={evaluationMap.results[0][0]} trueLabel={trueLabel} active={activeTruthCell === "0:0"} onClick={() => openTruth(0, 0)} conclusionMark={showConclusion && conclusionCellIds.has("0:0") ? conclusionMark : undefined} /></tr>
                                        </tbody>
                                    ) : evaluationMap.variables.length === 1 ? (
                                        <>
                                            <thead>
                                                <tr>
                                                    <th data-axis-corner>{evaluationMap.variableLabels.get(evaluationMap.variables[0])}</th>
                                                    <th>{LL.evaluation.value()}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {evaluationMap.rowAssignments.map((assignment, rowIndex) => (
                                                    <tr key={rowIndex}>
                                                        <th className={styles.rowValue}>{assignment[0]}</th>
                                                        <TruthCell value={evaluationMap.results[rowIndex][0]} trueLabel={trueLabel} active={activeTruthCell === `${rowIndex}:0`} onClick={() => openTruth(rowIndex, 0)} conclusionMark={showConclusion && conclusionCellIds.has(`${rowIndex}:0`) ? conclusionMark : undefined} />
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </>
                                    ) : (
                                        <>
                                            <thead>
                                                {evaluationMap.columnVariables.map((variable, variableIndex) => (
                                                    <tr key={variable}>
                                                        {evaluationMap.rowVariables.map((rowVariable) => (
                                                            <th className={styles.rowAxisHeader} data-empty-cell key={rowVariable} />
                                                        ))}
                                                        <th className={styles.axisCorner} data-axis-corner>{evaluationMap.variableLabels.get(variable)}</th>
                                                        {evaluationMap.columnAssignments.map((assignment, columnIndex) => (
                                                            <th className={styles.columnValue} key={columnIndex}>{assignment[variableIndex]}</th>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </thead>
                                            <tbody>
                                                <tr className={styles.axisSpacerRow}>
                                                    {evaluationMap.rowVariables.map((variable) => (
                                                        <th className={styles.rowAxisHeader} key={variable}>{evaluationMap.variableLabels.get(variable)}</th>
                                                    ))}
                                                    <th className={styles.axisCorner} data-empty-cell />
                                                    {evaluationMap.columnAssignments.map((_, columnIndex) => <td data-empty-cell key={columnIndex} />)}
                                                </tr>
                                                {evaluationMap.rowAssignments.map((assignment, rowIndex) => (
                                                    <tr key={rowIndex}>
                                                        {evaluationMap.rowVariables.map((variable, variableIndex) => (
                                                            <th className={styles.rowValue} key={variable}>{assignment[variableIndex]}</th>
                                                        ))}
                                                        <th className={styles.axisCorner} data-empty-cell aria-hidden="true" />
                                                        {evaluationMap.results[rowIndex].map((result, columnIndex) => (
                                                            <TruthCell
                                                                value={result}
                                                                trueLabel={trueLabel}
                                                                active={activeTruthCell === `${rowIndex}:${columnIndex}`}
                                                                onClick={() => openTruth(rowIndex, columnIndex)}
                                                                conclusionMark={showConclusion && conclusionCellIds.has(`${rowIndex}:${columnIndex}`) ? conclusionMark : undefined}
                                                                key={columnIndex}
                                                            />
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </>
                                    )}
                                </table>
                                </div>
                            </div>
                        </TransformComponent>
                        <AutoCenter
                            rowCount={evaluationMap.rowAssignments.length}
                            columnCount={evaluationMap.columnAssignments.length}
                            procedureOpen={Boolean(truthTrace)}
                        />
                        {showConclusion && <div className={`${styles.satisfaction} ${finalEvaluation === true ? styles.satisfied : styles.notSatisfied}`}>
                            <span className={styles.semanticRelation}>
                                <TegakiRenderer
                                    key={`${finalEvaluation}-${usesEnvironment}`}
                                    font={caveat}
                                    reducedMotion="user"
                                    timing={WRITING_TIMING}
                                >
                                    {`ℐ ${finalEvaluation === true ? "⊨" : "⊭"}`}
                                </TegakiRenderer>
                                {usesEnvironment && <sub>ℓ</sub>}
                            </span>
                            <TegakiRenderer
                                key={renderedFormula}
                                font={caveat}
                                reducedMotion="user"
                                timing={WRITING_TIMING}
                            >
                                {renderedFormula}
                            </TegakiRenderer>
                        </div>}
                        <TreeCanvasControls />
                    </TransformWrapper>
                </div>
            )}
        </section>
    );
}
