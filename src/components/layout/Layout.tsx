import type { ReactNode } from "react";
import NavBar from "./NavBar";
import Control from "./Control";
import styles from "./Layout.module.css";

export default function Layout({ children }: { children: ReactNode }) {
    return (
        <div className={styles.layout}>
            <NavBar />
            <main className={styles.content}>{children}</main>
            <Control />
        </div>
    );
}
