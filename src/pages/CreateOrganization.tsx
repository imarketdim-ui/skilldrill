import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Building2, Loader2 } from 'lucide-react';
import { z } from 'zod';

const organizationSchema = z.object({
  name: z.string().trim().min(2, 'Минимум 2 символа').max(200, 'Максимум 200 символов'),
  inn: z.string().trim().regex(/^(\d{10}|\d{12})$/, 'ИНН должен содержать 10 или 12 цифр'),
  legal_form: z.enum(['ip', 'ooo', 'zao', 'oao', 'self_employed', 'other'], {
    required_error: 'Выберите правовую форму',
  }),
  description: z.string().trim().max(1000, 'Максимум 1000 символов').optional(),
  contact_email: z.string().trim().email('Некорректный email').max(255).optional().or(z.literal('')),
  contact_phone: z.string().trim().max(20, 'Максимум 20 символов').optional(),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

const legalForms = [
  { value: 'ip', label: 'ИП (Индивидуальный предприниматель)' },
  { value: 'ooo', label: 'ООО (Общество с ограниченной ответственностью)' },
  { value: 'zao', label: 'ЗАО (Закрытое акционерное общество)' },
  { value: 'oao', label: 'ОАО (Открытое акционерное общество)' },
  { value: 'self_employed', label: 'Самозанятый' },
  { value: 'other', label: 'Другое' },
];

const CreateOrganization = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [addSelfAsMaster, setAddSelfAsMaster] = useState(false);
  const [formData, setFormData] = useState<Partial<OrganizationFormData>>({
    name: '',
    inn: '',
    legal_form: undefined,
    description: '',
    contact_email: profile?.email || '',
    contact_phone: profile?.phone || '',
  });

  if (!loading && !user) {
    navigate('/auth');
    return null;
  }

  const handleChange = (field: keyof OrganizationFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const result = organizationSchema.safeParse(formData);
    
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          newErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('organization_requests')
        .insert({
          requester_id: user!.id,
          name: result.data.name,
          inn: result.data.inn,
          legal_form: result.data.legal_form,
          description: result.data.description || null,
          contact_email: result.data.contact_email || null,
          contact_phone: result.data.contact_phone || null,
        });

      if (error) throw error;

      // If user opted in — ensure master role + master_profile exist
      if (addSelfAsMaster) {
        try {
          // Check existing role
          const { data: existingRole } = await supabase
            .from('user_roles')
            .select('id')
            .eq('user_id', user!.id)
            .eq('role', 'master')
            .eq('is_active', true)
            .maybeSingle();

          if (!existingRole) {
            await supabase.rpc('assign_role_on_account_creation', {
              _user_id: user!.id,
              _role: 'master',
            });
          }

          // Check existing master profile
          const { data: existingProfile } = await supabase
            .from('master_profiles')
            .select('id')
            .eq('user_id', user!.id)
            .maybeSingle();

          if (!existingProfile) {
            const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Мастер';
            await supabase.from('master_profiles').insert({
              user_id: user!.id,
              display_name: displayName,
              is_active: true,
            });
          }
        } catch (e: any) {
          console.warn('Add self as master failed:', e?.message);
        }
      }

      toast({
        title: 'Заявка отправлена',
        description: addSelfAsMaster
          ? 'После одобрения вы будете добавлены как мастер'
          : 'Ваша заявка на создание организации отправлена на рассмотрение',
      });

      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error submitting organization request:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось отправить заявку',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container-wide py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад в кабинет
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Создание организации</h1>
              <p className="text-muted-foreground">
                Заполните данные для подачи заявки
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Данные организации</CardTitle>
              <CardDescription>
                После отправки заявки администратор платформы рассмотрит её и примет решение
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Название организации *</Label>
                  <Input
                    id="name"
                    placeholder="ООО «Салон красоты»"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className={errors.name ? 'border-destructive' : ''}
                    disabled={isSubmitting}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name}</p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="inn">ИНН *</Label>
                    <Input
                      id="inn"
                      placeholder="1234567890"
                      value={formData.inn}
                      onChange={(e) => handleChange('inn', e.target.value.replace(/\D/g, ''))}
                      className={errors.inn ? 'border-destructive' : ''}
                      disabled={isSubmitting}
                      maxLength={12}
                    />
                    {errors.inn && (
                      <p className="text-sm text-destructive">{errors.inn}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Правовая форма *</Label>
                    <Select
                      value={formData.legal_form}
                      onValueChange={(value) => handleChange('legal_form', value)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className={errors.legal_form ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Выберите форму" />
                      </SelectTrigger>
                      <SelectContent>
                        {legalForms.map((form) => (
                          <SelectItem key={form.value} value={form.value}>
                            {form.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.legal_form && (
                      <p className="text-sm text-destructive">{errors.legal_form}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Описание деятельности</Label>
                  <Textarea
                    id="description"
                    placeholder="Опишите вашу деятельность и услуги..."
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    className={errors.description ? 'border-destructive' : ''}
                    disabled={isSubmitting}
                    rows={4}
                  />
                  {errors.description && (
                    <p className="text-sm text-destructive">{errors.description}</p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contact_email">Контактный email</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      placeholder="contact@company.ru"
                      value={formData.contact_email}
                      onChange={(e) => handleChange('contact_email', e.target.value)}
                      className={errors.contact_email ? 'border-destructive' : ''}
                      disabled={isSubmitting}
                    />
                    {errors.contact_email && (
                      <p className="text-sm text-destructive">{errors.contact_email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_phone">Контактный телефон</Label>
                    <Input
                      id="contact_phone"
                      type="tel"
                      placeholder="+7 (999) 123-45-67"
                      value={formData.contact_phone}
                      onChange={(e) => handleChange('contact_phone', e.target.value)}
                      className={errors.contact_phone ? 'border-destructive' : ''}
                      disabled={isSubmitting}
                    />
                    {errors.contact_phone && (
                      <p className="text-sm text-destructive">{errors.contact_phone}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30">
                  <Checkbox
                    id="add-self-master"
                    checked={addSelfAsMaster}
                    onCheckedChange={(v) => setAddSelfAsMaster(!!v)}
                    disabled={isSubmitting}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <Label htmlFor="add-self-master" className="cursor-pointer text-sm font-medium">
                      Я сам буду оказывать услуги в этой организации
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      После одобрения заявки вам автоматически будет создан профиль мастера
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/dashboard')}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    Отмена
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 btn-primary"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Отправка...
                      </>
                    ) : (
                      'Отправить заявку'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default CreateOrganization;
