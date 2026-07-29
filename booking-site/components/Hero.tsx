export default function Hero() {
  return (
    <section className="relative px-5 pb-4 pt-6 sm:px-8">
      <div className="mx-auto max-w-lg">
        {/* Wordmark */}
        <div className="flex animate-fade-up items-center gap-2.5">
          <FacetMark />
          <span className="text-[15px] font-semibold tracking-tight text-white">
            CMB
          </span>
        </div>

        {/* Availability pill */}
        <div
          className="mt-6 inline-flex animate-fade-up items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 backdrop-blur-md"
          style={{ animationDelay: "60ms" }}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-aqua opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-aqua" />
          </span>
          <span className="text-xs font-medium tracking-tight text-white/90">
            Now booking new clients
          </span>
        </div>

        <h1
          className="mt-4 animate-fade-up text-[3rem] font-bold leading-[0.98] tracking-tightest drop-shadow-[0_2px_20px_rgba(0,0,0,0.35)] sm:text-[4.25rem]"
          style={{ animationDelay: "120ms" }}
        >
          Your first
          <br />
          session is
          <br />
          <span className="italic">free.</span>
        </h1>
      </div>
    </section>
  );
}

/** Small triangulated mark that echoes the background artwork. */
export function FacetMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id="fm-a" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#F56A29" />
          <stop offset="100%" stopColor="#EDA149" />
        </linearGradient>
        <linearGradient id="fm-b" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#A41B47" />
          <stop offset="100%" stopColor="#6E2576" />
        </linearGradient>
        <linearGradient id="fm-c" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#6098D3" />
          <stop offset="100%" stopColor="#7AF0E4" />
        </linearGradient>
      </defs>
      <path d="M2 30 L16 2 L18 30 Z" fill="url(#fm-a)" />
      <path d="M16 2 L30 30 L18 30 Z" fill="url(#fm-b)" />
      <path d="M16 2 L30 30 L26 12 Z" fill="url(#fm-c)" opacity="0.9" />
    </svg>
  );
}
