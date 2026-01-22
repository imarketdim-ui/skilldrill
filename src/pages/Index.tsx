import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import CategoryGrid from "@/components/marketplace/CategoryGrid";
import PopularServices from "@/components/marketplace/PopularServices";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import Roles from "@/components/landing/Roles";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16 md:pt-20">
        <Hero />
        <CategoryGrid />
        <PopularServices />
        <Features />
        <HowItWorks />
        <Roles />
        <CTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
