const screens = document.querySelectorAll('.screen');
const diffBtns = document.querySelectorAll('.diff-btn');
const showScoreboardBtn = document.getElementById('show-scoreboard-btn');
const backToStartBtn = document.getElementById('back-to-start-btn');
const restartBtn = document.getElementById('restart-btn');
const toMenuBtn = document.getElementById('to-menu-btn');
const submitBtn = document.getElementById('submit-btn');
const answerInput = document.getElementById('answer-input');
const equationDisplay = document.getElementById('equation-display');
const timeLeftDisplay = document.getElementById('time-left');
const scoreDisplay = document.getElementById('score');
const finalScoreDisplay = document.getElementById('final-score');
const feedbackMessage = document.getElementById('feedback-message');
const endMessage = document.getElementById('end-message');
const saveScoreBtn = document.getElementById('save-score-btn');
const playerNameInput = document.getElementById('player-name');

// New feature elements
const comboBadge = document.getElementById('combo-badge');
const hintContainer = document.getElementById('hint-container');
const hintList = document.getElementById('hint-list');
const pauseBtn = document.getElementById('pause-btn');
const resumeBtn = document.getElementById('resume-btn');
const pauseOverlay = document.getElementById('pause-overlay');
const toggleMusicBtn = document.getElementById('toggle-music-btn');

let currentEq = null;
let score = 0;
let timeLeft = 120;
let timer = null;
let currentDifficulty = 'medium';

let consecutiveCorrect = 0;
let wrongAttempts = 0;
let isPaused = false;
let isMusicPlaying = false;

const GAME_TIME = 120;

// AUDIO SYNTHESIS SYSTEM
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;
let bgmInterval;

function initAudio() {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSoundEffect(type) {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'correct') { // Magical Ding
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    } else if (type === 'wrong') { // Deep Boing
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    } else if (type === 'tick') { // Tick Tock
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.02, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.05);
    }
}

function toggleBGM() {
    initAudio();
    isMusicPlaying = !isMusicPlaying;
    
    if (isMusicPlaying) {
        toggleMusicBtn.innerText = '🔊';
        let step = 0;
        const scale = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5 (Happy Arp)
        bgmInterval = setInterval(() => {
            if(isPaused) return; 
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.frequency.value = scale[step % scale.length];
            osc.type = 'sine';
            
            gain.gain.setValueAtTime(0.03, audioCtx.currentTime); // Very quiet
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
            
            osc.start();
            osc.stop(audioCtx.currentTime + 0.2);
            step++;
        }, 400);
    } else {
        toggleMusicBtn.innerText = '🎵';
        clearInterval(bgmInterval);
    }
}

toggleMusicBtn.addEventListener('click', toggleBGM);

// GAME LOGIC
function switchScreen(screenId) {
    screens.forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

diffBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        initAudio(); // Initialize audio on first user interaction
        currentDifficulty = e.target.getAttribute('data-diff');
        startGame();
    });
});

function startGame() {
    score = 0;
    timeLeft = GAME_TIME;
    consecutiveCorrect = 0;
    wrongAttempts = 0;
    isPaused = false;
    
    scoreDisplay.innerText = score;
    timeLeftDisplay.innerText = timeLeft;
    answerInput.value = '';
    feedbackMessage.style.opacity = '0';
    comboBadge.classList.remove('active');
    hintContainer.style.display = 'none';
    pauseOverlay.classList.remove('active');
    
    switchScreen('game-screen');
    nextQuestion();
    
    timer = setInterval(() => {
        if (!isPaused) {
            timeLeft--;
            timeLeftDisplay.innerText = timeLeft;
            
            if (timeLeft <= 10 && timeLeft > 0) {
                playSoundEffect('tick');
            }
            
            if (timeLeft <= 0) {
                endGame();
            }
        }
    }, 1000);
}

function pauseGame() {
    isPaused = true;
    pauseOverlay.classList.add('active');
}

function resumeGame() {
    isPaused = false;
    pauseOverlay.classList.remove('active');
    answerInput.focus();
}

pauseBtn.addEventListener('click', pauseGame);
resumeBtn.addEventListener('click', resumeGame);

function endGame() {
    clearInterval(timer);
    finalScoreDisplay.innerText = score;
    hintContainer.style.display = 'none';
    
    if (score >= 150) {
        endMessage.innerText = "Sen bir matematik dehasısın! 🤯🏆";
    } else if (score >= 80) {
        endMessage.innerText = "Harika iş çıkardın! Biraz daha pratikle uçabilirsin! 🦅";
    } else {
        endMessage.innerText = "Pes etmek yok, bir daha dene! 💪";
    }
    
    let scores = JSON.parse(localStorage.getItem('mathGameScores')) || [];
    const isTop10 = scores.length < 10 || score >= (scores[scores.length - 1]?.score || 0);

    if (isTop10 && score > 0) {
        document.getElementById('save-score-section').style.display = 'block';
        playerNameInput.value = '';
        setTimeout(() => playerNameInput.focus(), 100);
    } else {
        document.getElementById('save-score-section').style.display = 'none';
        if(score > 0) endMessage.innerText += "\n(Skor tablosuna giremedin, bir dahakine!)";
    }

    switchScreen('end-screen');
}

