import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const profile = mkdtempSync(join(tmpdir(), 'research-runboard-chrome-'))
const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--remote-debugging-port=9224',
  `--user-data-dir=${profile}`,
  'about:blank',
], { stdio: 'ignore' })

const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration))

async function getPageSocket() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const pages = await fetch('http://127.0.0.1:9224/json/list').then((response) => response.json())
      const page = pages.find((candidate) => candidate.type === 'page')
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl
    } catch {
      // Chrome may need a moment to open its debugging port.
    }
    await wait(100)
  }
  throw new Error('Chrome debugging endpoint did not become ready')
}

async function run() {
  const socket = new WebSocket(await getPageSocket())
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })

  let id = 0
  const pending = new Map()
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data)
    if (!message.id || !pending.has(message.id)) return
    const { resolve, reject } = pending.get(message.id)
    pending.delete(message.id)
    if (message.error) reject(new Error(message.error.message))
    else resolve(message.result)
  })

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const commandId = ++id
    pending.set(commandId, { resolve, reject })
    socket.send(JSON.stringify({ id: commandId, method, params }))
  })

  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  })
  await send('Page.enable')
  await send('Page.navigate', { url: 'http://127.0.0.1:4173/' })

  const inspect = async (expression) => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    return response.result.value
  }

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const loaded = await inspect(`document.title === 'Northstar Runboard' && document.readyState === 'complete'`)
    if (loaded) break
    await wait(100)
  }

  const before = await inspect(`(() => {
    const retryButtons = [...document.querySelectorAll('button')].filter((button) => button.textContent.trim() === 'Retry')
    return {
      title: document.title,
      url: location.href,
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      retryButtons: retryButtons.length,
      hasAttention: document.body.textContent.includes('Attention'),
      firstRun: document.querySelector('.run-name')?.textContent?.trim(),
      visibleIssue: Boolean(document.querySelector('.run-issue')?.textContent?.trim()),
    }
  })()`)

  await inspect(`(() => {
    const retry = [...document.querySelectorAll('button')].find((button) => button.getAttribute('aria-label') === 'Retry Ligand docking screen')
    retry?.click()
  })()`)
  await wait(100)

  const retryChanged = await inspect(`(() => {
    const run = [...document.querySelectorAll('.run-row')].find((row) => row.textContent.includes('Ligand docking screen'))
    return Boolean(run?.textContent.includes('Queued') && !run?.textContent.includes('Retry'))
  })()`)

  const result = { ...before, retryChanged }
  const passed = result.clientWidth === result.scrollWidth
    && result.retryButtons >= 2
    && result.hasAttention
    && result.firstRun === 'Ligand docking screen'
    && result.visibleIssue
    && result.retryChanged

  console.log(JSON.stringify({ viewport: '390x844', passed, ...result }))
  socket.close()
  if (!passed) process.exitCode = 1
}

try {
  await run()
} finally {
  if (chrome.exitCode === null) {
    chrome.kill('SIGTERM')
    await new Promise((resolve) => chrome.once('exit', resolve))
  }
  rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
}
