import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Scissors, Dumbbell, GraduationCap, Camera, Heart, Home, Car, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

const quickCategories = [
  { icon: Scissors, label: "Бьюти", id: "a0000001-0000-0000-0000-000000000001" },
  { icon: Dumbbell, label: "Фитнес", id: "a0000001-0000-0000-0000-000000000007" },
  { icon: GraduationCap, label: "Обучение", id: "a0000001-0000-0000-0000-000000000003" },
  { icon: Camera, label: "Фото", id: "a0000001-0000-0000-0000-000000000005" },
  { icon: Heart, label: "Здоровье", id: "a0000001-0000-0000-0000-000000000006" },
  { icon: Home, label: "Дом", id: "a0000001-0000-0000-0000-000000000008" },
  { icon: Car, label: "Авто", id: "a0000001-0000-0000-0000-000000000002" },
  { icon: Sparkles, label: "СПА", id: "a0000001-0000-0000-0000-000000000004" },
];

const Hero = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/catalog?q=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate('/catalog');
    }
  };

  return (
    <section className="relative min-h-[600px] md:min-h-[680px] flex items-center">
      {/* Background image */}
      <div className="absolute inset-0">
        <img src={heroBg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-foreground/60" />
      </div>

      <div className="container-wide relative z-10 py-28 md:py-36">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <p className="text-sm font-medium text-white/70 uppercase tracking-widest">
            Маркетплейс услуг в Абакане
          </p>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-tight text-white">
            Найдите своего{" "}
            <span className="text-primary-foreground">специалиста</span>
          </h1>
          
          <p className="text-lg md:text-xl text-white/80 max-w-xl mx-auto">
            Записывайтесь онлайн к проверенным мастерам. Удобно, быстро, с гарантией качества.
          </p>

          {/* Search bar — Khakasia-inspired */}
          <div className="bg-card rounded-2xl p-2 shadow-lg max-w-2xl mx-auto">
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary">
                <Search className="w-5 h-5 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  placeholder="Маникюр, массаж, стрижка, фитнес..."
                  className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-base"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button size="lg" onClick={handleSearch} className="shrink-0">
                <Search className="w-4 h-4 mr-2" />
                Найти
              </Button>
            </div>
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {quickCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => navigate(`/catalog/${cat.id}`)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-sm text-white/90 hover:text-white border border-white/10"
              >
                <cat.icon className="w-4 h-4" />
                {cat.label}
              </button>
            ))}
          </div>

          {/* Quick CTA for specialists */}
          <div className="pt-4">
            <button
              onClick={() => navigate('/for-business')}
              className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white/90 transition-colors"
            >
              Вы специалист? Разместите свои услуги
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
