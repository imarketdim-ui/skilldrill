import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Copy, Check, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props { businessId: string; }

interface ServiceItem {
  id: string; name: string; price: number;
  duration_minutes: number; description: string | null;
  category_name: string | null;
}

const BusinessServiceImport = ({ businessId }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<Set<string>>(new Set());
  const [imported, setImported] = useState<Set<string>>(new Set());

  const searchServices = async () => {
    if (!search.trim()) return;
    setLoading(true);
    const { data } = await supabase
      .from('services')
      .select('id, name, price, duration_minutes, description, service_categories(name)')
      .eq('is_active', true)
      .neq('business_id', businessId)
      .ilike('name', `%${search}%`)
      .limit(20);

    setServices((data || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      price: s.price,
      duration_minutes: s.duration_minutes,
      description: s.description,
      category_name: s.service_categories?.name || null,
    })));
    setLoading(false);
  };

  const importService = async (service: ServiceItem) => {
    if (!user) return;
    setImporting(prev => new Set(prev).add(service.id));
    try {
      const { error } = await supabase.from('services').insert({
        name: service.name,
        price: service.price,
        duration_minutes: service.duration_minutes,
        description: service.description,
        business_id: businessId,
        organization_id: null,
        master_id: null,
        is_active: true,
      });
      if (error) throw error;
      setImported(prev => new Set(prev).add(service.id));
      toast({ title: 'Услуга импортирована', description: service.name });
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
    setImporting(prev => { const s = new Set(prev); s.delete(service.id); return s; });
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)} className="gap-1">
        <Package className="h-4 w-4" /> Импорт услуг
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Импорт услуг из каталога</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск услуг..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchServices()}
                  className="pl-9"
                />
              </div>
              <Button onClick={searchServices} disabled={loading}>Найти</Button>
            </div>

            {loading ? (
              <p className="text-center py-4 text-muted-foreground">Поиск...</p>
            ) : services.length === 0 ? (
              <p className="text-center py-8 text-sm text-muted-foreground">
                {search ? 'Ничего не найдено' : 'Введите название услуги для поиска'}
              </p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {services.map(s => (
                  <Card key={s.id}>
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{s.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{s.price} ₽</span>
                            <span>{s.duration_minutes} мин</span>
                            {s.category_name && <Badge variant="outline" className="text-[10px]">{s.category_name}</Badge>}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={imported.has(s.id) ? 'secondary' : 'default'}
                          disabled={importing.has(s.id) || imported.has(s.id)}
                          onClick={() => importService(s)}
                          className="gap-1 shrink-0"
                        >
                          {imported.has(s.id) ? <><Check className="h-3 w-3" /> Добавлено</> :
                            importing.has(s.id) ? 'Импорт...' : <><Copy className="h-3 w-3" /> Импорт</>}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BusinessServiceImport;
