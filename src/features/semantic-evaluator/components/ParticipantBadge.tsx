import { MicOff } from "lucide-react";
import styles from "./ParticipantBadge.module.css";

export default function ParticipantBadge() {
    return (
        <div className={styles.tile} role="status" aria-label="Héctor Sandoval, micrófono silenciado">
            <div className={styles.avatar} aria-hidden="true">HJ</div>
            <div className={styles.caption}>
                <MicOff size={17} className={styles.mutedIcon} aria-hidden="true" />
                <span>Héctor Sandoval</span>
            </div>
        </div>
    );
}
