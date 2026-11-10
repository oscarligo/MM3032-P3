import { useEffect, useMemo, useRef } from "react";
import rough from "roughjs";
import { tokenizeWithSteps } from "../algorithms/lexer-steps";
import { FormulaParser } from "../algorithms/parser";
import { collectPredicateArities, predicateAritySubscript } from "../algorithms/parser-tree";
import type { Formula } from "../types";
import { procedureOffset, useProcedureStore } from "../../../store/store_control";
import { useFormulaStore } from "../../../store/store_formula";

export function useLexerVisualization() {
    const input = useFormulaStore((state) => state.formula);
    const globalStep = useProcedureStore((state) => state.stepIndex);
    const procedures = useProcedureStore((state) => state.procedures);
    const parserOffset = procedureOffset(procedures, "parser");
    const parserStepIndex = globalStep - parserOffset;

    const boardRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const charRefs = useRef<(HTMLSpanElement | null)[]>([]);

    const result = useMemo(() => {
        if (!input.trim()) return { tokens: [], steps: [], predicateSubscripts: new Map<number, string>(), error: "" };
        try {
            const raw = tokenizeWithSteps(input);
            const predicateSubscripts = new Map<number, string>();
            try {
                const parser = new FormulaParser(raw.tokens);
                const formula = parser.parse();
                const arities = collectPredicateArities(formula);
                const tokenSteps = raw.steps.filter((step) => step.tokenType !== "WHITESPACE" && step.tokenType !== "EOF");
                const visit = (current: Formula) => {
                    if (current.kind === "atom") {
                        const tokenIndex = parser.nodeTokens.get(current);
                        const step = tokenIndex === undefined ? undefined : tokenSteps[tokenIndex];
                        const subscript = predicateAritySubscript(arities, current.predicate, current.args.length);
                        if (step && subscript) predicateSubscripts.set(step.cursor, subscript);
                        return;
                    }
                    if (current.kind === "not") return visit(current.inner);
                    if (current.kind === "forall" || current.kind === "exists") return visit(current.inner);
                    visit(current.left);
                    visit(current.right);
                };
                visit(formula);
            } catch {
                // A lexically valid partial formula has no arity annotation yet.
            }
            return {
                tokens: raw.tokens,
                steps: raw.steps.filter((s) => s.tokenType !== "WHITESPACE" && s.matchedText !== ""),
                predicateSubscripts,
                error: "",
            };
        } catch (error) {
            return {
                tokens: [],
                steps: [],
                predicateSubscripts: new Map<number, string>(), error: error instanceof Error ? error.message : String(error),
            };
        }
    }, [input]);

    const focusStep = procedures.parser && parserStepIndex >= 0
        ? result.steps[parserStepIndex]
        : undefined;

    // Renderizado del círculo de RoughJS y cálculo de coordenadas hacia el slot destino
    useEffect(() => {
        const canvas = canvasRef.current;
        const board = boardRef.current;
        if (!canvas || !board) return;

        const draw = () => {
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            const boardRect = board.getBoundingClientRect();
            const scaleX = boardRect.width / board.offsetWidth || 1;
            const scaleY = boardRect.height / board.offsetHeight || 1;
            canvas.width = board.offsetWidth;
            canvas.height = board.offsetHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (!focusStep) return;

            const rc = rough.canvas(canvas);
            const annotationColor =
                getComputedStyle(board).getPropertyValue("--color-annotation").trim() ||
                getComputedStyle(board).color;
            const lines = new Map<number, { left: number; right: number; top: number; bottom: number }>();
            const characters = charRefs.current.slice(focusStep.cursor, focusStep.cursor + focusStep.matchedText.length);
            for (const character of characters) {
                if (!character) continue;
                const rect = character.getBoundingClientRect();
                const top = (rect.top - boardRect.top) / scaleY;
                const left = (rect.left - boardRect.left) / scaleX;
                const right = (rect.right - boardRect.left) / scaleX;
                const bottom = (rect.bottom - boardRect.top) / scaleY;
                const key = Math.round(top);
                const line = lines.get(key);
                lines.set(key, {
                    left: Math.min(line?.left ?? left, left),
                    right: Math.max(line?.right ?? right, right),
                    top,
                    bottom: Math.max(line?.bottom ?? bottom, bottom),
                });
            }
            // A token can wrap onto multiple lines on a narrow board.
            for (const { left, right, top, bottom } of lines.values()) {
                const width = right - left;
                const height = bottom - top;
                rc.ellipse(left + width / 2, top + height / 2, Math.max(width, height * 0.75), height, {
                    stroke: annotationColor, strokeWidth: 2, roughness: 1.8, bowing: 1.2,
                });
            }
        };
        draw();
        const observer = new ResizeObserver(draw);
        observer.observe(board);
        charRefs.current.forEach((character) => { if (character) observer.observe(character); });
        return () => observer.disconnect();

    }, [focusStep, input]);

    return {
        input,
        result,
        boardRef,
        canvasRef,
        charRefs,
    };
}
