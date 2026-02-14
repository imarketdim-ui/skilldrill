import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';

const Privacy = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container-wide max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" /> Назад
          </Button>
          
          <h1 className="text-3xl font-bold mb-8">Политика конфиденциальности</h1>
          
          <div className="prose prose-neutral max-w-none space-y-6">
            <p className="text-muted-foreground">Дата последнего обновления: 14 февраля 2026 г.</p>
            
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">1. Общие положения</h2>
              <p>Настоящая Политика конфиденциальности (далее — «Политика») определяет порядок обработки и защиты персональных данных пользователей платформы SkillSpot (далее — «Платформа»).</p>
              <p>Политика разработана в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных».</p>
            </section>
            
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">2. Какие данные мы собираем</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Имя и фамилия</li>
                <li>Адрес электронной почты</li>
                <li>Номер телефона</li>
                <li>Данные об оказанных/полученных услугах</li>
                <li>Информация о платежах и подписках</li>
                <li>IP-адрес и данные об устройстве</li>
              </ul>
            </section>
            
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">3. Цели обработки данных</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Предоставление доступа к функционалу Платформы</li>
                <li>Идентификация пользователей</li>
                <li>Обработка платежей и подписок</li>
                <li>Связь с пользователями (уведомления, поддержка)</li>
                <li>Улучшение качества сервиса</li>
                <li>Выполнение требований законодательства РФ</li>
              </ul>
            </section>
            
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">4. Хранение и защита данных</h2>
              <p>Персональные данные хранятся на серверах, расположенных на территории Российской Федерации, в соответствии с требованиями ФЗ-152.</p>
              <p>Мы применяем шифрование данных при передаче (HTTPS/SSL), контроль доступа и регулярное резервное копирование.</p>
            </section>
            
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">5. Права пользователя</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Право на доступ к своим персональным данным</li>
                <li>Право на исправление неточных данных</li>
                <li>Право на удаление персональных данных</li>
                <li>Право на отзыв согласия на обработку</li>
                <li>Право на удаление аккаунта</li>
              </ul>
            </section>
            
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">6. Контактная информация</h2>
              <p>По вопросам обработки персональных данных обращайтесь:</p>
              <p>Email: privacy@skillspot.ru</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
