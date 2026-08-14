import { writeFile } from 'node:fs/promises';

const [, , devtoolsBase = 'http://127.0.0.1:9223', pageUrl = 'http://127.0.0.1:5173/', screenshotPath = 'evidence/mobile-390x844.png'] = process.argv;
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const targets = await fetch(`${devtoolsBase}/json/list`).then((response) => response.json());
const target = targets.find((candidate) => candidate.type === 'page');
if (!target) throw new Error('No inspectable Chrome page target found.');

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let sequence = 0;
const pending = new Map();
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
});

function send(method, params = {}) {
  const id = ++sequence;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  screenWidth: 390,
  screenHeight: 844,
  deviceScaleFactor: 1,
  mobile: true,
});
await send('Page.navigate', { url: pageUrl });
await delay(800);

const evaluated = await send('Runtime.evaluate', {
  returnByValue: true,
  awaitPromise: true,
  expression: `(async () => {
    const canvas = document.querySelector('#game');
    const score = document.querySelector('#score');
    const lives = document.querySelector('#lives');
    const pause = document.querySelector('#pause-button');
    const restart = document.querySelector('#restart-button');
    const instructions = document.querySelector('.instruction');
    const controls = document.querySelector('.controls');
    pause.click();
    await new Promise(requestAnimationFrame);
    const paused = {
      overlayVisible: !document.querySelector('#overlay').hidden,
      phase: document.querySelector('#phase').textContent,
      buttonText: pause.textContent,
    };
    pause.click();
    await new Promise(requestAnimationFrame);
    return {
      viewport: { width: innerWidth, height: innerHeight },
      document: {
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      },
      canvas: { width: canvas.getBoundingClientRect().width, height: canvas.getBoundingClientRect().height },
      loadBearingTextOutsideCanvas: {
        score: score.textContent,
        lives: lives.textContent,
        instructions: instructions.textContent.trim(),
        pauseButton: pause.textContent,
        restartButton: restart.textContent,
        allOutside: [score, lives, instructions, pause, restart].every((node) => !canvas.contains(node)),
      },
      controlsFit: controls.scrollWidth <= controls.clientWidth,
      pauseInteraction: paused,
      resumed: {
        overlayVisible: !document.querySelector('#overlay').hidden,
        phase: document.querySelector('#phase').textContent,
        buttonText: pause.textContent,
      },
    };
  })()`,
});

const screenshot = await send('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: false,
  fromSurface: true,
});
await writeFile(screenshotPath, Buffer.from(screenshot.data, 'base64'));
socket.close();
console.log(JSON.stringify(evaluated.result.value, null, 2));
