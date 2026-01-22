import { motion } from "framer-motion";
import { 
  Calendar, 
  Users, 
  BarChart3, 
  Shield, 
  Star, 
  Zap,
  Building2,
  Wallet
} from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Онлайн-запись",
    description: "Клиенты записываются 24/7. Никаких звонков и ожидания.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Users,
    title: "Управление командой",
    description: "Гибкие роли и права. Контролируйте доступ к данным бизнеса.",
    color: "bg-amber/10 text-amber-dark",
  },
  {
    icon: BarChart3,
    title: "Аналитика и отчёты",
    description: "Следите за доходами, эффективностью услуг и сотрудников.",
    color: "bg-emerald-dark/10 text-emerald-dark",
  },
  {
    icon: Shield,
    title: "Двусторонние рейтинги",
    description: "Клиенты оценивают мастеров, мастера — клиентов. Доверие для всех.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Star,
    title: "Технологические карты",
    description: "Детальный расчёт себестоимости и прибыли каждой услуги.",
    color: "bg-amber/10 text-amber-dark",
  },
  {
    icon: Zap,
    title: "Мгновенные уведомления",
    description: "Push, SMS, Email — клиент всегда в курсе изменений.",
    color: "bg-emerald-dark/10 text-emerald-dark",
  },
  {
    icon: Building2,
    title: "Мультибизнес",
    description: "Управляйте несколькими точками из одного аккаунта.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Wallet,
    title: "Финансы и зарплаты",
    description: "Автоматический расчёт комиссий и выплат сотрудникам.",
    color: "bg-amber/10 text-amber-dark",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const Features = () => {
  return (
    <section className="section-padding bg-surface" id="features">
      <div className="container-wide">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-6">
            Всё для вашего
            <span className="text-gradient-primary"> бизнеса</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            SkillSpot — это не просто запись на услуги. Это полноценная операционная система 
            для салонов красоты, фитнес-студий, медицинских центров и любого сервисного бизнеса.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={item}
              className="group bg-card rounded-2xl p-6 border border-border/50 card-hover"
            >
              <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold font-display mb-2 text-foreground">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Features;
