import clickSound from "../assets/Audio/Click-mouse.mp3";
import aston from "../assets/Audio/Gran Turismo (Japan) Soundtrack - Aston Martin Car Dealer.mp3";
import chrysler from "../assets/Audio/Gran Turismo (Japan) Soundtrack - Chrysler (Dodge) Car Dealer.mp3";
import toyota from "../assets/Audio/Gran Turismo (Japan) Soundtrack - Toyota Car Dealer.mp3";

// Los clics suenan más fuerte que la música para que el fondo no los tape
const CLICK_VOLUME = 0.7;
const MUSIC_VOLUME = 0.12;

const PLAYLIST = [aston, chrysler, toyota];

function startMusic(): () => void {
    let index = Math.floor(Math.random() * PLAYLIST.length);
    const music = new Audio(PLAYLIST[index]);
    music.volume = MUSIC_VOLUME;
    let started = false;

    const playNext = () => {
        index = (index + 1) % PLAYLIST.length;
        music.src = PLAYLIST[index];
        void music.play().catch(() => undefined);
    };
    music.addEventListener("ended", playNext);

    // Los navegadores bloquean el audio hasta la primera interacción del usuario
    const unlock = () => {
        if (started) return;
        void music.play().then(() => {
            started = true;
            removeUnlockListeners();
        }).catch(() => undefined);
    };
    const removeUnlockListeners = () => {
        document.removeEventListener("pointerdown", unlock, true);
        document.removeEventListener("keydown", unlock, true);
    };
    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("keydown", unlock, true);

    return () => {
        removeUnlockListeners();
        music.removeEventListener("ended", playNext);
        music.pause();
        music.removeAttribute("src");
        music.load();
    };
}

function startClickSound(): () => void {
    const base = new Audio(clickSound);
    base.preload = "auto";

    const onClick = (event: MouseEvent) => {
        const button = (event.target as Element | null)?.closest("button");
        if (!button || button.disabled) return;
        // Un clon por clic permite que clics rápidos se superpongan sin cortarse
        const click = base.cloneNode() as HTMLAudioElement;
        click.volume = CLICK_VOLUME;
        void click.play().catch(() => undefined);
    };
    document.addEventListener("click", onClick, true);

    return () => document.removeEventListener("click", onClick, true);
}

export function initAudio(): () => void {
    const stopMusic = startMusic();
    const stopClicks = startClickSound();
    return () => {
        stopMusic();
        stopClicks();
    };
}
