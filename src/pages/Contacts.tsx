import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Mail, Phone, MapPin, Clock } from 'lucide-react';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';

const Contacts = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container-wide max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" /> Назад
          </Button>
          
          <h1 className="text-3xl font-bold mb-8">Контакты</h1>
          
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" /> Электронная почта
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p>Общие вопросы: <a href="mailto:info@skillspot.ru" className="text-primary hover:underline">info@skillspot.ru</a></p>
                <p>Поддержка: <a href="mailto:support@skillspot.ru" className="text-primary hover:underline">support@skillspot.ru</a></p>
                <p>Партнёрство: <a href="mailto:partners@skillspot.ru" className="text-primary hover:underline">partners@skillspot.ru</a></p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" /> Телефон
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p>Горячая линия: <a href="tel:+78001234567" className="text-primary hover:underline">8 (800) 123-45-67</a></p>
                <p className="text-sm text-muted-foreground">Звонок бесплатный по РФ</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" /> Адрес
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>Россия, г. Москва</p>
                <p className="text-sm text-muted-foreground mt-2">Юридический адрес будет указан после регистрации юридического лица</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" /> Режим работы
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>Пн–Пт: 09:00–18:00 (МСК)</p>
                <p>Техническая поддержка: 24/7</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Contacts;
