import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, MapPin, Users, ExternalLink, Search, ArrowLeft, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import {
  allMasters, allBusinesses, getMastersByCategory, getBusinessesByCategory,
  getIndependentMasters, categoryMap, type MockMaster, type MockBusiness
} from '@/data/mockCatalog';

const categories = Object.entries(categoryMap).filter(([id]) => id !== 'a0000001-0000-0000-0000-000000000009');

const Catalog = () => {
  const navigate = useNavigate();
  const { categoryId } = useParams();
  const [search, setSearch] = useState('');

  if (categoryId) {
    return <CategoryPage categoryId={categoryId} />;
  }

  const filtered = categories.filter(([, cat]) =>
    cat.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container-wide">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Каталог услуг</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Найдите нужную услугу среди мастеров и организаций Абакана
            </p>
          </div>

          <div className="max-w-md mx-auto mb-12">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input placeholder="Поиск по категориям..." className="pl-10 h-12 text-lg" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {filtered.map(([id, cat]) => {
              const masters = getMastersByCategory(id);
              const businesses = getBusinessesByCategory(id);
              return (
                <Card key={id} className="cursor-pointer group hover:shadow-lg transition-all" onClick={() => navigate(`/catalog/${id}`)}>
                  <CardContent className="pt-8 pb-6 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                      <Users className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{cat.name}</h3>
                    <p className="text-sm text-muted-foreground">{masters.length} мастеров · {businesses.length} организаций</p>
                    <Badge variant="secondary" className="mt-3">Смотреть</Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

const CategoryPage = ({ categoryId }: { categoryId: string }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const cat = categoryMap[categoryId];
  const masters = getMastersByCategory(categoryId);
  const businesses = getBusinessesByCategory(categoryId);
  const independent = getIndependentMasters(categoryId);

  const filteredMasters = masters.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.services.some(s => s.name.toLowerCase().includes(search.toLowerCase())));
  const filteredBusinesses = businesses.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));

  if (!cat) return <div className="p-8 text-center">Категория не найдена</div>;

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container-wide">
          <Button variant="ghost" onClick={() => navigate('/catalog')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Все категории
          </Button>
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{cat.name}</h1>
            <p className="text-muted-foreground">{masters.length} мастеров · {businesses.length} организаций · Абакан</p>
          </div>

          <div className="max-w-md mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input placeholder="Поиск мастера или услуги..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          <Tabs defaultValue="masters">
            <TabsList className="mb-6">
              <TabsTrigger value="masters">Мастера ({filteredMasters.length})</TabsTrigger>
              <TabsTrigger value="businesses">Организации ({filteredBusinesses.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="masters">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredMasters.map(master => (
                  <MasterCard key={master.id} master={master} onClick={() => navigate(`/master/${master.id}`)} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="businesses">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredBusinesses.map(biz => (
                  <BusinessCardItem key={biz.id} business={biz} onClick={() => navigate(`/business/${biz.id}`)} />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

const MasterCard = ({ master, onClick }: { master: MockMaster; onClick: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
    whileHover={{ y: -4 }} transition={{ duration: 0.3 }}
    className="bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    onClick={onClick}
  >
    <div className="p-5">
      <div className="flex items-center gap-4 mb-4">
        <img src={master.avatar} alt={master.name} className="w-16 h-16 rounded-full object-cover" />
        <div>
          <h3 className="font-semibold text-foreground">{master.name}</h3>
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-4 h-4 text-primary fill-primary" />
            <span className="text-sm font-medium">{master.rating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({master.reviewCount})</span>
          </div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{master.bio}</p>
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
        <MapPin className="w-4 h-4" /> {master.location}
      </div>
      <div className="space-y-2">
        {master.services.slice(0, 2).map(s => (
          <div key={s.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-secondary">
            <span className="truncate">{s.name}</span>
            <span className="font-semibold whitespace-nowrap ml-2">{s.price.toLocaleString()} ₽</span>
          </div>
        ))}
      </div>
      <Button size="sm" className="w-full mt-4">Записаться</Button>
    </div>
  </motion.div>
);

const BusinessCardItem = ({ business, onClick }: { business: MockBusiness; onClick: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
    whileHover={{ y: -4 }} transition={{ duration: 0.3 }}
    className="bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    onClick={onClick}
  >
    <div className="relative h-40 overflow-hidden">
      <img src={business.image} alt={business.name} className="w-full h-full object-cover" />
      <div className="absolute bottom-3 left-4"><span className="px-2 py-1 rounded-lg bg-card text-foreground text-xs font-medium shadow-sm">{business.categoryName}</span></div>
    </div>
    <div className="p-5">
      <h3 className="text-lg font-semibold mb-2">{business.name}</h3>
      <div className="flex items-center gap-2 mb-2">
        <Star className="w-4 h-4 text-amber fill-amber" />
        <span className="text-sm font-medium">{business.rating.toFixed(1)}</span>
        <span className="text-sm text-muted-foreground">({business.reviewCount} отзывов)</span>
      </div>
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
        <MapPin className="w-4 h-4" /> {business.address}
      </div>
      <div className="flex gap-4 text-sm text-muted-foreground mb-4">
        <span><Users className="w-4 h-4 inline mr-1" />{business.specialistCount} мастеров</span>
        <span>{business.serviceCount} услуг</span>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{business.description}</p>
      <Button variant="outline" className="w-full">Смотреть услуги <ExternalLink className="w-4 h-4 ml-1" /></Button>
    </div>
  </motion.div>
);

export default Catalog;
