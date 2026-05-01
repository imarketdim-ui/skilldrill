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
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  businessId: string;
  masters: { master_id: string; name: string; skillspot_id: string }[];
  onImported?: () => void;
}

interface ServiceItem {
  id: string; name: string; price: number;
  duration_minutes: number; description: string | null;
  category_name: string | null;
  master_id: string | null;
  master_name: string;
}

const BusinessServiceImport = ({ businessId, masters, onImported }: Props) => {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<Set<string>>(new Set());
  const [imported, setImported] = useState<Set<string>>(new Set());
  const [selectedMasterId, setSelectedMasterId] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const searchServices = async () => {
    if (masters.length === 0) return;
    setLoading(true);
    let query = supabase
      .from('services')
      .select('id, name, price, duration_minutes, description, master_id, service_categories(name), profiles!services_master_id_fkey(first_name, last_name)')
      .eq('is_active', true)
      .neq('business_id', businessId)
      .in('master_id', masters.map((master) => master.master_id))
      .limit(100);

    if (selectedMasterId !== 'all') {
      query = query.eq('master_id', selectedMasterId);
    }
    if (search.trim()) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data } = await query;

    setServices((data || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      price: s.price,
      duration_minutes: s.duration_minutes,
      description: s.description,
      category_name: s.service_categories?.name || null,
      master_id: s.master_id,
      master_name: [s.profiles?.first_name, s.profiles?.last_name].filter(Boolean).join(' ') || 'Мастер',
    })));
    setLoading(false);
  };

  const importService = async (service: ServiceItem) => {
    setImporting(prev => new Set(prev).add(service.id));
    try {
      const { error } = await supabase.from('services').insert({
        name: service.name,
        price: service.price,
        duration_minutes: service.duration_minutes,
        description: service.description,
        business_id: businessId,
        organization_id: null,
        master_id: service.master_id,
        is_active: !!service.master_id,
        tech_card: {
          assigned_master_ids: service.master_id ? [service.master_id] : [],
          imported_source_service_id: service.id,
        },
      });
      if (error) throw error;
      setImported(prev => new Set(prev).add(service.id));
      toast({ title: 'Услуга импортирована', description: service.name });
      onImported?.();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
    setImporting(prev => { const s = new Set(prev); s.delete(service.id); return s; });
  };

  const importSelected = async () => {
    for (const service of services.filter((item) => selectedIds.has(item.id))) {
      await importService(service);
    }
    setSelectedIds(new Set());
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)} className="gap-1">
        <Package className="h-4 w-4" /> Импорт услуг
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Импорт услуг мастеров организации</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-[1fr_220px_auto]">
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
              <Select value={selectedMasterId} onValueChange={setSelectedMasterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Все мастера" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все мастера</SelectItem>
                  {masters.map((master) => (
                    <SelectItem key={master.master_id} value={master.master_id}>
                      {master.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={searchServices} disabled={loading}>Найти</Button>
            </div>
            {selectedIds.size > 0 && (
              <div className="flex justify-end">
                <Button onClick={importSelected} disabled={Array.from(selectedIds).some((id) => importing.has(id))}>
                  Импортировать выбранные ({selectedIds.size})
                </Button>
              </div>
            )}

            {loading ? (
              <p className="text-center py-4 text-muted-foreground">Поиск...</p>
            ) : services.length === 0 ? (
              <p className="text-center py-8 text-sm text-muted-foreground">
                {search ? 'Ничего не найдено' : 'Выберите мастера или введите название услуги'}
              </p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {services.map(s => (
                  <Card key={s.id}>
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-start gap-3 min-w-0">
                          <Checkbox
                            checked={selectedIds.has(s.id)}
                            onCheckedChange={(checked) => setSelectedIds((prev) => {
                              const next = new Set(prev);
                              if (checked) next.add(s.id);
                              else next.delete(s.id);
                              return next;
                            })}
                            disabled={imported.has(s.id)}
                          />
                          <div className="min-w-0">
                          <p className="font-medium text-sm">{s.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{s.price} ₽</span>
                            <span>{s.duration_minutes} мин</span>
                            <span>{s.master_name}</span>
                            {s.category_name && <Badge variant="outline" className="text-[10px]">{s.category_name}</Badge>}
                          </div>
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
