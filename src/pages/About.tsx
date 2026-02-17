import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Star, Shield, Calendar, Bell, Gift, Users, ArrowRight, Search, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';

const clientBenefits = [
  { icon: Search, title: 'Умный поиск', description: 'Находите мастеров и организации по услуге, рейтингу, цене и расположению.' },
  { icon: Calendar, title: 'Онлайн-запись 24/7', description: 'Записывайтесь в удобное время без звонков. Получайте подтверждение мгновенно.' },
  { icon: Star, title: 'Проверенные рейтинги', description: 'Двусторонняя система оценок: клиенты оценивают мастеров, а мастера — клиентов.' },
  { icon: Shield, title: 'Безопасность', description: 'Все мастера проходят верификацию. Ваши данные защищены.' },
  { icon: Bell, title: 'Уведомления', description: 'Напоминания о записях, акции от любимых мастеров.' },
  { icon: Gift, title: 'Реферальная программа', description: 'Приглашайте друзей и получайте бонусы на свой баланс.' },
  { icon: Heart, title: 'Избранное и история', description: 'Сохраняйте любимых мастеров, быстро повторяйте запись.' },
  { icon: Users, title: 'Персональный рейтинг', description: 'Ваш клиентский рейтинг открывает доступ к эксклюзивным скидкам.' },
];

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-20">
        {/* Hero */}
        <section className="py-20 bg-background">
          <div className="container-wide max-w-4xl mx-auto text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-4">О платформе</p>
              <h1 className="text-4xl md:text-5xl font-display font-bold mb-6">
                Почему клиенты выбирают <span className="text-primary">SkillSpot</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                Единая платформа для поиска и записи к проверенным специалистам. Удобно, прозрачно, выгодно.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" onClick={() => navigate('/auth?tab=signup')}>
                  Зарегистрироваться <ArrowRight className="w-5 h-5" />
                </Button>
                <Button variant="outline" size="lg" onClick={() => navigate('/catalog')}>
                  Перейти в каталог
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-20 bg-surface">
          <div className="container-wide">
            <h2 className="text-3xl font-display font-bold text-center mb-12">Преимущества для клиентов</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {clientBenefits.map((b, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-2xl p-6 border border-border"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <b.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-display font-semibold mb-2">{b.title}</h3>
                  <p className="text-sm text-muted-foreground">{b.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How ratings work */}
        <section className="py-20 bg-background">
          <div className="container-wide max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-display font-bold mb-6">Как работает рейтинг</h2>
            <p className="text-muted-foreground mb-10">
              В SkillSpot рейтинг — двусторонний. Высокий рейтинг открывает доступ к лучшим специалистам и эксклюзивным акциям.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { val: '4.5+', desc: 'Доступ к топ-мастерам и приоритетная запись', color: 'text-primary' },
                { val: '3.5+', desc: 'Стандартный доступ ко всем услугам платформы', color: 'text-primary' },
                { val: '<3.5', desc: 'Ограничение записи, рекомендация улучшить рейтинг', color: 'text-accent' },
              ].map((item, i) => (
                <div key={i} className="p-6 rounded-2xl bg-card border border-border">
                  <p className={`text-4xl font-display font-bold ${item.color} mb-2`}>{item.val}</p>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-surface">
          <div className="container-wide max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-display font-bold mb-4">Хотите стать мастером?</h2>
            <p className="text-muted-foreground mb-8">
              Любой зарегистрированный пользователь может подать заявку на мастера или создать кабинет бизнеса.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate('/for-business')}>Для бизнеса и мастеров <ArrowRight className="w-5 h-5" /></Button>
              <Button variant="outline" size="lg" onClick={() => navigate('/subscription')}>Тарифы</Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;
