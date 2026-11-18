// Admit both the requested folder and the project's existing "Audio" spelling.
const soundUrls = import.meta.glob<string>("../assets/{audio,Audio}/*.m4a", {
    eager: true,
    query: "?url",
    import: "default",
});

export function createParticipantAudio() {
    let active: HTMLAudioElement | undefined;

    const stop = () => {
        if (!active) return;
        active.pause();
        active.currentTime = 0;
        active = undefined;
    };

    const play = (visible: boolean) => {
        stop();
        const filename = visible ? "welcome.m4a" : "Goodbye.m4a";
        const url = Object.entries(soundUrls).find(([path]) =>
            path.toLowerCase().endsWith(`/${filename.toLowerCase()}`))?.[1];
        if (!url) {
            console.warn(`Falta el audio src/assets/audio/${filename}. Agrégalo y vuelve a compilar.`);
            return;
        }
        const audio = new Audio(url);
        active = audio;
        audio.volume = 0.8;
        void audio.play().catch((error: unknown) => {
            // Pausing a sound during a rapid toggle can cancel its pending play().
            if (active === audio) console.warn(`No se pudo reproducir ${filename}.`, error);
        });
    };

    return { play, stop };
}
