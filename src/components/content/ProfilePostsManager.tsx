import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Plus, Pencil, Trash2, Eye, EyeOff, Pin, PinOff, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  PROFILE_POST_KIND_META,
  PROFILE_POST_KIND_OPTIONS,
  type ProfileEntityType,
  type ProfilePostKind,
  type ProfilePostRecord,
  getProfilePostExcerpt,
  isStoryActive,
  sortProfilePosts,
} from '@/lib/profilePosts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import PhotoUploader from '@/components/marketplace/PhotoUploader';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface Props {
  entityType: ProfileEntityType;
  entityId: string;
  title?: string;
  description?: string;
  emptyText?: string;
  onChanged?: () => void;
}

const initialForm = {
  post_kind: 'post' as ProfilePostKind,
  title: '',
  body: '',
  is_published: true,
  is_pinned: false,
  media_urls: [] as string[],
};

const ProfilePostsManager = ({
  entityType,
  entityId,
  title = 'Посты и сторис',
  description = 'Публикуйте обновления, новые работы, достижения и короткие сторис для публичной страницы.',
  emptyText = 'Пока нет публикаций. Добавьте первую новость, работу или сторис.',
  onChanged,
}: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<ProfilePostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);

  const loadPosts = async () => {
    if (!entityId) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('profile_posts')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Не удалось загрузить публикации', description: error.message, variant: 'destructive' });
      setPosts([]);
    } else {
      setPosts(sortProfilePosts((data || []) as ProfilePostRecord[]));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPosts();
  }, [entityId, entityType]);

  const activeStories = useMemo(
    () => posts.filter((post) => isStoryActive(post)),
    [posts],
  );

  const resetForm = () => {
    setEditingId(null);
    setForm(initialForm);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (post: ProfilePostRecord) => {
    setEditingId(post.id);
    setForm({
      post_kind: post.post_kind,
      title: post.title || '',
      body: post.body || '',
      is_published: post.is_published,
      is_pinned: post.is_pinned,
      media_urls: Array.isArray(post.media_urls) ? post.media_urls : [],
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.title.trim() && !form.body.trim()) {
      toast({ title: 'Добавьте заголовок или текст', description: 'Публикация не должна быть пустой.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const payload = {
      entity_type: entityType,
      entity_id: entityId,
      author_user_id: user.id,
      post_kind: form.post_kind,
      title: form.title.trim() || null,
      body: form.body.trim() || null,
      media_urls: form.media_urls,
      is_published: form.is_published,
      is_pinned: form.is_pinned,
      expires_at: form.post_kind === 'story' ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
    };

    const query = editingId
      ? (supabase as any).from('profile_posts').update(payload).eq('id', editingId)
      : (supabase as any).from('profile_posts').insert(payload);

    const { error } = await query;
    setSaving(false);

    if (error) {
      toast({ title: 'Не удалось сохранить публикацию', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: editingId ? 'Публикация обновлена' : 'Публикация создана' });
    setOpen(false);
    resetForm();
    await loadPosts();
    onChanged?.();
  };

  const toggleBooleanField = async (post: ProfilePostRecord, key: 'is_published' | 'is_pinned') => {
    const { error } = await (supabase as any)
      .from('profile_posts')
      .update({ [key]: !post[key] })
      .eq('id', post.id);

    if (error) {
      toast({ title: 'Не удалось обновить публикацию', description: error.message, variant: 'destructive' });
      return;
    }

    await loadPosts();
    onChanged?.();
  };

  const handleDelete = async (postId: string) => {
    const { error } = await (supabase as any).from('profile_posts').delete().eq('id', postId);
    if (error) {
      toast({ title: 'Не удалось удалить публикацию', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Публикация удалена' });
    await loadPosts();
    onChanged?.();
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            {activeStories.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {activeStories.slice(0, 4).map((story) => (
                  <Badge key={story.id} variant="secondary" className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    Сторис активна ещё {formatDistanceToNowStrict(new Date(story.expires_at || story.created_at), { locale: ru, addSuffix: true })}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Загрузка публикаций...</p>
          ) : posts.length === 0 ? (
            <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              {emptyText}
            </div>
          ) : (
            posts.map((post) => {
              const meta = PROFILE_POST_KIND_META[post.post_kind];
              const Icon = meta.icon;
              return (
                <div key={post.id} className="rounded-2xl border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${meta.accentClass}`}>
                        <Icon className="h-3.5 w-3.5" />
                        {meta.label}
                      </div>
                      <div>
                        <p className="font-semibold">{post.title || 'Без заголовка'}</p>
                        <p className="text-sm text-muted-foreground">
                          {getProfilePostExcerpt(post, 220) || 'Без текста'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{new Date(post.created_at).toLocaleDateString('ru-RU')}</span>
                        {post.is_pinned && <span>Закреплено</span>}
                        {!post.is_published && <span>Черновик</span>}
                        {post.post_kind === 'story' && post.expires_at && (
                          <span>Исчезнет {new Date(post.expires_at).toLocaleString('ru-RU')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => toggleBooleanField(post, 'is_published')}>
                        {post.is_published ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                        {post.is_published ? 'Скрыть' : 'Опубликовать'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => toggleBooleanField(post, 'is_pinned')}>
                        {post.is_pinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
                        {post.is_pinned ? 'Открепить' : 'Закрепить'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEdit(post)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Изменить
                      </Button>
                      <ConfirmDialog
                        trigger={
                          <Button variant="outline" size="sm">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Удалить
                          </Button>
                        }
                        title="Удалить публикацию?"
                        description="Публикация исчезнет с публичной страницы и из сторис."
                        onConfirm={() => handleDelete(post.id)}
                      />
                    </div>
                  </div>

                  {Array.isArray(post.media_urls) && post.media_urls.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                      {post.media_urls.slice(0, 4).map((url) => (
                        <img key={url} src={url} alt="" className="h-28 w-full rounded-xl object-cover" />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Редактировать публикацию' : 'Новая публикация'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Тип публикации</Label>
              <Select
                value={form.post_kind}
                onValueChange={(value) => setForm((prev) => ({ ...prev, post_kind: value as ProfilePostKind }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROFILE_POST_KIND_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {PROFILE_POST_KIND_OPTIONS.find((option) => option.value === form.post_kind)?.description}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Заголовок</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder={form.post_kind === 'story' ? 'Короткий заголовок сторис' : 'Например: Освоили новую технику окрашивания'}
              />
            </div>

            <div className="space-y-2">
              <Label>Текст публикации</Label>
              <Textarea
                rows={5}
                value={form.body}
                onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
                placeholder="Расскажите о новой работе, курсе, услуге или важном обновлении для клиентов."
              />
            </div>

            <PhotoUploader
              label="Фото для публикации"
              photos={form.media_urls}
              onPhotosChange={(photos) => setForm((prev) => ({ ...prev, media_urls: photos }))}
              bucket="portfolio"
              storagePath={`${user?.id || 'anonymous'}/profile-posts`}
              maxPhotos={form.post_kind === 'story' ? 6 : 12}
              maxSizeMb={8}
              supabase={supabase}
            />

            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-xl border p-3">
                <div>
                  <p className="font-medium">Опубликовать сразу</p>
                  <p className="text-xs text-muted-foreground">Иначе сохранится как скрытая публикация.</p>
                </div>
                <Switch
                  checked={form.is_published}
                  onCheckedChange={(value) => setForm((prev) => ({ ...prev, is_published: value }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border p-3">
                <div>
                  <p className="font-medium">Закрепить в ленте</p>
                  <p className="text-xs text-muted-foreground">Будет выше остальных обновлений на странице.</p>
                </div>
                <Switch
                  checked={form.is_pinned}
                  onCheckedChange={(value) => setForm((prev) => ({ ...prev, is_pinned: value }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Отменить
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Сохраняем...' : editingId ? 'Сохранить' : 'Опубликовать'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProfilePostsManager;
