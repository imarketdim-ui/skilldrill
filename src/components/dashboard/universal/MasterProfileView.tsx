import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, ExternalLink, Edit, Eye, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useState } from 'react';
import { CategoryConfig } from './categoryConfig';

interface Props {
  masterProfile: any;
  profile: any;
  config: CategoryConfig;
  onEditClick: () => void;
}

const MasterProfileView = ({ masterProfile, profile, config, onEditClick }: Props) => {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const sl = (masterProfile?.social_links as any) || {};
  const workPhotos: string[] = masterProfile?.work_photos || [];
  const interiorPhotos: string[] = masterProfile?.interior_photos || [];
  const hashtags: string[] = masterProfile?.hashtags || [];

  const getInitials = () =>
    `${(profile?.first_name || '')[0] || ''}${(profile?.last_name || '')[0] || ''}`.toUpperCase() || '?';

  const IconComponent = config.icon;

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
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Мой профиль</h2>
          <Button onClick={onEditClick}>
            <Edit className="h-4 w-4 mr-2" /> Редактировать
          </Button>
        </div>

        {/* Profile header card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20 shrink-0">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xl bg-primary/10 text-primary">{getInitials()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-semibold">{profile?.first_name} {profile?.last_name}</h3>
                {masterProfile?.short_description && (
                  <p className="text-muted-foreground mt-1">{masterProfile.short_description}</p>
                )}
                {masterProfile?.service_categories?.name && (
                  <Badge variant="outline" className="gap-1 mt-2">
                    <IconComponent className="h-3 w-3" />
                    {masterProfile.service_categories.name}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        {masterProfile?.description && (
          <Card>
            <CardHeader><CardTitle className="text-lg">О себе</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{masterProfile.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Address */}
        {(masterProfile?.city || masterProfile?.address) && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Адрес</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  {masterProfile.city && <p className="font-medium">{masterProfile.city}</p>}
                  {masterProfile.address && <p className="text-sm text-muted-foreground">{masterProfile.address}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Workplace */}
        {masterProfile?.workplace_description && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Рабочее место</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{masterProfile.workplace_description}</p>
            </CardContent>
          </Card>
        )}

        {/* Hashtags */}
        {hashtags.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Хэштеги</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {hashtags.map(tag => (
                  <Badge key={tag} variant="secondary">#{tag}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Photos */}
        {(workPhotos.length > 0 || interiorPhotos.length > 0) && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Фотографии</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {workPhotos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Фото работ</p>
                  <div className="flex flex-wrap gap-2">
                    {workPhotos.map((url, i) => (
                      <div key={i} className="w-20 h-20 rounded-lg overflow-hidden border cursor-pointer" onClick={() => setLightboxUrl(url)}>
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {interiorPhotos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Фото интерьера</p>
                  <div className="flex flex-wrap gap-2">
                    {interiorPhotos.map((url, i) => (
                      <div key={i} className="w-20 h-20 rounded-lg overflow-hidden border cursor-pointer" onClick={() => setLightboxUrl(url)}>
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Social links */}
        {Object.values(sl).some(Boolean) && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Социальные сети</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-3 flex-wrap">
                {sl.telegram && (
                  <a href={`https://t.me/${sl.telegram}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1"><ExternalLink className="h-3.5 w-3.5" /> Telegram: @{sl.telegram}</a>
                )}
                {sl.vk && (
                  <a href={`https://vk.com/${sl.vk}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1"><ExternalLink className="h-3.5 w-3.5" /> VK</a>
                )}
                {sl.instagram && (
                  <a href={`https://instagram.com/${sl.instagram}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1"><ExternalLink className="h-3.5 w-3.5" /> Instagram</a>
                )}
                {sl.youtube && (
                  <a href={sl.youtube} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1"><ExternalLink className="h-3.5 w-3.5" /> YouTube</a>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!masterProfile?.description && !masterProfile?.address && workPhotos.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground mb-3">Профиль ещё не заполнен</p>
              <Button onClick={onEditClick} variant="outline">
                <Edit className="h-4 w-4 mr-2" /> Заполнить профиль
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};

export default MasterProfileView;
