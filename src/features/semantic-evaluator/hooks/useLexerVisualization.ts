import { useEffect, useMemo, useRef, useState } from "react";
import rough from "roughjs";
import { tokenizeWithSteps, type LexerStep } from "../algorithms/lexer-steps";

const DEFAULT_FORMULA = "∀x (P(x) → ∃y Q(x, y))";

export function useLexerVisualization() {
    const [input, setInput] = useState(DEFAULT_FORMULA);
    // Inicia en -1: estado en reposo sin análisis activo
    const [stepIndex, setStepIndex] = useState(-1);
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

    // currentStep solo existe si ya arrancó la visualización (stepIndex >= 0)
    const currentStep: LexerStep | undefined =
        stepIndex >= 0 ? result.steps[stepIndex] : undefined;

    // Tokens consolidados antes del paso actual
    const settledTokens =
        stepIndex >= 0 ? result.steps.slice(0, stepIndex) : [];

    // Reiniciar a estado inicial sin análisis
    useEffect(() => {
        setStepIndex(-1);
        setIsPlaying(false);
    }, [input]);

    // Control de reproducción automática
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

    // Dibujo del círculo con RoughJS: solo cuando stepIndex >= 0 y currentStep es válido
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

        // Si estamos en reposo inicial, el canvas permanece 100% limpio
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
        rc.ellipse(left + width / 2, top + height / 2, Math.max(width + 26, 46), Math.max(height + 22, 46), {
            stroke: "#e11d48",
            strokeWidth: 2.5,
            roughness: 2.2,
            bowing: 1.5,
        });
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
