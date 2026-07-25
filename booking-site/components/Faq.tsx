import { faqs } from "@/lib/config";
import { SectionLabel } from "./Includes";

export default function Faq() {
  return (
    <section className="relative px-5 py-16 sm:px-8">
      <div className="mx-auto max-w-lg">
        <SectionLabel>Questions</SectionLabel>

        <div className="glass-dark mt-7 divide-y divide-white/[0.08] overflow-hidden">
          {faqs.map((item) => (
            <details key={item.q} className="group">
              <summary className="tap-target flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-medium tracking-tight [&::-webkit-details-marker]:hidden">
                {item.q}
                <span
                  aria-hidden
                  className="shrink-0 text-xl leading-none text-flame transition-transform duration-200 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="px-5 pb-5 text-[15px] leading-relaxed text-white/60">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
