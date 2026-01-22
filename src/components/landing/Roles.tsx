import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const roles = [
  {
    title: "Клиент",
    subtitle: "Найти и записаться",
    description: "Ищите услуги, записывайтесь онлайн, оставляйте отзывы и получайте бонусы за хороший рейтинг.",
    features: [
      "Поиск по услугам и геолокации",
      "Онлайн-запись 24/7",
      "История визитов",
      "Персональный рейтинг",
      "Уведомления о записях",
    ],
    cta: "Найти услугу",
    variant: "hero" as const,
    popular: false,
  },
  {
    title: "Бизнес",
    subtitle: "Управлять и расти",
    description: "Полная операционная система: от записей до финансов. Всё в одном месте.",
    features: [
      "Управление расписанием",
      "Роли и права сотрудников",
      "Технологические карты услуг",
      "Финансовая аналитика",
      "Складской учёт",
      "Зарплаты и комиссии",
      "Клиентская база с рейтингами",
    ],
    cta: "Подключить бизнес",
    variant: "accent" as const,
    popular: true,
  },
  {
    title: "Специалист",
    subtitle: "Работать и зарабатывать",
    description: "Управляйте своим расписанием, следите за начислениями и развивайте личный бренд.",
    features: [
      "Личное расписание",
      "Начисления и комиссии",
      "Рейтинг и отзывы",
      "Уведомления о записях",
      "Профиль специалиста",
    ],
    cta: "Стать специалистом",
    variant: "outline-primary" as const,
    popular: false,
  },
];

const Roles = () => {
  return (
    <section className="section-padding bg-surface" id="roles">
      <div className="container-wide">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-6">
            Одна платформа,
            <span className="text-gradient-primary"> три роли</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Каждый пользователь может быть клиентом, специалистом или владельцем бизнеса. 
            Переключайтесь между ролями в один клик.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {roles.map((role, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative bg-card rounded-2xl p-8 border ${
                role.popular 
                  ? "border-primary shadow-primary" 
                  : "border-border/50"
              } card-hover`}
            >
              {role.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-primary to-emerald-dark text-white text-sm font-medium rounded-full">
                  Популярно
                </div>
              )}
              
              <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-1">{role.subtitle}</p>
                <h3 className="text-2xl font-display font-bold text-foreground">{role.title}</h3>
              </div>
              
              <p className="text-muted-foreground mb-6">
                {role.description}
              </p>
              
              <ul className="space-y-3 mb-8">
                {role.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-sm text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button variant={role.variant} size="lg" className="w-full">
                {role.cta}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Roles;
