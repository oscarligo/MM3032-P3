import type { CSSProperties, ReactNode } from "react";
import styles from "./Whiteboard.module.css";

export interface WhiteboardProps {
    id?: string;
    children?: ReactNode;
    width?: CSSProperties["width"];
    maxWidth?: CSSProperties["maxWidth"];
    height?: CSSProperties["height"];
    minHeight?: CSSProperties["minHeight"];
    padding?: CSSProperties["padding"];
    className?: string;
    ariaLabel?: string;
    isCenter?: boolean;
}

export default function Whiteboard({
    id,
    children,
    width,
    maxWidth,
    height,
    minHeight,
    padding,
    className,
    ariaLabel,
    isCenter,
}: WhiteboardProps) {
    const showCorners =
        isCenter ?? (/center/i.test(className ?? "") || /center/i.test(id ?? ""));

    return (
        <section
            id={id}
            className={`${styles.whiteboard}${showCorners ? ` ${styles.isCenter}` : ""}${className ? ` ${className}` : ""}`}
            style={{ width, maxWidth, height, minHeight, padding }}
            aria-label={ariaLabel}
        >
            <span className={`${styles.corner} ${styles.cornerTL}`} aria-hidden="true" />
            <span className={`${styles.corner} ${styles.cornerTR}`} aria-hidden="true" />
            <span className={`${styles.corner} ${styles.cornerBL}`} aria-hidden="true" />
            <span className={`${styles.corner} ${styles.cornerBR}`} aria-hidden="true" />
            {children}
        </section>
    );
}
