import { Search, CalendarCheck, Star, UserPlus } from "lucide-react";

const steps = [
  {
    icon: Search,
    step: "01",
    title: "Найдите специалиста",
    description: "Используйте поиск и фильтры, чтобы найти нужную услугу по категории, цене или рейтингу.",
  },
  {
    icon: CalendarCheck,
    step: "02",
    title: "Запишитесь онлайн",
    description: "Выберите удобную дату и время. Подтверждение придёт мгновенно.",
  },
  {
    icon: Star,
    step: "03",
    title: "Получите услугу",
    description: "Посетите мастера в назначенное время. Всё просто и без лишних звонков.",
  },
  {
    icon: UserPlus,
    step: "04",
    title: "Оставьте отзыв",
    description: "Оцените качество — это помогает другим клиентам и мотивирует специалистов.",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="container-wide">
        <div className="text-center mb-14">
          <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-3">Как это работает</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            От поиска до результата — 4 шага
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((s, i) => (
            <div key={i} className="relative text-center">
              {/* Connector line (hidden on last item and mobile) */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-px bg-border" />
              )}
              
              <div className="relative inline-flex mb-5">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <s.icon className="w-9 h-9 text-primary" />
                </div>
                <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                  {s.step}
                </span>
              </div>
              
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
