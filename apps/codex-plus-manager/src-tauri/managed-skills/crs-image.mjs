#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const DEFAULT_BASE_URL = 'https://www.leishen-ai.cn/openai/v1'
const MODEL = 'gpt-image-2'
const CODEX_HOME = process.env.CODEX_HOME || path.join(os.homedir(), '.codex')
const CONFIG_DIR = process.env.CRS_IMAGE_HOME || path.join(os.homedir(), '.crs-image')
const CONFIG_FILE = process.env.CRS_IMAGE_CONFIG || path.join(CONFIG_DIR, 'config.json')
const CODEX_AUTH_FILE = process.env.CODEX_AUTH_FILE || path.join(CODEX_HOME, 'auth.json')
const CODEX_CONFIG_FILE = process.env.CODEX_CONFIG_FILE || path.join(CODEX_HOME, 'config.toml')
const DEFAULT_SIZE = '1024x1024'
const DEFAULT_QUALITY = 'high'
const MAX_EDGE = 3840
const MIN_PIXELS = 655360
const MAX_PIXELS = 8294400
const DEFAULT_REQUEST_TIMEOUT_MS = 15 * 60 * 1000

const IMAGE_SIZE_PRESETS = Object.freeze([
  { ratio: '1:1', tier: '1k', width: 1024, height: 1024 },
  { ratio: '1:1', tier: '2k', width: 2048, height: 2048 },
  { ratio: '1:1', tier: '4k', width: 2880, height: 2880 },
  { ratio: '2:3', tier: '1k', width: 1024, height: 1536 },
  { ratio: '2:3', tier: '2k', width: 1344, height: 2016 },
  { ratio: '2:3', tier: '4k', width: 2336, height: 3504 },
  { ratio: '3:2', tier: '1k', width: 1536, height: 1024 },
  { ratio: '3:2', tier: '2k', width: 2016, height: 1344 },
  { ratio: '3:2', tier: '4k', width: 3504, height: 2336 },
  { ratio: '3:4', tier: '1k', width: 1024, height: 1360 },
  { ratio: '3:4', tier: '2k', width: 1536, height: 2048 },
  { ratio: '3:4', tier: '4k', width: 2496, height: 3312 },
  { ratio: '4:3', tier: '1k', width: 1360, height: 1024 },
  { ratio: '4:3', tier: '2k', width: 2048, height: 1536 },
  { ratio: '4:3', tier: '4k', width: 3312, height: 2496 },
  { ratio: '9:16', tier: '1k', width: 1024, height: 1824 },
  { ratio: '9:16', tier: '2k', width: 1152, height: 2048 },
  { ratio: '9:16', tier: '4k', width: 2160, height: 3840 },
  { ratio: '16:9', tier: '1k', width: 1824, height: 1024 },
  { ratio: '16:9', tier: '2k', width: 2048, height: 1152 },
  { ratio: '16:9', tier: '4k', width: 3840, height: 2160 },
  { ratio: 'auto', tier: 'auto', width: 1024, height: 1024 }
])

function usage() {
  return `
crs-image - CRS gpt-image-2 client

Usage:
  crs-image gen "prompt" [--size "16:9 2K"] [--quality high] [-n 1] [-o output.png] [--json]
  crs-image gen --prompt "prompt" [--size 1024x1024] [-o output.png] [--json]
  crs-image gen --prompt-file prompt.txt [--size 1024x1024] [-o output.png] [--json]
  crs-image edit image.png --prompt "edit prompt" [-o output.png] [--mask mask.png] [--json]
  crs-image edit image.png --prompt-file prompt.txt [-o output.png] [--mask mask.png] [--json]
  crs-image config --base-url https://relay.example.com/openai/v1 [--api-key sk-...]
	  crs-image doctor

	Config priority:
	  base URL: flags > CRS_BASE_URL > ${CONFIG_FILE} > ${CODEX_CONFIG_FILE} > OPENAI_BASE_URL
	  API key:  flags > CRS_API_KEY > ${CODEX_AUTH_FILE} > ${CONFIG_FILE} > OPENAI_API_KEY
	Image size:
	  presets like "1:1 2K", "16:9 4K", "9:16 2K", "2:3 4K", "3:2 1K", "3:4 2K", "4:3 2K"; or custom WIDTHxHEIGHT.
	  Custom width and height must be multiples of 16 and no edge can exceed ${MAX_EDGE}px.
	Image quality:
	  default high. auto, low, medium, high. xhigh/highest/max are treated as high.
	`.trim()
}

