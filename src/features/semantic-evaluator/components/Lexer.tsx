import { motion, AnimatePresence } from "motion/react";
import { TegakiRenderer } from "tegaki/react";
import caveat from "tegaki/fonts/caveat";
import { useI18nContext } from "../../../i18n/i18n-react";
import { useLexerVisualization } from "../hooks/useLexerVisualization";
import styles from "./Lexer.module.css";

export default function Lexer() {
    const { LL } = useI18nContext();
    const {
        input,
        setInput,
        result,
        currentStep,
        settledTokens,
        stepIndex,
        isPlaying,
        hasStarted,
        boardRef,
        canvasRef,
        charRefs,
        previous,
        restart,
        togglePlaying,
        next,
    } = useLexerVisualization();

    const description =
        currentStep?.tokenType === "WHITESPACE"
            ? LL.lexer.whitespace()
            : currentStep
                ? LL.lexer.recognized({
                        type: currentStep.tokenType,
                        value: currentStep.matchedText || "EOF",
                    })
                : "";

    return (
        <section className={styles.boardSection} aria-labelledby="lexer-title">
            <header className={styles.toolbar}>
                <div className={styles.titleGroup}>
                    <h1 id="lexer-title">
                        <TegakiRenderer 
                            font={caveat} 
                            reducedMotion="always"
                        >
                            {LL.lexer.title()}
                        </TegakiRenderer>
                    </h1>
                    {description && (
                        <span className={styles.statusText}>
                            <TegakiRenderer
                                font={caveat}
                                reducedMotion="user"
                                time={{ mode: 'uncontrolled', speed:0.2}}
                            >
                                {LL.lexer.inputLabel()}
                            </TegakiRenderer>
                        </span>
                    )}
                </div>

                <div className={styles.inputsRow}>
                    <label className={styles.inputLabel} htmlFor="lexer-input">
                        <TegakiRenderer font={caveat} reducedMotion="user" timing={{ glyphGap: 0.0 }}>
                            {LL.lexer.inputLabel()}
                        </TegakiRenderer>
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
                    <TegakiRenderer font={caveat} reducedMotion="user" timing={{ glyphGap: 0.02 }}>
                        {LL.lexer.invalid()}
                    </TegakiRenderer>
                </p>
            ) : input ? (
                <div className={styles.canvasArea} ref={boardRef}>
                    {/* Capa de trazo RoughJS (se mantiene en blanco hasta el primer paso) */}
                    <canvas ref={canvasRef} className={styles.roughCanvas} />

                    {/* 1. Expresión superior (Tegaki + medición) */}
                    <div className={styles.formulaWrapper}>
                        <TegakiRenderer
                            key={input}
                            font={caveat}
                            reducedMotion="user"
                            timing={{ glyphGap: 0.025 }}
                            className={styles.formulaTegaki}
                        >
                            {input}
                        </TegakiRenderer>

                        <div className={styles.measureLayer} aria-hidden="true">
                            {input.split("").map((char, index) => (
                                <span
                                    key={index}
                                    ref={(el) => {
                                        charRefs.current[index] = el;
                                    }}
                                    className={styles.measureChar}
                                >
                                    {char}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* 2. Fila inferior de tokens: NO se muestra nada hasta el primer paso (stepIndex >= 0) */}
                    {hasStarted && (
                        <div className={styles.tokensRow}>
                            <span className={styles.bracket}>
                                <TegakiRenderer font={caveat} reducedMotion="user" timing={{ glyphGap: 0.01 }}>
                                    {"["}
                                </TegakiRenderer>
                            </span>

                            {/* Tokens fijados previamente */}
                            {settledTokens.map((step, idx) => (
                                <span key={`${step.cursor}-${idx}`} className={styles.settledToken}>
                                    <TegakiRenderer
                                        font={caveat}
                                        reducedMotion="user"
                                        timing={{ glyphGap: 0.02 }}
                                    >
                                        {`${step.tokenType}, `}
                                    </TegakiRenderer>
                                </span>
                            ))}

                            {/* Token activo que cae y se transforma */}
                            <AnimatePresence mode="wait">
                                {currentStep && (
                                    <motion.span
                                        key={`active-${currentStep.cursor}`}
                                        className={styles.activeTokenSlot}
                                        initial={{ opacity: 0, y: -45, scale: 1.2 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0.7 }}
                                        transition={{
                                            duration: 0.45,
                                            ease: [0.22, 1, 0.36, 1],
                                        }}
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
                                            <TegakiRenderer
                                                font={caveat}
                                                reducedMotion="user"
                                                timing={{ glyphGap: 0.02 }}
                                            >
                                                {`${currentStep.tokenType}${
                                                    stepIndex < result.steps.length - 1 ? ", " : ""
                                                }`}
                                            </TegakiRenderer>
                                        </motion.span>
                                    </motion.span>
                                )}
                            </AnimatePresence>

                            <span className={styles.bracket}>
                                <TegakiRenderer font={caveat} reducedMotion="user" timing={{ glyphGap: 0.01 }}>
                                    {"]"}
                                </TegakiRenderer>
                            </span>
                        </div>
                    )}

                    {/* Controles escritos en estilo Tegaki */}
                    <div className={styles.controls}>
                        <button onClick={previous} disabled={stepIndex <= 0}>
                            <TegakiRenderer font={caveat} reducedMotion="always">
                                {LL.lexer.previous()}
                            </TegakiRenderer>
                        </button>
                        <button onClick={restart}>
                            <TegakiRenderer font={caveat} reducedMotion="always">
                                {LL.lexer.restart()}
                            </TegakiRenderer>
                        </button>
                        <button onClick={togglePlaying} disabled={result.steps.length < 1}>
                            <TegakiRenderer font={caveat} reducedMotion="always">
                                {isPlaying ? LL.lexer.pause() : LL.lexer.play()}
                            </TegakiRenderer>
                        </button>
                        <button onClick={next} disabled={stepIndex >= result.steps.length - 1}>
                            <TegakiRenderer font={caveat} reducedMotion="always">
                                {LL.lexer.next()}
                            </TegakiRenderer>
                        </button>
                    </div>
                </div>
            ) : (
                <p className={styles.empty}>
                    <TegakiRenderer font={caveat} reducedMotion="user" timing={{ glyphGap: 0.02 }}>
                        {LL.lexer.empty()}
                    </TegakiRenderer>
                </p>
            )}
        </section>
    );
}
