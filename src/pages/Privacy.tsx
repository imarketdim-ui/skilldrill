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
            <p className="text-muted-foreground">Дата последнего обновления: 15 февраля 2026 г.</p>
            
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">1. Общие положения</h2>
              <p>Настоящая Политика конфиденциальности (далее — «Политика») определяет порядок обработки и защиты персональных данных пользователей платформы SkillSpot (далее — «Платформа»), расположенной по адресу skilldrill.lovable.app.</p>
              <p>Оператор персональных данных: ООО «СКИЛЛ СПОТ», ИНН 1901142926, КПП 190101001, ОГРН 1191901004272.</p>
              <p>Юридический адрес: 655009, Россия, Республика Хакасия, г. Абакан, ул. Российская, д. 45Б.</p>
              <p>Политика разработана в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных» и Федеральным законом от 27.07.2006 № 149-ФЗ «Об информации, информационных технологиях и о защите информации».</p>
            </section>
            
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">2. Какие данные мы собираем</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Фамилия, имя, отчество</li>
                <li>Адрес электронной почты</li>
                <li>Номер телефона</li>
                <li>Данные об оказанных/полученных услугах</li>
                <li>Информация о платежах и подписках</li>
                <li>IP-адрес и данные об устройстве</li>
                <li>Файлы cookie и аналитические данные</li>
              </ul>
            </section>
            
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">3. Цели обработки данных</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Предоставление доступа к функционалу Платформы</li>
                <li>Идентификация и аутентификация пользователей</li>
                <li>Обработка платежей и подписок</li>
                <li>Связь с пользователями (уведомления, поддержка)</li>
                <li>Улучшение качества сервиса и персонализация</li>
                <li>Выполнение требований законодательства Российской Федерации</li>
                <li>Предотвращение мошенничества и обеспечение безопасности</li>
              </ul>
            </section>
            
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">4. Правовые основания обработки</h2>
              <p>Обработка персональных данных осуществляется на основании:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Согласия субъекта персональных данных (ст. 6 ч. 1 п. 1 ФЗ-152)</li>
                <li>Исполнения договора, стороной которого является субъект (ст. 6 ч. 1 п. 5 ФЗ-152)</li>
                <li>Исполнения обязанностей, предусмотренных законодательством РФ (ст. 6 ч. 1 п. 2 ФЗ-152)</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">5. Хранение и защита данных</h2>
              <p>Персональные данные хранятся на серверах, расположенных на территории Российской Федерации, в соответствии с требованиями ФЗ-152.</p>
              <p>Мы применяем следующие меры защиты:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Шифрование данных при передаче (HTTPS/TLS)</li>
                <li>Разграничение доступа к информационным системам</li>
                <li>Регулярное резервное копирование</li>
                <li>Мониторинг и аудит безопасности</li>
              </ul>
            </section>
            
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">6. Передача данных третьим лицам</h2>
              <p>Мы можем передавать персональные данные:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Платёжным провайдерам (АО «Тинькофф Банк») — для обработки платежей</li>
                <li>Государственным органам — по запросу в установленном законом порядке</li>
              </ul>
              <p>Трансграничная передача данных не осуществляется.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">7. Права субъекта персональных данных</h2>
              <p>В соответствии с ФЗ-152 вы имеете право:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Получить информацию об обработке ваших персональных данных</li>
                <li>Потребовать уточнения, блокирования или уничтожения данных</li>
                <li>Отозвать согласие на обработку персональных данных</li>
                <li>Обжаловать действия оператора в Роскомнадзор</li>
                <li>Удалить свой аккаунт и все связанные данные</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">8. Файлы cookie</h2>
              <p>Платформа использует файлы cookie для обеспечения работоспособности сервиса, аналитики и персонализации. Продолжая использовать Платформу, вы соглашаетесь с использованием cookie.</p>
            </section>
            
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">9. Контактная информация</h2>
              <p>По вопросам обработки персональных данных обращайтесь:</p>
              <p>ООО «СКИЛЛ СПОТ»</p>
              <p>Email: <a href="mailto:imp-invest@mail.ru" className="text-primary hover:underline">imp-invest@mail.ru</a></p>
              <p>Телефон: <a href="tel:+78617440008" className="text-primary hover:underline">8 (617) 44-00-08</a></p>
              <p>Адрес: 655009, Россия, Республика Хакасия, г. Абакан, ул. Российская, д. 45Б</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
