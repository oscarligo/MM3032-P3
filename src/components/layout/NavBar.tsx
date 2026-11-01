import { useEffect } from "react";
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

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
    }, [theme]);

    return (
        <nav className={styles.navbar} aria-label={LL.navbar.navigation()}>
            <span className={styles.brand}>{LL.navbar.title()}</span>
            <div className={styles.controls}>
                <label>
                    <span>{LL.navbar.language()}</span>
                    <select value={locale} onChange={(event) => setLocale(event.target.value as Locales)}>
                        <option value="es">{LL.navbar.spanish()}</option>
                        <option value="en">{LL.navbar.english()}</option>
                    </select>
                </label>
                <button type="button" onClick={toggleTheme} aria-pressed={theme === "dark"}>
                    {theme === "dark" ? LL.navbar.lightTheme() : LL.navbar.darkTheme()}
                </button>
            </div>
        </nav>
    );
}
