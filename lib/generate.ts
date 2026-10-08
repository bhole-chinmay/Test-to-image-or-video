import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { MediaType } from './detect-media'

const GENERATED_DIR = path.join(process.cwd(), 'public', 'generated')
const IMAGE_MODELS = ['flux'] as const
const HORDE_BASE = 'https://stablehorde.net/api/v2'
const CLIENT_AGENT = 'PromptFrame:1.0:cursor'
type AspectRatio = 'landscape' | 'portrait' | 'square'
type FalMedia = { url: string; type: MediaType }

async function generateWithFal(
  type: MediaType,
  prompt: string,
  seed: number,
  aspectRatio: AspectRatio,
  apiKey: string,
): Promise<FalMedia> {
  const model = type === 'image' ? 'fal-ai/flux/dev' : 'fal-ai/minimax/video-01'
  const input = type === 'image'
    ? { prompt, seed, image_size: aspectRatio === 'portrait' ? 'portrait_4_3' : aspectRatio === 'square' ? 'square' : 'landscape_4_3', num_images: 1 }
    : { prompt }
  const headers = { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' }
  const submitted = await fetch(`https://queue.fal.run/${model}`, {
    method: 'POST', headers, body: JSON.stringify(input), signal: AbortSignal.timeout(30_000),
  })
  if (!submitted.ok) {
    const detail = await submitted.text().catch(() => '')
    throw new Error(`fal request failed (${submitted.status}): ${detail.slice(0, 220)}`)
  }
  const job = await submitted.json() as { request_id?: string; response_url?: string; status_url?: string }
  if (!job.request_id) throw new Error('fal did not return a request id.')

  const deadline = Date.now() + (type === 'video' ? 240_000 : 120_000)
  while (Date.now() < deadline) {
    await sleep(2500)
    const statusUrl = job.status_url || `https://queue.fal.run/${model}/requests/${job.request_id}/status`
    const statusRes = await fetch(statusUrl, { headers: { Authorization: `Key ${apiKey}` }, signal: AbortSignal.timeout(30_000) })
    if (!statusRes.ok) throw new Error(`fal status failed (${statusRes.status}).`)
    const status = await statusRes.json() as { status?: string; error?: string }
    if (status.status === 'FAILED') throw new Error(`fal generation failed${status.error ? `: ${status.error}` : '.'}`)
    if (status.status !== 'COMPLETED') continue

    const resultUrl = job.response_url || `https://queue.fal.run/${model}/requests/${job.request_id}`
    const resultRes = await fetch(resultUrl, { headers: { Authorization: `Key ${apiKey}` }, signal: AbortSignal.timeout(30_000) })
    if (!resultRes.ok) throw new Error(`fal result failed (${resultRes.status}).`)
    const result = await resultRes.json() as { images?: Array<{ url?: string }>; video?: { url?: string } }
    const url = type === 'image' ? result.images?.[0]?.url : result.video?.url
    if (!url) throw new Error('fal completed without returning a media URL.')
    return { url, type }
  }
  throw new Error(`fal ${type} generation timed out. Please try again.`)
}

function dimensionsFor(ratio: AspectRatio) {
  if (ratio === 'portrait') return { width: 768, height: 1024 }
  if (ratio === 'square') return { width: 1024, height: 1024 }
  return { width: 1024, height: 768 }
}

function imageExtension(buffer: Buffer) {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'jpg'
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'png'
  if (buffer.toString('ascii', 0, 4) === 'RIFF') return 'webp'
  if (buffer.toString('ascii', 4, 8) === 'ftypavif') return 'avif'
  return 'jpg'
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function ensureGeneratedDir() {
  await mkdir(GENERATED_DIR, { recursive: true })
}

export function publicUrl(filename: string) {
  return `/generated/${filename}`
}

function isLikelyImage(buffer: Buffer, contentType: string) {
  if (buffer.length < 1000) return false
  if (contentType.includes('application/json') || buffer[0] === 0x7b) return false
  const b0 = buffer[0]
  const b1 = buffer[1]
  if (b0 === 0xff && b1 === 0xd8) return true
  if (b0 === 0x89 && b1 === 0x50) return true
  if (b0 === 0x47 && b1 === 0x49) return true
  if (buffer.toString('ascii', 0, 4) === 'RIFF') return true
  return !contentType.includes('text/') && buffer.length > 5000
}

async function fetchPollinationsImage(
  prompt: string,
  seed: number,
  model: string,
  apiKey?: string,
  aspectRatio: AspectRatio = 'landscape',
): Promise<Buffer> {
  const dimensions = dimensionsFor(aspectRatio)
  const params = new URLSearchParams({
    width: String(dimensions.width),
    height: String(dimensions.height),
    seed: String(seed),
    nologo: 'true',
    model,
    referrer: 'promptframe',
  })
  const url = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt.trim())}?${params}`
  const headers: Record<string, string> = {
    Accept: 'image/jpeg,image/png,image/webp,image/*,*/*',
    'User-Agent': 'Mozilla/5.0 (compatible; PromptFrame/1.0)',
  }
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`

  let res: Response
  try {
    res = await fetch(url, {
      headers,
      cache: 'no-store',
      redirect: 'follow',
      signal: AbortSignal.timeout(90_000),
    })
  } catch {
    throw new Error('Could not reach Pollinations. Check your internet connection and try again.')
  }

  if (!res.ok) {
    throw new Error(`pollinations ${res.status}`)
  }

  const contentType = res.headers.get('content-type') || ''
  const buffer = Buffer.from(await res.arrayBuffer())
  if (!isLikelyImage(buffer, contentType)) {
    throw new Error('pollinations invalid image')
  }
  return buffer
}