function parseArgs(argv) {
  const flags = {}
  const positionals = []
  const booleanFlags = new Set(['json', 'help', 'version', 'stdin'])
  const valueFlags = new Set(['prompt', 'prompt-file', 'promptFile'])

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--') {
      positionals.push(...argv.slice(i + 1))
      break
    }

    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=')
      if (eq !== -1) {
        flags[arg.slice(2, eq)] = arg.slice(eq + 1)
        continue
      }

      const key = arg.slice(2)
      if (booleanFlags.has(key)) {
        flags[key] = true
        continue
      }

      const next = argv[i + 1]
      if (next === undefined || (next.startsWith('-') && !valueFlags.has(key))) {
        flags[key] = true
      } else {
        flags[key] = next
        i += 1
      }
      continue
    }

    if (arg.startsWith('-') && arg.length > 1) {
      const key = arg.slice(1)
      if (key === 'o') {
        flags.output = argv[i + 1]
        i += 1
        continue
      }
      if (key === 'n') {
        flags.n = argv[i + 1]
        i += 1
        continue
      }
      if (key === 'p') {
        flags.prompt = argv[i + 1]
        i += 1
        continue
      }
      if (key === 'f') {
        flags['prompt-file'] = argv[i + 1]
        i += 1
        continue
      }
    }

    positionals.push(arg)
  }

  return { flags, positionals }
}

function readConfigFile() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return {}
    }
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
  } catch (error) {
    throw new Error(`Failed to read ${CONFIG_FILE}: ${error.message}`)
  }
}

function writeConfigFile(nextConfig) {
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true })
  fs.writeFileSync(CONFIG_FILE, `${JSON.stringify(nextConfig, null, 2)}\n`, { mode: 0o600 })
}

function readJsonFile(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return {}
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (_) {
    return {}
  }
}

function readCodexAuthFile() {
  const auth = readJsonFile(CODEX_AUTH_FILE)
  return {
    apiKey: auth.OPENAI_API_KEY || auth.openai_api_key || auth.apiKey || auth.api_key || ''
  }
}

