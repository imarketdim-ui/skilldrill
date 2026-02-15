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
            <p className="text-muted-foreground">Дата последнего обновления: 15 февраля 2026 г.</p>
            
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">1. Термины и определения</h2>
              <p><strong>Оператор</strong> — ООО «СКИЛЛ СПОТ», ИНН 1901142926, ОГРН 1191901004272, юридический адрес: 655009, Россия, Республика Хакасия, г. Абакан, ул. Российская, д. 45Б.</p>
              <p><strong>Платформа</strong> — онлайн-сервис SkillSpot, расположенный по адресу skilldrill.lovable.app, предоставляющий возможность записи на услуги и управления деятельностью специалистов.</p>
              <p><strong>Пользователь</strong> — физическое лицо, зарегистрированное на Платформе.</p>
              <p><strong>Мастер (Специалист)</strong> — Пользователь, оказывающий услуги через Платформу.</p>
              <p><strong>Клиент</strong> — Пользователь, получающий услуги через Платформу.</p>
            </section>
            
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">2. Предмет соглашения</h2>
              <p>Настоящее Пользовательское соглашение (далее — «Соглашение») регулирует отношения между Оператором и Пользователем при использовании Платформы.</p>
              <p>Платформа предоставляет Пользователям инструменты для поиска и записи на услуги, управления расписанием, ведения CRM и учёта финансов.</p>
              <p>Акцептом Соглашения является регистрация на Платформе.</p>
            </section>
            
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">3. Подписочная модель</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Мастер: 1 000 ₽/мес (пробный период — 14 дней)</li>
                <li>Бизнес: 3 000 ₽/мес (до 5 мастеров), +500 ₽/мес за каждого дополнительного</li>
                <li>Сеть: 3 000 ₽/мес (до 3 точек), +1 000 ₽/мес за доп. точку, +500 ₽/мес за доп. мастера</li>
              </ul>
              <p>Оплата производится ежемесячно через эквайринг АО «Тинькофф Банк».</p>
            </section>
            
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">4. Права и обязанности сторон</h2>
              <h3 className="text-lg font-medium">4.1. Пользователь обязан:</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Предоставлять достоверную информацию при регистрации</li>
                <li>Не нарушать права других пользователей</li>
                <li>Соблюдать условия настоящего Соглашения и законодательство РФ</li>
                <li>Не использовать Платформу для незаконной деятельности</li>
              </ul>
              <h3 className="text-lg font-medium">4.2. Оператор обязуется:</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Обеспечивать доступность сервиса</li>
                <li>Защищать персональные данные в соответствии с ФЗ-152</li>
                <li>Предоставлять своевременную техническую поддержку</li>
              </ul>
            </section>
            
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">5. Ответственность</h2>
              <p>Платформа не является стороной сделки между Клиентом и Специалистом. Оператор не несёт ответственности за качество услуг, оказываемых специалистами.</p>
              <p>Споры между клиентами и специалистами решаются через систему диспутов Платформы или в судебном порядке в соответствии с законодательством РФ.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">6. Порядок расторжения</h2>
              <p>Пользователь вправе в любое время удалить свой аккаунт через настройки профиля.</p>
              <p>Оператор вправе заблокировать или удалить аккаунт Пользователя в случае нарушения условий Соглашения.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">7. Защита прав потребителей</h2>
              <p>Настоящее Соглашение не ограничивает права Пользователя, предусмотренные Законом РФ «О защите прав потребителей» от 07.02.1992 № 2300-1.</p>
            </section>
            
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">8. Заключительные положения</h2>
              <p>Настоящее Соглашение регулируется законодательством Российской Федерации.</p>
              <p>Все споры разрешаются путём переговоров, а при недостижении согласия — в суде по месту нахождения Оператора.</p>
              <p>Оператор вправе в одностороннем порядке вносить изменения в Соглашение с уведомлением Пользователей не менее чем за 10 дней.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">9. Реквизиты Оператора</h2>
              <p>ООО «СКИЛЛ СПОТ»</p>
              <p>ИНН: 1901142926 | КПП: 190101001 | ОГРН: 1191901004272</p>
              <p>Адрес: 655009, Россия, Республика Хакасия, г. Абакан, ул. Российская, д. 45Б</p>
              <p>Email: <a href="mailto:imp-invest@mail.ru" className="text-primary hover:underline">imp-invest@mail.ru</a></p>
              <p>Телефон: <a href="tel:+78617440008" className="text-primary hover:underline">8 (617) 44-00-08</a></p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
