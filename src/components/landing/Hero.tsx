import { motion } from "framer-motion";
import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-illustration.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background gradient */}
      <div 
        className="absolute inset-0 -z-10"
        style={{ background: "var(--gradient-hero)" }}
      />
      
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      
      <div className="container-wide w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium"
              >
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse-soft" />
                Маркетплейс услуг нового поколения
              </motion.div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-tight">
                Найдите идеального
                <span className="text-gradient-primary block">специалиста</span>
                за минуту
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl">
                SkillSpot объединяет клиентов, специалистов и бизнесы на одной платформе. 
                Записывайтесь онлайн, управляйте своим делом, растите вместе с нами.
              </p>
            </div>

            {/* Search box */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-card rounded-2xl p-2 shadow-xl border border-border/50"
            >
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-surface">
                  <Search className="w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Маникюр, массаж, стрижка..."
                    className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface sm:w-48">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Город"
                    className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <Button variant="hero" size="lg" className="sm:w-auto">
                  Найти
                </Button>
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap gap-8 pt-4"
            >
              <div>
                <p className="text-3xl font-bold font-display text-foreground">10K+</p>
                <p className="text-muted-foreground">Специалистов</p>
              </div>
              <div>
                <p className="text-3xl font-bold font-display text-foreground">50K+</p>
                <p className="text-muted-foreground">Клиентов</p>
              </div>
              <div>
                <p className="text-3xl font-bold font-display text-foreground">4.9</p>
                <p className="text-muted-foreground">Средний рейтинг</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Right image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="relative">
              <img
                src={heroImage}
                alt="SkillSpot - маркетплейс услуг"
                className="w-full h-auto rounded-3xl"
              />
              
              {/* Floating cards */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -left-8 top-1/4 bg-card p-4 rounded-2xl shadow-xl border border-border/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xl">⭐</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">4.9 рейтинг</p>
                    <p className="text-sm text-muted-foreground">1,234 отзыва</p>
                  </div>
                </div>
              </motion.div>
              
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -right-4 bottom-1/4 bg-card p-4 rounded-2xl shadow-xl border border-border/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                    <span className="text-xl">✅</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Записано!</p>
                    <p className="text-sm text-muted-foreground">Завтра в 14:00</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