function readCodexBaseUrl() {
  try {
    if (!fs.existsSync(CODEX_CONFIG_FILE)) {
      return ''
    }
    const text = fs.readFileSync(CODEX_CONFIG_FILE, 'utf8')
    const providerMatch = text.match(/^\s*model_provider\s*=\s*["']([^"']+)["']/m)
    const provider = providerMatch?.[1]
    const sections = text.split(/\n(?=\s*\[)/)

    if (provider) {
      const section = sections.find((part) =>
        new RegExp(
          `^\\s*\\[model_providers\\.${provider.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`,
          'm'
        ).test(part)
      )
      const baseUrlMatch = section?.match(/^\s*base_url\s*=\s*["']([^"']+)["']/m)
      if (baseUrlMatch?.[1]) {
        return baseUrlMatch[1]
      }
    }

    const openaiBaseUrlMatch = text.match(/^\s*base_url\s*=\s*["']([^"']*\/openai[^"']*)["']/m)
    if (openaiBaseUrlMatch?.[1]) {
      return openaiBaseUrlMatch[1]
    }

    const anyBaseUrlMatch = text.match(/^\s*base_url\s*=\s*["']([^"']+)["']/m)
    return anyBaseUrlMatch?.[1] || ''
  } catch (_) {
    return ''
  }
}

function normalizeBaseUrl(value) {
  const raw = String(value || DEFAULT_BASE_URL)
    .trim()
    .replace(/\/+$/, '')
  if (!raw) {
    return DEFAULT_BASE_URL
  }
  if (raw.endsWith('/openai/v1') || raw.endsWith('/v1')) {
    return raw
  }
  if (raw.endsWith('/openai')) {
    return `${raw}/v1`
  }
  return `${raw}/openai/v1`
}

function resolveConfig(flags = {}) {
  const fileConfig = readConfigFile()
  const codexAuth = readCodexAuthFile()
  const codexBaseUrl = readCodexBaseUrl()
  const baseUrl =
    flags['base-url'] ||
    flags.baseUrl ||
    process.env.CRS_BASE_URL ||
    fileConfig.baseUrl ||
    fileConfig.base_url ||
    codexBaseUrl ||
    process.env.OPENAI_BASE_URL ||
    DEFAULT_BASE_URL
  const apiKey =
    flags['api-key'] ||
    flags.apiKey ||
    process.env.CRS_API_KEY ||
    codexAuth.apiKey ||
    fileConfig.apiKey ||
    fileConfig.api_key ||
    process.env.OPENAI_API_KEY ||
    ''

  return {
    baseUrl: normalizeBaseUrl(baseUrl),
    apiKey: String(apiKey || '').trim()
  }
}

function requireApiKey(config) {
  if (!config.apiKey) {
    throw new Error(
      `Missing API key. Run your Codex one-click config first so ${CODEX_AUTH_FILE} contains OPENAI_API_KEY, or run: crs-image config --api-key <your-relay-api-key>`
    )
  }
}

function redact(value) {
  const raw = String(value || '')
  if (!raw) {
    return '(not set)'
  }
  if (raw.length <= 10) {
    return `${raw.slice(0, 2)}...`
  }
  return `${raw.slice(0, 6)}...${raw.slice(-4)}`
}

function outputExtension(format = 'png') {
  const normalized = String(format || 'png').toLowerCase()
  if (normalized === 'jpeg' || normalized === 'jpg') {
    return 'jpg'
  }
  if (normalized === 'webp') {
    return 'webp'
  }
  return 'png'
}

function timestamp() {
  return new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z$/, 'Z')
}

function defaultOutputPath(kind, format) {
  const ext = outputExtension(format)
  return path.join(process.cwd(), 'generated', `${kind}-${timestamp()}.${ext}`)
}

function resolveOutputPaths(outputPath, count, kind, format) {
  const basePath = outputPath || defaultOutputPath(kind, format)
  const ext = path.extname(basePath) || `.${outputExtension(format)}`
  const dir =
    fs.existsSync(basePath) && fs.statSync(basePath).isDirectory()
      ? basePath
      : path.dirname(basePath)
  const name =
    fs.existsSync(basePath) && fs.statSync(basePath).isDirectory()
      ? `${kind}-${timestamp()}`
      : path.basename(basePath, ext)

  fs.mkdirSync(dir, { recursive: true })
  if (count <= 1) {
    return [path.join(dir, `${name}${ext}`)]
  }
  return Array.from({ length: count }, (_, index) => path.join(dir, `${name}-${index + 1}${ext}`))
}

function getImageMime(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.jpg' || ext === '.jpeg') {
    return 'image/jpeg'
  }
  if (ext === '.webp') {
    return 'image/webp'
  }
  if (ext === '.gif') {
    return 'image/gif'
  }
  return 'image/png'
}

function getFlagValue(flags, names) {
  for (const name of names) {
    if (flags[name] !== undefined) {
      return flags[name]
    }
  }
  return undefined
}

function presetSize(preset) {
  return `${preset.width}x${preset.height}`
}

function normalizeAliasKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[×＊*]/g, 'x')
    .replace(/[，,]+/g, ' ')
    .replace(/\s+/g, ' ')
}

function compactAliasKey(value) {
  return normalizeAliasKey(value).replace(/\s+/g, '-')
}

function buildSizeAliases() {
  const aliases = new Map()
  const add = (key, size) => {
    const normalized = normalizeAliasKey(key)
    if (normalized) {
      aliases.set(normalized, size)
      aliases.set(compactAliasKey(normalized), size)
    }
  }

  for (const preset of IMAGE_SIZE_PRESETS) {
    const size = presetSize(preset)
    add(size, size)
    add(`${preset.ratio} ${preset.tier}`, size)
    add(`${preset.ratio}-${preset.tier}`, size)
    if (preset.tier === '1k') {
      add(preset.ratio, size)
    }
  }

  add('auto', DEFAULT_SIZE)
  add('方图', '1024x1024')
  add('方图 1k', '1024x1024')
  add('方图 2k', '2048x2048')
  add('方图 4k', '2880x2880')
  add('横图', '1824x1024')
  add('横图 1k', '1824x1024')
  add('横图 2k', '2048x1152')
  add('横图 4k', '3840x2160')
  add('竖图', '1024x1824')
  add('竖图 1k', '1024x1824')
  add('竖图 2k', '1152x2048')
  add('竖图 4k', '2160x3840')
  add('竖版', '1024x1536')
  add('竖版 1k', '1024x1536')
  add('竖版 2k', '1344x2016')
  add('竖版 4k', '2336x3504')
  add('横版', '1536x1024')
  add('横版 1k', '1536x1024')
  add('横版 2k', '2016x1344')
  add('横版 4k', '3504x2336')
  add('1024x1365', '1024x1360')
  add('1365x1024', '1360x1024')

  return aliases
}

