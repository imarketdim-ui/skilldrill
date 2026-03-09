import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Wrench, Building2, Globe, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import MapPicker from '@/components/marketplace/MapPicker';
import { usePlatformPricing } from '@/hooks/usePlatformPricing';
import { PhoneInput } from '@/components/ui/phone-input';
import { validateINN } from '@/lib/validation';

const legalForms = [
  { value: 'ip', label: 'ИП' },
  { value: 'ooo', label: 'ООО' },
  { value: 'zao', label: 'ЗАО' },
  { value: 'oao', label: 'ОАО' },
  { value: 'self_employed', label: 'Самозанятый' },
  { value: 'other', label: 'Другое' },
];

type AccountType = 'master' | 'business' | 'network';

const formatPhone = (value: string) => {
  let v = value.replace(/[^\d+]/g, '');
  if (v.startsWith('8') && v.length > 1) v = '+7' + v.slice(1);
  return v;
};

const CreateBusinessAccount = () => {
  const { user, profile, roles, loading, refreshProfile } = useAuth();
  const pricing = usePlatformPricing();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [existingMasterProfiles, setExistingMasterProfiles] = useState<any[]>([]);
  const [existingBusinesses, setExistingBusinesses] = useState<any[]>([]);
  const [existingNetworks, setExistingNetworks] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  // Use useRef-backed form to avoid stale closures from map callbacks
  const [form, setForm] = useState<any>({});
  const formRef = useRef<any>({});
  const updateForm = (updates: any) => {
    setForm((prev: any) => {
      const next = { ...prev, ...updates };
      formRef.current = next;
      return next;
    });
  };

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('service_categories').select('*').eq('is_active', true),
      supabase.from('master_profiles').select('*, service_categories(name)').eq('user_id', user.id),
      supabase.from('business_locations').select('*').eq('owner_id', user.id),
      supabase.from('networks').select('*').eq('owner_id', user.id),
    ]).then(([cats, masters, biz, nets]) => {
      setCategories(cats.data || []);
      setExistingMasterProfiles(masters.data || []);
      setExistingBusinesses(biz.data || []);
      setExistingNetworks(nets.data || []);
    });
  }, [user]);

  const isMaster = roles.includes('master');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountType || !user) return;

    if (accountType === 'master' && !form.category_id) {
      toast({ title: 'Выберите категорию', variant: 'destructive' });
      return;
    }
    if (accountType === 'business') {
      if (!form.business_name || !form.business_inn || !form.business_legal_form || !form.business_address || !form.director_name || !form.business_contact_email || !form.business_contact_phone) {
        toast({ title: 'Заполните все обязательные поля', variant: 'destructive' });
        return;
      }
      const innResult = validateINN(form.business_inn);
      if (!innResult.valid) {
        toast({ title: 'Ошибка ИНН', description: innResult.error, variant: 'destructive' });
        return;
      }
    }
    if (accountType === 'network') {
      if (!form.network_name || !form.network_inn || !form.network_legal_form || !form.network_address || !form.director_name || !form.network_contact_email || !form.network_contact_phone) {
        toast({ title: 'Заполните все обязательные поля', variant: 'destructive' });
        return;
      }
      const innResult = validateINN(form.network_inn);
      if (!innResult.valid) {
        toast({ title: 'Ошибка ИНН', description: innResult.error, variant: 'destructive' });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (accountType === 'master') {
        const { error: roleError } = await supabase.rpc('assign_role_on_account_creation', { _user_id: user.id, _role: 'master' });
        if (roleError) throw new Error('Не удалось назначить роль мастера');
        const existingCat = existingMasterProfiles.find(mp => mp.category_id === form.category_id);
        if (existingCat) { toast({ title: 'У вас уже есть профиль в этой категории', variant: 'destructive' }); setIsSubmitting(false); return; }
        await supabase.from('master_profiles').insert({
          user_id: user.id, category_id: form.category_id,
          subscription_status: 'trial', trial_start_date: new Date().toISOString(),
          trial_days: form.promo_code ? 45 : 14, promo_code_used: form.promo_code || null,
          moderation_status: 'draft', is_active: true,
        });
        toast({ title: 'Аккаунт мастера создан!', description: 'Заполните профиль для прохождения модерации.' });
      } else if (accountType === 'business') {
        const { error: roleError } = await supabase.rpc('assign_role_on_account_creation', { _user_id: user.id, _role: 'business_owner' });
        if (roleError) throw new Error('Не удалось назначить роль владельца бизнеса');
        await supabase.from('business_locations').insert({
          owner_id: user.id, name: form.business_name, inn: form.business_inn,
          legal_form: form.business_legal_form, address: form.business_address,
          city: form.business_city || null, description: form.business_description || null,
          contact_email: form.business_contact_email, contact_phone: form.business_contact_phone,
          director_name: form.director_name, moderation_status: 'draft',
          latitude: form.business_lat || null, longitude: form.business_lng || null,
        });
        toast({ title: 'Бизнес-аккаунт создан!', description: 'Заполните профиль и добавьте услуги.' });
      } else if (accountType === 'network') {
        const { error: roleError } = await supabase.rpc('assign_role_on_account_creation', { _user_id: user.id, _role: 'network_owner' });
        if (roleError) throw new Error('Не удалось назначить роль владельца сети');
        await supabase.from('networks').insert({
          owner_id: user.id, name: form.network_name, description: form.network_description || null,
          inn: form.network_inn, legal_form: form.network_legal_form, address: form.network_address,
          contact_email: form.network_contact_email, contact_phone: form.network_contact_phone,
          director_name: form.director_name, moderation_status: 'draft',
        });
        toast({ title: 'Сеть создана!', description: 'Заполните профиль и добавьте точки.' });
      }

      await refreshProfile();
      if (accountType === 'master') localStorage.setItem('skillspot_active_role', 'master');
      else if (accountType === 'business') localStorage.setItem('skillspot_active_role', 'business_owner');
      else if (accountType === 'network') localStorage.setItem('skillspot_active_role', 'network_owner');
      window.location.href = '/dashboard';
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeCards = [
    { type: 'master' as const, icon: Wrench, title: 'Мастер', desc: `Индивидуальный специалист · ${pricing.master.toLocaleString()} ₽/мес`, note: isMaster ? 'Добавить категорию' : null },
    { type: 'business' as const, icon: Building2, title: 'Бизнес', desc: `Салон, студия, точка · ${pricing.business.toLocaleString()} ₽/мес` },
    { type: 'network' as const, icon: Globe, title: 'Сеть', desc: `Несколько точек · ${pricing.network.toLocaleString()} ₽/мес` },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container-wide py-8 max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Назад
        </Button>
        <h1 className="text-2xl font-bold mb-2">Создать бизнес-аккаунт</h1>
        <p className="text-muted-foreground mb-6">Аккаунт создаётся мгновенно. После заполнения профиля он пройдёт модерацию.</p>

        {!accountType && (
          <div className="grid gap-4">
            {typeCards.map(card => (
              <Card key={card.type} className="cursor-pointer transition-colors hover:border-primary" onClick={() => setAccountType(card.type)}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl"><card.icon className="h-8 w-8 text-primary" /></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{card.title}</h3>
                        {card.note && <Badge variant="secondary">{card.note}</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{card.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {existingMasterProfiles.length > 0 && (
              <Card className="border-dashed">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-2">Ваши существующие профили мастера:</p>
                  <div className="flex flex-wrap gap-2">
                    {existingMasterProfiles.map(mp => (
                      <Badge key={mp.id} variant="outline"><CheckCircle className="h-3 w-3 mr-1" />{mp.service_categories?.name || 'Без категории'}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {accountType && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setAccountType(null); updateForm({}); }}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <CardTitle>
                  {accountType === 'master' ? 'Создание профиля мастера' : accountType === 'business' ? 'Создание бизнеса' : 'Создание сети'}
                </CardTitle>
              </div>
              <CardDescription>
                {accountType === 'master' ? 'Выберите категорию.' : 'Заполните реквизиты. Все поля со * обязательны.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {accountType === 'master' && (
                  <>
                    <div className="p-3 rounded-lg bg-muted border">
                      <div className="flex gap-2 items-start">
                        <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <p className="text-sm text-muted-foreground">Дополнительные категории можно добавить позже в ЛК.</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Категория *</Label>
                      <Select value={form.category_id || ''} onValueChange={v => updateForm({ category_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Выберите категорию" /></SelectTrigger>
                        <SelectContent>
                          {categories.filter(c => !existingMasterProfiles.some(mp => mp.category_id === c.id)).map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Промокод (необязательно)</Label>
                      <Input placeholder="Промокод для расширенного тестового периода" value={form.promo_code || ''} onChange={e => updateForm({ promo_code: e.target.value })} />
                      <p className="text-xs text-muted-foreground">14 дней бесплатно, с промокодом — 45 дней</p>
                    </div>
                  </>
                )}

                {accountType === 'business' && (
                  <>
                    <div className="space-y-2">
                      <Label>Название организации *</Label>
                      <Input required value={form.business_name || ''} onChange={e => updateForm({ business_name: e.target.value })} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>ИНН *</Label>
                        <Input required value={form.business_inn || ''} onChange={e => updateForm({ business_inn: e.target.value.replace(/\D/g, '') })} maxLength={12} />
                      </div>
                      <div className="space-y-2">
                        <Label>Правовая форма *</Label>
                        <Select value={form.business_legal_form || ''} onValueChange={v => updateForm({ business_legal_form: v })}>
                          <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                          <SelectContent>{legalForms.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>ФИО директора *</Label>
                      <Input required value={form.director_name || ''} onChange={e => updateForm({ director_name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Город</Label>
                      <Input value={form.business_city || ''} onChange={e => updateForm({ business_city: e.target.value })} placeholder="Москва" />
                    </div>
                    <div className="space-y-2">
                      <Label>Адрес *</Label>
                      <MapPicker
                        latitude={form.business_lat || null}
                        longitude={form.business_lng || null}
                        address={form.business_address || ''}
                        onLocationChange={(lat, lng, address) => updateForm({ business_address: address, business_lat: lat, business_lng: lng })}
                      />
                      <Input
                        value={form.business_address || ''}
                        onChange={e => updateForm({ business_address: e.target.value })}
                        placeholder="Можно ввести или скорректировать адрес вручную"
                        className="mt-2"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Описание</Label>
                      <Textarea value={form.business_description || ''} onChange={e => updateForm({ business_description: e.target.value })} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Email *</Label>
                        <Input type="email" required value={form.business_contact_email || ''} onChange={e => updateForm({ business_contact_email: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Телефон *</Label>
                        <PhoneInput value={form.business_contact_phone || ''} onChange={v => updateForm({ business_contact_phone: v })} />
                      </div>
                    </div>
                  </>
                )}

                {accountType === 'network' && (
                  <>
                    <div className="space-y-2">
                      <Label>Название сети *</Label>
                      <Input required value={form.network_name || ''} onChange={e => updateForm({ network_name: e.target.value })} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>ИНН *</Label>
                        <Input required value={form.network_inn || ''} onChange={e => updateForm({ network_inn: e.target.value.replace(/\D/g, '') })} maxLength={12} />
                      </div>
                      <div className="space-y-2">
                        <Label>Правовая форма *</Label>
                        <Select value={form.network_legal_form || ''} onValueChange={v => updateForm({ network_legal_form: v })}>
                          <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                          <SelectContent>{legalForms.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>ФИО директора *</Label>
                      <Input required value={form.director_name || ''} onChange={e => updateForm({ director_name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Адрес *</Label>
                      <MapPicker
                        latitude={null}
                        longitude={null}
                        address={form.network_address || ''}
                        onLocationChange={(lat, lng, address) => updateForm({ network_address: address })}
                      />
                      <Input value={form.network_address || ''} onChange={e => updateForm({ network_address: e.target.value })} placeholder="Можно ввести или скорректировать адрес вручную" className="mt-2" />
                    </div>
                    <div className="space-y-2">
                      <Label>Описание</Label>
                      <Textarea value={form.network_description || ''} onChange={e => updateForm({ network_description: e.target.value })} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Email *</Label>
                        <Input type="email" required value={form.network_contact_email || ''} onChange={e => updateForm({ network_contact_email: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Телефон *</Label>
                        <PhoneInput value={form.network_contact_phone || ''} onChange={v => updateForm({ network_contact_phone: v })} />
                      </div>
                    </div>
                  </>
                )}

                <div className="flex gap-4 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setAccountType(null); updateForm({}); }} className="flex-1">Назад</Button>
                  <Button type="submit" disabled={isSubmitting} className="flex-1">
                    {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Создание...</> : 'Создать аккаунт'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CreateBusinessAccount;
