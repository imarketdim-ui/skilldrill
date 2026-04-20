import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

const CreateBusinessAccount = () => {
  const { user, profile, roles, loading, refreshProfile } = useAuth();
  const pricing = usePlatformPricing();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const initialType = searchParams.get('type') as AccountType | null;
  const [accountType, setAccountType] = useState<AccountType | null>(
    initialType === 'network' && !pricing.network ? null : initialType
  );
  const [existingMasterProfiles, setExistingMasterProfiles] = useState<any[]>([]);
  const [existingBusinesses, setExistingBusinesses] = useState<any[]>([]);
  const [existingNetworks, setExistingNetworks] = useState<any[]>([]);
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

  // Check limits before allowing creation
  const canCreateBusiness = () => {
    // Active = trial, active, or in_network
    const activeStatuses = ['trial', 'active', 'in_network'];
    const activeBusinesses = existingBusinesses.filter(b => activeStatuses.includes(b.subscription_status));
    const hasActiveNetwork = existingNetworks.some(n => ['trial', 'active'].includes(n.subscription_status));

    // Network owners may create unlimited business locations under their network
    if (hasActiveNetwork) {
      return { allowed: true, reason: '' };
    }

    // Without an active network: 1 active business location max
    if (activeBusinesses.length >= 1) {
      return {
        allowed: false,
        reason: 'На текущем тарифе доступна только 1 бизнес-точка. Оформите тариф «Сеть», чтобы создавать дополнительные точки.',
      };
    }

    // Block if any existing business is in a non-active state (suspended/expired)
    const hasInactive = existingBusinesses.some(b => !activeStatuses.includes(b.subscription_status));
    if (hasInactive) {
      return {
        allowed: false,
        reason: 'У вас есть бизнес с приостановленной подпиской. Оплатите подписку или удалите неактивный бизнес, чтобы создать новый.',
      };
    }

    return { allowed: true, reason: '' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountType || !user) return;

    if (accountType === 'master' && !form.category_id) {
      toast({ title: 'Выберите категорию', variant: 'destructive' });
      return;
    }
    if (accountType === 'business') {
      const check = canCreateBusiness();
      if (!check.allowed) {
        toast({ title: 'Ограничение', description: check.reason, variant: 'destructive' });
        return;
      }
      if (!form.business_name || !form.business_inn || !form.business_legal_form || !form.business_lat || !form.director_name || !form.business_contact_email || !form.business_contact_phone) {
        toast({ title: 'Заполните все обязательные поля', description: 'Укажите адрес на карте', variant: 'destructive' });
        return;
      }
      const innResult = validateINN(form.business_inn);
      if (!innResult.valid) {
        toast({ title: 'Ошибка ИНН', description: innResult.error, variant: 'destructive' });
        return;
      }
    }
    if (accountType === 'network') {
      if (!form.network_name || !form.network_inn || !form.network_legal_form || !form.network_lat || !form.director_name || !form.network_contact_email || !form.network_contact_phone) {
        toast({ title: 'Заполните все обязательные поля', description: 'Укажите адрес на карте', variant: 'destructive' });
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
        const existingCat = existingMasterProfiles.find(mp => mp.category_id === form.category_id);
        if (existingCat) { toast({ title: 'У вас уже есть профиль в этой категории', variant: 'destructive' }); setIsSubmitting(false); return; }
        const { error: insertError } = await supabase.from('master_profiles').insert({
          user_id: user.id, category_id: form.category_id,
          subscription_status: 'trial', trial_start_date: new Date().toISOString(),
          trial_days: form.promo_code ? 45 : 14, promo_code_used: form.promo_code || null,
          moderation_status: 'draft', is_active: true,
        });
        if (insertError) throw new Error(insertError.message);
        const { error: roleError } = await supabase.rpc('assign_role_on_account_creation', { _user_id: user.id, _role: 'master' });
        if (roleError) console.error('Role assignment failed:', roleError);
        toast({ title: 'Аккаунт мастера создан!', description: 'Заполните профиль для прохождения модерации.' });
      } else if (accountType === 'business') {
        const { error: insertError } = await supabase.from('business_locations').insert({
          owner_id: user.id, name: form.business_name, inn: form.business_inn,
          legal_form: form.business_legal_form, address: form.business_address || '',
          city: form.business_city || null, description: form.business_description || null,
          contact_email: form.business_contact_email, contact_phone: form.business_contact_phone,
          director_name: form.director_name, moderation_status: 'draft',
          latitude: form.business_lat || null, longitude: form.business_lng || null,
        });
        if (insertError) throw new Error(insertError.message);
        const { error: roleError } = await supabase.rpc('assign_role_on_account_creation', { _user_id: user.id, _role: 'business_owner' });
        if (roleError) console.error('Role assignment failed:', roleError);
        toast({ title: 'Бизнес-аккаунт создан!', description: 'Заполните профиль и добавьте услуги.' });
      } else if (accountType === 'network') {
        const { error: insertError } = await supabase.from('networks').insert({
          owner_id: user.id, name: form.network_name.trim(), description: form.network_description || null,
          inn: form.network_inn.trim(), legal_form: form.network_legal_form, address: form.network_address || '',
          contact_email: form.network_contact_email.trim(), contact_phone: form.network_contact_phone.trim(),
          director_name: form.director_name.trim(), moderation_status: 'draft',
        });
        if (insertError) throw new Error(insertError.message);
        const { error: roleError } = await supabase.rpc('assign_role_on_account_creation', { _user_id: user.id, _role: 'network_owner' });
        if (roleError) console.error('Role assignment failed:', roleError);
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

  const renderEntityForm = (prefix: 'business' | 'network') => {
    const nameKey = `${prefix}_name`;
    const innKey = `${prefix}_inn`;
    const legalFormKey = `${prefix}_legal_form`;
    const addressKey = `${prefix}_address`;
    const descKey = `${prefix}_description`;
    const emailKey = `${prefix}_contact_email`;
    const phoneKey = `${prefix}_contact_phone`;
    const latKey = `${prefix}_lat`;
    const lngKey = `${prefix}_lng`;
    const cityKey = `${prefix}_city`;

    return (
      <>
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
          <div className="flex gap-2 items-start">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-200">Название только на русском языке</p>
              <p className="text-amber-700 dark:text-amber-300 mt-1">С 1 марта 2026 г. коммерческие наименования в РФ должны быть на русском языке. <Link to="/offer#russian-naming" className="underline hover:no-underline">Подробнее в п. 7 оферты</Link></p>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Название {prefix === 'business' ? 'организации' : 'сети'} *</Label>
          <Input required value={form[nameKey] || ''} onChange={e => updateForm({ [nameKey]: e.target.value })} placeholder={prefix === 'business' ? "Например: Салон красоты «Ромашка»" : "Например: Сеть салонов «Красота»"} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>ИНН *</Label>
            <Input required value={form[innKey] || ''} onChange={e => updateForm({ [innKey]: e.target.value.replace(/\D/g, '') })} maxLength={12} />
          </div>
          <div className="space-y-2">
            <Label>Правовая форма *</Label>
            <Select value={form[legalFormKey] || ''} onValueChange={v => updateForm({ [legalFormKey]: v })}>
              <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
              <SelectContent>{legalForms.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>ФИО директора *</Label>
          <Input required value={form.director_name || ''} onChange={e => updateForm({ director_name: e.target.value })} />
        </div>
        {prefix === 'business' && (
          <div className="space-y-2">
            <Label>Город</Label>
            <Input value={form[cityKey] || ''} onChange={e => updateForm({ [cityKey]: e.target.value })} placeholder="Москва" />
          </div>
        )}
        <div className="space-y-2">
          <Label>Адрес (укажите на карте) *</Label>
          <MapPicker
            latitude={form[latKey] || null}
            longitude={form[lngKey] || null}
            address={form[addressKey] || ''}
            onLocationChange={(lat, lng, address) => updateForm({ [addressKey]: address, [latKey]: lat, [lngKey]: lng })}
          />
          {form[addressKey] && (
            <p className="text-sm text-muted-foreground mt-1">📍 {form[addressKey]}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Описание</Label>
          <Textarea value={form[descKey] || ''} onChange={e => updateForm({ [descKey]: e.target.value })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Email *</Label>
            <Input type="email" required value={form[emailKey] || ''} onChange={e => updateForm({ [emailKey]: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Телефон *</Label>
            <PhoneInput value={form[phoneKey] || ''} onChange={v => updateForm({ [phoneKey]: v })} />
          </div>
        </div>
      </>
    );
  };

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
            {typeCards.map(card => {
              const isNetworkLocked = card.type === 'network' && !pricing.network;
              const bizCheck = card.type === 'business' ? canCreateBusiness() : { allowed: true, reason: '' };
              const isLocked = isNetworkLocked || (card.type === 'business' && !bizCheck.allowed);
              return (
                <Card
                  key={card.type}
                  className={`transition-colors ${isLocked ? 'cursor-pointer hover:border-primary/50 opacity-75' : 'cursor-pointer hover:border-primary'}`}
                  onClick={() => {
                    if (isNetworkLocked) {
                      toast({ title: 'Тариф «Сеть» пока недоступен', description: 'Для создания сети необходимо подключить тариф.' });
                      navigate('/for-business#pricing');
                      return;
                    }
                    if (card.type === 'business' && !bizCheck.allowed) {
                      toast({ title: 'Ограничение', description: bizCheck.reason, variant: 'destructive' });
                      return;
                    }
                    setAccountType(card.type);
                  }}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${isLocked ? 'bg-muted' : 'bg-primary/10'}`}>
                        <card.icon className={`h-8 w-8 ${isLocked ? 'text-muted-foreground' : 'text-primary'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{card.title}</h3>
                          {card.note && <Badge variant="secondary">{card.note}</Badge>}
                          {isLocked && <Badge variant="outline" className="text-destructive border-destructive">Ограничено</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{card.desc}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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
                {accountType === 'master' ? 'Выберите категорию.' : 'Заполните реквизиты. Все поля со * обязательны. Адрес — только через карту.'}
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

                {accountType === 'business' && renderEntityForm('business')}
                {accountType === 'network' && renderEntityForm('network')}

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
