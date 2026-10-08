import { PromptStudio } from '@/components/prompt-studio'

export default function Page() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_10%_-10%,#d8e8ef_0%,transparent_55%),radial-gradient(90%_70%_at_100%_0%,#f3dcc4_0%,transparent_50%),linear-gradient(180deg,#f7f4ef_0%,#e8eef2_48%,#dfe8ec_100%)]" />
        <div className="absolute -left-24 top-24 h-72 w-72 animate-[drift_18s_ease-in-out_infinite] rounded-full bg-[#c9a66b]/25 blur-3xl" />
        <div className="absolute -right-16 bottom-10 h-80 w-80 animate-[drift_22s_ease-in-out_infinite_reverse] rounded-full bg-[#6f91a8]/30 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.035] [background-image:url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E')]" />
      </div>
      <PromptStudio />
    </main>
  )
}
