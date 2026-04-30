import { useEffect } from "react";
import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import PopularServices from "@/components/marketplace/PopularServices";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";
import { getPublicSiteUrl, removeStructuredData, updatePageMeta, updateStructuredData } from "@/lib/seoUtils";

const Index = () => {
  useEffect(() => {
    const url = getPublicSiteUrl("/landing");
    updatePageMeta({
      title: "SkillSpot — онлайн-запись к мастерам и в организации",
      description: "SkillSpot помогает находить услуги, записываться онлайн и расти сервисному бизнесу за счёт рейтингов, CRM и встроенных коммуникаций.",
      url,
      canonicalUrl: url,
      type: "website",
    });

    updateStructuredData("landing-page", {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "SkillSpot",
      url,
      description: "Платформа для онлайн-записи к мастерам и организациям.",
    });

    return () => removeStructuredData("landing-page");
  }, []);

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
