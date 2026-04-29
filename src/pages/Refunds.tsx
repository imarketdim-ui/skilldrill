import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import { Button } from '@/components/ui/button';
import { COMPANY_INFO } from '@/lib/companyInfo';

const Refunds = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container-wide mx-auto max-w-4xl">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Назад
          </Button>

          <h1 className="mb-8 text-3xl font-bold">Правила возврата и отмены</h1>

          <div className="prose prose-neutral max-w-none space-y-6">
            <p className="text-muted-foreground">Дата последнего обновления: 29 апреля 2026 г.</p>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">1. Возврат подписки платформы</h2>
              <p>
                Возврат средств за подписку платформы SkillSpot осуществляется по письменному запросу пользователя
                на адрес <a href={`mailto:${COMPANY_INFO.email}`} className="text-primary hover:underline">{COMPANY_INFO.email}</a>.
              </p>
              <ul className="list-disc space-y-1 pl-6">
                <li>При первой оплате и отказе в течение 14 календарных дней возможен полный возврат.</li>
                <li>После 14 дней возможен пропорциональный возврат за неиспользованный оплаченный период.</li>
                <li>Возврат выполняется тем же способом, которым был произведён платёж, если иное не требуется законодательством.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">2. Сроки возврата</h2>
              <p>
                После подтверждения запроса возврат инициируется оператором в течение 10 рабочих дней. Срок зачисления
                денег на карту или счёт зависит от банка-эмитента.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">3. Отмена клиентских записей</h2>
              <p>
                Условия отмены конкретной записи на услугу определяются правилами мастера или организации, которые
                отображаются в карточке услуги и в подтверждении записи.
              </p>
              <p>
                SkillSpot предоставляет техническую платформу и журнал действий, но не подменяет правила конкретного
                исполнителя, если иное не закреплено в оферте или локальных правилах отмены.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">4. Споры и претензии</h2>
              <p>
                Если возврат связан с некачественным оказанием услуги, спор сначала направляется исполнителю через чат,
                обращение в поддержку или механизм диспута платформы. При необходимости оператор может запросить
                подтверждающие документы и историю коммуникации.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">5. Контакты для возврата</h2>
              <p><strong>{COMPANY_INFO.legalName}</strong></p>
              <p>ИНН: {COMPANY_INFO.inn} | КПП: {COMPANY_INFO.kpp} | ОГРН: {COMPANY_INFO.ogrn}</p>
              <p>Адрес: {COMPANY_INFO.address}</p>
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

export default Refunds;
