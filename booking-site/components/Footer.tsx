import { business } from "@/lib/config";
import { FacetMark } from "./Hero";

export default function Footer() {
  return (
    <footer className="relative px-5 pb-32 pt-10 sm:px-8">
      <div className="mx-auto max-w-lg">
        <div className="rule-facet mb-9" />

        <div className="flex items-center gap-2.5">
          <FacetMark className="h-6 w-6" />
          <span className="text-sm font-semibold tracking-tight">
            {business.name}
          </span>
        </div>

        <div className="mt-5 space-y-1.5 text-sm text-white/50">
          <p>
            <a
              href={`tel:${business.phoneE164}`}
              className="transition hover:text-amber"
            >
              {business.phone}
            </a>
          </p>
          <p>
            <a
              href={`mailto:${business.email}`}
              className="transition hover:text-amber"
            >
              {business.email}
            </a>
          </p>
        </div>

        <div className="mt-6 flex gap-5 text-sm text-white/50">
          <a href="/privacy" className="transition hover:text-amber">
            Privacy
          </a>
          <a href="/terms" className="transition hover:text-amber">
            Terms
          </a>
        </div>

        <p className="mt-8 text-xs text-white/30">
          © {new Date().getFullYear()} {business.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
