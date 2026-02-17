import { ShieldCheck, Target, Zap, Award } from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "Проверенные мастера",
    description: "Каждый специалист проходит проверку. Реальные фото работ и отзывы помогают сделать правильный выбор.",
  },
  {
    icon: Target,
    title: "Удобная запись",
    description: "Онлайн-запись 24/7, автоматические напоминания, управление расписанием — всё в одном месте.",
  },
  {
    icon: Zap,
    title: "Быстрый старт",
    description: "От регистрации до первого клиента — за 15 минут. CRM, расписание и аналитика уже включены.",
  },
  {
    icon: Award,
    title: "Двусторонние рейтинги",
    description: "Мастера и клиенты оценивают друг друга. Прозрачность и доверие на каждом шагу.",
  },
];

const WhyUs = () => {
  return (
    <section className="py-20 md:py-28 bg-surface">
      <div className="container-wide">
        <div className="text-center mb-14">
          <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-3">Почему мы</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            Платформа, которой доверяют
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className="bg-card rounded-2xl p-6 border border-border shadow-sm"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyUs;
