import { useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { GT, US } from "country-flag-icons/react/3x2";
import { Spin } from "@theme-toggles/react";
import "@theme-toggles/react/styles/spin.css";
import { useI18nContext } from "../../i18n/i18n-react";
import type { Locales } from "../../i18n/i18n-types";
import { useLocaleStore } from "../../store/store_local";
import { useUIStore } from "../../store/store_ui";
import styles from "./NavBar.module.css";

export default function NavBar() {
    const { LL } = useI18nContext();
    const locale = useLocaleStore((state) => state.locale);
    const setLocale = useLocaleStore((state) => state.setLocale);
    const theme = useUIStore((state) => state.theme);
    const toggleTheme = useUIStore((state) => state.toggleTheme);
    const initializedTheme = useRef(false);

    useEffect(() => {
        const root = document.documentElement;
        const syncBrowserChrome = () => {
            const wallColor = getComputedStyle(root).getPropertyValue("--wall-color").trim();
            document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute("content", wallColor);
        };
        if (!initializedTheme.current) {
            root.dataset.theme = theme;
            syncBrowserChrome();
            initializedTheme.current = true;
            return;
        }

        root.classList.add("theme-transition");
        root.getBoundingClientRect();
        root.dataset.theme = theme;
        syncBrowserChrome();
        const timer = window.setTimeout(() => root.classList.remove("theme-transition"), 300);
        return () => {
            window.clearTimeout(timer);
            root.classList.remove("theme-transition");
        };
    }, [theme]);

    const isDark = theme === "dark";
    const themeLabel = isDark ? LL.navbar.lightTheme() : LL.navbar.darkTheme();

    return (
        <nav className={styles.navbar} aria-label={LL.navbar.navigation()}>
            <div className={styles.controls}>
                <div className={styles.selectWrapper} title={LL.navbar.language()}>
                    <span className={styles.flagBadge} aria-hidden="true">
                        {locale === "es" ? (
                            <GT className={styles.flagIcon} />
                        ) : (
                            <US className={styles.flagIcon} />
                        )}
                    </span>
                    <ChevronDown
                        className={styles.selectChevron}
                        size={14}
                        strokeWidth={2.2}
                        aria-hidden="true"
                    />
                    <select
                        aria-label={LL.navbar.language()}
                        value={locale}
                        onChange={(event) => setLocale(event.target.value as Locales)}
                    >
                        <option value="es">{LL.navbar.spanish()}</option>
                        <option value="en">{LL.navbar.english()}</option>
                    </select>
                </div>

                <span className={styles.divider} aria-hidden="true" />

                <Spin
                    data-theme-toggle=""
                    className={`${styles.themeToggle} ${isDark ? styles.moonState : styles.sunState}`}
                    toggled={isDark}
                    onClick={toggleTheme}
                    duration={300}
                    aria-label={themeLabel}
                    title={themeLabel}
                />
            </div>
        </nav>
    );
}
