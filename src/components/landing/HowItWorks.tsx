import { motion } from "framer-motion";
import { Search, CalendarCheck, Star } from "lucide-react";

const steps = [
  {
    icon: Search,
    step: "01",
    title: "Найдите специалиста",
    description: "Введите услугу и город. Фильтруйте по рейтингу, цене и доступному времени.",
    gradient: "from-primary to-emerald-dark",
  },
  {
    icon: CalendarCheck,
    step: "02",
    title: "Запишитесь онлайн",
    description: "Выберите удобное время и подтвердите запись. Получите напоминание за день и час до визита.",
    gradient: "from-amber to-amber-dark",
  },
  {
    icon: Star,
    step: "03",
    title: "Оцените визит",
    description: "После услуги оставьте отзыв. Ваш рейтинг тоже растёт — лучшим клиентам доступны бонусы.",
    gradient: "from-primary to-emerald-dark",
  },
];

const HowItWorks = () => {
  return (
    <section className="section-padding" id="how-it-works">
      <div className="container-wide">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-6">
            Как это
            <span className="text-gradient-accent"> работает</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Три простых шага от поиска до идеального сервиса
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connection line */}
          <div className="hidden md:block absolute top-24 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-primary via-amber to-primary opacity-20" />
          
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="relative text-center"
            >
              {/* Icon */}
              <div className="relative inline-flex mb-6">
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-lg`}>
                  <step.icon className="w-10 h-10 text-white" />
                </div>
                <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-card border-2 border-border flex items-center justify-center text-sm font-bold text-foreground">
                  {step.step}
                </span>
              </div>
              
              <h3 className="text-xl font-display font-bold mb-3 text-foreground">
                {step.title}
              </h3>
              <p className="text-muted-foreground">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
