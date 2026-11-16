const display = document.querySelector('#display');
const ring = document.querySelector('#timer-ring');
const toggleButton = document.querySelector('#toggle');
const toggleLabel = document.querySelector('#toggle-label');
const toggleSymbol = document.querySelector('#toggle-symbol');
const resetButton = document.querySelector('#reset');
const lapButton = document.querySelector('#lap');
const lapList = document.querySelector('#laps-list');
const lapCount = document.querySelector('#lap-count');
const lapsEmpty = document.querySelector('#laps-empty');
const liveDot = document.querySelector('.live-dot');
const caption = document.querySelector('#timer-caption');
const soundButton = document.querySelector('#sound-toggle');
const sessionLabel = document.querySelector('#session-label');

let elapsedBeforeRun = 0;
let startedAt = 0;
let animationFrame = 0;
let running = false;
let lastLapAt = 0;
let lapNumber = 0;
let sessionNumber = 1;
let soundEnabled = false;
let audioContext;

function formatTime(milliseconds, includeHundredths = true) {
  const totalCs = Math.floor(milliseconds / 10);
  const hundredths = String(totalCs % 100).padStart(2, '0');
  const totalSeconds = Math.floor(totalCs / 100);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  const minutes = String(Math.floor(totalSeconds / 60) % 60).padStart(2, '0');
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  return includeHundredths ? `${hours}:${minutes}:${seconds}.${hundredths}` : `${hours}:${minutes}:${seconds}`;
}

function paint(now = performance.now()) {
  const elapsed = running ? elapsedBeforeRun + now - startedAt : elapsedBeforeRun;
  const formatted = formatTime(elapsed);
  const [base, centiseconds] = formatted.split('.');
  display.innerHTML = `${base}<span class="hundredths">.${centiseconds}</span>`;
  const hours = Math.floor(elapsed / 3_600_000);
  const minutes = Math.floor(elapsed / 60_000) % 60;
  const seconds = Math.floor(elapsed / 1_000) % 60;
  display.setAttribute('aria-label', `${hours} hours, ${minutes} minutes, ${seconds} seconds, ${centiseconds} hundredths`);
  ring.style.setProperty('--progress', `${(elapsed % 60_000) / 60_000 * 100}%`);
  if (running) animationFrame = requestAnimationFrame(paint);
}

function cue(frequency = 660, duration = 0.05) {
  if (!soundEnabled) return;
  audioContext ??= new AudioContext();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.045, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function setRunning(nextState) {
  running = nextState;
  if (running) {
    startedAt = performance.now();
    toggleLabel.textContent = 'Pause';
    toggleSymbol.textContent = 'Ⅱ';
    toggleButton.setAttribute('aria-label', 'Pause stopwatch');
    caption.textContent = 'TIME ELAPSED · RUNNING';
    liveDot.classList.add('running');
    resetButton.disabled = false;
    lapButton.disabled = false;
    paint();
    cue(720);
  } else {
    elapsedBeforeRun += performance.now() - startedAt;
    cancelAnimationFrame(animationFrame);
    toggleLabel.textContent = elapsedBeforeRun ? 'Resume' : 'Start';
    toggleSymbol.textContent = elapsedBeforeRun ? '▶' : '▶';
    toggleButton.setAttribute('aria-label', elapsedBeforeRun ? 'Resume stopwatch' : 'Start stopwatch');
    caption.textContent = elapsedBeforeRun ? 'TIME ELAPSED · PAUSED' : 'TIME ELAPSED';
    liveDot.classList.remove('running');
    resetButton.disabled = elapsedBeforeRun === 0 && lapNumber === 0;
    lapButton.disabled = true;
    paint();
    cue(440);
  }
}

function addLap() {
  if (!running) return;
  const total = elapsedBeforeRun + performance.now() - startedAt;
  const split = total - lastLapAt;
  lastLapAt = total;
  lapNumber += 1;
  lapsEmpty.hidden = true;
  const row = document.createElement('li');
  row.className = 'lap-row';
  row.innerHTML = `<span class="lap-index">LAP ${String(lapNumber).padStart(2, '0')}</span><span class="lap-split">+${formatTime(split)}</span><span class="lap-total">${formatTime(total)}</span>`;
  lapList.prepend(row);
  lapCount.textContent = `${String(lapNumber).padStart(2, '0')} LAPS`;
  resetButton.disabled = false;
  cue(830, 0.04);
}

toggleButton.addEventListener('click', () => setRunning(!running));
lapButton.addEventListener('click', addLap);
resetButton.addEventListener('click', () => {
  if (running) return;
  elapsedBeforeRun = 0;
  lastLapAt = 0;
  lapNumber = 0;
  lapList.replaceChildren();
  lapCount.textContent = '00 LAPS';
  lapsEmpty.hidden = false;
  resetButton.disabled = true;
  toggleLabel.textContent = 'Start';
  toggleSymbol.textContent = '▶';
  toggleButton.setAttribute('aria-label', 'Start stopwatch');
  caption.textContent = 'TIME ELAPSED';
  sessionNumber += 1;
  sessionLabel.textContent = `SESSION ${String(sessionNumber).padStart(2, '0')}`;
  paint();
});

soundButton.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundButton.setAttribute('aria-pressed', String(soundEnabled));
  soundButton.lastElementChild.textContent = soundEnabled ? 'Sound on' : 'Sound off';
  if (soundEnabled) cue(720);
});

document.addEventListener('keydown', (event) => {
  if (event.code !== 'Space' || event.repeat || event.target.matches('button, input, textarea, select, a')) return;
  event.preventDefault();
  setRunning(!running);
});

paint();
