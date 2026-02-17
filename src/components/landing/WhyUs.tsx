import { motion } from "framer-motion";
import { ShieldCheck, Target, Zap, Award } from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "Верифицированные мастера",
    description: "Каждый специалист проходит проверку. Реальные фото работ, отзывы и рейтинги помогают сделать правильный выбор.",
  },
  {
    icon: Target,
    title: "Умная система записи",
    description: "Онлайн-запись 24/7, автоматические напоминания, управление расписанием — всё в одном месте.",
  },
  {
    icon: Zap,
    title: "Быстрый старт для бизнеса",
    description: "От регистрации до первого клиента — за 15 минут. CRM, расписание и аналитика уже включены.",
  },
  {
    icon: Award,
    title: "Двусторонние рейтинги",
    description: "Уникальная система: мастера и клиенты оценивают друг друга. Прозрачность и доверие на каждом шагу.",
  },
];

const WhyUs = () => {
  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="container-wide">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-3">Почему мы</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            Платформе, которой доверяют
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-card rounded-2xl p-6 border border-border/50 hover:border-primary/20 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyUs;
