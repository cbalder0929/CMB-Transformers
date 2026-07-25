import { business } from "@/lib/config";
import { SectionLabel } from "./Includes";

export default function About() {
  return (
    <section className="relative px-5 py-16 sm:px-8">
      <div className="mx-auto max-w-lg">
        <SectionLabel>Who you train with</SectionLabel>

        <div className="glass-dark mt-7 overflow-hidden">
          {/* Replace with a real photo:
              <Image src="/charles.jpg" alt="Charles" width={800} height={600} priority /> */}
          <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-facet-full opacity-25" />
            <div className="absolute inset-0 bg-night-900/40" />
            <span className="relative text-sm tracking-tight text-white/45">
              Your photo here
            </span>
          </div>

          <div className="p-6">
            <h3 className="text-2xl font-bold tracking-tight">
              {business.trainerName}
            </h3>
            <p className="mt-1 text-sm font-medium text-amber">
              Personal Trainer · {business.location.cityState}
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-white/60">
              I don&rsquo;t just want to train you — I want to teach you how
              to train yourself. Everything I coach is built around the
              lessons that helped me stop quitting, stay disciplined, and
              make fitness part of my life.
            </p>
          </div>
        </div>

        <div className="glass-dark mt-4 p-6">
          <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/60">
            My philosophy
          </h4>
          <p className="mt-3 text-[15px] leading-relaxed text-white/60">
            My goal isn&rsquo;t for you to depend on me forever. My goal is
            for you to understand why you&rsquo;re doing what you&rsquo;re
            doing, so you can build habits that last long after our sessions.
          </p>
        </div>
      </div>
    </section>
  );
}
