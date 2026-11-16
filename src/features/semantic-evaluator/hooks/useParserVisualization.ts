import { useEffect, useMemo } from "react";
import { parseFormulaWithSteps, type ParserStep } from "../algorithms/parser-steps";
import type { Formula } from "../types";
import type { RenderTreeNode } from "../algorithms/parser-tree";
import type { Token } from "../algorithms/lexer";
import { useFormulaStore } from "../../../store/store_formula";
import { procedureOffset, useProcedureStore } from "../../../store/store_control";
import { useI18nContext } from "../../../i18n/i18n-react";
import { localizeParserError } from "../localization/parser-error";

export type ParserVisualization = {
    formula?: Formula;
    visibleTree?: RenderTreeNode;
    currentStep?: ParserStep;
    tokens: Token[];
    structureText: string;
    hasStarted: boolean;
    isComplete: boolean;
    error: string;
};

export function useParserVisualization(): ParserVisualization {
    const { LL } = useI18nContext();
    const input = useFormulaStore((state) => state.formula);
    const constantSymbols = useFormulaStore((state) => state.constantSymbols);
    const globalStep = useProcedureStore((state) => state.stepIndex);
    const procedures = useProcedureStore((state) => state.procedures);
    const registerProcedure = useProcedureStore((state) => state.registerProcedure);
    const unregisterProcedure = useProcedureStore((state) => state.unregisterProcedure);

    const result = useMemo(() => {
        try {
            const parsed = parseFormulaWithSteps(input, new Set(constantSymbols));
            return { ...parsed, error: "" };
        } catch (error) {
            return { formula: undefined, tokens: [], steps: [], error: localizeParserError(error, LL.parser) };
        }
    }, [LL.parser, constantSymbols, input]);

    useEffect(() => {
        registerProcedure("parser", result.steps.length, 0);
    }, [input, registerProcedure, result.steps.length]);

    useEffect(() => () => unregisterProcedure("parser"), [unregisterProcedure]);

    const localStep = globalStep - procedureOffset(procedures, "parser");
    const hasStarted = localStep >= 0;
    const totalSteps = result.steps.length;
    const isComplete = totalSteps > 0 && localStep >= totalSteps - 1;

    const clampedIndex = hasStarted && totalSteps > 0
        ? Math.min(localStep, totalSteps - 1)
        : -1;

    const currentStep = clampedIndex >= 0 ? result.steps[clampedIndex] : undefined;

    return {
        formula: result.formula,
        visibleTree: currentStep?.tree,
        currentStep,
        tokens: result.tokens,
        structureText: currentStep?.tree ? JSON.stringify(currentStep.tree, null, 2) : "",
        hasStarted,
        isComplete,
        error: result.error,
    };
}
