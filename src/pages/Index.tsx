import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import PopularServices from "@/components/marketplace/PopularServices";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16 md:pt-20">
        <Hero />
        {/* Single category row is already in Hero quick links, no duplicate grid */}
        <PopularServices />
        <CTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
