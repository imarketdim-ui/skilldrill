import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Mail, Phone, MapPin, Building2 } from 'lucide-react';
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
                  <Building2 className="h-5 w-5 text-primary" /> Юридическая информация
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-semibold">ООО «СКИЛЛ СПОТ»</p>
                <p>ИНН: 1901142926</p>
                <p>КПП: 190101001</p>
                <p>ОГРН: 1191901004272</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" /> Электронная почта
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p>Общие вопросы: <a href="mailto:imp-invest@mail.ru" className="text-primary hover:underline">imp-invest@mail.ru</a></p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" /> Телефон
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p><a href="tel:+79617440008" className="text-primary hover:underline">8 (961) 744-00-08</a></p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" /> Адрес
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>655009, Россия, Республика Хакасия,</p>
                <p>г. Абакан, ул. Российская, д. 45Б</p>
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
