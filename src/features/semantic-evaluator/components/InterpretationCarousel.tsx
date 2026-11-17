import { Children, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import styles from "./InterpretationCarousel.module.css";

type InterpretationCarouselProps = {
    children: ReactNode;
    previousLabel: string;
    nextLabel: string;
    pageSize?: number;
    className?: string;
    reserveControlsSpace?: boolean;
};

export default function InterpretationCarousel({ children, previousLabel, nextLabel, pageSize = 3, className, reserveControlsSpace = false }: InterpretationCarouselProps) {
    const items = useMemo(() => Children.toArray(children), [children]);
    const [page, setPage] = useState(0);
    const viewportRef = useRef<HTMLDivElement>(null);
    const pageCount = Math.max(1, Math.ceil(items.length / pageSize));

    useEffect(() => setPage((current) => Math.min(current, pageCount - 1)), [pageCount]);

    const pages = useMemo(
        () => Array.from({ length: pageCount }, (_, pageIndex) =>
            items.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize)
        ),
        [items, pageCount, pageSize]
    );

    const move = (nextPage: number) => {
        setPage(nextPage);
        window.requestAnimationFrame(() => {
            const viewport = viewportRef.current;
            viewport?.scrollTo({ left: viewport.clientWidth * nextPage, behavior: "smooth" });
        });
    };

    return (
        <div className={`${styles.carousel}${className ? ` ${className}` : ""}`}>
            <div className={styles.viewport} aria-live="polite" ref={viewportRef}>
                <div className={styles.track}>
                    {pages.map((pageItems, pageIndex) => {
                        const isActive = pageIndex === page;
                        return (
                            <div
                                className={`${styles.page} subtle-scrollbar ${isActive ? styles.activePage : ""}`}
                                key={pageIndex}
                                aria-hidden={!isActive}
                            >
                                {pageItems.map((item, itemIndex) => (
                                    <div className={styles.slide} key={pageIndex * pageSize + itemIndex}>
                                        {item}
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>

            {(pageCount > 1 || reserveControlsSpace) && (
                <div className={styles.controls}>
                    <button
                        type="button"
                        onClick={() => move(page - 1)}
                        disabled={page === 0}
                        aria-label={previousLabel}
                    >
                        ←
                    </button>
                    <div className={styles.progress} aria-hidden="true">
                        {Array.from({ length: pageCount }, (_, index) => (
                            <span className={index === page ? styles.active : ""} key={index} />
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => move(page + 1)}
                        disabled={page >= pageCount - 1}
                        aria-label={nextLabel}
                    >
                        →
                    </button>
                </div>
            )}
        </div>
    );
}
