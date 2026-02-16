import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Scissors, 
  Dumbbell, 
  Heart, 
  Sparkles, 
  Camera, 
  GraduationCap,
  Car,
  Home,
  MoreHorizontal
} from "lucide-react";

const categories = [
  { icon: Scissors, name: "Бьюти", id: "a0000001-0000-0000-0000-000000000001", count: 1234, color: "bg-pink-100 text-pink-600" },
  { icon: Dumbbell, name: "Фитнес", id: "a0000001-0000-0000-0000-000000000007", count: 567, color: "bg-emerald-100 text-emerald-600" },
  { icon: Heart, name: "Здоровье", id: "a0000001-0000-0000-0000-000000000006", count: 890, color: "bg-red-100 text-red-500" },
  { icon: Sparkles, name: "СПА", id: "a0000001-0000-0000-0000-000000000004", count: 456, color: "bg-purple-100 text-purple-600" },
  { icon: Camera, name: "Фото и видео", id: "a0000001-0000-0000-0000-000000000005", count: 234, color: "bg-blue-100 text-blue-600" },
  { icon: GraduationCap, name: "Обучение", id: "a0000001-0000-0000-0000-000000000003", count: 789, color: "bg-amber-100 text-amber-600" },
  { icon: Car, name: "Авто", id: "a0000001-0000-0000-0000-000000000002", count: 345, color: "bg-slate-100 text-slate-600" },
  { icon: Home, name: "Дом", id: "a0000001-0000-0000-0000-000000000008", count: 678, color: "bg-orange-100 text-orange-600" },
  { icon: MoreHorizontal, name: "Прочие", id: "a0000001-0000-0000-0000-000000000009", count: 123, color: "bg-gray-100 text-gray-600" },
];

const CategoryGrid = () => {
  const navigate = useNavigate();

  return (
    <section className="py-12 bg-background border-b border-border/50">
      <div className="container-wide">
        <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((category, index) => (
            <motion.button
              key={category.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -2 }}
              onClick={() => navigate(`/catalog/${category.id}`)}
              className="flex flex-col items-center gap-2 min-w-[80px] p-4 rounded-xl hover:bg-surface transition-colors cursor-pointer"
            >
              <div className={`w-14 h-14 rounded-xl ${category.color} flex items-center justify-center`}>
                <category.icon className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium text-foreground whitespace-nowrap">
                {category.name}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoryGrid;
