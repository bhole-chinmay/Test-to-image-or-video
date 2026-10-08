'use client'

import { useRef, useState } from 'react'
import {
  Aperture, ArrowDownToLine, ArrowUpRight, Check, ChevronDown, CircleHelp, Clock3,
  Command, Film, Image as ImageIcon, LoaderCircle, MoreHorizontal, Plus, Ratio,
  Settings2, SlidersHorizontal, Sparkles, WandSparkles, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MediaType } from '@/lib/detect-media'

type Mode = 'image' | 'video'
type GenerateResult = { type: MediaType; mode: 'auto' | MediaType; prompt: string; seed: number; url: string; detected: string; aspectRatio: string; note?: string }

const ideas = [
  { label: 'Dreamscape', prompt: 'A tiny glass greenhouse floating above a sea of clouds at sunrise, cinematic wide shot, soft peach and lilac light' },
  { label: 'Editorial', prompt: 'Editorial portrait of a woman with silver hair in a sculptural cobalt blue coat, brutalist architecture, direct flash' },
  { label: 'Motion', prompt: 'A lone astronaut walks through a field of glowing wildflowers beneath a violet moon, slow cinematic camera push in' },
]

export function PromptStudio() {
  const [prompt, setPrompt] = useState('')
  const [mode, setMode] = useState<Mode>('image')
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [ratio, setRatio] = useState('Landscape')
  const [showSettings, setShowSettings] = useState(false)
  const [mediaLoadError, setMediaLoadError] = useState(false)
  const promptRef = useRef<HTMLTextAreaElement>(null)

  async function generate(nextPrompt = prompt) {
    const trimmed = nextPrompt.trim()
    if (!trimmed) { setError('Add a few details to your prompt to get started.'); promptRef.current?.focus(); return }
    setError(null); setResult(null); setMediaLoadError(false); setBusy(true)
    setStatus(mode === 'video' ? 'Bringing your scene to life…' : 'Dreaming up your image…')
    try {
      const res = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: trimmed, mode, aspectRatio: ratio.toLowerCase() }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed.')
      setResult(data as GenerateResult)
    } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong. Try again.') }
    finally { setBusy(false); setStatus('') }
  }

  return (
    <div className="studio-shell">
      <aside className="sidebar">
        <a className="brand" href="#top" aria-label="Frame home"><span className="brand-mark"><Aperture size={19} strokeWidth={2.2} /></span><span>frame<span className="brand-dot">.</span></span></a>
        <div className="workspace-pill"><span className="workspace-avatar">S</span><span><b>Studio space</b><small>Free workspace</small></span><ChevronDown size={14} /></div>
        <div className="side-label">CREATE</div>
        <button className="nav-item active"><WandSparkles size={17} /> Imagine <span className="nav-shortcut">⌘ 1</span></button>
        <button className="nav-item" onClick={() => setMode('video')}><Film size={17} /> Motion <span className="nav-new">NEW</span></button>
        <button className="nav-item" onClick={() => setShowSettings(!showSettings)}><SlidersHorizontal size={17} /> Fine tune</button>
        <div className="side-divider" />
        <div className="side-label recent-label">YOUR CREATIONS <button aria-label="More creations"><MoreHorizontal size={17} /></button></div>
        <div className="history-empty"><div className="history-icon"><Clock3 size={17} /></div><p>Your canvas is fresh.</p><span>Generated pieces will show up here.</span></div>
        <div className="sidebar-bottom"><button className="nav-item"><CircleHelp size={17} /> Help center <ArrowUpRight size={13} className="push-right" /></button><div className="profile"><div className="profile-avatar">S</div><div><b>Sam Creator</b><small>Personal account</small></div><MoreHorizontal size={18} className="push-right" /></div></div>
      </aside>

      <main className="main-stage" id="top">
        <header className="topbar"><div className="crumb">Studio <span>/</span> <b>Imagine</b></div><div className="topbar-actions"><span className="credits"><span /> 24 credits</span><button className="upgrade-button">Upgrade <ArrowUpRight size={13} /></button><button className="icon-button" aria-label="Settings" onClick={() => setShowSettings(!showSettings)}><Settings2 size={17} /></button></div></header>

        <div className="content-wrap">
          <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line" /> YOUR IMAGINATION, IN FRAME</div><h1>Make something<br /><em>beautiful.</em></h1><p className="subhead">A thought, a feeling, a half-remembered dream.<br className="desktop-break" /> Start with a prompt and see where it takes you.</p></div><div className="today-badge"><div className="sun-orbit"><span /></div><span>Good things<br />start here</span></div></section>

          <section className={cn('composer-card', busy && 'is-busy')} aria-label="Create from a prompt">
            <div className="composer-topline"><span className="composer-label"><Sparkles size={14} /> YOUR PROMPT</span><span className="prompt-count">{prompt.length}<span> / 1200</span></span></div>
            <textarea ref={promptRef} value={prompt} maxLength={1200} disabled={busy} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void generate() } }} placeholder="Describe the scene you can see in your mind…" />
            {!prompt && <div className="prompt-hint"><span className="hint-spark">✳</span> Try “a quiet moment in a world that doesn’t exist yet”</div>}
            <div className="composer-footer"><div className="mode-switch" role="group" aria-label="Output type"><button className={cn(mode === 'image' && 'selected')} onClick={() => setMode('image')} disabled={busy}><ImageIcon size={15} /> Image</button><button className={cn(mode === 'video' && 'selected')} onClick={() => setMode('video')} disabled={busy}><Film size={15} /> Video <span className="mode-beta">BETA</span></button></div><div className="composer-actions"><button className="settings-trigger" onClick={() => setShowSettings(!showSettings)}><SlidersHorizontal size={15} /><span>Settings</span></button><button className="generate-button" disabled={busy} onClick={() => void generate()}>{busy ? <LoaderCircle size={16} className="spin" /> : <Sparkles size={16} />}{busy ? 'Creating…' : 'Generate'}<span className="button-shortcut"><Command size={10} /> ↵</span></button></div></div>
            {showSettings && <div className="settings-popover"><div className="settings-heading">Canvas settings <button onClick={() => setShowSettings(false)} aria-label="Close settings"><X size={14} /></button></div><label>Aspect ratio</label><div className="ratio-options">{['Landscape','Portrait','Square'].map((item) => <button key={item} onClick={() => setRatio(item)} className={cn(ratio === item && 'chosen')}><Ratio size={14} />{item}{ratio === item && <Check size={12} />}</button>)}</div><p>More controls are coming soon.</p></div>}
          </section>

          {busy ? <section className="preview-panel loading-panel"><div className="loading-art"><div className="loading-ring ring-one" /><div className="loading-ring ring-two" /><Sparkles size={28} /></div><span className="loading-kicker">A LITTLE CREATION IN PROGRESS</span><h2>{status}</h2><p>This usually takes around 20–60 seconds. Stay right here.</p><div className="loading-progress"><span /></div></section> : error ? <section className="preview-panel unavailable-panel" role="status"><div className="unavailable-icon">{mode === 'video' ? <Film size={22} /> : <ImageIcon size={22} />}<span><X size={11} /></span></div><span className="loading-kicker">OUTPUT NOT CREATED</span><h2>There’s nothing to preview yet.</h2><p>{error.includes('needs a provider key') || error.includes('Native AI video needs') ? <>Add your own <code>POLLINATIONS_API_KEY</code> from <a href="https://enter.pollinations.ai/keys" target="_blank" rel="noreferrer">enter.pollinations.ai/keys</a> to <code>.env.local</code>, restart the server, and try again.</> : error.includes('Could not reach') ? 'The server could not connect to its image provider. Check the deployed server’s outbound network access and try again.' : error}</p><button className="retry-button" onClick={() => void generate()} disabled={busy}><Sparkles size={14} /> Try again</button></section> : result ? <section className="result-panel"><div className="result-heading"><div><span className="loading-kicker">YOUR NEW CREATION</span><h2>Made from your imagination</h2></div><a href={result.url} download={`${result.type}-${result.seed}.${result.type === 'video' ? 'mp4' : result.url.split('.').pop()}`} className="download-button"><ArrowDownToLine size={15} /> Download</a></div><div className="result-media">{mediaLoadError ? <div className="media-load-error"><ImageIcon size={24} /><b>Image could not be loaded</b><span>The generated media could not be loaded. Check provider access and try again.</span><button className="retry-button" onClick={() => void generate()}><Sparkles size={14} /> Try again</button></div> : result.type === 'video' ? <video key={result.url} src={result.url} controls autoPlay loop muted playsInline onError={() => setMediaLoadError(true)} /> : <img key={result.url} src={result.url} alt={result.prompt} onError={() => setMediaLoadError(true)} />}</div><div className="result-meta"><div className="result-prompt"><span>YOUR PROMPT · {result.aspectRatio}</span><p>{result.prompt}</p></div><span className="seed-chip">Seed {result.seed}</span></div>{result.note && <p className="result-note">{result.note}</p>}</section> : <section className="inspiration"><div className="section-heading"><div><span className="loading-kicker">A PLACE TO BEGIN</span><h2>Pick a feeling.</h2></div><button className="shuffle-button" onClick={() => { setPrompt(ideas[Math.floor(Math.random() * ideas.length)].prompt); promptRef.current?.focus() }}><Plus size={14} /> Surprise me</button></div><div className="idea-grid">{ideas.map((idea, i) => <button className={`idea-card idea-${i + 1}`} key={idea.label} onClick={() => { setPrompt(idea.prompt); setMode(i === 2 ? 'video' : 'image'); promptRef.current?.focus() }}><span className="idea-art" aria-hidden="true"><span className="idea-orb" /><span className="idea-shape" /></span><span className="idea-copy"><b>{idea.label}</b><span>{idea.prompt.slice(0, 54)}…</span><ArrowUpRight size={14} /></span></button>)}</div></section>}
          <footer className="page-foot"><span>Made for the things you haven’t seen yet.</span><span><span className="online-dot" /> All systems feeling creative <span className="foot-sep">·</span> <button onClick={() => setShowSettings(true)}>Aspect: {ratio}</button></span></footer>
        </div>
      </main>
    </div>
  )
}
