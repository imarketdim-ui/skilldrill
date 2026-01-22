import { motion } from "framer-motion";
import ServiceCard from "./ServiceCard";
import BusinessCard from "./BusinessCard";

// Mock data for services
const mockServices = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop",
    title: "Маникюр с покрытием гель-лак",
    businessName: "Beauty Lab",
    rating: 4.9,
    reviewCount: 234,
    price: 2500,
    duration: "1.5 ч",
    location: "Центр",
    specialistName: "Анна К.",
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=300&fit=crop",
    title: "Массаж спины расслабляющий",
    businessName: "Wellness SPA",
    rating: 4.8,
    reviewCount: 156,
    price: 3500,
    duration: "1 ч",
    location: "Арбат",
    specialistName: "Михаил П.",
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1622288432450-277d0fef5ed6?w=400&h=300&fit=crop",
    title: "Мужская стрижка + укладка",
    businessName: "Barbershop №1",
    rating: 4.7,
    reviewCount: 89,
    price: 1800,
    duration: "45 мин",
    location: "Тверская",
    specialistName: "Дмитрий В.",
  },
  {
    id: 4,
    image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&h=300&fit=crop",
    title: "Чистка лица ультразвуковая",
    businessName: "Skin Care Studio",
    rating: 4.9,
    reviewCount: 312,
    price: 4200,
    duration: "1.5 ч",
    location: "Патриаршие",
    specialistName: "Елена С.",
  },
];

// Mock data for businesses
const mockBusinesses = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=400&h=300&fit=crop",
    name: "Beauty Lab Premium",
    category: "Салон красоты",
    rating: 4.9,
    reviewCount: 1234,
    location: "Москва, Тверская 15",
    specialistCount: 12,
    serviceCount: 45,
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1600948836101-f9ffda59d250?w=400&h=300&fit=crop",
    name: "FitZone Gym",
    category: "Фитнес",
    rating: 4.8,
    reviewCount: 567,
    location: "Москва, Арбат 22",
    specialistCount: 8,
    serviceCount: 24,
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1559599101-f09722fb4948?w=400&h=300&fit=crop",
    name: "Classic Barbershop",
    category: "Барбершоп",
    rating: 4.7,
    reviewCount: 234,
    location: "Москва, Сретенка 8",
    specialistCount: 5,
    serviceCount: 12,
  },
];

const PopularServices = () => {
  return (
    <section className="section-padding bg-surface">
      <div className="container-wide">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10"
        >
          <div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
              Популярные услуги
            </h2>
            <p className="text-muted-foreground">
              Лучшие предложения от проверенных специалистов
            </p>
          </div>
          <a 
            href="#" 
            className="text-primary font-medium hover:underline"
          >
            Смотреть все →
          </a>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {mockServices.map((service) => (
            <ServiceCard key={service.id} {...service} />
          ))}
        </div>

        {/* Popular Businesses */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10"
        >
          <div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
              Популярные заведения
            </h2>
            <p className="text-muted-foreground">
              Проверенные бизнесы с высоким рейтингом
            </p>
          </div>
          <a 
            href="#" 
            className="text-primary font-medium hover:underline"
          >
            Смотреть все →
          </a>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockBusinesses.map((business) => (
            <BusinessCard key={business.id} {...business} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default PopularServices;
