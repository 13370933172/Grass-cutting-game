class AudioManager {
    constructor() {
        this.sfxVolume = 0.7;
        this.bgmVolume = 0.5;
        this.sounds = {};
        this.bgm = null;
        this.audioContext = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    createSound(type, frequency, duration, volume = 1) {
        if (!this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

        const finalVolume = volume * this.sfxVolume;
        gainNode.gain.setValueAtTime(finalVolume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    playHit() {
        this.createSound('square', 200, 0.1, 0.3);
    }

    playShoot() {
        this.createSound('sine', 400, 0.05, 0.2);
    }

    playExplosion() {
        this.createSound('sawtooth', 100, 0.3, 0.4);
    }

    playLevelUp() {
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.createSound('sine', freq, 0.2, 0.3);
            }, i * 100);
        });
    }

    playPickup() {
        this.createSound('sine', 800, 0.1, 0.2);
        setTimeout(() => {
            this.createSound('sine', 1000, 0.1, 0.2);
        }, 50);
    }

    playDamage() {
        this.createSound('square', 150, 0.1, 0.4);
    }

    playDeath() {
        this.createSound('sawtooth', 200, 0.5, 0.5);
    }

    playBossSpawn() {
        const notes = [200, 180, 160, 140];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.createSound('sawtooth', freq, 0.3, 0.4);
            }, i * 200);
        });
    }

    playSkillUnlock() {
        const notes = [392, 494, 587, 784];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.createSound('triangle', freq, 0.15, 0.25);
            }, i * 80);
        });
    }

    setSfxVolume(volume) {
        this.sfxVolume = volume;
    }

    setBgmVolume(volume) {
        this.bgmVolume = volume;
        if (this.bgm) {
            this.bgm.volume = volume;
        }
    }

    playBgm() {
        if (!this.bgm) {
            this.bgm = this.createProceduralBgm();
        }
    }

    createProceduralBgm() {
        if (!this.audioContext) return null;

        const bpm = 120;
        const beatDuration = 60 / bpm;
        const notes = [262, 294, 330, 349, 392, 440, 494, 523];
        
        let noteIndex = 0;
        let beatCount = 0;

        const playBeat = () => {
            if (!this.initialized) return;

            const note = notes[noteIndex % notes.length];
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(note, this.audioContext.currentTime);

            const volume = 0.1 * this.bgmVolume;
            gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + beatDuration * 0.8);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + beatDuration * 0.8);

            noteIndex++;
            beatCount++;

            if (beatCount % 8 === 0) {
                noteIndex = Math.floor(Math.random() * notes.length);
            }
        };

        const intervalId = setInterval(playBeat, beatDuration * 1000);
        
        return {
            stop: () => clearInterval(intervalId),
            set volume(v) {
                this.bgmVolume = v;
            }
        };
    }

    stopBgm() {
        if (this.bgm) {
            this.bgm.stop();
            this.bgm = null;
        }
    }

    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
}

const audioManager = new AudioManager();
