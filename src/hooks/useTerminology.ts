import { useMemo } from 'react';

/**
 * Dynamic terminology based on organization category.
 * Maps category slugs/names to niche-specific terms.
 */

interface Terminology {
  specialist: string;
  specialists: string;
  client: string;
  clients: string;
  resource: string;
  resources: string;
  session: string;
  sessions: string;
  booking: string;
  bookings: string;
}

const CATEGORY_TERMS: Record<string, Partial<Terminology>> = {
  // Teaching / Education
  'обучение': {
    specialist: 'Преподаватель',
    specialists: 'Преподаватели',
    client: 'Ученик',
    clients: 'Ученики',
    resource: 'Аудитория',
    resources: 'Аудитории',
    session: 'Занятие',
    sessions: 'Занятия',
  },
  // Fitness
  'фитнес': {
    specialist: 'Тренер',
    specialists: 'Тренеры',
    client: 'Клиент',
    clients: 'Клиенты',
    resource: 'Зал',
    resources: 'Залы',
    session: 'Тренировка',
    sessions: 'Тренировки',
  },
  // Auto service
  'авто': {
    specialist: 'Механик',
    specialists: 'Механики',
    client: 'Клиент',
    clients: 'Клиенты',
    resource: 'Бокс',
    resources: 'Боксы',
    session: 'Работа',
    sessions: 'Работы',
  },
  // Beauty
  'бьюти': {
    specialist: 'Мастер',
    specialists: 'Мастера',
    client: 'Клиент',
    clients: 'Клиенты',
    resource: 'Кабинет',
    resources: 'Кабинеты',
    session: 'Процедура',
    sessions: 'Процедуры',
  },
  // SPA
  'спа': {
    specialist: 'Специалист',
    specialists: 'Специалисты',
    client: 'Гость',
    clients: 'Гости',
    resource: 'Кабинет',
    resources: 'Кабинеты',
    session: 'Процедура',
    sessions: 'Процедуры',
  },
  // Health / Medical
  'здоровье': {
    specialist: 'Специалист',
    specialists: 'Специалисты',
    client: 'Пациент',
    clients: 'Пациенты',
    resource: 'Кабинет',
    resources: 'Кабинеты',
    session: 'Приём',
    sessions: 'Приёмы',
  },
  // Photo & Video
  'фото': {
    specialist: 'Фотограф',
    specialists: 'Фотографы',
    client: 'Клиент',
    clients: 'Клиенты',
    resource: 'Студия',
    resources: 'Студии',
    session: 'Съёмка',
    sessions: 'Съёмки',
  },
  // Home services
  'дом': {
    specialist: 'Мастер',
    specialists: 'Мастера',
    client: 'Заказчик',
    clients: 'Заказчики',
    resource: 'Объект',
    resources: 'Объекты',
    session: 'Выезд',
    sessions: 'Выезды',
  },
};

const DEFAULT_TERMS: Terminology = {
  specialist: 'Мастер',
  specialists: 'Мастера',
  client: 'Клиент',
  clients: 'Клиенты',
  resource: 'Ресурс',
  resources: 'Ресурсы',
  session: 'Запись',
  sessions: 'Записи',
  booking: 'Запись',
  bookings: 'Записи',
};

export function useTerminology(categoryName?: string | null): Terminology {
  return useMemo(() => {
    if (!categoryName) return DEFAULT_TERMS;
    
    const lower = categoryName.toLowerCase();
    for (const [key, terms] of Object.entries(CATEGORY_TERMS)) {
      if (lower.includes(key)) {
        return { ...DEFAULT_TERMS, ...terms };
      }
    }
    
    return DEFAULT_TERMS;
  }, [categoryName]);
}

export type { Terminology };
export default useTerminology;
