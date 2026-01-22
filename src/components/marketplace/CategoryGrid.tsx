import { motion } from "framer-motion";
import { 
  Scissors, 
  Dumbbell, 
  Heart, 
  Sparkles, 
  Camera, 
  GraduationCap,
  Car,
  Home
} from "lucide-react";

const categories = [
  { icon: Scissors, name: "Красота", count: 1234, color: "bg-pink-100 text-pink-600" },
  { icon: Dumbbell, name: "Фитнес", count: 567, color: "bg-emerald-light text-primary" },
  { icon: Heart, name: "Здоровье", count: 890, color: "bg-red-100 text-red-500" },
  { icon: Sparkles, name: "СПА", count: 456, color: "bg-purple-100 text-purple-600" },
  { icon: Camera, name: "Фото", count: 234, color: "bg-blue-100 text-blue-600" },
  { icon: GraduationCap, name: "Обучение", count: 789, color: "bg-amber-100 text-amber-dark" },
  { icon: Car, name: "Авто", count: 345, color: "bg-slate-100 text-slate-600" },
  { icon: Home, name: "Дом", count: 678, color: "bg-orange-100 text-orange-600" },
];

const CategoryGrid = () => {
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
              className="flex flex-col items-center gap-2 min-w-[80px] p-4 rounded-xl hover:bg-surface transition-colors"
            >
              <div className={`w-14 h-14 rounded-xl ${category.color} flex items-center justify-center`}>
                <category.icon className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium text-foreground whitespace-nowrap">
                {category.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {category.count}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoryGrid;
