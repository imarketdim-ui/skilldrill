import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import WhyUs from "@/components/landing/WhyUs";
import HowItWorks from "@/components/landing/HowItWorks";
import PopularServices from "@/components/marketplace/PopularServices";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <WhyUs />
        <HowItWorks />
        <PopularServices />
        <CTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
