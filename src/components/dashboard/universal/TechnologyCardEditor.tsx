import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Calculator, Package, Wrench, Clock, ChevronDown, ChevronUp } from 'lucide-react';

interface MaterialItem {
  name: string;
  quantity: number;
  unit: string;
  price: number;
}

interface LaborStep {
  name: string;
  duration_minutes: number;
  cost: number;
}

interface EquipmentItem {
  name: string;
  usage_minutes: number;
  cost_per_use: number;
}

interface TechCard {
  id: string;
  service_id: string;
  materials: MaterialItem[];
  labor_steps: LaborStep[];
  equipment: EquipmentItem[];
  total_material_cost: number;
  total_labor_cost: number;
  total_equipment_cost: number;
  notes: string | null;
}

interface Props {
  serviceId: string;
  serviceName: string;
  servicePrice: number;
}

const TechnologyCardEditor = ({ serviceId, serviceName, servicePrice }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [card, setCard] = useState<TechCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [laborSteps, setLaborSteps] = useState<LaborStep[]>([]);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchCard();
  }, [serviceId]);

  const fetchCard = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('technology_cards')
      .select('*')
      .eq('service_id', serviceId)
      .maybeSingle();
    
    if (data) {
      setCard(data as any);
      setMaterials((data.materials as any) || []);
      setLaborSteps((data.labor_steps as any) || []);
      setEquipment((data.equipment as any) || []);
      setNotes(data.notes || '');
    }
    setLoading(false);
  };

  const totalMaterialCost = materials.reduce((s, m) => s + m.quantity * m.price, 0);
  const totalLaborCost = laborSteps.reduce((s, l) => s + l.cost, 0);
  const totalEquipmentCost = equipment.reduce((s, e) => s + e.cost_per_use, 0);
  const totalCost = totalMaterialCost + totalLaborCost + totalEquipmentCost;
  const profit = servicePrice - totalCost;

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const payload = {
      service_id: serviceId,
      master_id: user.id,
      materials: materials as any,
      labor_steps: laborSteps as any,
      equipment: equipment as any,
      total_material_cost: totalMaterialCost,
      total_labor_cost: totalLaborCost,
      total_equipment_cost: totalEquipmentCost,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    };

    try {
      if (card) {
        const { error } = await supabase.from('technology_cards').update(payload).eq('id', card.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('technology_cards').insert(payload);
        if (error) throw error;
      }
      toast({ title: 'Технологическая карта сохранена' });
      fetchCard();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const addMaterial = () => setMaterials(p => [...p, { name: '', quantity: 1, unit: 'шт', price: 0 }]);
  const addLabor = () => setLaborSteps(p => [...p, { name: '', duration_minutes: 30, cost: 0 }]);
  const addEquipment = () => setEquipment(p => [...p, { name: '', usage_minutes: 30, cost_per_use: 0 }]);

  const updateMaterial = (i: number, field: keyof MaterialItem, value: any) =>
    setMaterials(p => p.map((m, idx) => idx === i ? { ...m, [field]: value } : m));
  const updateLabor = (i: number, field: keyof LaborStep, value: any) =>
    setLaborSteps(p => p.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  const updateEquipment = (i: number, field: keyof EquipmentItem, value: any) =>
    setEquipment(p => p.map((e, idx) => idx === i ? { ...e, [field]: value } : e));

  if (loading) return null;

  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 text-sm hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          <span className="font-medium">Технологическая карта</span>
          {card && (
            <Badge variant="secondary" className="text-xs">
              Себестоимость: {totalCost.toLocaleString()} ₽
            </Badge>
          )}
        </div>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {expanded && (
        <div className="p-4 border-t space-y-5">
          {/* Materials */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="flex items-center gap-1.5"><Package className="h-3.5 w-3.5" /> Материалы</Label>
              <Button variant="ghost" size="sm" onClick={addMaterial}><Plus className="h-3 w-3 mr-1" /> Добавить</Button>
            </div>
            {materials.length === 0 ? (
              <p className="text-xs text-muted-foreground">Нет материалов</p>
            ) : (
              <div className="space-y-2">
                {materials.map((m, i) => (
                  <div key={i} className="grid grid-cols-[1fr_60px_50px_80px_30px] gap-1.5 items-center">
                    <Input placeholder="Название" value={m.name} onChange={e => updateMaterial(i, 'name', e.target.value)} className="h-8 text-xs" />
                    <Input type="number" placeholder="Кол" value={m.quantity} onChange={e => updateMaterial(i, 'quantity', Number(e.target.value))} className="h-8 text-xs" />
                    <Input placeholder="ед" value={m.unit} onChange={e => updateMaterial(i, 'unit', e.target.value)} className="h-8 text-xs" />
                    <Input type="number" placeholder="Цена" value={m.price} onChange={e => updateMaterial(i, 'price', Number(e.target.value))} className="h-8 text-xs" />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMaterials(p => p.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground text-right">Итого: {totalMaterialCost.toLocaleString()} ₽</p>
              </div>
            )}
          </div>

          {/* Labor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Трудозатраты</Label>
              <Button variant="ghost" size="sm" onClick={addLabor}><Plus className="h-3 w-3 mr-1" /> Добавить</Button>
            </div>
            {laborSteps.length === 0 ? (
              <p className="text-xs text-muted-foreground">Нет этапов</p>
            ) : (
              <div className="space-y-2">
                {laborSteps.map((l, i) => (
                  <div key={i} className="grid grid-cols-[1fr_70px_80px_30px] gap-1.5 items-center">
                    <Input placeholder="Этап" value={l.name} onChange={e => updateLabor(i, 'name', e.target.value)} className="h-8 text-xs" />
                    <Input type="number" placeholder="Мин" value={l.duration_minutes} onChange={e => updateLabor(i, 'duration_minutes', Number(e.target.value))} className="h-8 text-xs" />
                    <Input type="number" placeholder="₽" value={l.cost} onChange={e => updateLabor(i, 'cost', Number(e.target.value))} className="h-8 text-xs" />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLaborSteps(p => p.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground text-right">Итого: {totalLaborCost.toLocaleString()} ₽</p>
              </div>
            )}
          </div>

          {/* Equipment */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="flex items-center gap-1.5"><Wrench className="h-3.5 w-3.5" /> Оборудование</Label>
              <Button variant="ghost" size="sm" onClick={addEquipment}><Plus className="h-3 w-3 mr-1" /> Добавить</Button>
            </div>
            {equipment.length === 0 ? (
              <p className="text-xs text-muted-foreground">Нет оборудования</p>
            ) : (
              <div className="space-y-2">
                {equipment.map((e, i) => (
                  <div key={i} className="grid grid-cols-[1fr_70px_80px_30px] gap-1.5 items-center">
                    <Input placeholder="Ресурс" value={e.name} onChange={ev => updateEquipment(i, 'name', ev.target.value)} className="h-8 text-xs" />
                    <Input type="number" placeholder="Мин" value={e.usage_minutes} onChange={ev => updateEquipment(i, 'usage_minutes', Number(ev.target.value))} className="h-8 text-xs" />
                    <Input type="number" placeholder="₽" value={e.cost_per_use} onChange={ev => updateEquipment(i, 'cost_per_use', Number(ev.target.value))} className="h-8 text-xs" />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEquipment(p => p.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground text-right">Итого: {totalEquipmentCost.toLocaleString()} ₽</p>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="p-3 rounded-lg bg-muted space-y-1.5">
            <div className="flex justify-between text-sm">
              <span>Себестоимость</span>
              <span className="font-bold">{totalCost.toLocaleString()} ₽</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Цена услуги</span>
              <span>{servicePrice.toLocaleString()} ₽</span>
            </div>
            <div className={`flex justify-between text-sm font-bold pt-1.5 border-t ${profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
              <span>Прибыль</span>
              <span>{profit.toLocaleString()} ₽</span>
            </div>
          </div>

          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить карту'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default TechnologyCardEditor;
