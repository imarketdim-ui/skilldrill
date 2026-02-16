import {
  Scissors, Car, Sparkles, Camera, HeartPulse, Home, Wrench,
  Dumbbell, GraduationCap
} from 'lucide-react';

export interface CategoryConfig {
  key: string;
  icon: any;
  label: string;           // Роль (Мастер / Тренер / Преподаватель)
  sessionName: string;     // Единица работы: "сеанс", "тренировка", "занятие"
  sessionNamePlural: string;
  clientName: string;      // Клиент / Студент / Пациент
  clientNamePlural: string;
  newSessionLabel: string;
  welcomeEmoji: string;
  expenseCategories: string[];
}

export const categoryConfigs: Record<string, CategoryConfig> = {
  'Бьюти-услуги': {
    key: 'beauty',
    icon: Scissors,
    label: 'Мастер красоты',
    sessionName: 'сеанс',
    sessionNamePlural: 'сеансов',
    clientName: 'Клиент',
    clientNamePlural: 'Клиентов',
    newSessionLabel: 'Новый сеанс',
    welcomeEmoji: '💅',
    expenseCategories: ['Материалы и расходники', 'Аренда рабочего места', 'Оборудование', 'Повышение квалификации', 'Маркетинг', 'Прочее'],
  },
  'Авто': {
    key: 'auto',
    icon: Car,
    label: 'Автомастер',
    sessionName: 'заказ',
    sessionNamePlural: 'заказов',
    clientName: 'Клиент',
    clientNamePlural: 'Клиентов',
    newSessionLabel: 'Новый заказ',
    welcomeEmoji: '🔧',
    expenseCategories: ['Запчасти', 'Инструменты', 'Аренда бокса', 'Расходные материалы', 'Транспорт', 'Маркетинг', 'Прочее'],
  },
  'СПА': {
    key: 'spa',
    icon: Sparkles,
    label: 'СПА-мастер',
    sessionName: 'процедура',
    sessionNamePlural: 'процедур',
    clientName: 'Клиент',
    clientNamePlural: 'Клиентов',
    newSessionLabel: 'Новая процедура',
    welcomeEmoji: '🧖',
    expenseCategories: ['Косметика и масла', 'Аренда кабинета', 'Оборудование', 'Полотенца и бельё', 'Повышение квалификации', 'Маркетинг', 'Прочее'],
  },
  'Фото и видео': {
    key: 'photo',
    icon: Camera,
    label: 'Фотограф / Видеограф',
    sessionName: 'съёмка',
    sessionNamePlural: 'съёмок',
    clientName: 'Клиент',
    clientNamePlural: 'Клиентов',
    newSessionLabel: 'Новая съёмка',
    welcomeEmoji: '📸',
    expenseCategories: ['Аренда студии', 'Оборудование', 'Реквизит', 'Обработка и ПО', 'Транспорт', 'Маркетинг', 'Прочее'],
  },
  'Здоровье': {
    key: 'health',
    icon: HeartPulse,
    label: 'Специалист',
    sessionName: 'приём',
    sessionNamePlural: 'приёмов',
    clientName: 'Пациент',
    clientNamePlural: 'Пациентов',
    newSessionLabel: 'Новый приём',
    welcomeEmoji: '🏥',
    expenseCategories: ['Медикаменты и материалы', 'Аренда кабинета', 'Оборудование', 'Повышение квалификации', 'Страхование', 'Маркетинг', 'Прочее'],
  },
  'Дом': {
    key: 'home',
    icon: Home,
    label: 'Мастер',
    sessionName: 'заказ',
    sessionNamePlural: 'заказов',
    clientName: 'Клиент',
    clientNamePlural: 'Клиентов',
    newSessionLabel: 'Новый заказ',
    welcomeEmoji: '🏠',
    expenseCategories: ['Материалы', 'Инструменты', 'Транспорт', 'Аренда', 'Спецодежда', 'Маркетинг', 'Прочее'],
  },
  'Прочие услуги': {
    key: 'other',
    icon: Wrench,
    label: 'Мастер',
    sessionName: 'заказ',
    sessionNamePlural: 'заказов',
    clientName: 'Клиент',
    clientNamePlural: 'Клиентов',
    newSessionLabel: 'Новый заказ',
    welcomeEmoji: '⚡',
    expenseCategories: ['Материалы', 'Инструменты', 'Аренда', 'Транспорт', 'Маркетинг', 'Прочее'],
  },
  'Фитнес': {
    key: 'fitness',
    icon: Dumbbell,
    label: 'Тренер',
    sessionName: 'тренировка',
    sessionNamePlural: 'тренировок',
    clientName: 'Клиент',
    clientNamePlural: 'Клиентов',
    newSessionLabel: 'Новая тренировка',
    welcomeEmoji: '💪',
    expenseCategories: ['Аренда зала', 'Оборудование', 'Спортивное питание', 'Транспорт', 'Подписки и сертификация', 'Маркетинг', 'Прочее'],
  },
  'Обучение': {
    key: 'education',
    icon: GraduationCap,
    label: 'Преподаватель',
    sessionName: 'занятие',
    sessionNamePlural: 'занятий',
    clientName: 'Студент',
    clientNamePlural: 'Студентов',
    newSessionLabel: 'Новое занятие',
    welcomeEmoji: '👋',
    expenseCategories: ['Учебные материалы', 'Аренда помещения', 'Оборудование', 'Подписки и ПО', 'Транспорт', 'Маркетинг', 'Прочее'],
  },
};

export function getCategoryConfig(categoryName: string): CategoryConfig {
  return categoryConfigs[categoryName] || categoryConfigs['Прочие услуги'];
}
