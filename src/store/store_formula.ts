import { create } from "zustand";

type FormulaStore = {
    formula: string;
    constantSymbols: string[];
    setFormula: (formula: string) => void;
    toggleConstantSymbol: (symbol: string) => void;
};

export const useFormulaStore = create<FormulaStore>((set) => ({
    formula: "∀x (P(x) → ∃y Q(x, y))",
    constantSymbols: [],
    setFormula: (formula) => set({ formula }),
    toggleConstantSymbol: (symbol) => set((state) => ({
        constantSymbols: state.constantSymbols.includes(symbol)
            ? state.constantSymbols.filter((item) => item !== symbol)
            : [...state.constantSymbols, symbol],
    })),
}));
