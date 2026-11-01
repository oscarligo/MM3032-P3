import { useEffect, useMemo, useRef, useState } from "react";
import rough from "roughjs";
import { tokenizeWithSteps, type LexerStep } from "../algorithms/lexer-steps";

const DEFAULT_FORMULA = "∀x (P(x) → ∃y Q(x, y))";

export function useLexerVisualization() {
    const [input, setInput] = useState(DEFAULT_FORMULA);
    const [stepIndex, setStepIndex] = useState(-1);
    const [settledCount, setSettledCount] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const boardRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const charRefs = useRef<(HTMLSpanElement | null)[]>([]);

    const result = useMemo(() => {
        if (!input.trim()) return { tokens: [], steps: [], error: "" };
        try {
            const raw = tokenizeWithSteps(input);
            return {
                tokens: raw.tokens,
                steps: raw.steps.filter((s) => s.tokenType !== "WHITESPACE" && s.matchedText !== ""),
                error: "",
            };
        } catch (error) {
            return {
                tokens: [],
                steps: [],
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }, [input]);

    const currentStep: LexerStep | undefined =
        stepIndex >= 0 && stepIndex < result.steps.length
            ? result.steps[stepIndex]
            : undefined;

    const settledTokens = result.steps.slice(0, settledCount);

    useEffect(() => {
        setStepIndex(-1);
        setSettledCount(0);
        setIsPlaying(false);
    }, [input]);

    const advance = () => {
        if (stepIndex < 0) {
            setStepIndex(0);
            return;
        }
        if (stepIndex < result.steps.length) {
            setSettledCount(Math.min(stepIndex + 1, result.steps.length));
            setStepIndex(stepIndex + 1);
        }
    };

    useEffect(() => {
        if (!isPlaying) return;
        if (stepIndex >= result.steps.length) {
            setIsPlaying(false);
            return;
        }
        const timer = window.setTimeout(advance, 650);
        return () => window.clearTimeout(timer);
    }, [isPlaying, stepIndex, result.steps.length]);

    // Renderizado del círculo de RoughJS y cálculo de coordenadas hacia el slot destino
    useEffect(() => {
        const canvas = canvasRef.current;
        const board = boardRef.current;
        if (!canvas || !board) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const boardRect = board.getBoundingClientRect();
        canvas.width = boardRect.width;
        canvas.height = boardRect.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!currentStep || stepIndex < 0 || stepIndex >= result.steps.length) return;

        const startEl = charRefs.current[currentStep.cursor];
        const endEl =
            charRefs.current[currentStep.cursor + Math.max(0, currentStep.matchedText.length - 1)] ||
            startEl;
        if (!startEl || !endEl) return;

        const startRect = startEl.getBoundingClientRect();
        const endRect = endEl.getBoundingClientRect();

        const left = startRect.left - boardRect.left;
        const width = endRect.right - boardRect.left - left;
        const top = Math.min(startRect.top, endRect.top) - boardRect.top;
        const height = Math.max(startRect.bottom, endRect.bottom) - boardRect.top - top;

        const rc = rough.canvas(canvas);
        const annotationColor =
            getComputedStyle(board).getPropertyValue("--color-annotation").trim() ||
            getComputedStyle(board).color;

        rc.ellipse(
            left + width / 2,
            top + height / 2,
            Math.max(width, 36),
            Math.max(height, 36),
            { stroke: annotationColor, strokeWidth: 2, roughness: 1.8, bowing: 1.2 }
        );

    }, [currentStep, stepIndex, input]);

    const next = () => {
        advance();
    };

    const previous = () => {
        if (stepIndex <= 0) {
            setStepIndex(-1);
            setSettledCount(0);
            return;
        }
        setStepIndex((s) => s - 1);
        setSettledCount((c) => Math.max(0, c - 1));
    };

    const restart = () => {
        setStepIndex(-1);
        setSettledCount(0);
        setIsPlaying(false);
    };

    const togglePlaying = () => {
        if (stepIndex >= result.steps.length) {
            setStepIndex(0);
            setSettledCount(0);
            setIsPlaying(true);
            return;
        }
        if (stepIndex < 0) {
            setStepIndex(0);
            setSettledCount(0);
        }
        setIsPlaying((p) => !p);
    };

    return {
        input,
        setInput,
        result,
        currentStep,
        settledTokens,
        stepIndex,
        isPlaying,
        hasStarted: stepIndex >= 0,
        boardRef,
        canvasRef,
        charRefs,
        previous,
        restart,
        togglePlaying,
        next,
    };
}
