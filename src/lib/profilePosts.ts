import { Award, Briefcase, Camera, Newspaper, type LucideIcon } from 'lucide-react';

export type ProfilePostKind = 'post' | 'story' | 'work_update' | 'service_update' | 'achievement';
export type ProfileEntityType = 'master' | 'business';

export interface ProfilePostRecord {
  id: string;
  entity_type: ProfileEntityType;
  entity_id: string;
  author_user_id: string;
  post_kind: ProfilePostKind;
  title: string | null;
  body: string | null;
  media_urls: string[] | null;
  is_published: boolean;
  is_pinned: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export const PROFILE_POST_KIND_OPTIONS: Array<{
  value: ProfilePostKind;
  label: string;
  description: string;
}> = [
  { value: 'post', label: 'Пост', description: 'Новость, объявление или важное обновление' },
  { value: 'work_update', label: 'Новая работа', description: 'Свежий кейс, фото результата или пример услуги' },
  { value: 'service_update', label: 'Новая услуга', description: 'Изменение прайса, запуск новой процедуры или формата работы' },
  { value: 'achievement', label: 'Обучение / достижение', description: 'Курсы, сертификаты, новые техники и навыки' },
  { value: 'story', label: 'Сторис', description: 'Короткое временное обновление на 24 часа' },
];

export const PROFILE_POST_KIND_META: Record<
  ProfilePostKind,
  {
    label: string;
    icon: LucideIcon;
    accentClass: string;
  }
> = {
  post: {
    label: 'Пост',
    icon: Newspaper,
    accentClass: 'bg-slate-50 text-slate-900 border-slate-200',
  },
  work_update: {
    label: 'Новая работа',
    icon: Camera,
    accentClass: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  },
  service_update: {
    label: 'Новая услуга',
    icon: Briefcase,
    accentClass: 'bg-blue-50 text-blue-900 border-blue-200',
  },
  achievement: {
    label: 'Обучение и достижения',
    icon: Award,
    accentClass: 'bg-amber-50 text-amber-900 border-amber-200',
  },
  story: {
    label: 'Сторис',
    icon: Newspaper,
    accentClass: 'bg-fuchsia-50 text-fuchsia-900 border-fuchsia-200',
  },
};

export const isStoryActive = (post: Pick<ProfilePostRecord, 'post_kind' | 'expires_at'>) => {
  if (post.post_kind !== 'story') return false;
  if (!post.expires_at) return true;
  return new Date(post.expires_at).getTime() > Date.now();
};

export const getProfilePostExcerpt = (post: Pick<ProfilePostRecord, 'title' | 'body'>, maxLength = 160) => {
  const raw = [post.title, post.body].filter(Boolean).join('. ').replace(/\s+/g, ' ').trim();
  if (!raw) return '';
  if (raw.length <= maxLength) return raw;
  return `${raw.slice(0, maxLength - 1).trimEnd()}…`;
};

export const sortProfilePosts = (posts: ProfilePostRecord[]) =>
  [...posts].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return Number(b.is_pinned) - Number(a.is_pinned);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
