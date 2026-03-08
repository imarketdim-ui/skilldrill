import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Camera, Gift, ChevronRight } from 'lucide-react';

import { z } from 'zod';

const profileSchema = z.object({
  first_name: z.string().trim().max(100, 'Максимум 100 символов').optional(),
  last_name: z.string().trim().max(100, 'Максимум 100 символов').optional(),
  phone: z.string().trim().max(20, 'Максимум 20 символов').optional(),
  bio: z.string().trim().max(500, 'Максимум 500 символов').optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const normalizePhone = (value: string): string => {
  const digits = value.replace(/[^\d+]/g, '');
  if (digits.startsWith('8') && digits.length >= 2) return '+7' + digits.slice(1);
  return digits;
};

const ClientSettingsSection = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<ProfileFormData>({
    first_name: '', last_name: '', phone: '', bio: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
      });
    }
  }, [profile]);

  const handleChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handlePhoneBlur = () => {
    if (formData.phone) setFormData(prev => ({ ...prev, phone: normalizePhone(prev.phone || '') }));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast({ title: 'Файл слишком большой', description: 'Максимум 5 МБ', variant: 'destructive' }); return; }
    if (!file.type.startsWith('image/')) { toast({ title: 'Неверный формат', description: 'Загрузите изображение', variant: 'destructive' }); return; }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', user.id);
      if (updateError) throw updateError;
      await refreshProfile();
      toast({ title: 'Фото обновлено' });
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    } finally { setUploadingAvatar(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = profileSchema.safeParse(formData);
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach(err => { if (err.path[0]) newErrors[err.path[0] as string] = err.message; });
      setErrors(newErrors);
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('profiles').update({
        first_name: result.data.first_name || null,
        last_name: result.data.last_name || null,
        phone: result.data.phone ? normalizePhone(result.data.phone) : null,
        bio: result.data.bio || null,
      }).eq('id', user!.id);
      if (error) throw error;
      await refreshProfile();
      toast({ title: 'Профиль обновлён', description: 'Ваши данные успешно сохранены' });
    } catch (error: any) {
      toast({ title: 'Ошибка', description: error.message || 'Не удалось обновить профиль', variant: 'destructive' });
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <Card>
        <CardHeader>
          <CardTitle>Фото профиля</CardTitle>
          <CardDescription>Ваше фото будет видно другим пользователям</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {profile?.first_name?.[0] || profile?.email?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}>
                {uploadingAvatar ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}
                {uploadingAvatar ? 'Загрузка...' : 'Загрузить фото'}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">JPG, PNG, WebP · до 5 МБ</p>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
        </CardContent>
      </Card>

      {/* Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle>Личные данные</CardTitle>
          <CardDescription>Обновите вашу контактную информацию</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">Имя</Label>
                <Input id="first_name" placeholder="Иван" value={formData.first_name} onChange={(e) => handleChange('first_name', e.target.value)} className={errors.first_name ? 'border-destructive' : ''} disabled={isSubmitting} />
                {errors.first_name && <p className="text-sm text-destructive">{errors.first_name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Фамилия</Label>
                <Input id="last_name" placeholder="Иванов" value={formData.last_name} onChange={(e) => handleChange('last_name', e.target.value)} className={errors.last_name ? 'border-destructive' : ''} disabled={isSubmitting} />
                {errors.last_name && <p className="text-sm text-destructive">{errors.last_name}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={profile?.email || ''} disabled className="bg-muted" />
              <p className="text-sm text-muted-foreground">Email нельзя изменить</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input id="phone" type="tel" placeholder="+7 (999) 123-45-67" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} onBlur={handlePhoneBlur} className={errors.phone ? 'border-destructive' : ''} disabled={isSubmitting} />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">О себе</Label>
              <Textarea id="bio" placeholder="Расскажите о себе..." value={formData.bio} onChange={(e) => handleChange('bio', e.target.value)} className={errors.bio ? 'border-destructive' : ''} disabled={isSubmitting} rows={4} />
              {errors.bio && <p className="text-sm text-destructive">{errors.bio}</p>}
              <p className="text-sm text-muted-foreground">{formData.bio?.length || 0}/500 символов</p>
            </div>

            <div className="space-y-2">
              <Label>SkillSpot ID</Label>
              <Input value={profile?.skillspot_id || ''} disabled className="bg-muted font-mono" />
              <p className="text-sm text-muted-foreground">Ваш уникальный ID для приглашений</p>
            </div>

            <div className="space-y-2">
              <Label>KYC верификация</Label>
              <div className="p-3 rounded-lg border bg-muted/50">
                {(profile as any)?.kyc_verified ? (
                  <p className="text-sm text-primary font-medium">✓ Верифицирован</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Верификация положительно влияет на вашу репутацию. Пока недоступна.</p>
                )}
              </div>
            </div>

          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Referral program teaser */}
      <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/referral')}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Gift className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">Реферальная программа</p>
              <p className="text-sm text-muted-foreground">Приглашайте друзей и получайте бонусы</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientSettingsSection;
