import { business } from "@/lib/config";

export default function Hero() {
  return (
    <section className="relative px-5 pb-16 pt-8 sm:px-8">
      <div className="mx-auto max-w-lg">
        {/* Wordmark */}
        <div className="flex animate-fade-up items-center gap-2.5">
          <FacetMark />
          <span className="text-[15px] font-semibold tracking-tight text-white">
            {business.name}
          </span>
        </div>

        {/* Availability pill */}
        <div
          className="mt-12 inline-flex animate-fade-up items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 backdrop-blur-md"
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
          className="mt-6 animate-fade-up text-[3rem] font-bold leading-[0.98] tracking-tightest drop-shadow-[0_2px_20px_rgba(0,0,0,0.35)] sm:text-[4.25rem]"
          style={{ animationDelay: "120ms" }}
        >
          Your first
          <br />
          session is
          <br />
          <span className="italic">free.</span>
        </h1>

        <p
          className="mt-6 max-w-md animate-fade-up text-lg leading-relaxed text-white/80 drop-shadow-[0_1px_12px_rgba(0,0,0,0.4)]"
          style={{ animationDelay: "180ms" }}
        >
          No commitment. No pressure. Just one hour to see if we&rsquo;re a
          good fit.
        </p>

        <p
          className="mt-3 max-w-md animate-fade-up text-lg leading-relaxed text-white/80 drop-shadow-[0_1px_12px_rgba(0,0,0,0.4)]"
          style={{ animationDelay: "210ms" }}
        >
          You&rsquo;ll leave knowing exactly where you stand and what to do
          next — whether you keep training with {business.trainerName} or
          not.
        </p>

        <div
          className="mt-9 animate-fade-up space-y-3"
          style={{ animationDelay: "240ms" }}
        >
          <a href="#book" className="btn-primary w-full sm:w-auto sm:px-12">
            Book my free session
          </a>
          <p className="text-sm text-white/60">
            Takes about 30 seconds · Pick any open time
          </p>
        </div>

        {/* Stat strip — structure, and it earns trust before the ask */}
        <dl
          className="mt-14 grid animate-fade-up grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md"
          style={{ animationDelay: "300ms" }}
        >
          {[
            { v: "60", l: "minutes" },
            { v: "$0", l: "to start" },
            { v: "1:1", l: "coaching" },
          ].map((s) => (
            <div key={s.l} className="bg-white/[0.04] px-3 py-4 text-center">
              <dt className="text-2xl font-bold tracking-tight">{s.v}</dt>
              <dd className="mt-0.5 text-[11px] uppercase tracking-widest text-white/60">
                {s.l}
              </dd>
            </div>
          ))}
        </dl>
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
