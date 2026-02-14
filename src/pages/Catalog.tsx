import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Sparkles, Scissors, GraduationCap, Car, Dumbbell, LayoutGrid } from 'lucide-react';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';

const categoryIcons: Record<string, any> = {
  'Бьюти': Scissors,
  'Образование': GraduationCap,
  'Автомойка': Car,
  'Спорт': Dumbbell,
  'Универсальная': LayoutGrid,
};

const Catalog = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('service_categories').select('*').eq('is_active', true).then(({ data }) => {
      setCategories(data || []);
      setLoading(false);
    });
  }, []);

  const filtered = categories.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container-wide">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Каталог услуг</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Найдите нужную услугу среди тысяч мастеров и организаций
            </p>
          </div>

          <div className="max-w-md mx-auto mb-12">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Поиск по категориям..."
                className="pl-10 h-12 text-lg"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((cat) => {
              const Icon = categoryIcons[cat.name] || Sparkles;
              return (
                <Card key={cat.id} className="card-hover cursor-pointer group" onClick={() => navigate(`/catalog/${cat.id}`)}>
                  <CardContent className="pt-8 pb-6 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{cat.name}</h3>
                    <p className="text-sm text-muted-foreground">{cat.description}</p>
                    <Badge variant="secondary" className="mt-3">Смотреть мастеров</Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filtered.length === 0 && !loading && (
            <div className="text-center py-16 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Ничего не найдено</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Catalog;
