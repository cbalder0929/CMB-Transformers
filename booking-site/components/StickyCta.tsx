"use client";

import { useEffect, useState } from "react";

/**
 * Appears once the user scrolls past the hero, hides again while the booking
 * section is on screen — no point competing with the real CTA.
 */
export default function StickyCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const scrolledPastHero = window.scrollY > 420;

      const bookSection = document.getElementById("book");
      let bookingInView = false;
      if (bookSection) {
        const rect = bookSection.getBoundingClientRect();
        bookingInView = rect.top < window.innerHeight && rect.bottom > 0;
      }

      setVisible(scrolledPastHero && !bookingInView);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-night-950/80 p-4 backdrop-blur-xl transition-transform duration-300 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
    >
      <a href="#book" className="btn-primary mx-auto max-w-lg">
        Book my free session
      </a>
    </div>
  );
}
