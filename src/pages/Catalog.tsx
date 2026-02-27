import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Search, MapPin, Star, Loader2, SlidersHorizontal, X, ArrowUpDown,
  Check, Map as MapIcon, LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import CatalogMap, { type MapMaster } from "@/components/marketplace/CatalogMap";
import MasterCardItem from "@/components/marketplace/MasterCardItem";
import BusinessCardItem from "@/components/marketplace/BusinessCardItem";
import { supabase } from "@/integrations/supabase/client";

// Categories from DB
const CATEGORY_ALL = "all";

type Category = { id: string; name: string };

type MasterItem = {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  rating: number | null;
  review_count: number;
  location: string | null;
  category_id: string | null;
  category_name: string | null;
  min_price: number | null;
  hashtags: string[] | null;
  latitude: number | null;
  longitude: number | null;
};

type BusinessItem = {
  id: string;
  name: string;
  image: string | null;
  rating: number | null;
  review_count: number;
  address: string | null;
  description: string | null;
  category_name: string | null;
  specialist_count: number;
  service_count: number;
  latitude: number | null;
  longitude: number | null;
};

const sortOptions = [
  { value: "popular", label: "По популярности" },
  { value: "price_asc", label: "Сначала дешёвые" },
  { value: "price_desc", label: "Сначала дорогие" },
  { value: "rating", label: "По рейтингу" },
  { value: "newest", label: "Новинки" },
];

const stemRu = (word: string) =>
  word.toLowerCase().replace(/(ами|ями|ов|ев|ей|ий|ой|ый|ая|яя|ое|ее|ие|ые|ого|его|ому|ему|ых|их|ую|юю|ём|ем|ах|ях|ам|ям|ой|ей|ию|ью|ок|ек|ик|ки|ка|ку|ке|ек|ок|и|ы|у|е|а|о|ь)$/, "");

const parseFiltersFromURL = (params: URLSearchParams) => ({
  searchQuery: params.get("q") || "",
  categoryFilter: params.get("category") || CATEGORY_ALL,
  tab: (params.get("tab") || "masters") as "masters" | "businesses",
  priceMin: parseInt(params.get("priceMin") || "0") || 0,
  priceMax: parseInt(params.get("priceMax") || "50000") || 50000,
  sortBy: params.get("sort") || "popular",
  hashtags: params.get("tags") ? params.get("tags")!.split(",") : [],
});

