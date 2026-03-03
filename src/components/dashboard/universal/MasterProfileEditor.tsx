import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, X, Plus, Upload, Eye, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import MapPicker from '@/components/marketplace/MapPicker';
import { CategoryConfig } from './categoryConfig';

interface Props {
  masterProfile: any;
  config: CategoryConfig;
  onPhotosChanged?: () => void;
}

const MasterProfileEditor = ({ masterProfile, config, onPhotosChanged }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

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
  }, [masterProfile?.id]);

  // Warn on unsaved changes
  useEffect(() => {
    const isDirty = JSON.stringify(form) !== initialFormJson;
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ''; }
    };
    if (isDirty) window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [form, initialFormJson]);

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
      toast({ title: 'Профиль сохранён' });
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
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
        const urls: string[] = [...(masterProfile?.[field] || [])];
        for (const file of files) {
          const ext = file.name.split('.').pop();
          const path = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
          const { error } = await supabase.storage.from(bucket).upload(path, file);
          if (error) throw error;
          const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
          urls.push(urlData.publicUrl);
        }
        await supabase.from('master_profiles').update({ [field]: urls }).eq('user_id', user.id);
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
    const updated = (masterProfile?.[field] || []).filter((u: string) => u !== url);
    await supabase.from('master_profiles').update({ [field]: updated }).eq('user_id', user.id);
    toast({ title: 'Фото удалено' });
    onPhotosChanged?.();
  };

  const PhotoGrid = ({ field, bucket, label }: { field: 'work_photos' | 'interior_photos'; bucket: string; label: string }) => {
    const photos: string[] = masterProfile?.[field] || [];
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
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
          <button className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2" onClick={() => setLightboxUrl(null)}>
            <X className="h-6 w-6" />
          </button>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Редактировать профиль</h2>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Сохранить
          </Button>
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
          <CardHeader><CardTitle className="text-lg">Адрес и город</CardTitle></CardHeader>
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

        <div className="flex justify-end">
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
    </>
  );
};

export default MasterProfileEditor;
