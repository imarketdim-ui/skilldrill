import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
    <section className="relative min-h-[85vh] flex items-center overflow-hidden bg-background">
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      
      <div className="container-wide w-full">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium"
            >
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Маркетплейс услуг · г. Абакан
            </motion.div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Найдите идеального
              <span className="text-primary block">специалиста</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto">
              SkillSpot объединяет клиентов и специалистов на одной платформе.
              Записывайтесь онлайн, управляйте расписанием, растите вместе с нами.
            </p>
          </motion.div>

          {/* Search box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card rounded-2xl p-2 shadow-xl border border-border/50 max-w-2xl mx-auto"
          >
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-surface">
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
              <Button variant="hero" size="lg" className="sm:w-auto" onClick={handleSearch}>
                Найти
              </Button>
            </div>
          </motion.div>

          {/* Category quick links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex flex-wrap justify-center gap-3 pt-2"
          >
            {quickCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => navigate(`/catalog/${cat.id}`)}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-border/50 bg-card hover:bg-surface hover:border-primary/30 transition-all text-sm text-muted-foreground hover:text-foreground"
              >
                <cat.icon className="w-4 h-4" />
                {cat.label}
              </button>
            ))}
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex justify-center gap-12 pt-6"
          >
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">500+</p>
              <p className="text-sm text-muted-foreground">Специалистов</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">2K+</p>
              <p className="text-sm text-muted-foreground">Клиентов</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">4.9</p>
              <p className="text-sm text-muted-foreground">Средний рейтинг</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