// EQUATION GENERATOR
function generateEquation() {
    let x, a, b, c, type;
    let eqStr = "";
    let steps = [];

    // Max X thresholds
    let mx = currentDifficulty === 'easy' ? 10 : (currentDifficulty === 'medium' ? 15 : 20);
    x = Math.floor(Math.random() * mx) + 1; 

    // Available Types
    let maxType = currentDifficulty === 'easy' ? 2 : (currentDifficulty === 'medium' ? 5 : 8);
    type = Math.floor(Math.random() * (maxType + 1));
    
    // Scale operations based on difficulty
    let coeffBonus = currentDifficulty === 'hard' ? 5 : 0;
    let valBonus = currentDifficulty === 'hard' ? 20 : 0;

    switch(type) {
        case 0: // ax = b
            a = Math.floor(Math.random() * 8) + 2 + coeffBonus;
            b = a * x;
            eqStr = `${a}x = ${b}`;
            steps = [`Çarpım durumundaki ${a}, işlemlerin diğer tarafına bölme olarak geçer.`, `x = ${b} / ${a}`, `x = ${x}`];
            break;
        case 1: // x + a = b
            a = Math.floor(Math.random() * 20) + 1 + valBonus;
            b = x + a;
            eqStr = `x + ${a} = ${b}`;
            steps = [`+${a}'yı eşitliğin diğer tarafına -${a} olarak atıyoruz.`, `x = ${b} - ${a}`, `x = ${x}`];
            break;
        case 2: // x - a = b
            a = Math.floor(Math.random() * 20) + 1 + valBonus;
            b = x - a;
            eqStr = `x - ${a} = ${b}`;
            steps = [`-${a}'yı eşitliğin diğer tarafına +${a} olarak atıyoruz.`, `x = ${b} + ${a}`, `x = ${x}`];
            break;
        case 3: // ax + b = c
            a = Math.floor(Math.random() * 5) + 2 + coeffBonus;
            b = Math.floor(Math.random() * 15) + 1 + valBonus;
            c = a * x + b;
            eqStr = `${a}x + ${b} = ${c}`;
            steps = [`Önce +${b}'yi karşıya eksi olarak geçiriyoruz: ${a}x = ${c} - ${b}`, `${a}x = ${c - b}`, `Şimdi her iki tarafı ${a}'ya bölüyoruz: x = ${c - b} / ${a}`, `x = ${x}`];
            break;
        case 4: // ax - b = c
            a = Math.floor(Math.random() * 5) + 2 + coeffBonus;
            b = Math.floor(Math.random() * 15) + 1 + valBonus;
            c = a * x - b;
            eqStr = `${a}x - ${b} = ${c}`;
            steps = [`Önce -${b}'yi karşıya artı olarak geçiriyoruz: ${a}x = ${c} + ${b}`, `${a}x = ${c + b}`, `Şimdi her iki tarafı ${a}'ya bölüyoruz: x = ${c + b} / ${a}`, `x = ${x}`];
            break;
        case 5: // a(x + b) = c
            a = Math.floor(Math.random() * 4) + 2 + coeffBonus;
            b = Math.floor(Math.random() * 5) + 1;
            c = a * (x + b);
            eqStr = `${a}(x + ${b}) = ${c}`;
            steps = [`Önce çarpım durumundaki ${a}'yı karşıya bölme olarak atıyoruz: x + ${b} = ${c} / ${a}`, `x + ${b} = ${c / a}`, `Şimdi +${b}'yi karşıya eksi olarak atıyoruz: x = ${c / a} - ${b}`, `x = ${x}`];
            break;
        case 6: // a(x - b) = c
            a = Math.floor(Math.random() * 4) + 2 + coeffBonus;
            b = Math.floor(Math.random() * x) + 1;
            if (b === x) b = Math.max(1, x - 1);
            c = a * (x - b);
            eqStr = `${a}(x - ${b}) = ${c}`;
            steps = [`Önce çarpım durumundaki ${a}'yı karşıya bölme olarak atıyoruz: x - ${b} = ${c} / ${a}`, `x - ${b} = ${c / a}`, `Şimdi -${b}'yi karşıya artı olarak atıyoruz: x = ${c / a} + ${b}`, `x = ${x}`];
            break;
        case 7: // x / a = b
            a = Math.floor(Math.random() * 8) + 2 + coeffBonus;
            b = Math.floor(Math.random() * 10) + 1;
            x = a * b; // redefine x to be perfectly divisible
            eqStr = `x / ${a} = ${b}`;
            steps = [`Bölüm durumundaki ${a}'yı karşıya çarpım olarak geçiriyoruz.`, `x = ${b} x ${a}`, `x = ${x}`];
            break;
        case 8: // x / a + b = c
            a = Math.floor(Math.random() * 5) + 2 + coeffBonus;
            b = Math.floor(Math.random() * 10) + 1 + valBonus;
            c = b + Math.floor(Math.random() * 5) + 1; // ensures c > b
            x = a * (c - b);
            eqStr = `x / ${a} + ${b} = ${c}`;
            steps = [`Önce +${b}'yi karşıya eksi olarak atıyoruz: x / ${a} = ${c} - ${b}`, `x / ${a} = ${c - b}`, `Bölüm durumundaki ${a}'yı karşıya çarpım olarak geçiriyoruz: x = ${c - b} x ${a}`, `x = ${x}`];
            break;
    }
    
    return { question: eqStr, answer: x, steps: steps };
}

