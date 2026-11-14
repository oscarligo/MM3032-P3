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

    const pages = Array.from({ length: pageCount }, (_, pageIndex) =>
        items.slice(pageIndex * PAGE_SIZE, pageIndex * PAGE_SIZE + PAGE_SIZE)
    );

    return (
        <div className={styles.carousel}>
            <div className={styles.viewport} aria-live="polite">
                <div
                    className={styles.track}
                    style={{ transform: `translateX(-${page * 100}%)` }}
                >
                    {pages.map((pageItems, pageIndex) => {
                        const isActive = pageIndex === page;
                        return (
                            <div
                                className={styles.page}
                                key={pageIndex}
                                aria-hidden={!isActive}
                                inert={!isActive ? true : undefined}
                            >
                                {pageItems.map((item, itemIndex) => (
                                    <div className={styles.slide} key={pageIndex * PAGE_SIZE + itemIndex}>
                                        {item}
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>

            {pageCount > 1 && (
                <div className={styles.controls}>
                    <button
                        type="button"
                        onClick={() => setPage((current) => current - 1)}
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
                        onClick={() => setPage((current) => current + 1)}
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
