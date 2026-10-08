export type MediaType = 'image' | 'video'

const VIDEO_PATTERNS =
  /\b(video|clip|footage|animate[ds]?|animation|cinematic(?:\s+shot)?|timelapse|time[\s-]?lapse|moving|in\s+motion|walks?|walking|runs?|running|flies|flying|camera\s+pan|dolly|zoom\s+in|zoom\s+out|loops?|mp4|reel|short\s+film|scene\s+where)\b/i

/** Infer image vs video from the user's prompt wording. */
export function detectMediaType(prompt: string): MediaType {
  return VIDEO_PATTERNS.test(prompt.trim()) ? 'video' : 'image'
}
