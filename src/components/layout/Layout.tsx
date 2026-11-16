import { useState, type ReactNode } from "react";
import NavBar from "./NavBar";
import Control from "./Control";
import Qr from "./Qr";
import styles from "./Layout.module.css";

export default function Layout({ children }: { children: ReactNode }) {
    const [showQr, setShowQr] = useState(false);

    return (
        <div className={styles.layout}>
            <NavBar showQr={showQr} onToggleQr={() => setShowQr((visible) => !visible)} />
            <Qr visible={showQr} />
            <main className={styles.content}>{children}</main>
            <Control />
        </div>
    );
}
