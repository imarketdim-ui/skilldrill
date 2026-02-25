import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Scissors, Dumbbell, GraduationCap, Camera, Heart, Home, Car, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    navigate(`/catalog?q=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <section className="pt-28 pb-20 md:pt-36 md:pb-28 bg-background">
      <div className="container-wide">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <h1 className="text-4xl md:text-5xl font-display font-bold leading-tight text-foreground">
            Найдите своего
            <span className="text-primary"> специалиста</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            SkillSpot — маркетплейс услуг в Абакане. Записывайтесь онлайн, управляйте расписанием, растите вместе с нами.
          </p>

          {/* Search */}
          <div className="bg-card rounded-2xl p-2 shadow-md border border-border max-w-xl mx-auto">
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary">
                <Search className="w-5 h-5 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  placeholder="Маникюр, массаж, стрижка..."
                  className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button size="lg" onClick={handleSearch}>
                <Search className="w-4 h-4" />
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
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-secondary transition-colors text-sm text-muted-foreground hover:text-foreground"
              >
                <cat.icon className="w-4 h-4" />
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
