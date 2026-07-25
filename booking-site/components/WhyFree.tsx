import { SectionLabel } from "./Includes";

export default function WhyFree() {
  return (
    <section className="relative px-5 py-16 sm:px-8">
      <div className="mx-auto max-w-lg">
        <SectionLabel>Why it&rsquo;s free</SectionLabel>

        <h2 className="mt-3 text-3xl font-bold leading-[1.1] tracking-tightest sm:text-4xl">
          No sales pitch.
          <br />
          <span className="text-facet">Just an honest look.</span>
        </h2>

        <div className="glass-dark mt-7 p-6">
          <p className="text-[15px] leading-relaxed text-white/60">
            I don&rsquo;t believe personal training should start with a sales
            pitch. The first session is free because I want us to figure out
            two things:
          </p>

          <ul className="mt-5 space-y-3">
            {[
              "Can I genuinely help you reach your goals?",
              "Do we work well together?",
            ].map((q) => (
              <li key={q} className="flex items-start gap-3">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-flame" />
                <span className="text-[15px] font-medium tracking-tight text-white/90">
                  {q}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-5 text-[15px] leading-relaxed text-white/60">
            If the answer is yes, great — we&rsquo;ll build a plan. If not,
            you&rsquo;ll still leave with a better understanding of your
            fitness.
          </p>
        </div>
      </div>
    </section>
  );
}
