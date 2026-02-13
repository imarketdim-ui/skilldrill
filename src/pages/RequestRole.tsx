import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Wrench, Building2, Globe } from 'lucide-react';

const legalForms = [
  { value: 'ip', label: 'ИП' },
  { value: 'ooo', label: 'ООО' },
  { value: 'zao', label: 'ЗАО' },
  { value: 'oao', label: 'ОАО' },
  { value: 'self_employed', label: 'Самозанятый' },
  { value: 'other', label: 'Другое' },
];

const RequestRole = () => {
  const [searchParams] = useSearchParams();
  const requestType = searchParams.get('type') || 'master';
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    supabase.from('service_categories').select('*').eq('is_active', true).then(({ data }) => {
      setCategories(data || []);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('role_requests').insert({
        requester_id: user!.id,
        request_type: requestType as any,
        category_id: form.category_id || null,
        promo_code: form.promo_code || null,
        business_name: form.business_name || null,
        business_address: form.business_address || null,
        business_inn: form.business_inn || null,
        business_legal_form: form.business_legal_form || null,
        business_description: form.business_description || null,
        business_contact_email: form.business_contact_email || null,
        business_contact_phone: form.business_contact_phone || null,
        network_name: form.network_name || null,
        network_description: form.network_description || null,
      });
      if (error) throw error;
      toast({ title: 'Заявка отправлена', description: 'Администратор рассмотрит вашу заявку' });
      navigate('/dashboard');
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const icons: Record<string, any> = { master: Wrench, business: Building2, network: Globe };
  const titles: Record<string, string> = { master: 'Стать мастером', business: 'Создать бизнес', network: 'Создать сеть' };
  const Icon = icons[requestType] || Wrench;

  return (
    <div className="min-h-screen bg-background">
      <div className="container-wide py-8 max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Назад
        </Button>
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-primary/10 rounded-xl"><Icon className="h-8 w-8 text-primary" /></div>
          <h1 className="text-2xl font-bold">{titles[requestType]}</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Заявка</CardTitle>
            <CardDescription>После отправки администратор рассмотрит заявку</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {requestType === 'master' && (
                <>
                  <div className="space-y-2">
                    <Label>Направление работы</Label>
                    <Select onValueChange={(v) => setForm({ ...form, category_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Выберите категорию" /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Промокод (необязательно)</Label>
                    <Input placeholder="Промокод для расширенного тестового периода" value={form.promo_code || ''} onChange={(e) => setForm({ ...form, promo_code: e.target.value })} />
                    <p className="text-xs text-muted-foreground">14 дней бесплатно, с промокодом — 45 дней</p>
                  </div>
                </>
              )}
              {requestType === 'business' && (
                <>
                  <div className="space-y-2"><Label>Название *</Label><Input required value={form.business_name || ''} onChange={(e) => setForm({ ...form, business_name: e.target.value })} /></div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2"><Label>ИНН *</Label><Input required value={form.business_inn || ''} onChange={(e) => setForm({ ...form, business_inn: e.target.value.replace(/\D/g, '') })} maxLength={12} /></div>
                    <div className="space-y-2">
                      <Label>Правовая форма</Label>
                      <Select onValueChange={(v) => setForm({ ...form, business_legal_form: v })}>
                        <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                        <SelectContent>{legalForms.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2"><Label>Адрес</Label><Input value={form.business_address || ''} onChange={(e) => setForm({ ...form, business_address: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Описание</Label><Textarea value={form.business_description || ''} onChange={(e) => setForm({ ...form, business_description: e.target.value })} /></div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.business_contact_email || ''} onChange={(e) => setForm({ ...form, business_contact_email: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Телефон</Label><Input value={form.business_contact_phone || ''} onChange={(e) => setForm({ ...form, business_contact_phone: e.target.value })} /></div>
                  </div>
                </>
              )}
              {requestType === 'network' && (
                <>
                  <div className="space-y-2"><Label>Название сети *</Label><Input required value={form.network_name || ''} onChange={(e) => setForm({ ...form, network_name: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Описание</Label><Textarea value={form.network_description || ''} onChange={(e) => setForm({ ...form, network_description: e.target.value })} /></div>
                </>
              )}
              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate('/dashboard')} className="flex-1">Отмена</Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Отправка...</> : 'Отправить заявку'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RequestRole;
