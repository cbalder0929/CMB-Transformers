"use client";

import { useLayoutEffect, useState } from "react";

/**
 * Appears once the user scrolls past the hero, hides again while the booking
 * section is on screen — no point competing with the real CTA.
 */
export default function StickyCta() {
  // Start hidden on the server and measure before the first browser paint.
  const [visible, setVisible] = useState(false);

  useLayoutEffect(() => {
    let frameId: number | undefined;

    const updateVisibility = () => {
      const trainerSection = document.getElementById("trainer");
      const hasPassedTrainer = trainerSection
        ? trainerSection.getBoundingClientRect().bottom <= 0
        : false;

      setVisible((current) =>
        current === hasPassedTrainer ? current : hasPassedTrainer,
      );
    };

    // Browser scroll restoration can happen after hydration. Measure now and
    // again after the first layout pass, then react to later layout changes.
    updateVisibility();
    frameId = window.requestAnimationFrame(updateVisibility);

    const trainerSection = document.getElementById("trainer");
    const resizeObserver = trainerSection
      ? new ResizeObserver(updateVisibility)
      : undefined;
    if (trainerSection) resizeObserver?.observe(trainerSection);

    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);
    window.addEventListener("load", updateVisibility);
    window.addEventListener("pageshow", updateVisibility);

    return () => {
      if (frameId !== undefined) window.cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
      window.removeEventListener("load", updateVisibility);
      window.removeEventListener("pageshow", updateVisibility);
    };
  }, []);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 max-w-full overflow-x-clip border-t border-white/10 bg-night-950/80 p-4 backdrop-blur-xl transition-[opacity,transform] duration-300 ${
        visible
          ? "visible translate-y-0 opacity-100"
          : "invisible pointer-events-none translate-y-full opacity-0"
      }`}
      style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
    >
      <a href="#book" className="btn-primary mx-auto w-full max-w-lg">
        Book my free session
      </a>
    </div>
  );
}
