import { motion, AnimatePresence } from "motion/react";
import { TegakiRenderer } from "tegaki/react";
import caveat from "tegaki/fonts/caveat";
import { useI18nContext } from "../../../i18n/i18n-react";
import { useLexerVisualization } from "../hooks/useLexerVisualization";
import styles from "./Lexer.module.css";

const FAST_TEGAKI = { glyphGap: 0, stagger: { advance: 0.025, duration: 0.12 } } as const;

const Chalk = ({ children }: { children: string | number }) => (
    <TegakiRenderer font={caveat} reducedMotion="user" timing={FAST_TEGAKI}>
        {children}
    </TegakiRenderer>
);

const StaticChalk = ({ children }: { children: string | number }) => (
    <TegakiRenderer font={caveat} reducedMotion="always">
        {children}
    </TegakiRenderer>
);

const CtrlBtn = ({ onClick, disabled, label }: { onClick: () => void; disabled?: boolean; label: string }) => (
    <button className={styles.btn} onClick={onClick} disabled={disabled}>
        <StaticChalk>{label}</StaticChalk>
    </button>
);

export default function Lexer() {
    const { LL } = useI18nContext();
    const {
        input, setInput, result, currentStep, settledTokens, stepIndex, isPlaying, hasStarted,
        boardRef, canvasRef, charRefs, tokenSlotRef, tokenOffset,
        previous, restart, togglePlaying, next,
    } = useLexerVisualization();

    return (
        <div className={styles.container}>
            {/* Cabecera */}
            <header className={styles.toolbar}>
                <h1 className={styles.title} id="lexer-title">
                    <StaticChalk>{LL.lexer.title()}</StaticChalk>
                </h1>
                <div className={styles.inputGroup}>
                    <label htmlFor="lexer-input">
                        <StaticChalk>{LL.lexer.inputLabel()}</StaticChalk>
                    </label>
                    <input
                        id="lexer-input"
                        className={styles.input}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        spellCheck={false}
                    />
                </div>
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
                                {char !== " " && <Chalk>{char}</Chalk>}
                            </span>
                        ))}
                    </div>

                    {/* Fila inferior de tokens */}
                    {hasStarted && (
                        <div className={styles.tokensRow}>
                            <span className={styles.bracket}><Chalk>{"["}</Chalk></span>

                            {settledTokens.map((step, idx) => (
                                <span key={`${step.cursor}-${idx}`} className={styles.token}>
                                    <Chalk>{`${step.tokenType}, `}</Chalk>
                                </span>
                            ))}

                            <AnimatePresence mode="wait">
                                {currentStep && (
                                    <motion.span
                                        key={`active-${currentStep.cursor}-${Math.round(tokenOffset.x)}-${Math.round(tokenOffset.y)}`}
                                        ref={tokenSlotRef}
                                        className={styles.activeSlot}
                                        initial={{ opacity: 1, x: tokenOffset.x, y: tokenOffset.y, scale: 1.15 }}
                                        animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                                        exit={{ opacity: 0.7 }}
                                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                                    >
                                        <motion.span
                                            initial={{ opacity: 1 }}
                                            animate={{ opacity: 0 }}
                                            transition={{ delay: 0.25, duration: 0.2 }}
                                            className={styles.glyphMorph}
                                        >
                                            <TegakiRenderer font={caveat} reducedMotion="user" timing={{ glyphGap: 0.01 }}>
                                                {currentStep.matchedText}
                                            </TegakiRenderer>
                                        </motion.span>

                                        <motion.span
                                            initial={{ opacity: 0, scale: 0.85 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.3, duration: 0.25 }}
                                        >
                                            <Chalk>
                                                {`${currentStep.tokenType}${stepIndex < result.steps.length - 1 ? ", " : ""}`}
                                            </Chalk>
                                        </motion.span>
                                    </motion.span>
                                )}
                            </AnimatePresence>

                            <span className={styles.bracket}><Chalk>{"]"}</Chalk></span>
                        </div>
                    )}

                    {/* Controles simples integrados a la pizarra */}
                    <div className={styles.controls}>
                        <CtrlBtn onClick={previous} disabled={stepIndex <= 0} label={LL.lexer.previous()} />
                        <CtrlBtn onClick={restart} label={LL.lexer.restart()} />
                        <CtrlBtn onClick={togglePlaying} disabled={result.steps.length < 1} label={isPlaying ? LL.lexer.pause() : LL.lexer.play()} />
                        <CtrlBtn onClick={next} disabled={stepIndex >= result.steps.length - 1} label={LL.lexer.next()} />
                    </div>
                </div>
            ) : (
                <p className={styles.empty}><Chalk>{LL.lexer.empty()}</Chalk></p>
            )}
        </div>
    );
}
