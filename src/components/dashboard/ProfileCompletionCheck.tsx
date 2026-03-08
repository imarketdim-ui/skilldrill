import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getStorageReference, resolveStorageUrls } from '@/lib/storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  AlertTriangle, CheckCircle, MapPin, FileText, Image, Hash,
  Upload, X, Plus, Loader2, Camera, Award, Pencil, Eye
} from 'lucide-react';
import MapPicker from '@/components/marketplace/MapPicker';
import TagDropdown from '@/components/marketplace/TagDropdown';
import SignedImage from '@/components/ui/signed-image';

interface ProfileCompletionCheckProps {
  entityType: 'master' | 'business' | 'network';
  entityData: any;
  onProfileUpdated: () => void;
}

interface CompletionItem {
  key: string;
  label: string;
  required: boolean;
  completed: boolean;
  icon: any;
}

const ProfileCompletionCheck = ({ entityType, entityData, onProfileUpdated }: ProfileCompletionCheckProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Dialog states
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [descriptionDialogOpen, setDescriptionDialogOpen] = useState(false);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [hashtagDialogOpen, setHashtagDialogOpen] = useState(false);
  const [certificateDialogOpen, setCertificateDialogOpen] = useState(false);

  // Form states
  const [addressValue, setAddressValue] = useState(entityData?.address || '');
  const [descriptionValue, setDescriptionValue] = useState(entityData?.description || '');
  const [newService, setNewService] = useState({ name: '', price: '', duration_minutes: '60' });
  const [certificateComment, setCertificateComment] = useState('');

  useEffect(() => {
    if (user && entityType === 'master' && entityData) {
      supabase.from('services').select('*').eq('master_id', user.id).then(({ data }) => setServices(data || []));
    } else if (entityType === 'business' && entityData) {
      supabase.from('services').select('*').eq('organization_id', entityData.id).then(({ data }) => setServices(data || []));
    }
  }, [user, entityType, entityData]);

  useEffect(() => {
    setAddressValue(entityData?.address || '');
    setDescriptionValue(entityData?.description || '');
  }, [entityData]);

  const getCompletionItems = (): CompletionItem[] => {
    const items: CompletionItem[] = [
      { key: 'address', label: 'Адрес', required: true, completed: !!entityData?.address, icon: MapPin },
    ];
    // Services only for masters — organizations add services in their dashboard
    if (entityType === 'master') {
      items.push({ key: 'services', label: 'Услуги (мин. 1)', required: true, completed: services.length > 0, icon: FileText });
    }
    items.push(
      { key: 'description', label: 'Описание', required: false, completed: !!entityData?.description, icon: FileText },
      { key: 'interior_photos', label: 'Фото интерьера/экстерьера', required: false, completed: (entityData?.interior_photos?.length || 0) > 0, icon: Camera },
      { key: 'work_photos', label: 'Фото работ', required: false, completed: (entityData?.work_photos?.length || 0) > 0, icon: Image },
      { key: 'certificates', label: 'Сертификаты и референсы', required: false, completed: (entityData?.certificate_photos?.length || 0) > 0, icon: Award },
      { key: 'hashtags', label: 'Хэштеги', required: false, completed: (entityData?.hashtags?.length || 0) > 0, icon: Hash },
    );
    return items;
  };

  const items = getCompletionItems();
  const requiredItems = items.filter(i => i.required);
  const completedRequired = requiredItems.filter(i => i.completed).length;
  const allRequiredDone = completedRequired === requiredItems.length;
  const completedTotal = items.filter(i => i.completed).length;
  const progress = Math.round((completedTotal / items.length) * 100);

  const moderationStatus = entityData?.moderation_status || 'draft';
  const showBanner = moderationStatus === 'draft' || moderationStatus === 'rejected';

  const getTable = () => {
    if (entityType === 'master') return 'master_profiles';
    if (entityType === 'business') return 'business_locations';
    return 'networks';
  };

  const getIdField = () => entityType === 'master' ? 'user_id' : 'id';
  const getIdValue = () => entityType === 'master' ? user?.id : entityData?.id;

  const handleSaveField = async (field: string, value: any) => {
    setSaving(true);
    try {
      const { error } = await supabase.from(getTable() as any).update({ [field]: value }).eq(getIdField(), getIdValue());
      if (error) throw error;
      toast({ title: 'Сохранено' });
      onProfileUpdated();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleSaveAddressFromMap = async (address: string, lat: number, lng: number) => {
    setSaving(true);
    try {
      const updates: any = { address, latitude: lat, longitude: lng };
      const { error } = await supabase.from(getTable() as any).update(updates).eq(getIdField(), getIdValue());
      if (error) throw error;
      toast({ title: 'Адрес сохранён' });
      onProfileUpdated();
      setAddressDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleSaveDescription = async () => {
    await handleSaveField('description', descriptionValue);
    setDescriptionDialogOpen(false);
  };

  const handleAddService = async () => {
    if (!newService.name || !newService.price) {
      toast({ title: 'Заполните название и цену', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const insertData: any = {
        name: newService.name,
        price: Number(newService.price),
        duration_minutes: Number(newService.duration_minutes) || 60,
        is_active: true,
      };
      if (entityType === 'master') {
        insertData.master_id = user?.id;
        insertData.category_id = entityData?.category_id;
      } else {
        insertData.organization_id = entityData?.id;
      }
      const { error } = await supabase.from('services').insert(insertData);
      if (error) throw error;
      setNewService({ name: '', price: '', duration_minutes: '60' });
      const { data } = entityType === 'master'
        ? await supabase.from('services').select('*').eq('master_id', user?.id)
        : await supabase.from('services').select('*').eq('organization_id', entityData?.id);
      setServices(data || []);
      toast({ title: 'Услуга добавлена' });
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const [deleteServiceId, setDeleteServiceId] = useState<string | null>(null);

  const handleDeleteService = async (serviceId: string) => {
    await supabase.from('services').delete().eq('id', serviceId);
    setServices(prev => prev.filter(s => s.id !== serviceId));
    setDeleteServiceId(null);
  };

  const handleUploadPhoto = async (bucket: string, field: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async (e: any) => {
      const files = Array.from(e.target.files || []) as File[];
      if (files.length === 0) return;
      setUploading(true);
      try {
        const urls: string[] = [...(entityData?.[field] || [])];
        for (const file of files) {
          const ext = file.name.split('.').pop();
          const path = `${user?.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
          const { error } = await supabase.storage.from(bucket).upload(path, file);
          if (error) throw error;
          const ref = getStorageReference(bucket, path);
          urls.push(ref);
        }
        await handleSaveField(field, urls);
      } catch (err: any) {
        toast({ title: 'Ошибка загрузки', description: err.message, variant: 'destructive' });
      }
      setUploading(false);
    };
    input.click();
  };

  const handleRemovePhoto = async (field: string, url: string) => {
    const updated = (entityData?.[field] || []).filter((u: string) => u !== url);
    await handleSaveField(field, updated);
  };

  const handleHashtagsChange = async (tags: string[]) => {
    await handleSaveField('hashtags', tags);
  };

  const handleRemoveHashtag = async (tag: string) => {
    const updated = (entityData?.hashtags || []).filter((t: string) => t !== tag);
    await handleSaveField('hashtags', updated);
  };

  const handleSubmitForModeration = async () => {
    if (!allRequiredDone) {
      toast({ title: 'Заполните все обязательные поля', variant: 'destructive' });
      return;
    }
    setSaving(true);
    await supabase.from(getTable() as any).update({ moderation_status: 'pending' }).eq(getIdField(), getIdValue());
    toast({ title: 'Отправлено на модерацию', description: 'Модератор проверит ваш профиль и подтвердит публикацию.' });
    onProfileUpdated();
    setSaving(false);
  };

  if (!showBanner && moderationStatus === 'approved') return null;

  const PhotoGrid = ({ field, bucket }: { field: string; bucket: string }) => {
    const photos = entityData?.[field] || [];
    return (
      <div className="mt-2">
        {photos.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {photos.map((url: string, i: number) => (
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
        <Button variant="outline" size="sm" onClick={() => handleUploadPhoto(bucket, field)} disabled={uploading}>
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

      <Card className={moderationStatus === 'rejected' ? 'border-destructive' : 'border-primary/50'}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              {moderationStatus === 'rejected' ? (
                <><AlertTriangle className="h-5 w-5 text-destructive" /> Профиль отклонён</>
              ) : moderationStatus === 'pending' ? (
                <><Loader2 className="h-5 w-5 text-primary animate-spin" /> На модерации</>
              ) : (
                <><AlertTriangle className="h-5 w-5 text-primary" /> Заполните профиль</>
              )}
            </CardTitle>
            <Badge variant={moderationStatus === 'pending' ? 'default' : 'outline'}>{progress}%</Badge>
          </div>
          {moderationStatus === 'rejected' && entityData?.moderation_comment && (
            <p className="text-sm text-destructive mt-1">Причина: {entityData.moderation_comment}</p>
          )}
          {moderationStatus === 'draft' && (
             <p className="text-sm text-muted-foreground">
              Заполните необходимые поля и отправьте на модерацию. После одобрения ваш профиль станет доступен в поиске.
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progress} className="h-2" />

          {/* 1. Address — now with MapPicker */}
          <div className="p-4 rounded-lg border space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {entityData?.address ? <CheckCircle className="h-5 w-5 text-primary" /> : <MapPin className="h-5 w-5 text-muted-foreground" />}
                <span className="text-sm font-medium">Адрес <span className="text-destructive">*</span></span>
              </div>
              <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {entityData?.address ? <><Pencil className="h-3 w-3 mr-1" /> Изменить</> : <><Plus className="h-3 w-3 mr-1" /> Добавить</>}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader><DialogTitle>Выберите адрес на карте</DialogTitle></DialogHeader>
                  <MapPicker
                    latitude={entityData?.latitude || 53.7151}
                    longitude={entityData?.longitude || 91.4292}
                    address={entityData?.address || ''}
                    onLocationChange={(lat, lng, address) => handleSaveAddressFromMap(address, lat, lng)}
                  />
                </DialogContent>
              </Dialog>
            </div>
            {entityData?.address && (
              <p className="text-sm text-muted-foreground pl-7">{entityData.address}</p>
            )}
          </div>

          {/* 2. Services */}
          <div className="p-4 rounded-lg border space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {services.length > 0 ? <CheckCircle className="h-5 w-5 text-primary" /> : <FileText className="h-5 w-5 text-muted-foreground" />}
                <span className="text-sm font-medium">Услуги (мин. 1) <span className="text-destructive">*</span></span>
              </div>
              <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {services.length > 0 ? `${services.length} услуг · Изменить` : <><Plus className="h-3 w-3 mr-1" /> Добавить</>}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>Управление услугами</DialogTitle></DialogHeader>
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    {services.length > 0 && (
                      <div className="space-y-2">
                        {services.map(s => (
                          <div key={s.id} className="flex items-center justify-between text-sm p-3 bg-muted rounded-lg">
                            <div>
                              <p className="font-medium">{s.name}</p>
                              <p className="text-muted-foreground">{s.price} ₽ · {s.duration_minutes} мин</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteServiceId(s.id)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="border-t pt-4 space-y-3">
                      <p className="text-sm font-medium">Добавить услугу</p>
                      <div className="space-y-2">
                        <Input placeholder="Название услуги" value={newService.name} onChange={e => setNewService({ ...newService, name: e.target.value })} />
                        <div className="grid grid-cols-2 gap-2">
                          <Input placeholder="Цена ₽" type="text" inputMode="numeric" value={newService.price} onChange={e => setNewService({ ...newService, price: e.target.value.replace(/[^\d]/g, '') })} />
                          <Input placeholder="Длительность (мин)" type="text" inputMode="numeric" value={newService.duration_minutes} onChange={e => setNewService({ ...newService, duration_minutes: e.target.value.replace(/[^\d]/g, '') })} />
                        </div>
                      </div>
                      <Button className="w-full" onClick={handleAddService} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />} Добавить услугу
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {services.length > 0 && (
              <div className="pl-7 space-y-1">
                {services.slice(0, 3).map(s => (
                  <p key={s.id} className="text-sm text-muted-foreground">{s.name} — {s.price} ₽</p>
                ))}
                {services.length > 3 && <p className="text-xs text-muted-foreground">и ещё {services.length - 3}...</p>}
              </div>
            )}
          </div>

          {/* 3. Description */}
          <div className="p-4 rounded-lg border space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {entityData?.description ? <CheckCircle className="h-5 w-5 text-primary" /> : <FileText className="h-5 w-5 text-muted-foreground" />}
                <span className="text-sm font-medium">Описание</span>
              </div>
              <Dialog open={descriptionDialogOpen} onOpenChange={setDescriptionDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {entityData?.description ? <><Pencil className="h-3 w-3 mr-1" /> Изменить</> : <><Plus className="h-3 w-3 mr-1" /> Добавить</>}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Описание</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Textarea value={descriptionValue} onChange={e => setDescriptionValue(e.target.value)} placeholder="Расскажите о себе и своих услугах" rows={5} />
                    <Button className="w-full" onClick={handleSaveDescription} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Сохранить
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {entityData?.description && (
              <p className="text-sm text-muted-foreground pl-7 line-clamp-3">{entityData.description}</p>
            )}
          </div>

          {/* 4. Interior/Exterior Photos */}
          <div className="p-4 rounded-lg border space-y-2">
            <div className="flex items-center gap-2">
              {(entityData?.interior_photos?.length || 0) > 0 ? <CheckCircle className="h-5 w-5 text-primary" /> : <Camera className="h-5 w-5 text-muted-foreground" />}
              <span className="text-sm font-medium">Фото интерьера/экстерьера</span>
            </div>
            <PhotoGrid field="interior_photos" bucket="interiors" />
          </div>

          {/* 5. Work Photos */}
          <div className="p-4 rounded-lg border space-y-2">
            <div className="flex items-center gap-2">
              {(entityData?.work_photos?.length || 0) > 0 ? <CheckCircle className="h-5 w-5 text-primary" /> : <Image className="h-5 w-5 text-muted-foreground" />}
              <span className="text-sm font-medium">Фото работ</span>
            </div>
            <PhotoGrid field="work_photos" bucket="portfolio" />
          </div>

          {/* 6. Certificates */}
          <div className="p-4 rounded-lg border space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(entityData?.certificate_photos?.length || 0) > 0 ? <CheckCircle className="h-5 w-5 text-primary" /> : <Award className="h-5 w-5 text-muted-foreground" />}
                <span className="text-sm font-medium">Сертификаты и референсы</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleUploadPhoto('certificates', 'certificate_photos')} disabled={uploading}>
                {uploading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />} Добавить
              </Button>
            </div>
            {(entityData?.certificate_photos?.length || 0) > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 pl-7">
                {(entityData.certificate_photos || []).map((url: string, i: number) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border group">
                    <SignedImage bucket="certificates" storageSrc={url} alt="" className="w-full h-full object-cover cursor-pointer" onClick={() => setLightboxUrl(url)} />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <button onClick={() => setLightboxUrl(url)} className="p-1 rounded bg-white/20"><Eye className="h-3 w-3 text-white" /></button>
                      <button onClick={() => handleRemovePhoto('certificate_photos', url)} className="p-1 rounded bg-destructive/80"><X className="h-3 w-3 text-white" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 7. Hashtags — now with TagDropdown */}
          <div className="p-4 rounded-lg border space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(entityData?.hashtags?.length || 0) > 0 ? <CheckCircle className="h-5 w-5 text-primary" /> : <Hash className="h-5 w-5 text-muted-foreground" />}
                <span className="text-sm font-medium">Хэштеги</span>
              </div>
              <Dialog open={hashtagDialogOpen} onOpenChange={setHashtagDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {(entityData?.hashtags?.length || 0) > 0 ? <><Pencil className="h-3 w-3 mr-1" /> Изменить</> : <><Plus className="h-3 w-3 mr-1" /> Добавить</>}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Хэштеги</DialogTitle></DialogHeader>
                  <TagDropdown
                    label="Хэштеги"
                    tags={entityData?.hashtags || []}
                    onTagsChange={handleHashtagsChange}
                    presets={['маникюр', 'педикюр', 'стрижка', 'окрашивание', 'массаж', 'фитнес', 'йога', 'английский', 'детейлинг', 'мойка']}
                    placeholder="Добавить тег..."
                  />
                  <Button className="w-full mt-2" onClick={() => setHashtagDialogOpen(false)}>Готово</Button>
                </DialogContent>
              </Dialog>
            </div>
            {(entityData?.hashtags?.length || 0) > 0 && (
              <div className="flex flex-wrap gap-1.5 pl-7">
                {(entityData.hashtags || []).map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="text-xs gap-1">
                    #{tag}
                    <button onClick={() => handleRemoveHashtag(tag)}><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Submit for moderation */}
          {moderationStatus !== 'pending' && (
            <Button
              className="w-full"
              onClick={handleSubmitForModeration}
              disabled={!allRequiredDone || saving}
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {allRequiredDone ? 'Отправить на модерацию' : 'Заполните обязательные поля'}
            </Button>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default ProfileCompletionCheck;
