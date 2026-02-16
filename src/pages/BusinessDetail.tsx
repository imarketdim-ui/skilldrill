import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Star, MapPin, ArrowLeft, Users, Clock, ExternalLink, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import { getBusinessById, getBusinessMasters, getMasterById } from '@/data/mockCatalog';

const BusinessDetail = () => {
  const { businessId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const business = getBusinessById(businessId || '');
  const masters = business ? getBusinessMasters(business.id) : [];
  const [bookingService, setBookingService] = useState<string | null>(null);

  if (!business) return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-16 text-center"><p>Организация не найдена</p></main>
      <Footer />
    </div>
  );

  const handleBook = () => {
    toast({ title: 'Заявка отправлена!', description: 'Организация свяжется с вами для подтверждения.' });
    setBookingService(null);
  };

  const allServices = masters.flatMap(m => m.services.map(s => ({ ...s, masterName: m.name, masterId: m.id })));

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container-wide max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Назад
          </Button>

          {/* Header */}
          <div className="relative h-48 rounded-2xl overflow-hidden mb-6">
            <img src={business.image} alt={business.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-6">
              <Badge className="bg-white/20 backdrop-blur-sm text-white mb-2">{business.categoryName}</Badge>
              <h1 className="text-2xl font-bold text-white">{business.name}</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 mb-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1"><Star className="w-4 h-4 text-amber fill-amber" />{business.rating.toFixed(1)} ({business.reviewCount} отзывов)</div>
            <div className="flex items-center gap-1"><MapPin className="w-4 h-4" />{business.address}</div>
            <div className="flex items-center gap-1"><Users className="w-4 h-4" />{business.specialistCount} мастеров</div>
          </div>
          <p className="text-muted-foreground mb-8">{business.description}</p>

          <Tabs defaultValue="services">
            <TabsList className="mb-6">
              <TabsTrigger value="services">Услуги ({allServices.length})</TabsTrigger>
              <TabsTrigger value="masters">Мастера ({masters.length})</TabsTrigger>
              <TabsTrigger value="reviews">Отзывы</TabsTrigger>
              <TabsTrigger value="info">О нас</TabsTrigger>
            </TabsList>

            <TabsContent value="services">
              <div className="grid gap-4">
                {allServices.map(service => (
                  <Card key={service.id}>
                    <CardContent className="flex flex-col md:flex-row gap-4 p-4">
                      <img src={service.image} alt={service.name} className="w-full md:w-40 h-32 object-cover rounded-lg" />
                      <div className="flex-1">
                        <Badge variant="secondary" className="mb-2">{service.subcategory}</Badge>
                        <h3 className="font-semibold text-lg mb-1">{service.name}</h3>
                        <p className="text-sm text-muted-foreground mb-1">{service.description}</p>
                        <p className="text-xs text-primary cursor-pointer" onClick={() => navigate(`/master/${service.masterId}`)}>Мастер: {service.masterName}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
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
                              <p className="text-sm text-muted-foreground">Мастер: {service.masterName}</p>
                              <p className="text-sm text-muted-foreground">{service.price.toLocaleString()} ₽ · {service.duration}</p>
                              <Input placeholder="Ваше имя" />
                              <Input type="tel" placeholder="Телефон" />
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="text-sm font-medium">Дата</label>
                                  <Input type="date" />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-sm font-medium">Время</label>
                                  <Input type="time" />
                                </div>
                              </div>
                              <Textarea placeholder="Комментарий (необязательно)" />
                              <Button onClick={handleBook} className="w-full">Подтвердить запись</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="masters">
              <div className="grid gap-4 md:grid-cols-2">
                {masters.map(master => (
                  <Card key={master.id} className="cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate(`/master/${master.id}`)}>
                    <CardContent className="flex items-center gap-4 p-4">
                      <img src={master.avatar} alt={master.name} className="w-16 h-16 rounded-full object-cover" />
                      <div className="flex-1">
                        <h3 className="font-semibold">{master.name}</h3>
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="w-4 h-4 text-amber fill-amber" />
                          <span>{master.rating.toFixed(1)}</span>
                          <span className="text-muted-foreground">({master.reviewCount})</span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">{master.bio}</p>
                      </div>
                      <Button variant="outline" size="sm">Профиль</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="reviews">
              <div className="space-y-4">
                {masters.flatMap(m => m.reviews).map(review => (
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

            <TabsContent value="info">
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div><h3 className="font-semibold mb-1">Адрес</h3><p className="text-muted-foreground flex items-center gap-1"><MapPin className="w-4 h-4" />{business.address}, {business.location}</p></div>
                  <div><h3 className="font-semibold mb-1">О нас</h3><p className="text-muted-foreground">{business.description}</p></div>
                  <div><h3 className="font-semibold mb-1">Команда</h3><p className="text-muted-foreground">{business.specialistCount} мастеров · {business.serviceCount} услуг</p></div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BusinessDetail;
