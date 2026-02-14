import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';

const Terms = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container-wide max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" /> Назад
          </Button>
          
          <h1 className="text-3xl font-bold mb-8">Пользовательское соглашение</h1>
          
          <div className="prose prose-neutral max-w-none space-y-6">
            <p className="text-muted-foreground">Дата последнего обновления: 14 февраля 2026 г.</p>
            
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">1. Термины и определения</h2>
              <p><strong>Платформа</strong> — онлайн-сервис SkillSpot, предоставляющий возможность записи на услуги и управления бизнесом.</p>
              <p><strong>Пользователь</strong> — физическое лицо, зарегистрированное на Платформе.</p>
              <p><strong>Мастер</strong> — Пользователь, оказывающий услуги через Платформу.</p>
              <p><strong>Клиент</strong> — Пользователь, получающий услуги через Платформу.</p>
            </section>
            
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">2. Предмет соглашения</h2>
              <p>Платформа предоставляет Пользователям инструменты для поиска и записи на услуги, управления расписанием, ведения CRM и ERP.</p>
            </section>
            
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">3. Подписочная модель</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Мастер: 1 000 ₽/мес</li>
                <li>Бизнес: 3 000 ₽/мес (до 5 мастеров), +500 ₽/мес за каждого дополнительного</li>
                <li>Сеть: 3 000 ₽/мес (до 3 точек), +1 000 ₽/мес за доп. точку, +500 ₽/мес за доп. мастера</li>
              </ul>
            </section>
            
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">4. Права и обязанности сторон</h2>
              <p>Пользователь обязуется предоставлять достоверную информацию, не нарушать права других пользователей и соблюдать условия настоящего соглашения.</p>
              <p>Платформа обязуется обеспечивать доступность сервиса, защиту персональных данных и своевременную техническую поддержку.</p>
            </section>
            
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">5. Ответственность</h2>
              <p>Платформа не несёт ответственности за качество услуг, оказываемых мастерами. Споры между клиентами и мастерами решаются через систему диспутов Платформы.</p>
            </section>
            
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">6. Заключительные положения</h2>
              <p>Настоящее соглашение регулируется законодательством Российской Федерации, включая Закон о защите прав потребителей.</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
