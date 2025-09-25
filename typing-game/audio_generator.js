// 8bit音響生成システム
class ChiptuneSynthesizer {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);
        this.masterGain.gain.value = 0.3;
    }

    // 8bitスタイルの波形生成
    createOscillator(frequency, waveType = 'square') {
        const oscillator = this.audioContext.createOscillator();
        oscillator.type = waveType;
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        return oscillator;
    }

    // エンベロープ（音量変化）を適用
    applyEnvelope(gainNode, attack = 0.01, decay = 0.1, sustain = 0.7, release = 0.3) {
        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(1, now + attack);
        gainNode.gain.linearRampToValueAtTime(sustain, now + attack + decay);
        gainNode.gain.linearRampToValueAtTime(0, now + attack + decay + release);
    }

    // タイピング成功音
    playSuccessSound() {
        const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
        frequencies.forEach((freq, index) => {
            setTimeout(() => {
                const oscillator = this.createOscillator(freq, 'square');
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.masterGain);
                
                this.applyEnvelope(gainNode, 0.01, 0.05, 0.3, 0.1);
                
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.2);
            }, index * 50);
        });
    }

    // ミス音
    playMissSound() {
        const oscillator = this.createOscillator(130.81, 'sawtooth'); // C3
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        // 下降する音程
        oscillator.frequency.exponentialRampToValueAtTime(65.41, this.audioContext.currentTime + 0.3);
        this.applyEnvelope(gainNode, 0.01, 0.1, 0.5, 0.2);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.3);
    }

    // コンボ音
    playComboSound(comboLevel) {
        const baseFreq = 261.63; // C4
        const frequency = baseFreq * Math.pow(1.2, Math.min(comboLevel / 10, 5));
        
        const oscillator = this.createOscillator(frequency, 'triangle');
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        this.applyEnvelope(gainNode, 0.01, 0.05, 0.8, 0.15);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.2);
    }

    // BGM生成（ループ）
    startBGM() {
        this.stopBGM();
        this.bgmInterval = setInterval(() => {
            this.playBGMSequence();
        }, 4000);
        this.playBGMSequence();
    }

    stopBGM() {
        if (this.bgmInterval) {
            clearInterval(this.bgmInterval);
            this.bgmInterval = null;
        }
    }

    // BGMシーケンス
    playBGMSequence() {
        const melody = [
            { freq: 523.25, duration: 0.5 }, // C5
            { freq: 659.25, duration: 0.5 }, // E5
            { freq: 783.99, duration: 0.5 }, // G5
            { freq: 659.25, duration: 0.5 }, // E5
            { freq: 523.25, duration: 0.5 }, // C5
            { freq: 440.00, duration: 0.5 }, // A4
            { freq: 493.88, duration: 1.0 }, // B4
        ];

        let currentTime = 0;
        melody.forEach(note => {
            setTimeout(() => {
                const oscillator = this.createOscillator(note.freq, 'square');
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.masterGain);
                
                gainNode.gain.value = 0.1; // BGMは小さめに
                this.applyEnvelope(gainNode, 0.05, 0.1, 0.6, note.duration - 0.15);
                
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + note.duration);
            }, currentTime * 1000);
            currentTime += note.duration;
        });
    }
}

// グローバルインスタンス
let audioSystem = null;

// 音響システム初期化
function initAudioSystem() {
    if (!audioSystem) {
        audioSystem = new ChiptuneSynthesizer();
    }
    return audioSystem;
}

