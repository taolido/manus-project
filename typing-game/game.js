// ゲームメインクラス
class TypingGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.audioSystem = null;
        
        // ゲーム状態
        this.gameState = 'start'; // 'start', 'playing', 'gameOver'
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.level = 1;
        this.lives = 3;
        
        // 文字関連
        this.fallingChars = [];
        this.charSpeed = 1;
        this.spawnRate = 0.02;
        this.lastSpawnTime = 0;
        
        // キャラクター画像
        this.characterImages = {
            normal: 'character_normal.png',
            focused: 'character_focused.png',
            excited: 'character_excited.png',
            awakened: 'character_awakened.png',
            super: 'character_super.png'
        };
        this.currentCharacterState = 'normal';
        
        // 文字セット
        this.charSets = {
            hiragana: 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん',
            katakana: 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン',
            english: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            numbers: '0123456789'
        };
        
        // 入力バッファ
        this.inputBuffer = '';
        this.targetChar = '';
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.updateUI();
        this.gameLoop();
    }
    
    setupEventListeners() {
        // スタートボタン
        document.getElementById('startButton').addEventListener('click', () => {
            this.startGame();
        });
        
        // リスタートボタン
        document.getElementById('restartButton').addEventListener('click', () => {
            this.restartGame();
        });
        
        // キーボード入力
        document.addEventListener('keydown', (e) => {
            if (this.gameState === 'playing') {
                this.handleKeyInput(e);
            }
        });
        
        // 音響システム初期化（ユーザーインタラクション後）
        document.addEventListener('click', () => {
            if (!this.audioSystem) {
                this.audioSystem = initAudioSystem();
            }
        }, { once: true });
    }
    
    startGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.level = 1;
        this.lives = 3;
        this.fallingChars = [];
        this.charSpeed = 1;
        this.spawnRate = 0.02;
        
        document.getElementById('startScreen').style.display = 'none';
        document.getElementById('gameOverScreen').style.display = 'none';
        
        if (this.audioSystem) {
            this.audioSystem.startBGM();
        }
        
        this.updateUI();
        this.updateCharacterState();
    }
    
    restartGame() {
        this.startGame();
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        
        if (this.audioSystem) {
            this.audioSystem.stopBGM();
        }
        
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('maxCombo').textContent = this.maxCombo;
        document.getElementById('gameOverScreen').style.display = 'block';
    }
    
    handleKeyInput(e) {
        const key = e.key;
        
        // 特殊キーは無視
        if (key.length > 1 && key !== 'Backspace') return;
        
        if (key === 'Backspace') {
            this.inputBuffer = this.inputBuffer.slice(0, -1);
            this.updateUI();
            return;
        }
        
        this.inputBuffer += key;
        this.checkCharacterMatch();
        this.updateUI();
    }
    
    checkCharacterMatch() {
        for (let i = this.fallingChars.length - 1; i >= 0; i--) {
            const char = this.fallingChars[i];
            
            // 直接マッチ（英数字）
            if (char.text === this.inputBuffer) {
                this.destroyCharacter(i);
                this.inputBuffer = '';
                return;
            }
            
            // ローマ字変換マッチ（ひらがな・カタカナ）
            const romaji = this.convertToRomaji(char.text);
            if (romaji && romaji === this.inputBuffer.toLowerCase()) {
                this.destroyCharacter(i);
                this.inputBuffer = '';
                return;
            }
            
            // 部分マッチ判定（ローマ字入力中）
            if (romaji && romaji.startsWith(this.inputBuffer.toLowerCase()) && this.inputBuffer.length > 0) {
                // 入力中の状態を維持
                return;
            }
        }
        
        // マッチしない場合は入力をクリア（誤入力防止）
        if (this.inputBuffer.length > 3) {
            this.inputBuffer = '';
        }
    }
    
    convertToRomaji(char) {
        const romajiMap = {
            // ひらがな
            'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
            'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
            'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
            'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
            'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
            'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
            'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
            'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
            'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
            'わ': 'wa', 'を': 'wo', 'ん': 'n',
            // カタカナ
            'ア': 'a', 'イ': 'i', 'ウ': 'u', 'エ': 'e', 'オ': 'o',
            'カ': 'ka', 'キ': 'ki', 'ク': 'ku', 'ケ': 'ke', 'コ': 'ko',
            'サ': 'sa', 'シ': 'shi', 'ス': 'su', 'セ': 'se', 'ソ': 'so',
            'タ': 'ta', 'チ': 'chi', 'ツ': 'tsu', 'テ': 'te', 'ト': 'to',
            'ナ': 'na', 'ニ': 'ni', 'ヌ': 'nu', 'ネ': 'ne', 'ノ': 'no',
            'ハ': 'ha', 'ヒ': 'hi', 'フ': 'fu', 'ヘ': 'he', 'ホ': 'ho',
            'マ': 'ma', 'ミ': 'mi', 'ム': 'mu', 'メ': 'me', 'モ': 'mo',
            'ヤ': 'ya', 'ユ': 'yu', 'ヨ': 'yo',
            'ラ': 'ra', 'リ': 'ri', 'ル': 'ru', 'レ': 're', 'ロ': 'ro',
            'ワ': 'wa', 'ヲ': 'wo', 'ン': 'n'
        };
        
        return romajiMap[char] || null;
    }
    
    destroyCharacter(index) {
        this.fallingChars.splice(index, 1);
        this.score += 10 * (this.level + this.combo / 10);
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        
        // レベルアップ判定
        if (this.score > this.level * 500) {
            this.level++;
            this.charSpeed += 0.5;
            this.spawnRate += 0.005;
        }
        
        // 音効果
        if (this.audioSystem) {
            this.audioSystem.playSuccessSound();
            if (this.combo % 10 === 0 && this.combo > 0) {
                this.audioSystem.playComboSound(this.combo);
            }
        }
        
        this.updateUI();
        this.updateCharacterState();
        this.createParticleEffect();
    }
    
    missCharacter() {
        this.combo = 0;
        this.lives--;
        
        if (this.audioSystem) {
            this.audioSystem.playMissSound();
        }
        
        if (this.lives <= 0) {
            this.gameOver();
        }
        
        this.updateUI();
        this.updateCharacterState();
    }
    
    updateCharacterState() {
        let newState = 'normal';
        
        if (this.combo >= 50) {
            newState = 'super';
        } else if (this.combo >= 30) {
            newState = 'awakened';
        } else if (this.combo >= 20) {
            newState = 'excited';
        } else if (this.combo >= 10) {
            newState = 'focused';
        }
        
        if (newState !== this.currentCharacterState) {
            this.currentCharacterState = newState;
            document.getElementById('characterImage').src = this.characterImages[newState];
        }
    }
    
    spawnCharacter() {
        if (Math.random() < this.spawnRate) {
            const charTypes = Object.keys(this.charSets);
            const randomType = charTypes[Math.floor(Math.random() * charTypes.length)];
            const charSet = this.charSets[randomType];
            const randomChar = charSet[Math.floor(Math.random() * charSet.length)];
            
            this.fallingChars.push({
                text: randomChar,
                x: Math.random() * (this.canvas.width - 40) + 20,
                y: -30,
                speed: this.charSpeed + Math.random() * 0.5,
                color: this.getRandomColor()
            });
        }
    }
    
    getRandomColor() {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    updateFallingChars() {
        for (let i = this.fallingChars.length - 1; i >= 0; i--) {
            const char = this.fallingChars[i];
            char.y += char.speed;
            
            // 画面下端に到達した場合
            if (char.y > this.canvas.height) {
                this.fallingChars.splice(i, 1);
                this.missCharacter();
            }
        }
    }
    
    createParticleEffect() {
        // 簡単なパーティクルエフェクト
        const particles = [];
        for (let i = 0; i < 5; i++) {
            particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 30,
                color: this.getRandomColor()
            });
        }
        
        const animateParticles = () => {
            this.ctx.save();
            for (let particle of particles) {
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.life--;
                
                this.ctx.globalAlpha = particle.life / 30;
                this.ctx.fillStyle = particle.color;
                this.ctx.fillRect(particle.x, particle.y, 3, 3);
            }
            this.ctx.restore();
            
            if (particles.some(p => p.life > 0)) {
                requestAnimationFrame(animateParticles);
            }
        };
        
        animateParticles();
    }
    
    render() {
        // 背景をクリア
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 背景グラデーション
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 降下する文字を描画
        this.ctx.font = '24px "Press Start 2P"';
        this.ctx.textAlign = 'center';
        
        for (let char of this.fallingChars) {
            // 影効果
            this.ctx.fillStyle = '#000';
            this.ctx.fillText(char.text, char.x + 2, char.y + 2);
            
            // メイン文字
            this.ctx.fillStyle = char.color;
            this.ctx.fillText(char.text, char.x, char.y);
        }
        
        // 入力バッファ表示
        if (this.inputBuffer) {
            this.ctx.font = '20px "Press Start 2P"';
            this.ctx.fillStyle = '#ffff00';
            this.ctx.textAlign = 'left';
            this.ctx.fillText('入力: ' + this.inputBuffer, 20, this.canvas.height - 30);
        }
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('combo').textContent = this.combo;
        document.getElementById('level').textContent = this.level;
    }
    
    gameLoop() {
        if (this.gameState === 'playing') {
            this.spawnCharacter();
            this.updateFallingChars();
        }
        
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// ゲーム開始
window.addEventListener('load', () => {
    new TypingGame();
});

