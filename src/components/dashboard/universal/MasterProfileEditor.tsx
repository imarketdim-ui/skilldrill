import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getStorageReference } from '@/lib/storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, X, Plus, Upload, Eye, MapPin, Undo2, Camera, ZoomIn } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import MapPicker from '@/components/marketplace/MapPicker';
import { CategoryConfig } from './categoryConfig';


interface Props {
  masterProfile: any;
  config: CategoryConfig;
  onPhotosChanged?: () => void;
  onClose?: () => void;
}

const MasterProfileEditor = ({ masterProfile, config, onPhotosChanged, onClose }: Props) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [masterAvatarUrl, setMasterAvatarUrl] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  // Local photo state for optimistic display
  const [localWorkPhotos, setLocalWorkPhotos] = useState<string[]>([]);
  const [localInteriorPhotos, setLocalInteriorPhotos] = useState<string[]>([]);

  const [form, setForm] = useState({
    description: '',
    short_description: '',
    workplace_description: '',
    address: '',
    city: '',
    latitude: null as number | null,
    longitude: null as number | null,
    hashtags: [] as string[],
    social_links: { telegram: '', vk: '', instagram: '', youtube: '' } as Record<string, string>,
  });
  const [hashtagInput, setHashtagInput] = useState('');
  const [initialFormJson, setInitialFormJson] = useState('');

  useEffect(() => {
    if (!masterProfile?.id) return;
    const sl = (masterProfile.social_links as any) || {};
    const newForm = {
      description: masterProfile.description || '',
      short_description: (masterProfile as any).short_description || '',
      workplace_description: masterProfile.workplace_description || '',
      address: masterProfile.address || '',
      city: masterProfile.city || '',
      latitude: masterProfile.latitude,
      longitude: masterProfile.longitude,
      hashtags: masterProfile.hashtags || [],
      social_links: {
        telegram: sl.telegram || '',
        vk: sl.vk || '',
        instagram: sl.instagram || '',
        youtube: sl.youtube || '',
      },
    };
    setForm(newForm);
    setInitialFormJson(JSON.stringify(newForm));
    setLocalWorkPhotos(masterProfile.work_photos || []);
    setLocalInteriorPhotos(masterProfile.interior_photos || []);
    setMasterAvatarUrl(masterProfile.avatar_url || null);
  }, [masterProfile?.id]);

  // Avatar crop state
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropScale, setCropScale] = useState(1);
  const [cropOffsetX, setCropOffsetX] = useState(50);
  const [cropOffsetY, setCropOffsetY] = useState(50);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingAvatarFile(file);
    const url = URL.createObjectURL(file);
    setCropImageSrc(url);
    setCropScale(1);
    setCropOffsetX(50);
    setCropOffsetY(50);
    setCropDialogOpen(true);
    e.target.value = '';
  };

  const handleCropConfirm = useCallback(async () => {
    if (!pendingAvatarFile || !user || !cropImageSrc) return;
    setUploadingAvatar(true);
    try {
      // Draw cropped image on canvas
      const canvas = document.createElement('canvas');
      const size = 400;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;

      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = cropImageSrc;
      });

      const scale = cropScale;
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const ox = (cropOffsetX / 100) * (drawW - size);
      const oy = (cropOffsetY / 100) * (drawH - size);

      ctx.drawImage(img, -ox, -oy, drawW, drawH);

      const blob = await new Promise<Blob>((resolve) => canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.9));
      const path = `${user.id}/master-avatar-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      await supabase.from('master_profiles').update({ avatar_url: urlData.publicUrl } as any).eq('user_id', user.id);
      setMasterAvatarUrl(urlData.publicUrl);
      toast({ title: 'Фото мастерского кабинета обновлено' });
      onPhotosChanged?.();
      setCropDialogOpen(false);
      URL.revokeObjectURL(cropImageSrc);
      setCropImageSrc(null);
      setPendingAvatarFile(null);
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    } finally { setUploadingAvatar(false); }
  }, [pendingAvatarFile, user, cropImageSrc, cropScale, cropOffsetX, cropOffsetY]);

  const isDirty = JSON.stringify(form) !== initialFormJson;

  // Warn on unsaved changes (browser close)
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ''; }
    };
    if (isDirty) window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('master_profiles').update({
        description: form.description || null,
        short_description: form.short_description || null,
        workplace_description: form.workplace_description || null,
        address: form.address || null,
        city: form.city || null,
        latitude: form.latitude,
        longitude: form.longitude,
        hashtags: form.hashtags,
        social_links: form.social_links,
      }).eq('user_id', user.id);
      if (error) throw error;
      // Update initial state so dirty flag resets
      setInitialFormJson(JSON.stringify(form));
      toast({ title: 'Профиль сохранён' });
      onPhotosChanged?.();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleCancel = () => {
    if (isDirty) {
      setCancelConfirmOpen(true);
    } else {
      onClose?.();
    }
  };

  const confirmCancel = () => {
    setCancelConfirmOpen(false);
    // Reset form to initial
    if (masterProfile) {
      const sl = (masterProfile.social_links as any) || {};
      setForm({
        description: masterProfile.description || '',
        short_description: (masterProfile as any).short_description || '',
        workplace_description: masterProfile.workplace_description || '',
        address: masterProfile.address || '',
        city: masterProfile.city || '',
        latitude: masterProfile.latitude,
        longitude: masterProfile.longitude,
        hashtags: masterProfile.hashtags || [],
        social_links: { telegram: sl.telegram || '', vk: sl.vk || '', instagram: sl.instagram || '', youtube: sl.youtube || '' },
      });
    }
    onClose?.();
  };

  const addHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, '');
    if (!tag || form.hashtags.includes(tag)) return;
    setForm(p => ({ ...p, hashtags: [...p.hashtags, tag] }));
    setHashtagInput('');
  };

  const removeHashtag = (tag: string) => {
    setForm(p => ({ ...p, hashtags: p.hashtags.filter(t => t !== tag) }));
  };

  const handleUploadPhoto = async (field: 'work_photos' | 'interior_photos', bucket: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async (e: any) => {
      const files = Array.from(e.target.files || []) as File[];
      if (!files.length || !user) return;
      setUploading(true);
      try {
        const currentPhotos = field === 'work_photos' ? [...localWorkPhotos] : [...localInteriorPhotos];
        const newRefs: string[] = [];
        for (const file of files) {
          const ext = file.name.split('.').pop();
          const path = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
          const { error } = await supabase.storage.from(bucket).upload(path, file);
          if (error) throw error;
          const ref = getStorageReference(bucket, path);
          newRefs.push(ref);
        }
        const updatedPhotos = [...currentPhotos, ...newRefs];
        await supabase.from('master_profiles').update({ [field]: updatedPhotos }).eq('user_id', user.id);
        // Optimistic update - show photos immediately
        if (field === 'work_photos') {
          setLocalWorkPhotos(updatedPhotos);
        } else {
          setLocalInteriorPhotos(updatedPhotos);
        }
        toast({ title: 'Фото загружены' });
        onPhotosChanged?.();
      } catch (err: any) {
        toast({ title: 'Ошибка загрузки', description: err.message, variant: 'destructive' });
      }
      setUploading(false);
    };
    input.click();
  };

  const handleRemovePhoto = async (field: 'work_photos' | 'interior_photos', url: string) => {
    if (!user) return;
    const currentPhotos = field === 'work_photos' ? localWorkPhotos : localInteriorPhotos;
    const updated = currentPhotos.filter((u: string) => u !== url);
    await supabase.from('master_profiles').update({ [field]: updated }).eq('user_id', user.id);
    // Optimistic update
    if (field === 'work_photos') {
      setLocalWorkPhotos(updated);
    } else {
      setLocalInteriorPhotos(updated);
    }
    toast({ title: 'Фото удалено' });
    onPhotosChanged?.();
  };

  const PhotoGrid = ({ field, bucket, label }: { field: 'work_photos' | 'interior_photos'; bucket: string; label: string }) => {
    const photos = field === 'work_photos' ? localWorkPhotos : localInteriorPhotos;
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        {photos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {photos.map((url, i) => (
              <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border group">
                <img src={url} alt="" className="w-full h-full object-cover cursor-pointer" onClick={() => setLightboxUrl(url)} />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <button onClick={() => setLightboxUrl(url)} className="p-1 rounded bg-white/20"><Eye className="h-3 w-3 text-white" /></button>
                  <button onClick={() => handleRemovePhoto(field, url)} className="p-1 rounded bg-destructive/80"><X className="h-3 w-3 text-white" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
        <Button variant="outline" size="sm" onClick={() => handleUploadPhoto(field, bucket)} disabled={uploading}>
          {uploading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
          Загрузить
        </Button>
      </div>
    );
  };

  return (
    <>
      {lightboxUrl && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
          <button className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2" onClick={() => setLightboxUrl(null)}>
            <X className="h-6 w-6" />
          </button>
        </div>
      )}

      <div className="space-y-6">
        {/* Master cabinet avatar — separate from client avatar */}
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Camera className="h-5 w-5" /> Фото мастерского кабинета</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={masterAvatarUrl || profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {`${(profile?.first_name || '')[0] || ''}${(profile?.last_name || '')[0] || ''}`.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <Button variant="outline" size="sm" onClick={() => avatarFileRef.current?.click()} disabled={uploadingAvatar}>
                  {uploadingAvatar ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                  {uploadingAvatar ? 'Загрузка...' : 'Загрузить фото'}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">Отдельное фото для мастерского кабинета.<br />Если не задано — используется фото клиентского кабинета.</p>
                <input ref={avatarFileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFileSelect} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Crop dialog */}
        <Dialog open={cropDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setCropDialogOpen(false);
            if (cropImageSrc) { URL.revokeObjectURL(cropImageSrc); setCropImageSrc(null); }
            setPendingAvatarFile(null);
          }
        }}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Выберите область отображения</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="relative w-64 h-64 mx-auto rounded-full overflow-hidden border-2 border-primary bg-muted">
                {cropImageSrc && (
                  <img
                    src={cropImageSrc}
                    alt="Предпросмотр"
                    className="absolute"
                    style={{
                      width: `${cropScale * 100}%`,
                      height: `${cropScale * 100}%`,
                      objectFit: 'cover',
                      left: `${-(cropOffsetX / 100) * (cropScale * 100 - 100)}%`,
                      top: `${-(cropOffsetY / 100) * (cropScale * 100 - 100)}%`,
                    }}
                    draggable={false}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1"><ZoomIn className="h-3 w-3" /> Масштаб</Label>
                <Slider value={[cropScale]} onValueChange={([v]) => setCropScale(v)} min={1} max={3} step={0.05} />
              </div>
              {cropScale > 1 && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">Горизонтально</Label>
                    <Slider value={[cropOffsetX]} onValueChange={([v]) => setCropOffsetX(v)} min={0} max={100} step={1} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Вертикально</Label>
                    <Slider value={[cropOffsetY]} onValueChange={([v]) => setCropOffsetY(v)} min={0} max={100} step={1} />
                  </div>
                </>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setCropDialogOpen(false); if (cropImageSrc) URL.revokeObjectURL(cropImageSrc); setCropImageSrc(null); }}>Отмена</Button>
                <Button className="flex-1" onClick={handleCropConfirm} disabled={uploadingAvatar}>
                  {uploadingAvatar ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                  Сохранить
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-2xl font-bold">Редактировать профиль</h2>
          <div className="flex items-center gap-2">
            {onClose && (
              <Button variant="outline" onClick={handleCancel}>
                <Undo2 className="h-4 w-4 mr-2" /> Отменить
              </Button>
            )}
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Сохранить
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-lg">Описание</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Краткое описание</Label>
              <Input value={form.short_description} onChange={e => setForm(p => ({ ...p, short_description: e.target.value }))} placeholder="Кратко о себе (1-2 предложения для карточки)" maxLength={200} />
              <p className="text-xs text-muted-foreground">{form.short_description.length}/200</p>
            </div>
            <div className="space-y-2">
              <Label>О себе</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Расскажите о своём опыте и специализации..." rows={4} />
            </div>
            <div className="space-y-2">
              <Label>Описание рабочего места</Label>
              <Textarea value={form.workplace_description} onChange={e => setForm(p => ({ ...p, workplace_description: e.target.value }))} placeholder="Опишите условия работы..." rows={3} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Место работы — адрес и город</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Город</Label>
              <Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="Москва" />
            </div>
            <div className="space-y-2">
              <Label>Адрес</Label>
              <Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="ул. Примерная, д. 1" />
            </div>
            <Button variant="outline" size="sm" onClick={() => setMapOpen(true)}>
              <MapPin className="h-4 w-4 mr-1" /> Выбрать на карте
            </Button>
            <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
              Хотите принимать сотрудников, вести кассу и склад?{' '}
              <a href="/subscription" className="text-primary font-medium underline-offset-2 hover:underline">
                Перейдите на тариф «Про»
              </a>
              .
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Хэштеги</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {form.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.hashtags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    #{tag}
                    <button onClick={() => removeHashtag(tag)}><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input value={hashtagInput} onChange={e => setHashtagInput(e.target.value)} placeholder="Новый хэштег"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addHashtag(); } }}
              />
              <Button variant="outline" size="sm" onClick={addHashtag}><Plus className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Фотографии</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <PhotoGrid field="work_photos" bucket="portfolio" label="Фото работ" />
            <PhotoGrid field="interior_photos" bucket="interiors" label="Фото интерьера / рабочего места" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Социальные сети</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Telegram</Label>
              <Input value={form.social_links.telegram} onChange={e => setForm(p => ({ ...p, social_links: { ...p.social_links, telegram: e.target.value } }))} placeholder="username" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">VK</Label>
              <Input value={form.social_links.vk} onChange={e => setForm(p => ({ ...p, social_links: { ...p.social_links, vk: e.target.value } }))} placeholder="id или username" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Instagram</Label>
              <Input value={form.social_links.instagram} onChange={e => setForm(p => ({ ...p, social_links: { ...p.social_links, instagram: e.target.value } }))} placeholder="username" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">YouTube</Label>
              <Input value={form.social_links.youtube} onChange={e => setForm(p => ({ ...p, social_links: { ...p.social_links, youtube: e.target.value } }))} placeholder="URL канала" />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          {onClose && (
            <Button variant="outline" onClick={handleCancel} size="lg">
              <Undo2 className="h-4 w-4 mr-2" /> Отменить
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Сохранить все изменения
          </Button>
        </div>
      </div>

      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Выберите адрес на карте</DialogTitle></DialogHeader>
          <MapPicker
            latitude={form.latitude || 55.7558}
            longitude={form.longitude || 37.6173}
            address={form.address}
            onLocationChange={(lat, lng, address) => {
              setForm(p => ({ ...p, latitude: lat, longitude: lng, address }));
              setMapOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={cancelConfirmOpen}
        onOpenChange={setCancelConfirmOpen}
        title="Несохранённые изменения"
        description="У вас есть несохранённые изменения. Если вы закроете окно, все изменения будут потеряны."
        confirmLabel="Закрыть без сохранения"
        cancelLabel="Вернуться к редактированию"
        onConfirm={confirmCancel}
        variant="destructive"
      />
    </>
  );
};

export default MasterProfileEditor;
