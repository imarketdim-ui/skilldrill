import { useState, useEffect } from 'react';
import { TIMEZONE_OPTIONS } from '@/hooks/useTimezone';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, Settings, Percent, Save, Loader2, Plus, Trash2, X, Tag } from 'lucide-react';
import BusinessOnboardingProgress from './BusinessOnboardingProgress';
import ProfilePostsManager from '@/components/content/ProfilePostsManager';

const legalForms = [
  { value: 'ip', label: 'ИП' },
  { value: 'ooo', label: 'ООО' },
  { value: 'zao', label: 'ЗАО' },
  { value: 'oao', label: 'ОАО' },
  { value: 'self_employed', label: 'Самозанятый' },
  { value: 'other', label: 'Другое' },
];

const ruleTypes = [
  { value: 'default', label: 'По умолчанию', desc: 'Применяется ко всем, если нет более специфичного правила' },
  { value: 'master', label: 'По мастеру', desc: 'Для конкретного мастера' },
  { value: 'category', label: 'По категории', desc: 'Для услуг определённой категории' },
  { value: 'service', label: 'По услуге', desc: 'Для конкретной услуги' },
];

interface Props {
  business: any;
  onUpdated: () => void;
}

const BusinessSettings = ({ business, onUpdated }: Props) => {
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [commissionOpen, setCommissionOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});

  // Commission rules
  const [rules, setRules] = useState<any[]>([]);
  const [masters, setMasters] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [ruleForm, setRuleForm] = useState<any>({ name: '', rule_type: 'default', commission_percent: '', master_id: '', category_id: '', service_id: '', is_active: true });
  const [addRuleOpen, setAddRuleOpen] = useState(false);

  // Category management
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);
  const [contentDialogOpen, setContentDialogOpen] = useState(false);

  useEffect(() => {
    if (business) {
      const addressParts = (business.address || '').split(', ');
      setForm({
        name: business.name || '', inn: business.inn || '', legal_form: business.legal_form || '',
        address: business.address || '', city: business.city || '', description: business.description || '',
        director_name: business.director_name || '', contact_email: business.contact_email || '',
        contact_phone: business.contact_phone || '',
        timezone: (business as any).timezone || 'Europe/Moscow',
        street: addressParts[0] || '', house: addressParts[1] || '', office: addressParts[2] || '',
      });
    }
  }, [business]);

  const handleSaveInfo = async () => {
    setSaving(true);
    const composedAddress = [form.street, form.house, form.office].filter(Boolean).join(', ');
    const { error } = await supabase.from('business_locations').update({
      name: form.name, inn: form.inn, legal_form: form.legal_form, address: composedAddress || form.address,
      city: form.city || null, description: form.description || null, director_name: form.director_name,
      contact_email: form.contact_email, contact_phone: form.contact_phone,
    }).eq('id', business.id);
    setSaving(false);
    if (error) toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Информация обновлена' }); setEditOpen(false); onUpdated(); }
  };

  const openCommissions = async () => {
    const [rulesRes, mastersRes, catsRes, svcsRes] = await Promise.all([
      supabase.from('business_commission_rules').select('*').eq('business_id', business.id).order('priority', { ascending: false }),
      supabase.from('business_masters')
        .select('master_id, profile:profiles!business_masters_master_id_fkey(first_name, last_name, skillspot_id)')
        .eq('business_id', business.id).eq('status', 'accepted'),
      supabase.from('service_categories').select('id, name').eq('is_active', true),
      supabase.from('services').select('id, name').eq('business_id', business.id),
    ]);
    setRules(rulesRes.data || []);
    setMasters((mastersRes.data || []).map((m: any) => ({
      id: m.master_id,
      name: `${m.profile?.first_name || ''} ${m.profile?.last_name || ''}`.trim(),
      skillspot_id: m.profile?.skillspot_id,
    })));
    setCategories(catsRes.data || []);
    setServices(svcsRes.data || []);
    setCommissionOpen(true);
  };

  const handleAddRule = async () => {
    if (!ruleForm.name || !ruleForm.commission_percent) {
      toast({ title: 'Заполните название и процент', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const priorityMap: Record<string, number> = { default: 0, category: 10, master: 20, service: 30 };
    const { error } = await supabase.from('business_commission_rules').insert({
      business_id: business.id,
      name: ruleForm.name,
      rule_type: ruleForm.rule_type,
      commission_percent: Number(ruleForm.commission_percent),
      master_id: ruleForm.rule_type === 'master' ? ruleForm.master_id || null : null,
      category_id: ruleForm.rule_type === 'category' ? ruleForm.category_id || null : null,
      service_id: ruleForm.rule_type === 'service' ? ruleForm.service_id || null : null,
      priority: priorityMap[ruleForm.rule_type] || 0,
      is_active: ruleForm.is_active,
    });
    setSaving(false);
    if (error) toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Правило добавлено' });
      setAddRuleOpen(false);
      setRuleForm({ name: '', rule_type: 'default', commission_percent: '', master_id: '', category_id: '', service_id: '', is_active: true });
      // Refresh
      const { data } = await supabase.from('business_commission_rules').select('*').eq('business_id', business.id).order('priority', { ascending: false });
      setRules(data || []);
    }
  };

  const deleteRule = async (id: string) => {
    await supabase.from('business_commission_rules').delete().eq('id', id);
    setRules(prev => prev.filter(r => r.id !== id));
    toast({ title: 'Правило удалено' });
  };

  const toggleRule = async (id: string, active: boolean) => {
    await supabase.from('business_commission_rules').update({ is_active: active }).eq('id', id);
    setRules(prev => prev.map(r => r.id === id ? { ...r, is_active: active } : r));
  };

  const formatPhone = (value: string) => {
    let v = value.replace(/[^\d+]/g, '');
    if (v.startsWith('8') && v.length > 1) v = '+7' + v.slice(1);
    return v;
  };

  const getRuleLabel = (r: any) => {
    if (r.rule_type === 'master') {
      const m = masters.find(m => m.id === r.master_id);
      return m ? m.name : 'Мастер';
    }
    if (r.rule_type === 'category') {
      const c = categories.find(c => c.id === r.category_id);
      return c ? c.name : 'Категория';
    }
    if (r.rule_type === 'service') {
      const s = services.find(s => s.id === r.service_id);
      return s ? s.name : 'Услуга';
    }
    return 'Все';
  };

  const ruleTypeBadgeVariant = (type: string) => {
    if (type === 'default') return 'secondary' as const;
    if (type === 'master') return 'default' as const;
    if (type === 'category') return 'outline' as const;
    return 'destructive' as const;
  };

  const openCategories = async () => {
    const { data } = await supabase.from('service_categories').select('id, name').eq('is_active', true).order('name');
    setAllCategories(data || []);
    setSelectedCategoryId(business.category_id || null);
    setCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    setSavingCategory(true);
    const { error } = await supabase.from('business_locations').update({ category_id: selectedCategoryId }).eq('id', business.id);
    setSavingCategory(false);
    if (error) toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Категория обновлена' }); setCategoryDialogOpen(false); onUpdated(); }
  };

  return (
    <div className="space-y-4">
      <BusinessOnboardingProgress business={business} />
      <Card>
        <CardHeader><CardTitle>Настройки бизнеса</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> Редактировать информацию
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={openCategories}>
            <Tag className="h-4 w-4" /> Категория бизнеса
            {business.category_id && <Badge variant="secondary" className="ml-auto text-xs">{allCategories.find(c => c.id === business.category_id)?.name || 'Выбрана'}</Badge>}
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={openCommissions}>
            <Percent className="h-4 w-4" /> Настройки комиссий
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setContentDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Публичные посты и сторис
          </Button>
        </CardContent>
      </Card>

      {/* Edit Info Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Редактировать информацию</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input value={form.name || ''} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>ИНН</Label>
                <Input value={form.inn || ''} onChange={e => setForm((p: any) => ({ ...p, inn: e.target.value.replace(/\D/g, '') }))} maxLength={12} />
              </div>
              <div className="space-y-2">
                <Label>Правовая форма</Label>
                <Select value={form.legal_form || ''} onValueChange={v => setForm((p: any) => ({ ...p, legal_form: v }))}>
                  <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                  <SelectContent>{legalForms.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>ФИО директора</Label>
              <Input value={form.director_name || ''} onChange={e => setForm((p: any) => ({ ...p, director_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Город</Label>
              <Input value={form.city || ''} onChange={e => setForm((p: any) => ({ ...p, city: e.target.value }))} placeholder="Москва" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Улица</Label>
                <Input value={form.street || ''} onChange={e => setForm((p: any) => ({ ...p, street: e.target.value }))} placeholder="ул. Ленина" />
              </div>
              <div className="space-y-2">
                <Label>Дом</Label>
                <Input value={form.house || ''} onChange={e => setForm((p: any) => ({ ...p, house: e.target.value }))} placeholder="12" />
              </div>
              <div className="space-y-2">
                <Label>Офис/кв.</Label>
                <Input value={form.office || ''} onChange={e => setForm((p: any) => ({ ...p, office: e.target.value }))} placeholder="3" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea value={form.description || ''} onChange={e => setForm((p: any) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Часовой пояс</Label>
              <Select value={form.timezone || 'Europe/Moscow'} onValueChange={v => setForm((p: any) => ({ ...p, timezone: v }))}>
                <SelectTrigger><SelectValue placeholder="Выберите часовой пояс" /></SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OPTIONS.map(tz => <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.contact_email || ''} onChange={e => setForm((p: any) => ({ ...p, contact_email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Телефон</Label>
                <Input value={form.contact_phone || ''} onChange={e => setForm((p: any) => ({ ...p, contact_phone: formatPhone(e.target.value) }))} />
              </div>
            </div>
            <Button className="w-full" onClick={handleSaveInfo} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Сохранить
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Commission Rules Dialog */}
      <Dialog open={commissionOpen} onOpenChange={setCommissionOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Настройки комиссий</DialogTitle>
            <CardDescription>Правила применяются по приоритету: услуга → мастер → категория → по умолчанию</CardDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Button size="sm" onClick={() => setAddRuleOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Добавить правило
            </Button>

            {rules.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">Нет правил комиссий. Добавьте правило «По умолчанию» для начала.</p>
            ) : (
              <div className="space-y-2">
                {rules.map(r => (
                  <div key={r.id} className={`flex items-center justify-between p-3 rounded-lg border ${!r.is_active ? 'opacity-50' : ''}`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{r.name}</span>
                        <Badge variant={ruleTypeBadgeVariant(r.rule_type)} className="text-xs">
                          {ruleTypes.find(t => t.value === r.rule_type)?.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{getRuleLabel(r)} · {r.commission_percent}%</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={r.is_active} onCheckedChange={v => toggleRule(r.id, v)} />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteRule(r.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Rule Dialog */}
      <Dialog open={addRuleOpen} onOpenChange={setAddRuleOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Новое правило комиссии</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input value={ruleForm.name} onChange={e => setRuleForm((p: any) => ({ ...p, name: e.target.value }))} placeholder="Например: Стандартная комиссия" />
            </div>
            <div className="space-y-2">
              <Label>Тип правила</Label>
              <Select value={ruleForm.rule_type} onValueChange={v => setRuleForm((p: any) => ({ ...p, rule_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ruleTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label} — {t.desc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {ruleForm.rule_type === 'master' && masters.length > 0 && (
              <div className="space-y-2">
                <Label>Мастер</Label>
                <Select value={ruleForm.master_id} onValueChange={v => setRuleForm((p: any) => ({ ...p, master_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Выберите мастера" /></SelectTrigger>
                  <SelectContent>
                    {masters.map(m => <SelectItem key={m.id} value={m.id}>{m.name} ({m.skillspot_id})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {ruleForm.rule_type === 'category' && categories.length > 0 && (
              <div className="space-y-2">
                <Label>Категория</Label>
                <Select value={ruleForm.category_id} onValueChange={v => setRuleForm((p: any) => ({ ...p, category_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Выберите категорию" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {ruleForm.rule_type === 'service' && services.length > 0 && (
              <div className="space-y-2">
                <Label>Услуга</Label>
                <Select value={ruleForm.service_id} onValueChange={v => setRuleForm((p: any) => ({ ...p, service_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Выберите услугу" /></SelectTrigger>
                  <SelectContent>
                    {services.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Процент комиссии *</Label>
              <div className="flex items-center gap-2">
                <Input type="text" inputMode="numeric" value={ruleForm.commission_percent}
                  onChange={e => setRuleForm((p: any) => ({ ...p, commission_percent: e.target.value.replace(/[^\d.]/g, '') }))}
                  placeholder="0" className="w-24" />
                <span className="text-muted-foreground">%</span>
              </div>
            </div>
            <Button className="w-full" onClick={handleAddRule} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Добавить правило
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Категория бизнеса</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Выберите основную категорию вашего бизнеса. Это поможет клиентам найти вас в каталоге.</p>
            <div className="max-h-[50vh] overflow-y-auto space-y-1">
              {allCategories.map(cat => (
                <button
                  key={cat.id}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${selectedCategoryId === cat.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                  onClick={() => setSelectedCategoryId(cat.id)}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            <Button className="w-full" onClick={handleSaveCategory} disabled={savingCategory}>
              {savingCategory ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Сохранить
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={contentDialogOpen} onOpenChange={setContentDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Публичный контент организации</DialogTitle>
          </DialogHeader>
          <ProfilePostsManager
            entityType="business"
            entityId={business.id}
            title="Посты, сторис и новости организации"
            description="Публикуйте новые работы, обновления услуг, новости команды и достижения, которые увидят клиенты на публичной странице."
            emptyText="Пока нет публикаций. Добавьте первую новость, работу или сторис организации."
            onChanged={onUpdated}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessSettings;