const SIZE_ALIASES = buildSizeAliases()

function stripCustomPrefix(value) {
  return normalizeAliasKey(value).replace(/^(自定义|custom)\s+/, '')
}

function parseImageSize(value) {
  const match = stripCustomPrefix(value).match(/^(\d{1,5})x(\d{1,5})$/)
  if (!match) {
    return null
  }
  return {
    width: Number(match[1]),
    height: Number(match[2]),
    size: `${Number(match[1])}x${Number(match[2])}`
  }
}

function validateImageSize(size) {
  const parsed = parseImageSize(size)
  if (!parsed) {
    return {
      valid: false,
      reason:
        'Unsupported image size. Use a preset such as "16:9 2K", or a custom size like "1280x720".'
    }
  }

  const { width, height } = parsed
  if (width <= 0 || height <= 0) {
    return { valid: false, reason: 'Image size width and height must be greater than 0.' }
  }
  if (width > MAX_EDGE || height > MAX_EDGE) {
    return { valid: false, reason: `Image size edges must be less than or equal to ${MAX_EDGE}px.` }
  }
  if (width % 16 !== 0 || height % 16 !== 0) {
    return { valid: false, reason: 'Image size edges must be multiples of 16px.' }
  }

  const longEdge = Math.max(width, height)
  const shortEdge = Math.min(width, height)
  if (longEdge / shortEdge > 3) {
    return { valid: false, reason: 'Image size long edge to short edge ratio must not exceed 3:1.' }
  }

  const pixels = width * height
  if (pixels < MIN_PIXELS || pixels > MAX_PIXELS) {
    return {
      valid: false,
      reason: `Image size pixels must be between ${MIN_PIXELS} and ${MAX_PIXELS}.`
    }
  }

  return { valid: true, width, height, size: parsed.size, pixels }
}

function normalizeImageSize(value) {
  const raw = String(value || DEFAULT_SIZE).trim() || DEFAULT_SIZE
  const aliasKey = normalizeAliasKey(raw)
  const compactKey = compactAliasKey(raw)
  const candidate =
    SIZE_ALIASES.get(aliasKey) || SIZE_ALIASES.get(compactKey) || stripCustomPrefix(raw)
  const parsed = parseImageSize(candidate)

  if (!parsed) {
    throw new Error(
      'Unsupported image size. Use a preset such as "16:9 2K", or a custom size like "1280x720".'
    )
  }

  const validation = validateImageSize(parsed.size)
  if (!validation.valid) {
    throw new Error(validation.reason)
  }
  return validation.size
}

async function readStdinText() {
  const chunks = []
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf8')
}

function readPromptFile(filePath) {
  const absolute = path.resolve(String(filePath))
  return fs.readFileSync(absolute, 'utf8')
}

async function resolvePrompt({ flags, positionals = [], usePositionals = true, missingMessage }) {
  const promptFlag = getFlagValue(flags, ['prompt', 'p'])
  if (promptFlag !== undefined) {
    if (promptFlag === true || promptFlag === '') {
      throw new Error('Missing value for --prompt')
    }
    if (String(promptFlag) === '-') {
      const stdinPrompt = (await readStdinText()).trim()
      if (!stdinPrompt) {
        throw new Error(missingMessage)
      }
      return stdinPrompt
    }
    const prompt = String(promptFlag).trim()
    if (!prompt) {
      throw new Error(missingMessage)
    }
    return prompt
  }

  const promptFile = getFlagValue(flags, ['prompt-file', 'promptFile'])
  if (promptFile !== undefined) {
    if (promptFile === true || promptFile === '') {
      throw new Error('Missing value for --prompt-file')
    }
    const prompt = String(promptFile) === '-' ? await readStdinText() : readPromptFile(promptFile)
    const normalized = prompt.trim()
    if (!normalized) {
      throw new Error(missingMessage)
    }
    return normalized
  }

  if (usePositionals && positionals.length > 0) {
    if (positionals.length === 1 && positionals[0] === '-') {
      const stdinPrompt = (await readStdinText()).trim()
      if (!stdinPrompt) {
        throw new Error(missingMessage)
      }
      return stdinPrompt
    }
    const prompt = positionals.join(' ').trim()
    if (!prompt) {
      throw new Error(missingMessage)
    }
    return prompt
  }

  if (flags.stdin || process.stdin.isTTY !== true) {
    const stdinPrompt = (await readStdinText()).trim()
    if (stdinPrompt) {
      return stdinPrompt
    }
  }

  throw new Error(missingMessage)
}

