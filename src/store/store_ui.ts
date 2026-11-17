import { create } from "zustand";

export type Theme = "light" | "dark";

const deviceTheme = (): Theme =>
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";

type UIStore = {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
};

export const useUIStore = create<UIStore>((set) => ({
    theme: deviceTheme(),
    setTheme: (theme) => set({ theme }),
    toggleTheme: () => set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
}));
