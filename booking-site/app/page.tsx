import FacetBackdrop from "@/components/FacetBackdrop";
import Hero from "@/components/Hero";
import WhyFree from "@/components/WhyFree";
import Includes from "@/components/Includes";
import BookingSection from "@/components/BookingSection";
import About from "@/components/About";
import Faq from "@/components/Faq";
import Footer from "@/components/Footer";
import StickyCta from "@/components/StickyCta";

export default function Home() {
  return (
    <>
      <FacetBackdrop />
      <main className="relative min-h-screen">
        <Hero />
        <BookingSection />
        <About />
        <Faq />
        <WhyFree />
        <Includes />
        <Footer />
      </main>
      <StickyCta />
    </>
  );
}