async function readJsonResponse(response) {
  const text = await response.text()
  if (!text) {
    return null
  }
  try {
    return JSON.parse(text)
  } catch (_) {
    return text
  }
}

function extractErrorMessage(payload, fallback) {
  if (!payload) {
    return fallback
  }
  if (typeof payload === 'string') {
    return payload.slice(0, 500)
  }
  return payload.error?.message || payload.message || payload.detail || payload.error || fallback
}

function getRequestTimeoutMs() {
  const raw = process.env.CRS_IMAGE_TIMEOUT_MS || process.env.OPENAI_IMAGE_TIMEOUT_MS || ''
  const parsed = Number.parseInt(String(raw).trim(), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REQUEST_TIMEOUT_MS
}

async function requestJson(url, options) {
  const timeoutMs = getRequestTimeoutMs()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      ...options,
      signal: options?.signal || controller.signal
    })
    const payload = await readJsonResponse(response)
    if (!response.ok) {
      const message = extractErrorMessage(payload, `HTTP ${response.status}`)
      const error = new Error(message)
      error.status = response.status
      error.payload = payload
      throw error
    }
    return payload
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Image request timed out after ${Math.ceil(timeoutMs / 1000)} seconds`)
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

function imageDataToBuffer(item) {
  const b64 = item?.b64_json || item?.b64 || ''
  if (b64) {
    return Buffer.from(String(b64).replace(/\s+/g, ''), 'base64')
  }

  const url = item?.url || ''
  const match = String(url).match(/^data:image\/[a-z0-9.+-]+;base64,(.+)$/i)
  if (match) {
    return Buffer.from(match[1].replace(/\s+/g, ''), 'base64')
  }

  throw new Error('Image response did not include b64_json or data URL')
}

function commonBody(flags, prompt) {
  const body = {
    model: MODEL,
    prompt,
    size: normalizeImageSize(flags.size || DEFAULT_SIZE),
    quality: normalizeImageQuality(flags.quality || DEFAULT_QUALITY),
    n: Number.parseInt(String(flags.n || '1'), 10) || 1,
    response_format: 'b64_json'
  }

  for (const field of ['background', 'moderation', 'output_format', 'output_compression']) {
    if (flags[field] !== undefined) {
      body[field] = flags[field]
    }
  }

  return body
}

function normalizeImageQuality(value) {
  const normalized = String(value || DEFAULT_QUALITY)
    .trim()
    .toLowerCase()
  if (['xhigh', 'x-high', 'x_high', 'highest', 'best', 'max', 'hd'].includes(normalized)) {
    return 'high'
  }
  if (['low', 'medium', 'high', 'auto'].includes(normalized)) {
    return normalized
  }
  return normalized || DEFAULT_QUALITY
}

async function saveImages(payload, flags, kind) {
  const data = Array.isArray(payload?.data) ? payload.data : []
  if (data.length === 0) {
    throw new Error('Image API returned no images')
  }

  const format = flags.output_format || 'png'
  const paths = resolveOutputPaths(flags.output || flags.out, data.length, kind, format)
  data.forEach((item, index) => {
    fs.writeFileSync(paths[index], imageDataToBuffer(item))
  })
  return paths
}

async function generateImage(positionals, flags) {
  const prompt = await resolvePrompt({
    flags,
    positionals,
    missingMessage: 'Missing prompt. Example: crs-image gen "a clean product photo"'
  })

  const config = resolveConfig(flags)
  requireApiKey(config)
  const body = commonBody(flags, prompt)
  const payload = await requestJson(`${config.baseUrl}/images/generations`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  })
  const files = await saveImages(payload, flags, 'image')
  return { ok: true, model: MODEL, files, created: payload?.created || null }
}

async function editImage(positionals, flags) {
  const images = positionals.filter(Boolean)
  if (images.length === 0) {
    throw new Error(
      'Missing input image. Example: crs-image edit input.png --prompt "make it blue"'
    )
  }
  const prompt = await resolvePrompt({
    flags,
    positionals: [],
    usePositionals: false,
    missingMessage: 'Missing --prompt for image edit'
  })

  const config = resolveConfig(flags)
  requireApiKey(config)
  const body = commonBody(flags, prompt)
  const form = new FormData()
  for (const [key, value] of Object.entries(body)) {
    form.append(key, String(value))
  }

  for (const imagePath of images) {
    const absolute = path.resolve(imagePath)
    const buffer = fs.readFileSync(absolute)
    form.append(
      'image',
      new Blob([buffer], { type: getImageMime(absolute) }),
      path.basename(absolute)
    )
  }

  if (flags.mask) {
    const absolute = path.resolve(String(flags.mask))
    const buffer = fs.readFileSync(absolute)
    form.append(
      'mask',
      new Blob([buffer], { type: getImageMime(absolute) }),
      path.basename(absolute)
    )
  }

  const payload = await requestJson(`${config.baseUrl}/images/edits`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.apiKey}`
    },
    body: form
  })
  const files = await saveImages(payload, flags, 'edit')
  return { ok: true, model: MODEL, files, created: payload?.created || null }
}

