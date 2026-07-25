import { sessionIncludes } from "@/lib/config";

/** Each step gets a facet color, walking the same path as the artwork. */
const facetColors = [
  "from-amber to-flame",
  "from-flame to-ember",
  "from-rose to-plum",
  "from-azure to-cyan",
];

export default function Includes() {
  return (
    <section className="relative px-5 py-16 sm:px-8">
      <div className="mx-auto max-w-lg">
        <SectionLabel>What happens in your first session</SectionLabel>

        <h2 className="mt-3 text-3xl font-bold leading-[1.1] tracking-tightest sm:text-4xl">
          One hour.
          <br />
          <span className="text-facet">Three steps.</span>
        </h2>

        <ol className="mt-9 space-y-3">
          {sessionIncludes.map((item, i) => (
            <li key={item.title} className="glass-dark p-5">
              <div className="flex items-start gap-4">
                <span
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white ${facetColors[i % facetColors.length]}`}
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold tracking-tight">{item.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-white/60">
                    {item.body}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px w-6 bg-gradient-to-r from-flame to-rose" />
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
        {children}
      </span>
    </div>
  );
}
