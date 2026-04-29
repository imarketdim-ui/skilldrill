import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import { COMPANY_INFO } from '@/lib/companyInfo';

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
            <p className="text-muted-foreground">Дата последнего обновления: 1 марта 2026 г.</p>
            
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">1. Общие положения</h2>
              <p>Настоящий документ является официальным предложением (публичной офертой) {COMPANY_INFO.legalName} (далее — «Оператор») на заключение договора оказания услуг по предоставлению доступа к платформе SkillSpot.</p>
              <p>Оператор: {COMPANY_INFO.legalName}, ИНН {COMPANY_INFO.inn}, КПП {COMPANY_INFO.kpp}, ОГРН {COMPANY_INFO.ogrn}.</p>
              <p>Юридический адрес: {COMPANY_INFO.address}.</p>
              <p>Акцептом настоящей оферты является регистрация на Платформе и/или оплата подписки.</p>
            </section>
            
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">2. Предмет оферты</h2>
              <p>Оператор предоставляет Пользователю доступ к SaaS-сервису для записи на услуги, управления расписанием, CRM/ERP функционала и маркетплейсу услуг на условиях ежемесячной подписки.</p>
              <p>Услуги предоставляются в электронной форме посредством сети Интернет.</p>
            </section>
            
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">3. Стоимость и порядок оплаты</h2>
              <p>Стоимость подписки:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Мастер: 199 ₽/мес (пробный период — 14 дней бесплатно)</li>
                <li>Про: 2 490 ₽/мес (1 точка, до 10 сотрудников)</li>
                <li>Сеть: 5 490 ₽/мес (неограниченное число точек и сотрудников)</li>
              </ul>
              <p className="p-3 bg-muted rounded-md border border-border text-sm">⚠️ Оплата будет доступна в ближайшее время. Сейчас сервис работает в тестовом режиме.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">4. Порядок возврата денежных средств</h2>
              <p>Возврат денежных средств осуществляется в соответствии с Законом РФ «О защите прав потребителей» от 07.02.1992 № 2300-1:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>При отказе от подписки в течение 14 дней с момента первой оплаты — полный возврат</li>
                <li>При отказе после 14 дней — пропорциональный возврат за неиспользованный период</li>
                <li>Возврат осуществляется на банковскую карту, с которой была произведена оплата, в течение 10 рабочих дней</li>
              </ul>
              <p>Для оформления возврата обратитесь по адресу: <a href={`mailto:${COMPANY_INFO.email}`} className="text-primary hover:underline">{COMPANY_INFO.email}</a></p>
            </section>
            
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">5. Порядок контроля подписок</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>1 день просрочки — уведомление по email</li>
                <li>7 дней — повторное уведомление</li>
                <li>30 дней — блокировка функционала, скрытие из поиска</li>
                <li>60 дней — удаление бизнес-функций (услуги, мастера, расписание, аналитика)</li>
              </ul>
              <p>При удалении сохраняются: история клиентов, финансовые транзакции, логи.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">6. Безопасность платежей</h2>
              <p className="p-3 bg-muted rounded-md border border-border text-sm">⚠️ Оплата будет доступна в ближайшее время. Сейчас сервис работает в тестовом режиме. Оператор не хранит данные банковских карт на своих серверах.</p>
            </section>

            <section className="space-y-3" id="russian-naming">
              <h2 className="text-xl font-semibold">7. Требования к наименованиям</h2>
              <p>В соответствии с Федеральным законом от 28.02.2025 № 31-ФЗ «О внесении изменений в Закон Российской Федерации „О защите прав потребителей"», вступившим в силу с 1 марта 2026 года, все наименования организаций, индивидуальных предпринимателей и самозанятых, используемые в коммерческих обозначениях на территории Российской Федерации, должны быть указаны на русском языке.</p>
              <p><strong>Основные требования:</strong></p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Наименование организации или профессиональное имя специалиста, размещённое на Платформе, должно быть написано на русском языке (кириллицей)</li>
                <li>Допускается дублирование названия на иностранном языке в скобках или через слеш, но основное наименование — только на русском</li>
                <li>Названия, содержащие исключительно латинские символы или иные иноязычные обозначения, без русскоязычного эквивалента, не допускаются к размещению на Платформе</li>
                <li>Оператор вправе отказать в модерации аккаунта или запросить исправление наименования, если оно не соответствует данным требованиям</li>
              </ul>
              <p>Данное требование распространяется на:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Названия бизнес-аккаунтов (салоны, студии, клиники и т.д.)</li>
                <li>Названия сетей</li>
                <li>Профессиональные псевдонимы мастеров, используемые в качестве публичного наименования</li>
              </ul>
              <p className="text-muted-foreground text-sm">Основание: ФЗ от 28.02.2025 № 31-ФЗ, ст. 9 Закона «О защите прав потребителей» в новой редакции. Вступает в силу: 1 марта 2026 г.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">8. Ответственность сторон</h2>
              <p>Оператор не является стороной сделки между Клиентом и Специалистом и не несёт ответственности за качество оказанных услуг.</p>
              <p>Оператор обязуется обеспечить доступность Платформы не менее 99% времени в месяц, за исключением плановых технических работ.</p>
            </section>
            
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">9. Реквизиты Оператора</h2>
              <p><strong>{COMPANY_INFO.legalName}</strong></p>
              <p>ИНН: {COMPANY_INFO.inn} | КПП: {COMPANY_INFO.kpp} | ОГРН: {COMPANY_INFO.ogrn}</p>
              <p>Юридический адрес: {COMPANY_INFO.address}</p>
              <p>Email: <a href={`mailto:${COMPANY_INFO.email}`} className="text-primary hover:underline">{COMPANY_INFO.email}</a></p>
              <p>Телефон: <a href={`tel:${COMPANY_INFO.phoneHref}`} className="text-primary hover:underline">{COMPANY_INFO.phoneDisplay}</a></p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Offer;