async function configure(flags) {
  const current = readConfigFile()
  const next = { ...current }

  if (flags['base-url'] || flags.baseUrl) {
    next.baseUrl = normalizeBaseUrl(flags['base-url'] || flags.baseUrl)
  } else if (!next.baseUrl && !next.base_url) {
    next.baseUrl = DEFAULT_BASE_URL
  }

  if (flags['api-key'] || flags.apiKey) {
    next.apiKey = String(flags['api-key'] || flags.apiKey).trim()
  }

  if (Object.keys(flags).length > 0) {
    writeConfigFile(next)
  }

  const resolved = resolveConfig({})
  return {
    ok: true,
    configFile: CONFIG_FILE,
    baseUrl: resolved.baseUrl,
    apiKey: redact(resolved.apiKey)
  }
}

async function doctor(flags) {
  const config = resolveConfig(flags)
  requireApiKey(config)
  const payload = await requestJson(`${config.baseUrl}/models`, {
    method: 'GET',
    headers: {
      authorization: `Bearer ${config.apiKey}`
    }
  })
  const models = Array.isArray(payload?.data) ? payload.data.map((item) => item.id) : []
  return {
    ok: true,
    baseUrl: config.baseUrl,
    apiKey: redact(config.apiKey),
    imageModelEnabled: models.includes(MODEL)
  }
}

function skillInfo() {
  const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), '.codex')
  return {
    ok: true,
    skillDir: path.join(codexHome, 'skills', 'crs-image'),
    installHint: 'Install SKILL.md into the skillDir, then restart Codex.'
  }
}

function printResult(result, asJson) {
  if (asJson) {
    console.log(JSON.stringify(result, null, 2))
    return
  }

  if (Array.isArray(result.files)) {
    for (const file of result.files) {
      console.log(file)
    }
    return
  }

  for (const [key, value] of Object.entries(result)) {
    console.log(`${key}: ${value}`)
  }
}

async function main() {
  const command = process.argv[2]
  const { flags, positionals } = parseArgs(process.argv.slice(3))

  if (!command || command === '--help' || command === '-h' || flags.help || command === 'help') {
    console.log(usage())
    return
  }

  if (flags.version || command === 'version') {
    console.log('crs-image 1.0.3')
    return
  }

  let result
  if (command === 'gen' || command === 'generate') {
    result = await generateImage(positionals, flags)
  } else if (command === 'edit' || command === 'edits') {
    result = await editImage(positionals, flags)
  } else if (command === 'config') {
    result = await configure(flags)
  } else if (command === 'doctor' || command === 'ping') {
    result = await doctor(flags)
  } else if (command === 'skill') {
    result = skillInfo()
  } else {
    throw new Error(`Unknown command: ${command}\n\n${usage()}`)
  }

  printResult(result, Boolean(flags.json))
}

main().catch((error) => {
  const prefix = error.status ? `HTTP ${error.status}` : 'ERROR'
  console.error(`${prefix}: ${error.message}`)
  if (error.payload && process.env.CRS_IMAGE_DEBUG === '1') {
    console.error(JSON.stringify(error.payload, null, 2))
  }
  process.exitCode = error.status === 403 ? 3 : 1
})