const Catalog = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initial = parseFiltersFromURL(searchParams);

  const [searchQuery, setSearchQuery] = useState(initial.searchQuery);
  const [categoryFilter, setCategoryFilter] = useState(initial.categoryFilter);
  const [tab, setTab] = useState<"masters" | "businesses" | "services">(initial.tab as any || "masters");
  const [priceRange, setPriceRange] = useState<[number, number]>([initial.priceMin, initial.priceMax]);
  const [sortBy, setSortBy] = useState(initial.sortBy);
  const [selectedTags, setSelectedTags] = useState<string[]>(initial.hashtags);

  const [categories, setCategories] = useState<Category[]>([]);
  const [masters, setMasters] = useState<MasterItem[]>([]);
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  // Sync filters → URL
  const syncURL = useCallback(() => {
    const p = new URLSearchParams();
    if (searchQuery) p.set("q", searchQuery);
    if (categoryFilter !== CATEGORY_ALL) p.set("category", categoryFilter);
    if (tab !== "masters") p.set("tab", tab);
    if (priceRange[0] > 0) p.set("priceMin", String(priceRange[0]));
    if (priceRange[1] < 50000) p.set("priceMax", String(priceRange[1]));
    if (sortBy !== "popular") p.set("sort", sortBy);
    if (selectedTags.length > 0) p.set("tags", selectedTags.join(","));
    setSearchParams(p, { replace: true });
  }, [searchQuery, categoryFilter, tab, priceRange, sortBy, selectedTags, setSearchParams]);

  useEffect(() => { syncURL(); }, [syncURL]);

  // Fetch categories
  useEffect(() => {
    const fetchCats = async () => {
      const { data } = await supabase.from("service_categories").select("id, name").order("name");
      setCategories(data || []);
    };
    fetchCats();
  }, []);

  // Fetch masters
  useEffect(() => {
    const fetchMasters = async () => {
      setIsLoading(true);
      // Fetch master profiles with profiles and services
      let query = supabase
        .from("master_profiles")
        .select(`
          id, user_id, description, address, category_id, hashtags, latitude, longitude, is_active,
          profiles!master_profiles_user_id_fkey(first_name, last_name, avatar_url, bio),
          service_categories!master_profiles_category_id_fkey(name)
        `)
        .eq("is_active", true)
        .eq("moderation_status", "approved");

      if (categoryFilter !== CATEGORY_ALL) {
        query = query.eq("category_id", categoryFilter);
      }

      const { data } = await query.limit(100);

      // Fetch services for all masters in parallel
      const userIds = (data || []).map((mp: any) => mp.user_id);
      let servicesMap: Record<string, number[]> = {};
      if (userIds.length > 0) {
        const { data: svcData } = await supabase
          .from("services")
          .select("master_id, price")
          .in("master_id", userIds)
          .eq("is_active", true);
        (svcData || []).forEach((s: any) => {
          if (!servicesMap[s.master_id]) servicesMap[s.master_id] = [];
          if (s.price > 0) servicesMap[s.master_id].push(s.price);
        });
      }

      const mapped: MasterItem[] = (data || []).map((mp: any) => {
        const profile = mp.profiles;
        const prices = servicesMap[mp.user_id] || [];
        return {
          id: mp.id,
          user_id: mp.user_id,
          name: [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Мастер",
          avatar_url: profile?.avatar_url,
          bio: mp.description || profile?.bio,
          rating: null,
          review_count: 0,
          location: mp.address || "Абакан",
          category_id: mp.category_id,
          category_name: mp.service_categories?.name || null,
          min_price: prices.length > 0 ? Math.min(...prices) : null,
          hashtags: mp.hashtags,
          latitude: mp.latitude,
          longitude: mp.longitude,
        };
      });

      setMasters(mapped);
      setIsLoading(false);
    };
    fetchMasters();
  }, [categoryFilter]);

  // Fetch businesses
  useEffect(() => {
    const fetchBusinesses = async () => {
      const { data } = await supabase
        .from("business_locations")
        .select(`
          id, name, address, description, hashtags, latitude, longitude, is_active,
          interior_photos, exterior_photos
        `)
        .eq("is_active", true)
        .eq("moderation_status", "approved")
        .limit(100);

      const mapped: BusinessItem[] = (data || []).map((bl: any) => {
        const photos = [...(bl.interior_photos || []), ...(bl.exterior_photos || [])];
        return {
          id: bl.id,
          name: bl.name,
          image: photos[0] || null,
          rating: null,
          review_count: 0,
          address: bl.address || "Абакан",
          description: bl.description,
          category_name: null,
          specialist_count: 0,
          service_count: 0,
          latitude: bl.latitude,
          longitude: bl.longitude,
        };
      });

      setBusinesses(mapped);
    };
    fetchBusinesses();
  }, []);

  // Available hashtags
  const availableTags = useMemo(() => {
    const counts = new Map<string, number>();
    masters.forEach((m) => (m.hashtags || []).forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([name]) => name);
  }, [masters]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Filter masters
  const filteredMasters = useMemo(() => {
    return masters
      .filter((m) => {
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const stem = stemRu(searchQuery);
          const match =
            m.name.toLowerCase().includes(q) ||
            stemRu(m.name).includes(stem) ||
            (m.bio || "").toLowerCase().includes(q) ||
            (m.hashtags || []).some((h) => h.toLowerCase().includes(q) || stemRu(h).includes(stem));
          if (!match) return false;
        }
        if (m.min_price != null) {
          if (m.min_price < priceRange[0] || m.min_price > priceRange[1]) return false;
        }
        if (selectedTags.length > 0) {
          const mTags = (m.hashtags || []).map((t) => t.toLowerCase());
          if (!selectedTags.every((st) => mTags.some((mt) => mt.includes(st.toLowerCase())))) return false;
        }
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "price_asc": return (a.min_price || 0) - (b.min_price || 0);
          case "price_desc": return (b.min_price || 0) - (a.min_price || 0);
          case "rating": return (b.rating || 0) - (a.rating || 0);
          default: return 0;
        }
      });
  }, [masters, searchQuery, priceRange, selectedTags, sortBy]);

  // Filter businesses
  const filteredBusinesses = useMemo(() => {
    return businesses.filter((b) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return b.name.toLowerCase().includes(q) || (b.description || "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [businesses, searchQuery]);

  const activeFiltersCount = [
    priceRange[0] > 0 || priceRange[1] < 50000,
    selectedTags.length > 0,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setPriceRange([0, 50000]);
    setSelectedTags([]);
    setSortBy("popular");
    setSearchQuery("");
    setCategoryFilter(CATEGORY_ALL);
  };

  // Map items
  const mapItems: MapMaster[] = useMemo(() => {
    if (tab === "masters") {
      return filteredMasters
        .filter((m) => m.latitude && m.longitude)
        .map((m) => ({
          id: m.user_id,
          name: m.name,
          latitude: m.latitude,
          longitude: m.longitude,
          avatar_url: m.avatar_url,
          rating: m.rating,
          review_count: m.review_count,
          min_price: m.min_price,
          category_name: m.category_name,
          type: "master" as const,
        }));
    }
    return filteredBusinesses
      .filter((b) => b.latitude && b.longitude)
      .map((b) => ({
        id: b.id,
        name: b.name,
        latitude: b.latitude,
        longitude: b.longitude,
        avatar_url: b.image,
        rating: b.rating,
        min_price: null,
        category_name: b.category_name,
        type: "business" as const,
      }));
  }, [tab, filteredMasters, filteredBusinesses]);

  const currentItems = tab === "masters" ? filteredMasters : filteredBusinesses;
  const currentCount = currentItems.length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Поиск услуг
            </h1>
            <p className="text-lg text-muted-foreground">
              Найдите нужную услугу среди мастеров и организаций Абакана
            </p>
          </div>

          {/* Search & Filters Bar */}
          <div className="max-w-4xl mx-auto mb-6">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Поиск по мастерам, услугам, хештегам..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 text-base"
                />
              </div>
              <Button
                variant={showFilters ? "default" : "outline"}
                className="h-12 gap-2 relative"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Фильтры
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Expandable Filters Panel */}
          {showFilters && (
            <div className="max-w-4xl mx-auto mb-6 bg-card border border-border rounded-xl p-5 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground text-sm">Параметры поиска</h3>
                <button onClick={() => setShowFilters(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Sort */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Сортировка</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-10">
                      <ArrowUpDown className="w-3.5 h-3.5 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Цена: {priceRange[0].toLocaleString("ru-RU")} – {priceRange[1].toLocaleString("ru-RU")} ₽
                  </label>
                  <Slider
                    value={priceRange}
                    onValueChange={(v) => setPriceRange(v as [number, number])}
                    min={0}
                    max={50000}
                    step={500}
                    className="mt-3"
                  />
                </div>
              </div>

              {/* Hashtags */}
              {availableTags.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Теги {selectedTags.length > 0 && `(${selectedTags.length})`}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.slice(0, showAllTags ? undefined : 12).map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-foreground border-border hover:border-primary/50"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          {tag}
                        </button>
                      );
                    })}
                    {availableTags.length > 12 && (
                      <button
                        onClick={() => setShowAllTags(!showAllTags)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium text-primary hover:underline"
                      >
                        {showAllTags ? "Свернуть" : `Ещё ${availableTags.length - 12}`}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {activeFiltersCount > 0 && (
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground">
                    Сбросить все фильтры
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Category Tabs + View Toggle */}
          <div className="flex flex-wrap items-center gap-2 mb-8">
            <Button
              variant={categoryFilter === CATEGORY_ALL ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter(CATEGORY_ALL)}
            >
              Все
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={categoryFilter === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter(cat.id)}
              >
                {cat.name}
              </Button>
            ))}

            <span className="text-sm text-muted-foreground ml-2">
              {currentCount} {currentCount === 1 ? "результат" : currentCount < 5 ? "результата" : "результатов"}
            </span>

            <div className="ml-auto flex gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                className="gap-1.5"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Список</span>
              </Button>
              <Button
                variant={viewMode === "map" ? "default" : "outline"}
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setViewMode("map");
                  setTimeout(() => {
                    document.getElementById("map-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 100);
                }}
              >
                <MapIcon className="w-4 h-4" />
                <span className="hidden sm:inline">На карте</span>
                {mapItems.length > 0 && (
                  <span className="bg-primary-foreground/20 text-primary-foreground rounded-full px-1.5 py-0.5 text-xs font-bold leading-none">
                    {mapItems.length}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Tab Toggle */}
          <div className="flex gap-2 mb-6">
            <Button variant={tab === "masters" ? "default" : "outline"} size="sm" onClick={() => setTab("masters")}>
              Мастера ({filteredMasters.length})
            </Button>
            <Button variant={tab === "businesses" ? "default" : "outline"} size="sm" onClick={() => setTab("businesses")}>
              Организации ({filteredBusinesses.length})
            </Button>
            <Button variant={tab === "services" ? "default" : "outline"} size="sm" onClick={() => setTab("services" as any)}>
              Услуги
            </Button>
          </div>

          {/* Results */}
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : viewMode === "map" ? (
            <div id="map-section" className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary border border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapIcon className="w-4 h-4 text-primary" />
                  {mapItems.length > 0
                    ? `${mapItems.length} объект${mapItems.length === 1 ? "" : mapItems.length < 5 ? "а" : "ов"} на карте`
                    : "Нет объектов с координатами"}
                </div>
                <Button variant="outline" size="sm" onClick={() => setViewMode("grid")}>
                  ← Вернуться к списку
                </Button>
              </div>

              <CatalogMap items={mapItems} />

              {/* Mini cards below map */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mapItems.map((item) => (
                  <Card
                    key={item.id}
                    className="overflow-hidden hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => navigate(item.type === "master" ? `/master/${item.id}` : `/business/${item.id}`)}
                  >
                    <CardContent className="p-4 flex gap-3">
                      <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-secondary">
                        {item.avatar_url ? (
                          <img src={item.avatar_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground font-bold">
                            {item.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-foreground text-sm truncate group-hover:text-primary transition-colors">
                          {item.name}
                        </h4>
                        {item.category_name && (
                          <p className="text-xs text-muted-foreground mt-0.5">{item.category_name}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          {item.min_price && (
                            <span className="text-sm font-bold text-foreground">от {item.min_price.toLocaleString("ru-RU")} ₽</span>
                          )}
                          {item.rating && item.rating > 0 && (
                            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                              <Star className="w-3 h-3 fill-accent text-accent" />
                              {Number(item.rating).toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {mapItems.length === 0 && (
                <div className="text-center py-10">
                  <MapPin className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">Нет объектов с координатами</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setViewMode("grid")}>
                    Показать списком
                  </Button>
                </div>
              )}
            </div>
          ) : currentCount > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tab === "masters"
                ? filteredMasters.map((m) => (
                    <MasterCardItem
                      key={m.id}
                      id={m.id}
                      name={m.name}
                      avatar_url={m.avatar_url}
                      rating={m.rating}
                      review_count={m.review_count}
                      bio={m.bio}
                      location={m.location}
                      category_name={m.category_name}
                      min_price={m.min_price}
                      hashtags={m.hashtags}
                      onClick={() => navigate(`/master/${m.user_id}`)}
                    />
                  ))
                : filteredBusinesses.map((b) => (
                    <BusinessCardItem
                      key={b.id}
                      id={b.id}
                      name={b.name}
                      image={b.image}
                      rating={b.rating}
                      review_count={b.review_count}
                      address={b.address}
                      description={b.description}
                      category_name={b.category_name}
                      specialist_count={b.specialist_count}
                      service_count={b.service_count}
                      onClick={() => navigate(`/business/${b.id}`)}
                    />
                  ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-xl font-medium text-foreground mb-2">
                Ничего не найдено
              </p>
              <p className="text-muted-foreground mb-6">
                Попробуйте изменить параметры поиска
              </p>
              <Button variant="outline" onClick={resetFilters}>
                Сбросить фильтры
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Catalog;
