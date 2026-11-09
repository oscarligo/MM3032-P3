import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import styles from "./FitContent.module.css";

export default function FitContent({ children }: { children: ReactNode }) {
    const viewportRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [fitStyle, setFitStyle] = useState({ transform: "scale(1)" });

    useLayoutEffect(() => {
        const viewport = viewportRef.current;
        const content = contentRef.current;
        if (!viewport || !content) return;

        const fit = () => {
            if (!viewport.clientWidth || !viewport.clientHeight) return;
            const width = Math.max(1, content.scrollWidth);
            const height = Math.max(1, content.scrollHeight);
            const scale = Math.min(1, viewport.clientWidth / width, viewport.clientHeight / height);
            const left = Math.max(0, (viewport.clientWidth - width * scale) / 2);
            const transform = `translateX(${left}px) scale(${scale})`;
            setFitStyle((previous) => previous.transform === transform ? previous : { transform });
        };
        fit();
        const observer = new ResizeObserver(fit);
        observer.observe(viewport);
        observer.observe(content);
        // Intrinsic child sizes can change without changing the content's border box.
        Array.from(content.children).forEach((element) => observer.observe(element));
        content.querySelectorAll("[data-fit-content]").forEach((element) => observer.observe(element));
        return () => observer.disconnect();
    }, [children]);

    return (
        <div ref={viewportRef} className={styles.viewport}>
            <div ref={contentRef} className={styles.content} style={fitStyle}>
                {children}
            </div>
        </div>
    );
}