/** Free anonymous text-to-image via Stable Horde (no API key required). */
async function fetchHordeImage(prompt: string, seed: number, aspectRatio: AspectRatio): Promise<Buffer> {
  const dimensions = dimensionsFor(aspectRatio)
  const scale = Math.min(1, 1024 / Math.max(dimensions.width, dimensions.height))
  let submit: Response
  try {
    submit = await fetch(`${HORDE_BASE}/generate/async`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Client-Agent': CLIENT_AGENT,
    },
    body: JSON.stringify({
      prompt: `${prompt.trim()} ### blurry, low quality, watermark, text`,
      params: {
        sampler_name: 'k_euler',
        cfg_scale: 7,
        denoising_strength: 0.75,
        height: Math.round(dimensions.height * scale / 64) * 64,
        width: Math.round(dimensions.width * scale / 64) * 64,
        steps: 20,
        n: 1,
        seed: String(seed),
      },
      nsfw: false,
      censor_nsfw: true,
      trusted_workers: false,
      models: ['stable_diffusion'],
      r2: true,
      shared: false,
    }),
      signal: AbortSignal.timeout(30_000),
    })
  } catch {
    throw new Error('Could not reach the free image provider. Check your internet connection and try again.')
  }

  if (!submit.ok) {
    const detail = await submit.text().catch(() => '')
    throw new Error(`horde submit ${submit.status}: ${detail.slice(0, 120)}`)
  }

  const submitted = (await submit.json()) as { id?: string; message?: string }
  if (!submitted.id) {
    throw new Error(submitted.message || 'horde did not return a job id')
  }

  const deadline = Date.now() + 150_000
  while (Date.now() < deadline) {
    await sleep(2500)

    let statusRes: Response
    try {
      statusRes = await fetch(`${HORDE_BASE}/generate/status/${submitted.id}`, {
      headers: {
        Accept: 'application/json',
        'Client-Agent': CLIENT_AGENT,
      },
        signal: AbortSignal.timeout(30_000),
      })
    } catch {
      throw new Error('Lost connection while waiting for the image provider. Please try again.')
    }

    if (!statusRes.ok) {
      throw new Error(`horde status ${statusRes.status}`)
    }

    const status = (await statusRes.json()) as {
      done?: boolean
      faulted?: boolean
      generations?: Array<{ img?: string }>
    }

    if (status.faulted) {
      throw new Error('horde generation faulted')
    }

    if (!status.done) continue

    const img = status.generations?.[0]?.img
    if (!img) throw new Error('horde returned no image')

    // r2:true returns a URL; otherwise base64
    if (img.startsWith('http')) {
      const imgRes = await fetch(img, { signal: AbortSignal.timeout(60_000) })
      if (!imgRes.ok) throw new Error(`horde download ${imgRes.status}`)
      const buffer = Buffer.from(await imgRes.arrayBuffer())
      if (!isLikelyImage(buffer, imgRes.headers.get('content-type') || '')) {
        throw new Error('horde downloaded invalid image')
      }
      return buffer
    }

    const buffer = Buffer.from(img, 'base64')
    if (buffer.length < 1000) throw new Error('horde base64 image too small')
    return buffer
  }

  throw new Error('horde generation timed out')
}

