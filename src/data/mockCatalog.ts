// Mock catalog data for all categories
// All locations: Абакан

export interface MockMaster {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  reviewCount: number;
  bio: string;
  location: string;
  categoryId: string;
  categoryName: string;
  businessId?: string;
  services: MockService[];
  reviews: MockReview[];
  portfolioImages: string[];
}

export interface MockBusiness {
  id: string;
  name: string;
  image: string;
  categoryId: string;
  categoryName: string;
  rating: number;
  reviewCount: number;
  location: string;
  address: string;
  description: string;
  specialistCount: number;
  serviceCount: number;
  masters: string[]; // master ids
}

export interface MockService {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: string;
  image: string;
  subcategory: string;
}

export interface MockReview {
  id: string;
  author: string;
  rating: number;
  text: string;
  date: string;
}

const beautyMasters: MockMaster[] = [
  // Business 1 masters
  { id: 'b-m1', name: 'Анна Петрова', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop', rating: 4.9, reviewCount: 187, bio: 'Стилист-парикмахер с 8-летним опытом. Специализируюсь на сложных окрашиваниях и креативных стрижках.', location: 'Абакан', categoryId: 'a0000001-0000-0000-0000-000000000001', categoryName: 'Бьюти-услуги', businessId: 'bus-beauty-1',
    services: [
      { id: 'bs1', name: 'Женская стрижка', description: 'Консультация + стрижка + укладка', price: 2500, duration: '1.5 ч', image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop', subcategory: 'Стрижки' },
      { id: 'bs2', name: 'Окрашивание в один тон', description: 'Подбор цвета + окрашивание + уход', price: 4500, duration: '2.5 ч', image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=300&fit=crop', subcategory: 'Окрашивание' },
    ],
    reviews: [
      { id: 'r1', author: 'Мария К.', rating: 5, text: 'Прекрасный мастер! Стрижка идеальная, всем рекомендую.', date: '2026-02-10' },
      { id: 'r2', author: 'Елена С.', rating: 5, text: 'Окрашивание получилось именно как хотела. Спасибо!', date: '2026-02-08' },
    ],
    portfolioImages: ['https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&h=400&fit=crop']
  },
  { id: 'b-m2', name: 'Ольга Сидорова', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop', rating: 4.8, reviewCount: 142, bio: 'Мастер маникюра и педикюра. Работаю с гель-лаками премиум-класса.', location: 'Абакан', categoryId: 'a0000001-0000-0000-0000-000000000001', categoryName: 'Бьюти-услуги', businessId: 'bus-beauty-1',
    services: [
      { id: 'bs3', name: 'Маникюр с покрытием', description: 'Маникюр + покрытие гель-лак', price: 2000, duration: '1.5 ч', image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=300&fit=crop', subcategory: 'Маникюр' },
      { id: 'bs4', name: 'Педикюр классический', description: 'Педикюр + покрытие гель-лак', price: 2500, duration: '2 ч', image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=400&h=300&fit=crop', subcategory: 'Педикюр' },
    ],
    reviews: [
      { id: 'r3', author: 'Ирина В.', rating: 5, text: 'Ольга — настоящий профессионал. Маникюр держится 3 недели!', date: '2026-02-12' },
    ],
    portfolioImages: ['https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&h=400&fit=crop']
  },
  // Business 2 masters
  { id: 'b-m3', name: 'Дарья Козлова', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop', rating: 4.7, reviewCount: 98, bio: 'Косметолог с медицинским образованием. Чистки, пилинги, уходовые процедуры.', location: 'Абакан', categoryId: 'a0000001-0000-0000-0000-000000000001', categoryName: 'Бьюти-услуги', businessId: 'bus-beauty-2',
    services: [
      { id: 'bs5', name: 'Ультразвуковая чистка', description: 'Глубокая чистка лица ультразвуком', price: 3500, duration: '1 ч', image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&h=300&fit=crop', subcategory: 'Косметология' },
    ],
    reviews: [{ id: 'r4', author: 'Наталья М.', rating: 5, text: 'Кожа после чистки как новая!', date: '2026-02-09' }],
    portfolioImages: ['https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&h=400&fit=crop']
  },
  { id: 'b-m4', name: 'Виктория Лебедева', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop', rating: 4.9, reviewCount: 203, bio: 'Бровист и лэшмейкер. Создаю идеальный взгляд для каждой клиентки.', location: 'Абакан', categoryId: 'a0000001-0000-0000-0000-000000000001', categoryName: 'Бьюти-услуги', businessId: 'bus-beauty-2',
    services: [
      { id: 'bs6', name: 'Оформление бровей', description: 'Коррекция + окрашивание + укладка', price: 1500, duration: '45 мин', image: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=400&h=300&fit=crop', subcategory: 'Брови и ресницы' },
      { id: 'bs7', name: 'Наращивание ресниц', description: 'Классическое наращивание', price: 3000, duration: '2 ч', image: 'https://images.unsplash.com/photo-1583001931096-959e9a1a6223?w=400&h=300&fit=crop', subcategory: 'Брови и ресницы' },
    ],
    reviews: [{ id: 'r5', author: 'Светлана Д.', rating: 5, text: 'Лучший бровист в городе!', date: '2026-02-11' }],
    portfolioImages: ['https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=600&h=400&fit=crop']
  },
  // Independent masters
  { id: 'b-m5', name: 'Кристина Иванова', avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop', rating: 4.6, reviewCount: 67, bio: 'Мастер по окрашиванию. Балаяж, шатуш, airtouch.', location: 'Абакан', categoryId: 'a0000001-0000-0000-0000-000000000001', categoryName: 'Бьюти-услуги',
    services: [{ id: 'bs8', name: 'Балаяж', description: 'Техника окрашивания балаяж', price: 6000, duration: '3 ч', image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=300&fit=crop', subcategory: 'Окрашивание' }],
    reviews: [{ id: 'r6', author: 'Алина П.', rating: 5, text: 'Окрашивание супер!', date: '2026-02-07' }], portfolioImages: []
  },
  { id: 'b-m6', name: 'Елена Морозова', avatar: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=100&h=100&fit=crop', rating: 4.8, reviewCount: 115, bio: 'Nail-мастер с авторскими дизайнами.', location: 'Абакан', categoryId: 'a0000001-0000-0000-0000-000000000001', categoryName: 'Бьюти-услуги',
    services: [{ id: 'bs9', name: 'Дизайн ногтей', description: 'Маникюр + авторский дизайн', price: 3000, duration: '2 ч', image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=300&fit=crop', subcategory: 'Маникюр' }],
    reviews: [{ id: 'r7', author: 'Юлия К.', rating: 5, text: 'Дизайн просто космос!', date: '2026-02-06' }], portfolioImages: []
  },
  { id: 'b-m7', name: 'Марина Белова', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop', rating: 4.5, reviewCount: 54, bio: 'Мастер-универсал: стрижки, укладки, уход за волосами.', location: 'Абакан', categoryId: 'a0000001-0000-0000-0000-000000000001', categoryName: 'Бьюти-услуги',
    services: [{ id: 'bs10', name: 'Укладка волос', description: 'Укладка любой сложности', price: 1500, duration: '45 мин', image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop', subcategory: 'Стрижки' }],
    reviews: [{ id: 'r8', author: 'Татьяна Р.', rating: 4, text: 'Хорошая укладка, спасибо.', date: '2026-02-05' }], portfolioImages: []
  },
];

const autoMasters: MockMaster[] = [
  { id: 'a-m1', name: 'Алексей Кузнецов', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', rating: 4.8, reviewCount: 234, bio: 'Мастер детейлинга с 10-летним опытом. Полировка, керамика, защитные плёнки.', location: 'Абакан', categoryId: 'a0000001-0000-0000-0000-000000000002', categoryName: 'Авто', businessId: 'bus-auto-1',
    services: [
      { id: 'as1', name: 'Полировка кузова', description: 'Абразивная полировка + защитное покрытие', price: 8000, duration: '4 ч', image: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=400&h=300&fit=crop', subcategory: 'Детейлинг' },
      { id: 'as2', name: 'Керамическое покрытие', description: 'Нанесение керамики 9H', price: 15000, duration: '6 ч', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop', subcategory: 'Детейлинг' },
    ],
    reviews: [{ id: 'ar1', author: 'Сергей М.', rating: 5, text: 'Машина как новая! Отличная работа!', date: '2026-02-10' }], portfolioImages: ['https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=600&h=400&fit=crop']
  },
  { id: 'a-m2', name: 'Дмитрий Соколов', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop', rating: 4.7, reviewCount: 156, bio: 'Специалист по мойке и химчистке. Работаю на профессиональном оборудовании.', location: 'Абакан', categoryId: 'a0000001-0000-0000-0000-000000000002', categoryName: 'Авто', businessId: 'bus-auto-1',
    services: [
      { id: 'as3', name: 'Комплексная мойка', description: 'Мойка кузова + салона + багажника', price: 1500, duration: '1 ч', image: 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=400&h=300&fit=crop', subcategory: 'Автомойка' },
    ],
    reviews: [{ id: 'ar2', author: 'Андрей В.', rating: 5, text: 'Быстро и качественно!', date: '2026-02-09' }], portfolioImages: []
  },
  { id: 'a-m3', name: 'Максим Волков', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop', rating: 4.6, reviewCount: 89, bio: 'Шиномонтаж любой сложности. Балансировка, ремонт, хранение шин.', location: 'Абакан', categoryId: 'a0000001-0000-0000-0000-000000000002', categoryName: 'Авто', businessId: 'bus-auto-2',
    services: [
      { id: 'as4', name: 'Шиномонтаж R13-R17', description: 'Снятие, монтаж, балансировка 4 колёс', price: 2000, duration: '40 мин', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop', subcategory: 'Шиномонтаж' },
    ],
    reviews: [{ id: 'ar3', author: 'Павел К.', rating: 4, text: 'Всё быстро, цены адекватные.', date: '2026-02-08' }], portfolioImages: []
  },
  { id: 'a-m4', name: 'Николай Фёдоров', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop', rating: 4.9, reviewCount: 178, bio: 'Тонировка и бронирование стёкол.', location: 'Абакан', categoryId: 'a0000001-0000-0000-0000-000000000002', categoryName: 'Авто', businessId: 'bus-auto-2',
    services: [
      { id: 'as5', name: 'Тонировка стёкол', description: 'Тонировка всех стёкол плёнкой', price: 5000, duration: '2 ч', image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&h=300&fit=crop', subcategory: 'Тонировка' },
    ],
    reviews: [{ id: 'ar4', author: 'Игорь Л.', rating: 5, text: 'Тонировка отличная, плёнка качественная.', date: '2026-02-07' }], portfolioImages: []
  },
  { id: 'a-m5', name: 'Руслан Хасанов', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop', rating: 4.5, reviewCount: 62, bio: 'Химчистка салона паром.', location: 'Абакан', categoryId: 'a0000001-0000-0000-0000-000000000002', categoryName: 'Авто',
    services: [{ id: 'as6', name: 'Химчистка салона', description: 'Полная химчистка салона паром', price: 4000, duration: '3 ч', image: 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=400&h=300&fit=crop', subcategory: 'Химчистка салона' }],
    reviews: [{ id: 'ar5', author: 'Олег Р.', rating: 5, text: 'Салон как из салона!', date: '2026-02-06' }], portfolioImages: []
  },
  { id: 'a-m6', name: 'Артём Новиков', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop', rating: 4.7, reviewCount: 91, bio: 'Мойка премиум-класса. Только ручная мойка.', location: 'Абакан', categoryId: 'a0000001-0000-0000-0000-000000000002', categoryName: 'Авто',
    services: [{ id: 'as7', name: 'Ручная мойка премиум', description: 'Ручная мойка кузова + воск', price: 2000, duration: '1.5 ч', image: 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=400&h=300&fit=crop', subcategory: 'Автомойка' }],
    reviews: [{ id: 'ar6', author: 'Виктор С.', rating: 5, text: 'Ручная мойка — совсем другое дело.', date: '2026-02-05' }], portfolioImages: []
  },
  { id: 'a-m7', name: 'Тимур Абдуллаев', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&h=100&fit=crop', rating: 4.4, reviewCount: 45, bio: 'Детейлинг и защитные покрытия.', location: 'Абакан', categoryId: 'a0000001-0000-0000-0000-000000000002', categoryName: 'Авто',
    services: [{ id: 'as8', name: 'Нанесение жидкого стекла', description: 'Защитное покрытие жидким стеклом', price: 10000, duration: '5 ч', image: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=400&h=300&fit=crop', subcategory: 'Детейлинг' }],
    reviews: [{ id: 'ar7', author: 'Константин Б.', rating: 4, text: 'Хорошая работа, рекомендую.', date: '2026-02-04' }], portfolioImages: []
  },
];

const educationMasters: MockMaster[] = [
  { id: 'e-m1', name: 'Наталья Смирнова', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop', rating: 4.9, reviewCount: 312, bio: 'Преподаватель английского языка. IELTS 8.5. Подготовка к ЕГЭ и международным экзаменам.', location: 'Абакан', categoryId: 'a0000001-0000-0000-0000-000000000003', categoryName: 'Обучение', businessId: 'bus-edu-1',
    services: [
      { id: 'es1', name: 'Урок английского (60 мин)', description: 'Индивидуальный урок по программе ученика', price: 1500, duration: '1 ч', image: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400&h=300&fit=crop', subcategory: 'Английский язык' },
    ],
    reviews: [{ id: 'er1', author: 'Катерина Д.', rating: 5, text: 'Лучший преподаватель! Поступила в МГУ.', date: '2026-02-10' }], portfolioImages: []
  },
  { id: 'e-m2', name: 'Игорь Попов', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop', rating: 4.8, reviewCount: 198, bio: 'Репетитор по математике. Подготовка к ЕГЭ на 90+ баллов.', location: 'Абакан', categoryId: 'a0000001-0000-0000-0000-000000000003', categoryName: 'Обучение', businessId: 'bus-edu-1',
    services: [
      { id: 'es2', name: 'Подготовка к ЕГЭ по математике', description: 'Индивидуальное занятие, разбор задач', price: 1800, duration: '1.5 ч', image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=300&fit=crop', subcategory: 'Математика' },
    ],
    reviews: [{ id: 'er2', author: 'Олег Т.', rating: 5, text: 'Сдал ЕГЭ на 94 балла! Спасибо!', date: '2026-02-09' }], portfolioImages: []
  },
  { id: 'e-m3', name: 'Алина Васильева', avatar: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=100&h=100&fit=crop', rating: 4.7, reviewCount: 87, bio: 'Психолог, коуч. Работа с тревожностью, самооценкой, мотивацией.', location: 'Абакан', categoryId: 'a0000001-0000-0000-0000-000000000003', categoryName: 'Обучение', businessId: 'bus-edu-2',
    services: [
      { id: 'es3', name: 'Консультация психолога', description: 'Индивидуальная сессия', price: 2500, duration: '1 ч', image: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=300&fit=crop', subcategory: 'Психология' },
    ],
    reviews: [{ id: 'er3', author: 'Виктория Н.', rating: 5, text: 'Алина помогла мне справиться с тревожностью.', date: '2026-02-08' }], portfolioImages: []
  },
  { id: 'e-m4', name: 'Дмитрий Орлов', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop', rating: 4.6, reviewCount: 65, bio: 'Бизнес-тренер. Маркетинг, продажи, предпринимательство.', location: 'Абакан', categoryId: 'a0000001-0000-0000-0000-000000000003', categoryName: 'Обучение', businessId: 'bus-edu-2',
    services: [
      { id: 'es4', name: 'Бизнес-консультация', description: 'Разбор стратегии, маркетинга, продаж', price: 5000, duration: '1.5 ч', image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=300&fit=crop', subcategory: 'Бизнес и маркетинг' },
    ],
    reviews: [{ id: 'er4', author: 'Артём С.', rating: 4, text: 'Много полезного, буду внедрять.', date: '2026-02-07' }], portfolioImages: []
  },
  { id: 'e-m5', name: 'Мария Зайцева', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop', rating: 4.9, reviewCount: 145, bio: 'Преподаватель музыки. Фортепиано, вокал.', location: 'Абакан', categoryId: 'a0000001-0000-0000-0000-000000000003', categoryName: 'Обучение',
    services: [{ id: 'es5', name: 'Урок фортепиано', description: 'Обучение игре на фортепиано', price: 1200, duration: '45 мин', image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400&h=300&fit=crop', subcategory: 'Музыка' }],
    reviews: [{ id: 'er5', author: 'Лиза Г.', rating: 5, text: 'Замечательный педагог!', date: '2026-02-06' }], portfolioImages: []
  },
  { id: 'e-m6', name: 'Павел Жуков', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop', rating: 4.7, reviewCount: 102, bio: 'Репетитор по программированию. Python, JavaScript, React.', location: 'Абакан', categoryId: 'a0000001-0000-0000-0000-000000000003', categoryName: 'Обучение',
    services: [{ id: 'es6', name: 'Курс Python для начинающих', description: 'Индивидуальное обучение с нуля', price: 2000, duration: '1.5 ч', image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=300&fit=crop', subcategory: 'Программирование' }],
    reviews: [{ id: 'er6', author: 'Денис Ш.', rating: 5, text: 'За месяц освоил основы Python!', date: '2026-02-05' }], portfolioImages: []
  },
  { id: 'e-m7', name: 'Анастасия Фролова', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop', rating: 4.8, reviewCount: 88, bio: 'Преподаватель английского для детей. Игровая методика.', location: 'Абакан', categoryId: 'a0000001-0000-0000-0000-000000000003', categoryName: 'Обучение',
    services: [{ id: 'es7', name: 'Английский для детей', description: 'Игровой урок для детей 5-10 лет', price: 1000, duration: '45 мин', image: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400&h=300&fit=crop', subcategory: 'Английский язык' }],
    reviews: [{ id: 'er7', author: 'Ольга Б.', rating: 5, text: 'Ребёнок в восторге, ходит с удовольствием!', date: '2026-02-04' }], portfolioImages: []
  },
];

// Simplified remaining categories with same pattern
const createCategoryMasters = (catId: string, catName: string, data: Array<{id:string,name:string,avatar:string,rating:number,reviews:number,bio:string,busId?:string,services:MockService[]}>) : MockMaster[] =>
  data.map(d => ({
    id: d.id, name: d.name, avatar: d.avatar, rating: d.rating, reviewCount: d.reviews, bio: d.bio, location: 'Абакан',
    categoryId: catId, categoryName: catName, businessId: d.busId,
    services: d.services,
    reviews: [{ id: `${d.id}-r1`, author: 'Клиент', rating: d.rating, text: 'Отличный специалист, рекомендую!', date: '2026-02-10' }],
    portfolioImages: d.services.map(s => s.image),
  }));

const spaMasters = createCategoryMasters('a0000001-0000-0000-0000-000000000004', 'СПА', [
  { id: 'sp-m1', name: 'Михаил Петренко', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop', rating: 4.9, reviews: 267, bio: 'Массажист с 12-летним стажем. Классический, спортивный, расслабляющий массаж.', busId: 'bus-spa-1', services: [
    { id: 'sp1', name: 'Расслабляющий массаж', description: 'Массаж всего тела с маслами', price: 3000, duration: '1 ч', image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=300&fit=crop', subcategory: 'Массаж' },
  ]},
  { id: 'sp-m2', name: 'Юлия Романова', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop', rating: 4.8, reviews: 189, bio: 'SPA-терапевт. Обёртывания, скрабы, уход за телом.', busId: 'bus-spa-1', services: [
    { id: 'sp2', name: 'Шоколадное обёртывание', description: 'Обёртывание с натуральным какао', price: 3500, duration: '1.5 ч', image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&h=300&fit=crop', subcategory: 'Обёртывания' },
  ]},
  { id: 'sp-m3', name: 'Сергей Ким', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', rating: 4.7, reviews: 134, bio: 'Мастер хаммама. Традиционное парение и скрабирование.', busId: 'bus-spa-2', services: [
    { id: 'sp3', name: 'Хаммам', description: 'Парение + пилинг + мыльный массаж', price: 4000, duration: '1.5 ч', image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=300&fit=crop', subcategory: 'Хаммам' },
  ]},
  { id: 'sp-m4', name: 'Анна Черных', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop', rating: 4.6, reviews: 78, bio: 'Специалист по фитобочке и ароматерапии.', busId: 'bus-spa-2', services: [
    { id: 'sp4', name: 'Кедровая фитобочка', description: 'Сеанс в кедровой бочке с травами', price: 2000, duration: '30 мин', image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&h=300&fit=crop', subcategory: 'Фитобочка' },
  ]},
  { id: 'sp-m5', name: 'Оксана Лисицына', avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop', rating: 4.8, reviews: 156, bio: 'Массажист-реабилитолог.', services: [
    { id: 'sp5', name: 'Спортивный массаж', description: 'Восстановительный массаж после тренировок', price: 3500, duration: '1 ч', image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=300&fit=crop', subcategory: 'Массаж' },
  ]},
  { id: 'sp-m6', name: 'Артур Григорян', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop', rating: 4.5, reviews: 67, bio: 'Мастер тайского массажа.', services: [
    { id: 'sp6', name: 'Тайский массаж', description: 'Традиционный тайский массаж', price: 4000, duration: '1.5 ч', image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=300&fit=crop', subcategory: 'Массаж' },
  ]},
  { id: 'sp-m7', name: 'Вера Соловьёва', avatar: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=100&h=100&fit=crop', rating: 4.7, reviews: 92, bio: 'Ароматерапевт, специалист по релаксации.', services: [
    { id: 'sp7', name: 'Сеанс ароматерапии', description: 'Релаксация с эфирными маслами', price: 2500, duration: '1 ч', image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&h=300&fit=crop', subcategory: 'Ароматерапия' },
  ]},
]);

const photoMasters = createCategoryMasters('a0000001-0000-0000-0000-000000000005', 'Фото и видео', [
  { id: 'ph-m1', name: 'Александр Волков', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', rating: 4.9, reviews: 289, bio: 'Свадебный фотограф. 500+ свадеб за 10 лет.', busId: 'bus-photo-1', services: [
    { id: 'ph1', name: 'Свадебная съёмка', description: 'Полный свадебный день', price: 30000, duration: '10 ч', image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=300&fit=crop', subcategory: 'Свадебная съёмка' },
  ]},
  { id: 'ph-m2', name: 'Екатерина Миронова', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop', rating: 4.8, reviews: 198, bio: 'Портретный фотограф. Студийные и выездные фотосессии.', busId: 'bus-photo-1', services: [
    { id: 'ph2', name: 'Портретная фотосессия', description: 'Студийная фотосессия 1 час', price: 5000, duration: '1 ч', image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400&h=300&fit=crop', subcategory: 'Фотосессии' },
  ]},
  { id: 'ph-m3', name: 'Иван Белов', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop', rating: 4.7, reviews: 112, bio: 'Видеограф. Рекламные, промо и корпоративные ролики.', busId: 'bus-photo-2', services: [
    { id: 'ph3', name: 'Промо-ролик', description: 'Съёмка + монтаж рекламного ролика', price: 25000, duration: '2 дня', image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400&h=300&fit=crop', subcategory: 'Видеоролики' },
  ]},
  { id: 'ph-m4', name: 'Светлана Ткачёва', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop', rating: 4.6, reviews: 76, bio: 'Предметный фотограф для маркетплейсов.', busId: 'bus-photo-2', services: [
    { id: 'ph4', name: 'Предметная съёмка', description: '10 товаров на белом фоне', price: 8000, duration: '3 ч', image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400&h=300&fit=crop', subcategory: 'Предметная съёмка' },
  ]},
  { id: 'ph-m5', name: 'Роман Крылов', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop', rating: 4.9, reviews: 167, bio: 'Аэросъёмка с дрона. Недвижимость, мероприятия.', services: [
    { id: 'ph5', name: 'Аэросъёмка', description: 'Съёмка с дрона 1 час', price: 10000, duration: '1 ч', image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400&h=300&fit=crop', subcategory: 'Аэросъёмка' },
  ]},
  { id: 'ph-m6', name: 'Полина Жданова', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop', rating: 4.7, reviews: 89, bio: 'Семейный фотограф. Love-story, детские праздники.', services: [
    { id: 'ph6', name: 'Семейная фотосессия', description: 'Фотосессия семьи на природе', price: 7000, duration: '1.5 ч', image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=300&fit=crop', subcategory: 'Фотосессии' },
  ]},
  { id: 'ph-m7', name: 'Кирилл Зуев', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop', rating: 4.5, reviews: 54, bio: 'Видеооператор свадеб.', services: [
    { id: 'ph7', name: 'Свадебное видео', description: 'Съёмка свадебного дня + монтаж', price: 35000, duration: '12 ч', image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=300&fit=crop', subcategory: 'Свадебная съёмка' },
  ]},
]);

const healthMasters = createCategoryMasters('a0000001-0000-0000-0000-000000000006', 'Здоровье', [
  { id: 'h-m1', name: 'Елена Крылова', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop', rating: 4.9, reviews: 234, bio: 'Нутрициолог. Составление индивидуальных планов питания.', busId: 'bus-health-1', services: [
    { id: 'h1', name: 'Консультация нутрициолога', description: 'Анализ питания + план на месяц', price: 3000, duration: '1 ч', image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&h=300&fit=crop', subcategory: 'Нутрициология' },
  ]},
  { id: 'h-m2', name: 'Андрей Власов', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop', rating: 4.8, reviews: 178, bio: 'Остеопракт. Мягкие мануальные техники для снятия боли.', busId: 'bus-health-1', services: [
    { id: 'h2', name: 'Сеанс остеопрактики', description: 'Мягкая коррекция опорно-двигательного аппарата', price: 4000, duration: '1 ч', image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=300&fit=crop', subcategory: 'Остеопрактика' },
  ]},
  { id: 'h-m3', name: 'Ирина Савельева', avatar: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=100&h=100&fit=crop', rating: 4.7, reviews: 98, bio: 'Специалист по дыхательным практикам. Пранаяма, холотропное дыхание.', busId: 'bus-health-2', services: [
    { id: 'h3', name: 'Дыхательная практика', description: 'Групповое занятие пранаямой', price: 1500, duration: '1 ч', image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=300&fit=crop', subcategory: 'Дыхательные практики' },
  ]},
  { id: 'h-m4', name: 'Татьяна Никитина', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop', rating: 4.6, reviews: 67, bio: 'Йогатерапевт. Работа с проблемами спины, суставов.', busId: 'bus-health-2', services: [
    { id: 'h4', name: 'Йогатерапия', description: 'Индивидуальное занятие', price: 2500, duration: '1 ч', image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=300&fit=crop', subcategory: 'Йогатерапия' },
  ]},
  { id: 'h-m5', name: 'Виталий Громов', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop', rating: 4.8, reviews: 145, bio: 'Оздоровительный массаж. Снятие мышечных зажимов.', services: [
    { id: 'h5', name: 'Оздоровительный массаж', description: 'Массаж спины и шеи', price: 2500, duration: '45 мин', image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=300&fit=crop', subcategory: 'Оздоровительный массаж' },
  ]},
  { id: 'h-m6', name: 'Лариса Орлова', avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop', rating: 4.5, reviews: 56, bio: 'Нутрициолог. Детокс-программы.', services: [
    { id: 'h6', name: 'Детокс-программа', description: 'Составление детокс-плана на неделю', price: 2000, duration: '45 мин', image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&h=300&fit=crop', subcategory: 'Нутрициология' },
  ]},
  { id: 'h-m7', name: 'Антон Марков', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop', rating: 4.7, reviews: 89, bio: 'Практик холотропного дыхания.', services: [
    { id: 'h7', name: 'Холотропное дыхание', description: 'Групповой сеанс', price: 2000, duration: '2 ч', image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=300&fit=crop', subcategory: 'Дыхательные практики' },
  ]},
]);

const fitnessMasters = createCategoryMasters('a0000001-0000-0000-0000-000000000007', 'Фитнес', [
  { id: 'f-m1', name: 'Денис Громов', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', rating: 4.9, reviews: 312, bio: 'Персональный тренер. Силовые тренировки, набор массы, сушка.', busId: 'bus-fit-1', services: [
    { id: 'f1', name: 'Персональная тренировка', description: 'Силовая тренировка в зале', price: 2500, duration: '1 ч', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&fit=crop', subcategory: 'Силовые тренировки' },
  ]},
  { id: 'f-m2', name: 'Анастасия Ким', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop', rating: 4.8, reviews: 245, bio: 'Инструктор йоги. Хатха, виньяса, медитация.', busId: 'bus-fit-1', services: [
    { id: 'f2', name: 'Занятие йогой', description: 'Групповое занятие хатха-йогой', price: 800, duration: '1.5 ч', image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=300&fit=crop', subcategory: 'Йога' },
  ]},
  { id: 'f-m3', name: 'Владимир Сергеев', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop', rating: 4.7, reviews: 167, bio: 'Тренер по боксу. Подготовка к соревнованиям и фитнес-бокс.', busId: 'bus-fit-2', services: [
    { id: 'f3', name: 'Тренировка по боксу', description: 'Персональная тренировка по боксу', price: 2000, duration: '1 ч', image: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=400&h=300&fit=crop', subcategory: 'Бокс и единоборства' },
  ]},
  { id: 'f-m4', name: 'Ксения Данилова', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop', rating: 4.8, reviews: 198, bio: 'Тренер по пилатесу. Реформер, классический мат.', busId: 'bus-fit-2', services: [
    { id: 'f4', name: 'Пилатес на реформере', description: 'Индивидуальное занятие на реформере', price: 2500, duration: '1 ч', image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=300&fit=crop', subcategory: 'Пилатес' },
  ]},
  { id: 'f-m5', name: 'Егор Панин', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop', rating: 4.6, reviews: 89, bio: 'Кроссфит-тренер. Функциональные тренировки.', services: [
    { id: 'f5', name: 'Кроссфит тренировка', description: 'Групповая функциональная тренировка', price: 700, duration: '1 ч', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&fit=crop', subcategory: 'Кроссфит' },
  ]},
  { id: 'f-m6', name: 'Диана Летова', avatar: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=100&h=100&fit=crop', rating: 4.9, reviews: 210, bio: 'Тренер по танцам. Латина, бачата, сальса.', services: [
    { id: 'f6', name: 'Урок танцев', description: 'Групповое занятие по бачате', price: 600, duration: '1 ч', image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=300&fit=crop', subcategory: 'Танцы' },
  ]},
  { id: 'f-m7', name: 'Марат Хайруллин', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&h=100&fit=crop', rating: 4.5, reviews: 78, bio: 'Инструктор по растяжке и стретчингу.', services: [
    { id: 'f7', name: 'Стретчинг', description: 'Групповое занятие по растяжке', price: 600, duration: '1 ч', image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=300&fit=crop', subcategory: 'Растяжка' },
  ]},
]);

const homeMasters = createCategoryMasters('a0000001-0000-0000-0000-000000000008', 'Дом', [
  { id: 'hm-m1', name: 'Олег Васильев', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop', rating: 4.8, reviews: 234, bio: 'Сантехник с 15-летним опытом. Установка, ремонт, замена.', busId: 'bus-home-1', services: [
    { id: 'hm1', name: 'Ремонт сантехники', description: 'Устранение течи, замена смесителя', price: 2000, duration: '1 ч', image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=300&fit=crop', subcategory: 'Сантехника' },
  ]},
  { id: 'hm-m2', name: 'Пётр Козлов', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop', rating: 4.7, reviews: 178, bio: 'Электрик. Электромонтаж, ремонт проводки.', busId: 'bus-home-1', services: [
    { id: 'hm2', name: 'Электромонтаж', description: 'Установка розеток, выключателей, светильников', price: 1500, duration: '1 ч', image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=300&fit=crop', subcategory: 'Электрика' },
  ]},
  { id: 'hm-m3', name: 'Наталья Ефремова', avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=100&h=100&fit=crop', rating: 4.9, reviews: 312, bio: 'Профессиональный клининг. Генеральная и регулярная уборка.', busId: 'bus-home-2', services: [
    { id: 'hm3', name: 'Генеральная уборка', description: 'Полная уборка квартиры', price: 5000, duration: '4 ч', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop', subcategory: 'Уборка' },
  ]},
  { id: 'hm-m4', name: 'Андрей Степанов', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop', rating: 4.6, reviews: 89, bio: 'Мастер мелкого ремонта. Сборка мебели, навес полок.', busId: 'bus-home-2', services: [
    { id: 'hm4', name: 'Мелкий ремонт', description: 'Сборка мебели, навес полок, карнизов', price: 1500, duration: '1 ч', image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=300&fit=crop', subcategory: 'Мелкий ремонт' },
  ]},
  { id: 'hm-m5', name: 'Ирина Павлова', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop', rating: 4.8, reviews: 167, bio: 'Клининг после ремонта. Профессиональное оборудование.', services: [
    { id: 'hm5', name: 'Уборка после ремонта', description: 'Полная уборка после строительных работ', price: 8000, duration: '6 ч', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop', subcategory: 'Клининг после ремонта' },
  ]},
  { id: 'hm-m6', name: 'Виктор Зуев', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop', rating: 4.5, reviews: 56, bio: 'Сантехник. Установка бойлеров, стиральных машин.', services: [
    { id: 'hm6', name: 'Установка техники', description: 'Подключение стиральной/посудомоечной машины', price: 2500, duration: '1.5 ч', image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=300&fit=crop', subcategory: 'Сантехника' },
  ]},
  { id: 'hm-m7', name: 'Григорий Чернов', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', rating: 4.7, reviews: 102, bio: 'Электрик. Диагностика и ремонт электропроводки.', services: [
    { id: 'hm7', name: 'Диагностика проводки', description: 'Полная проверка электросети квартиры', price: 3000, duration: '2 ч', image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=300&fit=crop', subcategory: 'Электрика' },
  ]},
]);

// All masters combined
export const allMasters: MockMaster[] = [
  ...beautyMasters, ...autoMasters, ...educationMasters, ...spaMasters,
  ...photoMasters, ...healthMasters, ...fitnessMasters, ...homeMasters,
];

// All businesses
export const allBusinesses: MockBusiness[] = [
  // Beauty
  { id: 'bus-beauty-1', name: 'Beauty Lab Абакан', image: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=400&h=300&fit=crop', categoryId: 'a0000001-0000-0000-0000-000000000001', categoryName: 'Бьюти-услуги', rating: 4.9, reviewCount: 329, location: 'Абакан', address: 'ул. Ленина, 15', description: 'Премиальный салон красоты с командой профессионалов. Стрижки, окрашивания, маникюр, педикюр.', specialistCount: 2, serviceCount: 4, masters: ['b-m1', 'b-m2'] },
  { id: 'bus-beauty-2', name: 'Гламур Студия', image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop', categoryId: 'a0000001-0000-0000-0000-000000000001', categoryName: 'Бьюти-услуги', rating: 4.8, reviewCount: 301, location: 'Абакан', address: 'ул. Щетинкина, 42', description: 'Студия косметологии и бровей. Профессиональный уход за лицом и взглядом.', specialistCount: 2, serviceCount: 3, masters: ['b-m3', 'b-m4'] },
  // Auto
  { id: 'bus-auto-1', name: 'АвтоБлеск', image: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=400&h=300&fit=crop', categoryId: 'a0000001-0000-0000-0000-000000000002', categoryName: 'Авто', rating: 4.8, reviewCount: 390, location: 'Абакан', address: 'ул. Кирова, 88', description: 'Детейлинг-центр и автомойка. Профессиональный уход за автомобилем.', specialistCount: 2, serviceCount: 3, masters: ['a-m1', 'a-m2'] },
  { id: 'bus-auto-2', name: 'ШинСервис', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop', categoryId: 'a0000001-0000-0000-0000-000000000002', categoryName: 'Авто', rating: 4.7, reviewCount: 267, location: 'Абакан', address: 'ул. Крылова, 5', description: 'Шиномонтаж и тонировка. Быстро, качественно, с гарантией.', specialistCount: 2, serviceCount: 2, masters: ['a-m3', 'a-m4'] },
  // Education
  { id: 'bus-edu-1', name: 'Знание+', image: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400&h=300&fit=crop', categoryId: 'a0000001-0000-0000-0000-000000000003', categoryName: 'Обучение', rating: 4.9, reviewCount: 510, location: 'Абакан', address: 'пр. Ленина, 67', description: 'Образовательный центр. Подготовка к ЕГЭ, иностранные языки.', specialistCount: 2, serviceCount: 2, masters: ['e-m1', 'e-m2'] },
  { id: 'bus-edu-2', name: 'Развитие', image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=300&fit=crop', categoryId: 'a0000001-0000-0000-0000-000000000003', categoryName: 'Обучение', rating: 4.7, reviewCount: 152, location: 'Абакан', address: 'ул. Пушкина, 23', description: 'Центр психологии и бизнес-обучения.', specialistCount: 2, serviceCount: 2, masters: ['e-m3', 'e-m4'] },
  // SPA
  { id: 'bus-spa-1', name: 'Релакс SPA', image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=300&fit=crop', categoryId: 'a0000001-0000-0000-0000-000000000004', categoryName: 'СПА', rating: 4.9, reviewCount: 456, location: 'Абакан', address: 'ул. Вяткина, 18', description: 'SPA-центр с массажными и обёртывающими процедурами.', specialistCount: 2, serviceCount: 2, masters: ['sp-m1', 'sp-m2'] },
  { id: 'bus-spa-2', name: 'Восточный SPA', image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&h=300&fit=crop', categoryId: 'a0000001-0000-0000-0000-000000000004', categoryName: 'СПА', rating: 4.7, reviewCount: 212, location: 'Абакан', address: 'ул. Хакасская, 56', description: 'Хаммам и фитобочка. Восточные SPA-процедуры.', specialistCount: 2, serviceCount: 2, masters: ['sp-m3', 'sp-m4'] },
  // Photo
  { id: 'bus-photo-1', name: 'ФотоМир', image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400&h=300&fit=crop', categoryId: 'a0000001-0000-0000-0000-000000000005', categoryName: 'Фото и видео', rating: 4.9, reviewCount: 487, location: 'Абакан', address: 'ул. Советская, 31', description: 'Фотостудия полного цикла. Свадьбы, портреты, коммерческая съёмка.', specialistCount: 2, serviceCount: 2, masters: ['ph-m1', 'ph-m2'] },
  { id: 'bus-photo-2', name: 'ВидеоПро', image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400&h=300&fit=crop', categoryId: 'a0000001-0000-0000-0000-000000000005', categoryName: 'Фото и видео', rating: 4.7, reviewCount: 188, location: 'Абакан', address: 'ул. Чертыгашева, 12', description: 'Видеопроизводство и предметная съёмка для бизнеса.', specialistCount: 2, serviceCount: 2, masters: ['ph-m3', 'ph-m4'] },
  // Health
  { id: 'bus-health-1', name: 'Здоровье+', image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&h=300&fit=crop', categoryId: 'a0000001-0000-0000-0000-000000000006', categoryName: 'Здоровье', rating: 4.9, reviewCount: 412, location: 'Абакан', address: 'ул. Торосова, 7', description: 'Центр оздоровления. Нутрициология и остеопрактика.', specialistCount: 2, serviceCount: 2, masters: ['h-m1', 'h-m2'] },
  { id: 'bus-health-2', name: 'Гармония', image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=300&fit=crop', categoryId: 'a0000001-0000-0000-0000-000000000006', categoryName: 'Здоровье', rating: 4.7, reviewCount: 165, location: 'Абакан', address: 'ул. Маршала Жукова, 34', description: 'Центр дыхательных практик и йогатерапии.', specialistCount: 2, serviceCount: 2, masters: ['h-m3', 'h-m4'] },
  // Fitness
  { id: 'bus-fit-1', name: 'FitZone Абакан', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&fit=crop', categoryId: 'a0000001-0000-0000-0000-000000000007', categoryName: 'Фитнес', rating: 4.9, reviewCount: 557, location: 'Абакан', address: 'ул. Ленина, 100', description: 'Фитнес-клуб с персональными тренерами. Силовые, йога, групповые.', specialistCount: 2, serviceCount: 2, masters: ['f-m1', 'f-m2'] },
  { id: 'bus-fit-2', name: 'СпортЛайф', image: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=400&h=300&fit=crop', categoryId: 'a0000001-0000-0000-0000-000000000007', categoryName: 'Фитнес', rating: 4.8, reviewCount: 365, location: 'Абакан', address: 'ул. Кирова, 22', description: 'Бокс, пилатес, единоборства. Тренировки для всех уровней.', specialistCount: 2, serviceCount: 2, masters: ['f-m3', 'f-m4'] },
  // Home
  { id: 'bus-home-1', name: 'МастерДом', image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=300&fit=crop', categoryId: 'a0000001-0000-0000-0000-000000000008', categoryName: 'Дом', rating: 4.8, reviewCount: 412, location: 'Абакан', address: 'ул. Аскизская, 10', description: 'Сантехнические и электромонтажные работы. Вызов мастера на дом.', specialistCount: 2, serviceCount: 2, masters: ['hm-m1', 'hm-m2'] },
  { id: 'bus-home-2', name: 'Чистый Дом', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop', categoryId: 'a0000001-0000-0000-0000-000000000008', categoryName: 'Дом', rating: 4.9, reviewCount: 401, location: 'Абакан', address: 'ул. Комарова, 15', description: 'Профессиональный клининг и мелкий ремонт.', specialistCount: 2, serviceCount: 2, masters: ['hm-m3', 'hm-m4'] },
];

export const categoryMap: Record<string, { name: string; icon: string }> = {
  'a0000001-0000-0000-0000-000000000001': { name: 'Бьюти-услуги', icon: 'Scissors' },
  'a0000001-0000-0000-0000-000000000002': { name: 'Авто', icon: 'Car' },
  'a0000001-0000-0000-0000-000000000003': { name: 'Обучение', icon: 'GraduationCap' },
  'a0000001-0000-0000-0000-000000000004': { name: 'СПА', icon: 'Sparkles' },
  'a0000001-0000-0000-0000-000000000005': { name: 'Фото и видео', icon: 'Camera' },
  'a0000001-0000-0000-0000-000000000006': { name: 'Здоровье', icon: 'Heart' },
  'a0000001-0000-0000-0000-000000000007': { name: 'Фитнес', icon: 'Dumbbell' },
  'a0000001-0000-0000-0000-000000000008': { name: 'Дом', icon: 'Home' },
  'a0000001-0000-0000-0000-000000000009': { name: 'Прочие услуги', icon: 'LayoutGrid' },
};

export const getMastersByCategory = (categoryId: string) => allMasters.filter(m => m.categoryId === categoryId);
export const getBusinessesByCategory = (categoryId: string) => allBusinesses.filter(b => b.categoryId === categoryId);
export const getMasterById = (id: string) => allMasters.find(m => m.id === id);
export const getBusinessById = (id: string) => allBusinesses.find(b => b.id === id);
export const getBusinessMasters = (businessId: string) => allMasters.filter(m => m.businessId === businessId);
export const getIndependentMasters = (categoryId: string) => allMasters.filter(m => m.categoryId === categoryId && !m.businessId);
