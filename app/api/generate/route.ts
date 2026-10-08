import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'

import { detectMediaType, type MediaType } from '@/lib/detect-media'
import { persistGenerated } from '@/lib/generate'

export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'

type Body = {
  prompt?: string
  mode?: 'auto' | MediaType
  aspectRatio?: 'landscape' | 'portrait' | 'square'
}

export async function POST(request: NextRequest) {
  let body: Body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const prompt = body.prompt?.trim()
  if (!prompt) {
    return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 })
  }

  if (prompt.length > 1200) {
    return NextResponse.json(
      { error: 'Prompt is too long (max 1200 characters).' },
      { status: 400 },
    )
  }

  const mode = body.mode ?? 'auto'
  const aspectRatio = body.aspectRatio ?? 'landscape'
  if (!['landscape', 'portrait', 'square'].includes(aspectRatio)) {
    return NextResponse.json({ error: 'Invalid aspect ratio.' }, { status: 400 })
  }
  const type: MediaType =
    mode === 'auto' ? detectMediaType(prompt) : mode === 'video' ? 'video' : 'image'

  const seed = Math.floor(Math.random() * 1_000_000)
  const id = randomUUID()
  const apiKey = process.env.POLLINATIONS_API_KEY
  const falApiKey = process.env.FAL_KEY

  try {
    if (type === 'video' && !falApiKey && !apiKey) {
      return NextResponse.json({ error: 'Video generation needs a provider key. Set POLLINATIONS_API_KEY or FAL_KEY in your server environment.' }, { status: 503 })
    }

    const generated = await persistGenerated(id, type, prompt, seed, apiKey, aspectRatio, falApiKey)

    return NextResponse.json({
      type: generated.type,
      mode,
      prompt,
      seed,
      aspectRatio,
      url: generated.url,
      note: generated.note,
      detected:
        mode === 'auto'
          ? type === 'video'
            ? 'Detected video intent from your prompt.'
            : 'Detected image intent from your prompt.'
          : `Forced ${type} mode.`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed.'
    console.error('[generate]', message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
