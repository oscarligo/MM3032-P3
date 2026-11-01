import type { CSSProperties, ReactNode } from "react";
import styles from "./Whiteboard.module.css";

export interface WhiteboardProps {
    children?: ReactNode;
    width?: CSSProperties["width"];
    maxWidth?: CSSProperties["maxWidth"];
    height?: CSSProperties["height"];
    minHeight?: CSSProperties["minHeight"];
    padding?: CSSProperties["padding"];
    className?: string;
    ariaLabel?: string;
}

export default function Whiteboard({
    children,
    width,
    maxWidth,
    height,
    minHeight,
    padding,
    className,
    ariaLabel,
}: WhiteboardProps) {
    return (
        <section
            className={`${styles.whiteboard}${className ? ` ${className}` : ""}`}
            style={{ width, maxWidth, height, minHeight, padding }}
            aria-label={ariaLabel}
        >
            {children}
        </section>
    );
}
