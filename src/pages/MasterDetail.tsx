import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Star, MapPin, Clock, ArrowLeft, MessageSquare, Camera, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import { getMasterById } from '@/data/mockCatalog';

const MasterDetail = () => {
  const { masterId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const master = getMasterById(masterId || '');
  const [bookingService, setBookingService] = useState<string | null>(null);
  const [messageOpen, setMessageOpen] = useState(false);

  if (!master) return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-16 text-center"><p>Мастер не найден</p></main>
      <Footer />
    </div>
  );

  const handleBook = (serviceId: string) => {
    toast({ title: 'Заявка отправлена!', description: 'Мастер свяжется с вами для подтверждения записи.' });
    setBookingService(null);
  };

  const handleMessage = () => {
    toast({ title: 'Сообщение отправлено!', description: 'Мастер ответит вам в ближайшее время.' });
    setMessageOpen(false);
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container-wide max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Назад
          </Button>

          {/* Profile Header */}
          <div className="flex flex-col md:flex-row items-start gap-6 mb-8">
            <img src={master.avatar} alt={master.name} className="w-24 h-24 rounded-full object-cover border-4 border-primary/20" />
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-1">{master.name}</h1>
              <Badge variant="secondary" className="mb-2">{master.categoryName}</Badge>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                <div className="flex items-center gap-1"><Star className="w-4 h-4 text-amber fill-amber" />{master.rating.toFixed(1)} ({master.reviewCount} отзывов)</div>
                <div className="flex items-center gap-1"><MapPin className="w-4 h-4" />{master.location}</div>
              </div>
              <p className="text-muted-foreground">{master.bio}</p>
            </div>
            <div className="flex gap-2">
              <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline"><MessageSquare className="h-4 w-4 mr-2" /> Написать</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Написать {master.name}</DialogTitle></DialogHeader>
                  <Textarea placeholder="Ваше сообщение..." className="min-h-[100px]" />
                  <Button onClick={handleMessage} className="w-full">Отправить</Button>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Tabs defaultValue="services">
            <TabsList className="mb-6">
              <TabsTrigger value="services">Услуги</TabsTrigger>
              <TabsTrigger value="reviews">Отзывы ({master.reviews.length})</TabsTrigger>
              <TabsTrigger value="portfolio">Работы</TabsTrigger>
            </TabsList>

            <TabsContent value="services">
              <div className="grid gap-4">
                {master.services.map(service => (
                  <Card key={service.id}>
                    <CardContent className="flex flex-col md:flex-row gap-4 p-4">
                      <img src={service.image} alt={service.name} className="w-full md:w-40 h-32 object-cover rounded-lg" />
                      <div className="flex-1">
                        <Badge variant="secondary" className="mb-2">{service.subcategory}</Badge>
                        <h3 className="font-semibold text-lg mb-1">{service.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{service.description}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{service.duration}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end justify-between">
                        <p className="text-2xl font-bold">{service.price.toLocaleString()} ₽</p>
                        <Dialog open={bookingService === service.id} onOpenChange={(open) => setBookingService(open ? service.id : null)}>
                          <DialogTrigger asChild>
                            <Button variant="hero">Записаться</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Запись на «{service.name}»</DialogTitle></DialogHeader>
                            <div className="space-y-4">
                              <p className="text-sm text-muted-foreground">Мастер: {master.name}</p>
                              <p className="text-sm text-muted-foreground">Стоимость: {service.price.toLocaleString()} ₽ · {service.duration}</p>
                              <Input type="text" placeholder="Ваше имя" />
                              <Input type="tel" placeholder="Телефон" />
                              <Input type="date" />
                              <Textarea placeholder="Комментарий (необязательно)" />
                              <Button onClick={() => handleBook(service.id)} className="w-full">Подтвердить запись</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="reviews">
              <div className="space-y-4">
                {master.reviews.map(review => (
                  <Card key={review.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{review.author}</span>
                        <span className="text-sm text-muted-foreground">{review.date}</span>
                      </div>
                      <div className="flex items-center gap-1 mb-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'text-amber fill-amber' : 'text-muted'}`} />
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">{review.text}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="portfolio">
              {master.portfolioImages.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {master.portfolioImages.map((img, i) => (
                    <img key={i} src={img} alt={`Работа ${i + 1}`} className="w-full h-48 object-cover rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Мастер пока не добавил работы в портфолио</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MasterDetail;
