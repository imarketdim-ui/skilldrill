import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Star, MapPin, Users, ExternalLink, Search, ArrowLeft, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import {
  allMasters, allBusinesses, getMastersByCategory, getBusinessesByCategory,
  categoryMap, type MockMaster, type MockBusiness
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
      <main className="pt-20 pb-16">
        <div className="container-wide">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-display font-bold mb-3">Каталог услуг</h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Найдите нужную услугу среди мастеров и организаций
            </p>
          </div>

          <div className="max-w-md mx-auto mb-10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input placeholder="Поиск по категориям..." className="pl-10 h-11 rounded-xl" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map(([id, cat]) => {
              const masters = getMastersByCategory(id);
              const businesses = getBusinessesByCategory(id);
              return (
                <Card key={id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/catalog/${id}`)}>
                  <CardContent className="pt-6 pb-5 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Users className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="font-display font-semibold mb-1">{cat.name}</h3>
                    <p className="text-sm text-muted-foreground">{masters.length} мастеров · {businesses.length} организаций</p>
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

/* ========== Category Page with sidebar filters ========== */
const CategoryPage = ({ categoryId }: { categoryId: string }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('rating');
  const [priceRange, setPriceRange] = useState<string>('all');

  const cat = categoryMap[categoryId];
  const masters = getMastersByCategory(categoryId);
  const businesses = getBusinessesByCategory(categoryId);

  let filteredMasters = masters.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.services.some(s => s.name.toLowerCase().includes(search.toLowerCase()))
  );

  // Apply price filter
  if (priceRange !== 'all') {
    filteredMasters = filteredMasters.filter(m => {
      const minPrice = Math.min(...m.services.map(s => s.price));
      if (priceRange === 'under1000') return minPrice < 1000;
      if (priceRange === '1000-3000') return minPrice >= 1000 && minPrice <= 3000;
      if (priceRange === 'over3000') return minPrice > 3000;
      return true;
    });
  }

  // Apply sort
  if (sortBy === 'rating') {
    filteredMasters.sort((a, b) => b.rating - a.rating);
  } else if (sortBy === 'price_asc') {
    filteredMasters.sort((a, b) => Math.min(...a.services.map(s => s.price)) - Math.min(...b.services.map(s => s.price)));
  } else if (sortBy === 'price_desc') {
    filteredMasters.sort((a, b) => Math.min(...b.services.map(s => s.price)) - Math.min(...a.services.map(s => s.price)));
  } else if (sortBy === 'reviews') {
    filteredMasters.sort((a, b) => b.reviewCount - a.reviewCount);
  }

  const filteredBusinesses = businesses.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));

  if (!cat) return <div className="p-8 text-center">Категория не найдена</div>;

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-20 pb-16">
        <div className="container-wide">
          {/* Breadcrumb */}
          <Button variant="ghost" size="sm" onClick={() => navigate('/catalog')} className="mb-4 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Все категории
          </Button>

          <div className="mb-6">
            <h1 className="text-2xl font-display font-bold mb-1">{cat.name}</h1>
            <p className="text-sm text-muted-foreground">{masters.length} мастеров · {businesses.length} организаций</p>
          </div>

          <div className="flex gap-6">
            {/* Sidebar filters — desktop */}
            <aside className="hidden lg:block w-56 shrink-0">
              <div className="sticky top-20 space-y-6">
                <div>
                  <p className="text-sm font-semibold mb-3">Поиск</p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Мастер или услуга..." className="pl-9 h-9 text-sm rounded-lg" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold mb-3">Сортировка</p>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rating">По рейтингу</SelectItem>
                      <SelectItem value="reviews">По отзывам</SelectItem>
                      <SelectItem value="price_asc">Цена ↑</SelectItem>
                      <SelectItem value="price_desc">Цена ↓</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <p className="text-sm font-semibold mb-3">Цена</p>
                  <div className="space-y-2">
                    {[
                      { value: 'all', label: 'Все цены' },
                      { value: 'under1000', label: 'До 1 000 ₽' },
                      { value: '1000-3000', label: '1 000 — 3 000 ₽' },
                      { value: 'over3000', label: 'От 3 000 ₽' },
                    ].map(opt => (
                      <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={priceRange === opt.value} onCheckedChange={() => setPriceRange(opt.value)} />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold mb-3">Категории</p>
                  <div className="space-y-1">
                    {categories.slice(0, 6).map(([id, c]) => (
                      <button
                        key={id}
                        onClick={() => navigate(`/catalog/${id}`)}
                        className={`block w-full text-left text-sm px-2 py-1.5 rounded-lg transition-colors ${
                          id === categoryId ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-secondary'
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              {/* Mobile: search + filter toggle */}
              <div className="lg:hidden flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Поиск..." className="pl-9 h-9 text-sm rounded-lg" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Button variant="outline" size="sm" className="gap-1 shrink-0" onClick={() => setShowFilters(!showFilters)}>
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </div>

              {/* Mobile filters drawer */}
              {showFilters && (
                <div className="lg:hidden mb-4 p-4 rounded-xl bg-card border border-border space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">Фильтры</p>
                    <button onClick={() => setShowFilters(false)}><X className="h-4 w-4" /></button>
                  </div>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Сортировка" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rating">По рейтингу</SelectItem>
                      <SelectItem value="reviews">По отзывам</SelectItem>
                      <SelectItem value="price_asc">Цена ↑</SelectItem>
                      <SelectItem value="price_desc">Цена ↓</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="space-y-2">
                    {[
                      { value: 'all', label: 'Все цены' },
                      { value: 'under1000', label: 'До 1 000 ₽' },
                      { value: '1000-3000', label: '1 000 — 3 000 ₽' },
                      { value: 'over3000', label: 'От 3 000 ₽' },
                    ].map(opt => (
                      <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={priceRange === opt.value} onCheckedChange={() => setPriceRange(opt.value)} />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <Tabs defaultValue="masters">
                <TabsList className="mb-4">
                  <TabsTrigger value="masters">Мастера ({filteredMasters.length})</TabsTrigger>
                  <TabsTrigger value="businesses">Организации ({filteredBusinesses.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="masters">
                  <div className="grid gap-4 md:grid-cols-2">
                    {filteredMasters.map(master => (
                      <MasterCard key={master.id} master={master} onClick={() => navigate(`/master/${master.id}`)} />
                    ))}
                    {filteredMasters.length === 0 && (
                      <p className="col-span-2 text-center text-muted-foreground py-12">Ничего не найдено</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="businesses">
                  <div className="grid gap-4 md:grid-cols-2">
                    {filteredBusinesses.map(biz => (
                      <BusinessCardItem key={biz.id} business={biz} onClick={() => navigate(`/business/${biz.id}`)} />
                    ))}
                    {filteredBusinesses.length === 0 && (
                      <p className="col-span-2 text-center text-muted-foreground py-12">Ничего не найдено</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

/* ========== Card Components ========== */
const MasterCard = ({ master, onClick }: { master: MockMaster; onClick: () => void }) => (
  <div className="bg-card rounded-xl overflow-hidden border border-border hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
    <div className="p-5">
      <div className="flex items-center gap-3 mb-3">
        <img src={master.avatar} alt={master.name} className="w-12 h-12 rounded-full object-cover" />
        <div className="min-w-0">
          <h3 className="font-display font-semibold text-foreground truncate">{master.name}</h3>
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-primary fill-primary" />
            <span className="text-sm font-medium">{master.rating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({master.reviewCount})</span>
          </div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{master.bio}</p>
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
        <MapPin className="w-3.5 h-3.5" /> {master.location}
      </div>
      <div className="space-y-1.5">
        {master.services.slice(0, 2).map(s => (
          <div key={s.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-secondary">
            <span className="truncate">{s.name}</span>
            <span className="font-semibold whitespace-nowrap ml-2">{s.price.toLocaleString()} ₽</span>
          </div>
        ))}
      </div>
      <Button size="sm" className="w-full mt-3">Записаться</Button>
    </div>
  </div>
);

const BusinessCardItem = ({ business, onClick }: { business: MockBusiness; onClick: () => void }) => (
  <div className="bg-card rounded-xl overflow-hidden border border-border hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
    <div className="relative h-36 overflow-hidden">
      <img src={business.image} alt={business.name} className="w-full h-full object-cover" />
      <div className="absolute bottom-2 left-3">
        <span className="px-2 py-1 rounded-lg bg-card text-foreground text-xs font-medium shadow-sm">{business.categoryName}</span>
      </div>
    </div>
    <div className="p-5">
      <h3 className="font-display font-semibold mb-1">{business.name}</h3>
      <div className="flex items-center gap-2 mb-2">
        <Star className="w-3.5 h-3.5 text-primary fill-primary" />
        <span className="text-sm font-medium">{business.rating.toFixed(1)}</span>
        <span className="text-xs text-muted-foreground">({business.reviewCount})</span>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
        <MapPin className="w-3.5 h-3.5" /> {business.address}
      </div>
      <div className="flex gap-3 text-xs text-muted-foreground mb-3">
        <span><Users className="w-3.5 h-3.5 inline mr-0.5" />{business.specialistCount} мастеров</span>
        <span>{business.serviceCount} услуг</span>
      </div>
      <Button variant="outline" size="sm" className="w-full">Смотреть <ExternalLink className="w-3.5 h-3.5 ml-1" /></Button>
    </div>
  </div>
);

export default Catalog;