function nextQuestion() {
    currentEq = generateEquation();
    equationDisplay.innerText = currentEq.question;
    answerInput.value = '';
    answerInput.focus();
    wrongAttempts = 0;
    hintContainer.style.display = 'none';
}

function checkAnswer() {
    if (isPaused) return;
    const userVal = parseInt(answerInput.value);
    if (isNaN(userVal)) return;

    if (userVal === currentEq.answer) {
        playSoundEffect('correct');
        consecutiveCorrect++;
        
        let points = 10;
        if (consecutiveCorrect >= 3) {
            points = 20;
            comboBadge.classList.add('active');
        }
        
        score += points;
        scoreDisplay.innerText = score;
        
        let msg = consecutiveCorrect >= 3 ? "Alev Aldın! 🔥" : "Doğru! 🥳";
        showFeedback(msg, "correct");
        nextQuestion();
    } else {
        playSoundEffect('wrong');
        consecutiveCorrect = 0;
        comboBadge.classList.remove('active');
        
        wrongAttempts++;
        score = Math.max(0, score - 2);
        scoreDisplay.innerText = score;
        showFeedback("Yanlış, Tekrar Dene 😢", "wrong");
        
        if (wrongAttempts >= 2) {
            showHint();
        }
        
        answerInput.value = '';
        answerInput.focus();
    }
}

function showHint() {
    hintList.innerHTML = '';
    currentEq.steps.forEach(stepText => {
        const li = document.createElement('li');
        li.innerText = stepText;
        hintList.appendChild(li);
    });
    hintContainer.style.display = 'block';
}

function showFeedback(text, type) {
    feedbackMessage.innerText = text;
    feedbackMessage.className = `feedback ${type}`;
    feedbackMessage.style.opacity = '1';
    
    feedbackMessage.style.animation = 'none';
    void feedbackMessage.offsetWidth;
    
    feedbackMessage.style.animation = type === 'correct' ? 'popCorrect 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' : 'shake 0.5s ease-out';
    
    setTimeout(() => feedbackMessage.style.opacity = '0', 1500);
}

// SCOREBOARD LOGIC
function showScoreboard() {
    switchScreen('scoreboard-screen');
    const list = document.getElementById('scoreboard-list');
    list.innerHTML = '';
    
    let scores = JSON.parse(localStorage.getItem('mathGameScores')) || [];
    
    if (scores.length === 0) {
        list.innerHTML = '<li style="justify-content: center; color: #718096;">Henüz skor kaydedilmedi! İlk giren sen ol! 🚀</li>';
    } else {
        scores.forEach((entry, index) => {
            const li = document.createElement('li');
            let dColor = "var(--medium-color)";
            let dStr = "Orta";
            
            if(entry.difficulty === 'easy') { dStr = "Kolay"; dColor = "var(--easy-color)"; }
            if(entry.difficulty === 'hard') { dStr = "Zor"; dColor = "var(--hard-color)"; }
            
            li.innerHTML = `
                <span class="rank">#${index + 1}</span> 
                <span class="name">${entry.name} <span class="diff-badge" style="background: ${dColor};">${dStr}</span></span> 
                <span class="score-val">${entry.score} 🌟</span>
            `;
            list.appendChild(li);
        });
    }
}

saveScoreBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    if (!name) {
        alert("Lütfen kahramanın adını gir! 🦸‍♀️");
        playerNameInput.focus();
        return;
    }
    
    let scores = JSON.parse(localStorage.getItem('mathGameScores')) || [];
    scores.push({ name, score, difficulty: currentDifficulty });
    scores.sort((a, b) => b.score - a.score);
    localStorage.setItem('mathGameScores', JSON.stringify(scores.slice(0, 10)));
    
    document.getElementById('save-score-section').style.display = 'none';
    showScoreboard();
});

showScoreboardBtn.addEventListener('click', showScoreboard);
backToStartBtn.addEventListener('click', () => switchScreen('start-screen'));
restartBtn.addEventListener('click', startGame);
toMenuBtn.addEventListener('click', () => switchScreen('start-screen'));
submitBtn.addEventListener('click', checkAnswer);

answerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkAnswer();
});

playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveScoreBtn.click();
});
