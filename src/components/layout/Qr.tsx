import qrCode from "../../assets/qr.svg";
import { useI18nContext } from "../../i18n/i18n-react";
import styles from "./Qr.module.css";

export default function Qr({ visible }: { visible: boolean }) {
    const { LL } = useI18nContext();

    return (
        <aside
            className={`${styles.qr} ${visible ? styles.visible : styles.hidden}`}
            aria-label={LL.navbar.qrCode()}
            aria-hidden={!visible}
        >
            <img src={qrCode} alt={LL.navbar.qrCode()} />
        </aside>
    );
}
