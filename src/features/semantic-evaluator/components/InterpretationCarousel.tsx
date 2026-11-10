import { Children, type ReactNode, useEffect, useState } from "react";
import styles from "./InterpretationCarousel.module.css";

type InterpretationCarouselProps = {
    children: ReactNode;
    previousLabel: string;
    nextLabel: string;
};

const PAGE_SIZE = 3;

export default function InterpretationCarousel({ children, previousLabel, nextLabel }: InterpretationCarouselProps) {
    const items = Children.toArray(children);
    const [page, setPage] = useState(0);
    const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));

    useEffect(() => setPage((current) => Math.min(current, pageCount - 1)), [pageCount]);

    return (
        <div className={styles.carousel}>
            <div
                className={`${styles.viewport} ${pageCount > 1 ? styles.withControls : ""}`}
                aria-live="polite"
            >
                {items.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE).map((item, index) => (
                    <div className={styles.slide} key={page * PAGE_SIZE + index}>{item}</div>
                ))}
            </div>
            {pageCount > 1 && (
                <div className={styles.controls}>
                    <button type="button" onClick={() => setPage((current) => current - 1)} disabled={page === 0} aria-label={previousLabel}>←</button>
                    <button type="button" onClick={() => setPage((current) => current + 1)} disabled={page >= pageCount - 1} aria-label={nextLabel}>→</button>
                </div>
            )}
        </div>
    );
}