export async function generateImageBuffer(
  prompt: string,
  seed: number,
  apiKey?: string,
  aspectRatio: AspectRatio = 'landscape',
): Promise<Buffer> {
  const errors: string[] = []

  // 1) Fast path: Pollinations (best quality when quota allows)
  for (let attempt = 0; attempt < 2; attempt++) {
    for (const model of IMAGE_MODELS) {
      try {
        return await fetchPollinationsImage(prompt, seed + attempt, model, apiKey, aspectRatio)
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err))
        await sleep(400)
      }
    }
  }

  // 2) Reliable free fallback: Stable Horde
  try {
    return await fetchHordeImage(prompt, seed, aspectRatio)
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err))
  }

  throw new Error(
    `Could not generate an image. ${errors.slice(-2).join(' | ')}. The generation server must be able to reach the image provider.`,
  )
}

export async function generateVideoBuffer(
  prompt: string,
  seed: number,
  apiKey?: string,
): Promise<{ buffer: Buffer; ext: 'mp4' } | null> {
  if (!apiKey) throw new Error('Native AI video needs a Pollinations API key. Add POLLINATIONS_API_KEY to .env.local.')

  const params = new URLSearchParams({
    model: 'veo',
    duration: '4',
    aspectRatio: '16:9',
    seed: String(seed),
  })

  const url = `https://gen.pollinations.ai/video/${encodeURIComponent(prompt.trim())}?${params}`

  let res: Response
  try {
    res = await fetch(url, {
    headers: {
      Accept: 'video/mp4,video/*,*/*',
      Authorization: `Bearer ${apiKey}`,
      'User-Agent': 'Mozilla/5.0 (compatible; PromptFrame/1.0)',
    },
    cache: 'no-store',
      signal: AbortSignal.timeout(180_000),
    })
  } catch {
    throw new Error('Could not reach the video provider. Check your internet connection and try again.')
  }

  if (!res.ok) {
    throw new Error(`Video provider returned ${res.status}`)
  }

  const buffer = Buffer.from(await res.arrayBuffer())
  if (buffer.length < 1000) {
    throw new Error('Video provider returned an empty response')
  }

  return { buffer, ext: 'mp4' }
}

export async function persistGenerated(
  id: string,
  type: MediaType,
  prompt: string,
  seed: number,
  apiKey?: string,
  aspectRatio: AspectRatio = 'landscape',
  falApiKey?: string,
): Promise<{ url: string; type: MediaType; note?: string }> {
  if (falApiKey) {
    const generated = await generateWithFal(type, prompt, seed, aspectRatio, falApiKey)
    return { ...generated, note: `Generated with fal.ai (${type === 'image' ? 'FLUX' : 'MiniMax'}).` }
  }
  await ensureGeneratedDir()

  if (type === 'image') {
    const buffer = await generateImageBuffer(prompt, seed, apiKey, aspectRatio)
    const filename = `${id}.${imageExtension(buffer)}`
    await writeFile(path.join(GENERATED_DIR, filename), buffer)
    return { url: publicUrl(filename), type: 'image' }
  }

  const remote = await generateVideoBuffer(prompt, seed, apiKey)
  const filename = `${id}.mp4`
  await writeFile(path.join(GENERATED_DIR, filename), remote.buffer)
  return { url: publicUrl(filename), type: 'video', note: 'Generated with native AI video.' }
}
