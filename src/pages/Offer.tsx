import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';

const Offer = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container-wide max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" /> Назад
          </Button>
          
          <h1 className="text-3xl font-bold mb-8">Публичная оферта</h1>
          
          <div className="prose prose-neutral max-w-none space-y-6">
            <p className="text-muted-foreground">Дата последнего обновления: 14 февраля 2026 г.</p>
            
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">1. Общие положения</h2>
              <p>Настоящий документ является официальным предложением (публичной офертой) платформы SkillSpot на заключение договора оказания услуг.</p>
              <p>Акцептом настоящей оферты является регистрация на Платформе и/или оплата подписки.</p>
            </section>
            
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">2. Предмет оферты</h2>
              <p>Платформа предоставляет доступ к SaaS-сервису для записи на услуги, управления расписанием, CRM/ERP и маркетплейсу услуг на условиях подписки.</p>
            </section>
            
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">3. Стоимость и порядок оплаты</h2>
              <p>Стоимость подписки указана в разделе «Тарифы» на сайте Платформы. Оплата производится ежемесячно через систему эквайринга.</p>
            </section>
            
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">4. Порядок возврата</h2>
              <p>Возврат денежных средств осуществляется в соответствии с Законом РФ «О защите прав потребителей». При отказе от подписки в течение 14 дней с момента первой оплаты — полный возврат.</p>
            </section>
            
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">5. Порядок контроля подписок</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>1 день просрочки — уведомление</li>
                <li>7 дней — повторное уведомление</li>
                <li>30 дней — блокировка функционала, скрытие из поиска</li>
                <li>60 дней — удаление бизнес-функций (услуги, мастера, расписание, аналитика)</li>
              </ul>
              <p>При удалении сохраняются: история клиентов, финансовые транзакции, логи.</p>
            </section>
            
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">6. Реквизиты</h2>
              <p>Полные реквизиты юридического лица указаны на странице «Контакты».</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Offer;
