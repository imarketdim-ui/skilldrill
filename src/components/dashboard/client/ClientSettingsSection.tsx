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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, Camera, Gift, ChevronRight, Copy, Share2, Check,
  Lock, Bell, Users, UserX, MessageSquare
} from 'lucide-react';
import { z } from 'zod';

const profileSchema = z.object({
  first_name: z.string().trim().max(100).optional(),
  last_name: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(20).optional(),
  bio: z.string().trim().max(500).optional(),
  telegram: z.string().trim().max(100).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const normalizePhone = (value: string): string => {
  const digits = value.replace(/[^\d+]/g, '');
  if (digits.startsWith('8') && digits.length >= 2) return '+7' + digits.slice(1);
  return digits;
};

// ──────────────────────────────────────────────
// Avatar crop dialog (circle crop UX)
// ──────────────────────────────────────────────
interface AvatarCropDialogProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  onCrop: (blob: Blob) => void;
}

const AvatarCropDialog = ({ open, onClose, imageUrl, onCrop }: AvatarCropDialogProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const SIZE = 280;

  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.onload = () => {
      setImgEl(img);
      const fitScale = Math.max(SIZE / img.width, SIZE / img.height);
      setScale(fitScale);
      setPos({ x: (SIZE - img.width * fitScale) / 2, y: (SIZE - img.height * fitScale) / 2 });
    };
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    if (!imgEl || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.save();
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(imgEl, pos.x, pos.y, imgEl.width * scale, imgEl.height * scale);
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.save();
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.drawImage(imgEl, pos.x, pos.y, imgEl.width * scale, imgEl.height * scale);
    ctx.restore();
    ctx.strokeStyle = 'hsl(var(--primary))';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 1, 0, Math.PI * 2);
    ctx.stroke();
  }, [imgEl, pos, scale]);

  const onMouseDown = (e: React.MouseEvent) => { setDragging(true); setDragStart({ x: e.clientX - pos.x, y: e.clientY - pos.y }); };
  const onMouseMove = (e: React.MouseEvent) => { if (!dragging) return; setPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); };
  const onMouseUp = () => setDragging(false);

  const handleCrop = () => {
    if (!canvasRef.current) return;
    const out = document.createElement('canvas');
    out.width = SIZE; out.height = SIZE;
    const ctx = out.getContext('2d')!;
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    if (imgEl) ctx.drawImage(imgEl, pos.x, pos.y, imgEl.width * scale, imgEl.height * scale);
    out.toBlob(blob => { if (blob) onCrop(blob); }, 'image/jpeg', 0.92);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Выберите область фото</DialogTitle></DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <canvas
            ref={canvasRef} width={SIZE} height={SIZE}
            className="rounded-full cursor-grab active:cursor-grabbing border"
            style={{ width: SIZE, height: SIZE }}
            onMouseDown={onMouseDown} onMouseMove={onMouseMove}
            onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
          />
          <div className="w-full space-y-2">
            <Label className="text-xs text-muted-foreground">Масштаб</Label>
            <input type="range" min="0.5" max="3" step="0.05"
              value={scale} onChange={e => setScale(Number(e.target.value))}
              className="w-full accent-primary" />
          </div>
          <p className="text-xs text-muted-foreground">Перетаскивайте фото для выбора области</p>
          <div className="flex gap-2 w-full">
            <Button variant="outline" className="flex-1" onClick={onClose}>Отмена</Button>
            <Button className="flex-1" onClick={handleCrop}>Применить</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ──────────────────────────────────────────────
// Main settings component
// ──────────────────────────────────────────────
const ClientSettingsSection = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cropDialog, setCropDialog] = useState<{ open: boolean; url: string; file: File | null }>({ open: false, url: '', file: null });
  const [copiedId, setCopiedId] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({ first_name: '', last_name: '', phone: '', bio: '', telegram: '' });

  const [privacy, setPrivacy] = useState({
    allow_group_invites: true,
    show_in_search: true,
    allow_messages_from_strangers: true,
    show_phone: false,
  });
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        telegram: (profile as any)?.telegram || '',
      });
      const pv = (profile as any)?.privacy_settings;
      if (pv) setPrivacy(prev => ({ ...prev, ...pv }));
    }
  }, [profile]);

  const handleChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handlePhoneBlur = () => {
    if (formData.phone) setFormData(prev => ({ ...prev, phone: normalizePhone(prev.phone || '') }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast({ title: 'Файл слишком большой', description: 'Максимум 10 МБ', variant: 'destructive' }); return; }
    if (!file.type.startsWith('image/')) { toast({ title: 'Неверный формат', description: 'Загрузите изображение', variant: 'destructive' }); return; }
    const url = URL.createObjectURL(file);
    setCropDialog({ open: true, url, file });
    e.target.value = '';
  };

  const handleCropDone = async (blob: Blob) => {
    setCropDialog(prev => ({ ...prev, open: false }));
    if (!user) return;
    setUploadingAvatar(true);
    try {
      const path = `${user.id}/avatar-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', user.id);
      if (updateError) throw updateError;
      await refreshProfile();
      toast({ title: 'Фото обновлено' });
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
      URL.revokeObjectURL(cropDialog.url);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
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
        telegram: result.data.telegram || null,
      } as any).eq('id', user!.id);
      if (error) throw error;
      await refreshProfile();
      toast({ title: 'Профиль обновлён', description: 'Данные успешно сохранены' });
    } catch (error: any) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } finally { setIsSubmitting(false); }
  };

  const handleSavePrivacy = async () => {
    setSavingPrivacy(true);
    try {
      const { error } = await supabase.from('profiles').update({
        privacy_settings: privacy,
      } as any).eq('id', user!.id);
      if (error) throw error;
      toast({ title: 'Настройки конфиденциальности сохранены' });
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    } finally { setSavingPrivacy(false); }
  };

  const handleCopyId = () => {
    if (!profile?.skillspot_id) return;
    navigator.clipboard.writeText(profile.skillspot_id);
    setCopiedId(true);
    toast({ title: 'SkillSpot ID скопирован' });
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleShareId = () => {
    const text = `Мой SkillSpot ID: ${profile?.skillspot_id}`;
    if (navigator.share) {
      navigator.share({ title: 'SkillSpot ID', text });
    } else {
      navigator.clipboard.writeText(text);
      toast({ title: 'Скопировано для отправки' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <Card>
        <CardHeader>
          <CardTitle>Фото профиля (клиент)</CardTitle>
          <CardDescription>Это фото используется только в клиентском кабинете</CardDescription>
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
              <p className="text-xs text-muted-foreground mt-2">JPG, PNG, WebP · до 10 МБ<br />Можно выбрать область отображения</p>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
          </div>
        </CardContent>
      </Card>

      {/* SkillSpot ID */}
      <Card>
        <CardHeader>
          <CardTitle>SkillSpot ID</CardTitle>
          <CardDescription>Ваш уникальный идентификатор для приглашений и реферальной программы</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
            <span className="font-mono text-lg font-bold flex-1 select-all cursor-text">{profile?.skillspot_id || '—'}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopyId} title="Скопировать ID">
              {copiedId ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleShareId} title="Поделиться">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Можно выделить, скопировать или поделиться</p>
        </CardContent>
      </Card>

      {/* Referral block */}
      <Card className="cursor-pointer hover:border-primary/50 transition-colors border-primary/20 bg-primary/5" onClick={() => navigate('/referral')}>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Gift className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">Реферальный баланс и программа</p>
              <p className="text-sm text-muted-foreground">Приглашайте друзей — получайте бонусы на реферальный баланс</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
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
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <p className="text-xs text-muted-foreground">Email нельзя изменить</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input id="phone" type="tel" placeholder="+7 (999) 123-45-67" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} onBlur={handlePhoneBlur} className={errors.phone ? 'border-destructive' : ''} disabled={isSubmitting} />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="telegram">Telegram</Label>
              <Input id="telegram" placeholder="@username" value={formData.telegram} onChange={(e) => handleChange('telegram', e.target.value)} className={errors.telegram ? 'border-destructive' : ''} disabled={isSubmitting} />
              <p className="text-xs text-muted-foreground">Влияет на рейтинг надёжности</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">О себе</Label>
              <Textarea id="bio" placeholder="Расскажите о себе..." value={formData.bio} onChange={(e) => handleChange('bio', e.target.value)} className={errors.bio ? 'border-destructive' : ''} disabled={isSubmitting} rows={3} />
              {errors.bio && <p className="text-sm text-destructive">{errors.bio}</p>}
              <p className="text-xs text-muted-foreground">{formData.bio?.length || 0}/500</p>
            </div>

            <div className="space-y-2">
              <Label>KYC верификация</Label>
              <div className="p-3 rounded-lg border bg-muted/50 flex items-center gap-2">
                {(profile as any)?.kyc_verified
                  ? <Badge className="gap-1"><Check className="h-3 w-3" /> Верифицирован</Badge>
                  : <p className="text-sm text-muted-foreground flex items-center gap-2"><Lock className="h-4 w-4" /> Верификация увеличивает доверие мастеров к вам</p>
                }
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Сохранение...</> : 'Сохранить изменения'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" /> Конфиденциальность</CardTitle>
          <CardDescription>Управляйте тем, что видят другие пользователи</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2"><Users className="h-4 w-4" /> Добавление в групповые чаты</Label>
              <p className="text-xs text-muted-foreground">Разрешить другим добавлять вас в группы</p>
            </div>
            <Switch checked={privacy.allow_group_invites} onCheckedChange={v => setPrivacy(p => ({ ...p, allow_group_invites: v }))} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2"><Bell className="h-4 w-4" /> Отображение в поиске</Label>
              <p className="text-xs text-muted-foreground">Ваш профиль виден другим пользователям</p>
            </div>
            <Switch checked={privacy.show_in_search} onCheckedChange={v => setPrivacy(p => ({ ...p, show_in_search: v }))} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Сообщения от незнакомцев</Label>
              <p className="text-xs text-muted-foreground">Разрешить писать всем пользователям</p>
            </div>
            <Switch checked={privacy.allow_messages_from_strangers} onCheckedChange={v => setPrivacy(p => ({ ...p, allow_messages_from_strangers: v }))} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2"><UserX className="h-4 w-4" /> Показывать телефон</Label>
              <p className="text-xs text-muted-foreground">Ваш телефон виден мастерам в записях</p>
            </div>
            <Switch checked={privacy.show_phone} onCheckedChange={v => setPrivacy(p => ({ ...p, show_phone: v }))} />
          </div>
          <Button variant="outline" className="w-full" onClick={handleSavePrivacy} disabled={savingPrivacy}>
            {savingPrivacy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Сохранить настройки конфиденциальности
          </Button>
        </CardContent>
      </Card>

      {/* Avatar crop dialog */}
      <AvatarCropDialog
        open={cropDialog.open}
        onClose={() => { setCropDialog(p => ({ ...p, open: false })); URL.revokeObjectURL(cropDialog.url); }}
        imageUrl={cropDialog.url}
        onCrop={handleCropDone}
      />
    </div>
  );
};

export default ClientSettingsSection;
