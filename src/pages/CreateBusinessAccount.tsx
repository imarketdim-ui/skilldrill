import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Wrench, Building2, Globe, Info, CheckCircle, ArrowRight, Check } from 'lucide-react';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';

const legalForms = [
  { value: 'ip', label: 'ИП' },
  { value: 'ooo', label: 'ООО' },
  { value: 'zao', label: 'ЗАО' },
  { value: 'oao', label: 'ОАО' },
  { value: 'self_employed', label: 'Самозанятый' },
  { value: 'other', label: 'Другое' },
];

type AccountType = 'master' | 'business' | 'network';

const stepLabels: Record<AccountType, string[]> = {
  master: ['Тип аккаунта', 'Категория', 'Готово'],
  business: ['Тип аккаунта', 'Реквизиты', 'Контакты', 'Готово'],
  network: ['Тип аккаунта', 'Реквизиты', 'Контакты', 'Готово'],
};

const CreateBusinessAccount = () => {
  const { user, profile, roles, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [step, setStep] = useState(0); // 0 = choose type
  const [existingMasterProfiles, setExistingMasterProfiles] = useState<any[]>([]);
  const [existingBusinesses, setExistingBusinesses] = useState<any[]>([]);
  const [existingNetworks, setExistingNetworks] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (!loading && !user) navigate('/auth?redirect=/create-account');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('service_categories').select('*').eq('is_active', true),
      supabase.from('master_profiles').select('*, service_categories(name)').eq('user_id', user.id),
      supabase.from('business_locations').select('*').eq('owner_id', user.id),
      supabase.from('networks').select('*').eq('owner_id', user.id),
      supabase.from('role_requests').select('*').eq('requester_id', user.id).eq('status', 'pending' as any),
    ]).then(([cats, masters, biz, nets, reqs]) => {
      setCategories(cats.data || []);
      setExistingMasterProfiles(masters.data || []);
      setExistingBusinesses(biz.data || []);
      setExistingNetworks(nets.data || []);
      setPendingRequests(reqs.data || []);
    });
  }, [user]);

  const hasPendingRequest = (type: string) => pendingRequests.some(r => r.request_type === type);
  const isMaster = roles.includes('master');

  const handleSelectType = (type: AccountType) => {
    setAccountType(type);
    setStep(1);
    setForm({});
  };

  const handleSubmit = async () => {
    if (!accountType || !user) return;

    if (accountType === 'master' && !form.category_id) {
      toast({ title: 'Выберите категорию', variant: 'destructive' });
      return;
    }
    if (accountType === 'business' && (!form.business_name || !form.business_inn || !form.business_legal_form || !form.business_address || !form.director_name || !form.business_contact_email || !form.business_contact_phone)) {
      toast({ title: 'Заполните все обязательные поля', variant: 'destructive' });
      return;
    }
    if (accountType === 'network' && (!form.network_name || !form.network_inn || !form.network_legal_form || !form.network_address || !form.director_name || !form.network_contact_email || !form.network_contact_phone)) {
      toast({ title: 'Заполните все обязательные поля', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (accountType === 'master') {
        const { error: roleError } = await supabase.rpc('assign_role_on_account_creation', { _user_id: user.id, _role: 'master' });
        if (roleError) throw new Error('Не удалось назначить роль мастера');

        const existingCat = existingMasterProfiles.find(mp => mp.category_id === form.category_id);
        if (existingCat) {
          toast({ title: 'У вас уже есть профиль в этой категории', variant: 'destructive' });
          setIsSubmitting(false);
          return;
        }

        await supabase.from('master_profiles').insert({
          user_id: user.id, category_id: form.category_id, subscription_status: 'trial',
          trial_start_date: new Date().toISOString(), trial_days: form.promo_code ? 45 : 14,
          promo_code_used: form.promo_code || null, moderation_status: 'draft', is_active: true,
        });
        toast({ title: 'Аккаунт мастера создан!', description: 'Заполните профиль для модерации.' });

      } else if (accountType === 'business') {
        const { error: roleError } = await supabase.rpc('assign_role_on_account_creation', { _user_id: user.id, _role: 'business_owner' });
        if (roleError) throw new Error('Не удалось назначить роль');

        await supabase.from('business_locations').insert({
          owner_id: user.id, name: form.business_name, inn: form.business_inn,
          legal_form: form.business_legal_form, address: form.business_address,
          description: form.business_description || null, contact_email: form.business_contact_email,
          contact_phone: form.business_contact_phone, director_name: form.director_name, moderation_status: 'draft',
        });
        toast({ title: 'Бизнес создан!', description: 'Добавьте услуги для модерации.' });

      } else if (accountType === 'network') {
        const { error: roleError } = await supabase.rpc('assign_role_on_account_creation', { _user_id: user.id, _role: 'network_owner' });
        if (roleError) throw new Error('Не удалось назначить роль');

        await supabase.from('networks').insert({
          owner_id: user.id, name: form.network_name, description: form.network_description || null,
          inn: form.network_inn, legal_form: form.network_legal_form, address: form.network_address,
          contact_email: form.network_contact_email, contact_phone: form.network_contact_phone,
          director_name: form.director_name, moderation_status: 'draft',
        });
        toast({ title: 'Сеть создана!', description: 'Добавьте точки для модерации.' });
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

  const currentSteps = accountType ? stepLabels[accountType] : ['Тип аккаунта'];
  const totalSteps = currentSteps.length;

  const typeCards = [
    { type: 'master' as const, icon: Wrench, title: 'Мастер', desc: 'Индивидуальный специалист', price: '900 ₽/мес', disabled: hasPendingRequest('master'), note: isMaster ? 'Добавить категорию' : '14 дней бесплатно' },
    { type: 'business' as const, icon: Building2, title: 'Бизнес', desc: 'Салон, студия, точка', price: '3 000 ₽/мес', disabled: hasPendingRequest('business'), note: '14 дней бесплатно' },
    { type: 'network' as const, icon: Globe, title: 'Сеть', desc: 'Несколько точек', price: 'от 3 000 ₽/мес', disabled: hasPendingRequest('network'), note: '14 дней бесплатно' },
  ];

  const canProceed = () => {
    if (!accountType) return false;
    if (accountType === 'master') return !!form.category_id;
    if (step === 1) return !!(form[`${accountType === 'business' ? 'business' : 'network'}_name`] && form[`${accountType === 'business' ? 'business' : 'network'}_inn`] && form[`${accountType === 'business' ? 'business' : 'network'}_legal_form`] && form[`${accountType === 'business' ? 'business' : 'network'}_address`] && form.director_name);
    if (step === 2) return !!(form[`${accountType === 'business' ? 'business' : 'network'}_contact_email`] && form[`${accountType === 'business' ? 'business' : 'network'}_contact_phone`]);
    return false;
  };

  const prefix = accountType === 'network' ? 'network' : 'business';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20 pb-16">
        <div className="container-wide max-w-2xl mx-auto">
          {/* Progress indicator */}
          {accountType && (
            <div className="flex items-center gap-2 mb-8">
              {currentSteps.map((label, i) => (
                <div key={i} className="flex items-center gap-2 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${
                    i < step ? 'bg-primary text-primary-foreground' :
                    i === step ? 'bg-primary text-primary-foreground' :
                    'bg-secondary text-muted-foreground'
                  }`}>
                    {i < step ? <Check className="h-4 w-4" /> : i + 1}
                  </div>
                  <span className={`text-xs hidden sm:inline ${i <= step ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
                  {i < totalSteps - 1 && <div className={`flex-1 h-px ${i < step ? 'bg-primary' : 'bg-border'}`} />}
                </div>
              ))}
            </div>
          )}

          {/* Step 0: Choose type */}
          {step === 0 && (
            <div>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-display font-bold mb-2">Разместите свои услуги</h1>
                <p className="text-muted-foreground">Выберите тип аккаунта для начала работы</p>
              </div>

              <div className="grid gap-4">
                {typeCards.map((card) => (
                  <Card
                    key={card.type}
                    className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/40 ${card.disabled ? 'opacity-50 pointer-events-none' : ''}`}
                    onClick={() => !card.disabled && handleSelectType(card.type)}
                  >
                    <CardContent className="py-5 px-6">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                          <card.icon className="h-7 w-7 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-display font-bold text-lg">{card.title}</h3>
                            <Badge variant="secondary" className="text-xs">{card.note}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{card.desc}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-display font-bold text-lg">{card.price}</p>
                          <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto mt-1" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {existingMasterProfiles.length > 0 && (
                <div className="mt-6 p-4 rounded-xl bg-secondary">
                  <p className="text-sm text-muted-foreground mb-2">Ваши профили:</p>
                  <div className="flex flex-wrap gap-2">
                    {existingMasterProfiles.map(mp => (
                      <Badge key={mp.id} variant="outline">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {mp.service_categories?.name || 'Без категории'}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Master: Step 1 - Category */}
          {accountType === 'master' && step === 1 && (
            <Card>
              <CardContent className="pt-8 pb-6 px-6">
                <h2 className="text-xl font-display font-bold mb-1">Выберите категорию</h2>
                <p className="text-sm text-muted-foreground mb-6">Дополнительные категории можно добавить позже в личном кабинете</p>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Категория *</Label>
                    <Select onValueChange={(v) => setForm({ ...form, category_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Выберите категорию" /></SelectTrigger>
                      <SelectContent>
                        {categories
                          .filter(c => !existingMasterProfiles.some(mp => mp.category_id === c.id))
                          .map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Промокод (необязательно)</Label>
                    <Input placeholder="Для расширенного тестового периода" value={form.promo_code || ''} onChange={(e) => setForm({ ...form, promo_code: e.target.value })} />
                    <p className="text-xs text-muted-foreground">14 дней бесплатно, с промокодом — 45 дней</p>
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <Button variant="outline" onClick={() => { setStep(0); setAccountType(null); }} className="flex-1">Назад</Button>
                  <Button onClick={handleSubmit} disabled={!form.category_id || isSubmitting} className="flex-1">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Создать аккаунт
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Business/Network: Step 1 - Details */}
          {(accountType === 'business' || accountType === 'network') && step === 1 && (
            <Card>
              <CardContent className="pt-8 pb-6 px-6">
                <h2 className="text-xl font-display font-bold mb-1">
                  {accountType === 'business' ? 'Данные организации' : 'Данные сети'}
                </h2>
                <p className="text-sm text-muted-foreground mb-6">Заполните реквизиты</p>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Название *</Label>
                    <Input value={form[`${prefix}_name`] || ''} onChange={(e) => setForm({ ...form, [`${prefix}_name`]: e.target.value })} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>ИНН *</Label>
                      <Input value={form[`${prefix}_inn`] || ''} onChange={(e) => setForm({ ...form, [`${prefix}_inn`]: e.target.value.replace(/\D/g, '') })} maxLength={12} />
                    </div>
                    <div className="space-y-2">
                      <Label>Правовая форма *</Label>
                      <Select onValueChange={(v) => setForm({ ...form, [`${prefix}_legal_form`]: v })}>
                        <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                        <SelectContent>{legalForms.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>ФИО директора *</Label>
                    <Input value={form.director_name || ''} onChange={(e) => setForm({ ...form, director_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Адрес *</Label>
                    <Input value={form[`${prefix}_address`] || ''} onChange={(e) => setForm({ ...form, [`${prefix}_address`]: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Описание</Label>
                    <Textarea value={form[`${prefix}_description`] || ''} onChange={(e) => setForm({ ...form, [`${prefix}_description`]: e.target.value })} rows={3} />
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <Button variant="outline" onClick={() => { setStep(0); setAccountType(null); }} className="flex-1">Назад</Button>
                  <Button onClick={() => setStep(2)} disabled={!canProceed()} className="flex-1">
                    Далее <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Business/Network: Step 2 - Contacts */}
          {(accountType === 'business' || accountType === 'network') && step === 2 && (
            <Card>
              <CardContent className="pt-8 pb-6 px-6">
                <h2 className="text-xl font-display font-bold mb-1">Контактные данные</h2>
                <p className="text-sm text-muted-foreground mb-6">Для связи с клиентами и модерации</p>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input type="email" value={form[`${prefix}_contact_email`] || ''} onChange={(e) => setForm({ ...form, [`${prefix}_contact_email`]: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Телефон *</Label>
                    <Input value={form[`${prefix}_contact_phone`] || ''} onChange={(e) => setForm({ ...form, [`${prefix}_contact_phone`]: e.target.value })} />
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Назад</Button>
                  <Button onClick={handleSubmit} disabled={!canProceed() || isSubmitting} className="flex-1">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Создать аккаунт
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CreateBusinessAccount;
