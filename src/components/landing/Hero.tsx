import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Scissors, Dumbbell, GraduationCap, Camera, Heart, Home, Car, Sparkles, MapPin, Star, Users, ChevronDown } from "lucide-react";
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

const stats = [
  { icon: MapPin, value: "9", label: "Категорий" },
  { icon: Users, value: "500+", label: "Специалистов" },
  { icon: Users, value: "2K+", label: "Клиентов" },
  { icon: Star, value: "4.9", label: "Средний рейтинг" },
];

const Hero = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = () => {
    navigate(`/catalog?q=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img src={heroBg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/70" />
      </div>

      <div className="container-wide w-full relative z-10">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-white/90 text-sm font-medium"
          >
            <Sparkles className="w-4 h-4 text-accent" />
            Маркетплейс услуг · г. Абакан
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="space-y-4"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-tight text-white">
              Ваш идеальный
              <span className="block text-accent">специалист здесь</span>
            </h1>
            <p className="text-lg md:text-xl text-white/70 max-w-xl mx-auto">
              SkillSpot объединяет клиентов и специалистов на одной платформе.
              Записывайтесь онлайн, управляйте расписанием, растите вместе с нами.
            </p>
          </motion.div>

          {/* Search box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card/95 backdrop-blur-xl rounded-2xl p-2 shadow-xl border border-white/10 max-w-2xl mx-auto"
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
                <Search className="w-4 h-4" />
                Найти
              </Button>
            </div>
          </motion.div>

          {/* Category pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap justify-center gap-2 pt-2"
          >
            {quickCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => navigate(`/catalog/${cat.id}`)}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/5 backdrop-blur-sm hover:bg-white/15 hover:border-white/30 transition-all text-sm text-white/80 hover:text-white"
              >
                <cat.icon className="w-4 h-4" />
                {cat.label}
              </button>
            ))}
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex justify-center gap-8 sm:gap-12 pt-6"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</p>
                <p className="text-xs sm:text-sm text-white/60">{stat.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="pt-8"
          >
            <ChevronDown className="w-6 h-6 text-white/40 mx-auto animate-bounce" />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
