import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import rough from "roughjs";
import { tokenizeWithSteps, type LexerStep } from "../algorithms/lexer-steps";

const DEFAULT_FORMULA = "∀x (P(x) → ∃y Q(x, y))";

export function useLexerVisualization() {
    const [input, setInput] = useState(DEFAULT_FORMULA);
    const [stepIndex, setStepIndex] = useState(-1);
    const [isPlaying, setIsPlaying] = useState(false);

    const boardRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const charRefs = useRef<(HTMLSpanElement | null)[]>([]);
    const tokenSlotRef = useRef<HTMLSpanElement>(null);
    const [tokenOffset, setTokenOffset] = useState({ x: 0, y: 0 });

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
        stepIndex >= 0 ? result.steps[stepIndex] : undefined;

    const settledTokens =
        stepIndex >= 0 ? result.steps.slice(0, stepIndex) : [];

    useLayoutEffect(() => {
        setStepIndex(-1);
        setIsPlaying(false);
    }, [input]);

    useEffect(() => {
        if (!isPlaying) return;
        if (stepIndex >= result.steps.length - 1) {
            setIsPlaying(false);
            return;
        }

        const timer = window.setTimeout(() => {
            setStepIndex((prev) => (prev < 0 ? 0 : prev + 1));
        }, 1100);

        return () => window.clearTimeout(timer);
    }, [isPlaying, stepIndex, result.steps.length]);

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

        if (!currentStep || stepIndex < 0) return;

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
        const annotationColor = getComputedStyle(board).getPropertyValue("--color-annotation").trim() || getComputedStyle(board).color;
        rc.ellipse(
            left + width / 2, 
            top + height / 2, 
            Math.max(width, 36), 
            Math.max(height, 36), 
            { stroke: annotationColor, strokeWidth: 2, roughness: 1.8, bowing: 1.2 }
        );

        const tokenRect = tokenSlotRef.current?.getBoundingClientRect();
        if (tokenRect) {
            setTokenOffset({
                x: left + width / 2 + boardRect.left - (tokenRect.left + tokenRect.width / 2),
                y: top + height / 2 + boardRect.top - (tokenRect.top + tokenRect.height / 2),
            });
        }
    }, [currentStep, stepIndex, input]);

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
        tokenSlotRef,
        tokenOffset,
        previous: () => setStepIndex((s) => Math.max(0, s - 1)),
        restart: () => {
            setStepIndex(-1);
            setIsPlaying(false);
        },
        togglePlaying: () => {
            if (stepIndex < 0) setStepIndex(0);
            setIsPlaying((p) => !p);
        },
        next: () => setStepIndex((s) => (s < 0 ? 0 : Math.min(result.steps.length - 1, s + 1))),
    };
}
