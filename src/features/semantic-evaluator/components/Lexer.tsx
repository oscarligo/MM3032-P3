import { TegakiRenderer } from "tegaki/react";
import caveat from "tegaki/fonts/caveat";
import { useI18nContext } from "../../../i18n/i18n-react";
import { useLexerVisualization } from "../hooks/useLexerVisualization";
import styles from "./Lexer.module.css";

const FAST_TEGAKI = { glyphGap: 0, stagger: { advance: 0.025, duration: 0.12 } } as const;

const Chalk = ({ children }: { children: string | number }) => (
    <TegakiRenderer font={caveat} reducedMotion="user" timing={FAST_TEGAKI}>
        {String(children)}
    </TegakiRenderer>
);

const StaticChalk = ({ children }: { children: string | number }) => (
    <TegakiRenderer font={caveat} reducedMotion="always">
        {String(children)}
    </TegakiRenderer>
);

export default function Lexer() {
    const { LL } = useI18nContext();
    const {
        input, result, boardRef, canvasRef, charRefs,
    } = useLexerVisualization();

    return (
        <div className={styles.container}>
            <header className={styles.toolbar}>
                <h1 className={styles.title} id="lexer-title">
                    <StaticChalk>{LL.lexer.title()}</StaticChalk>
                </h1>
            </header>

            {result.error ? (
                <p className={styles.error} role="alert">
                    <Chalk>{LL.lexer.invalid()}</Chalk>
                </p>
            ) : input ? (
                <div className={styles.stage} ref={boardRef}>
                    <canvas ref={canvasRef} className={styles.canvas} />

                    {/* Expresión superior */}
                    <div className={styles.formulaRow}>
                        {input.split("").map((char, i) => (
                            <span
                                key={`${char}-${i}`}
                                ref={(el) => { charRefs.current[i] = el; }}
                                className={char === " " ? styles.space : styles.char}
                            >
                                {char !== " " && (
                                    <>
                                        <Chalk>{char}</Chalk>
                                        {result.predicateSubscripts.get(i) && (
                                            <span className={styles.aritySubscript}>
                                                <Chalk>{result.predicateSubscripts.get(i)!}</Chalk>
                                            </span>
                                        )}
                                    </>
                                )}
                            </span>
                        ))}
                    </div>

                </div>
            ) : (
                <p className={styles.empty}><Chalk>{LL.lexer.empty()}</Chalk></p>
            )}
        </div>
    );
}
