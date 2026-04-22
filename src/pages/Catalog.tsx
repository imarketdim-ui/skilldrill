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
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import CatalogMap, { type MapMaster } from "@/components/marketplace/CatalogMap";
import MasterCardItem from "@/components/marketplace/MasterCardItem";
import BusinessCardItem from "@/components/marketplace/BusinessCardItem";
import ServiceCardItem, { type ServiceCardData } from "@/components/marketplace/ServiceCardItem";

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
  city: string | null;
  category_id: string | null;
  category_name: string | null;
  min_price: number | null;
  hashtags: string[] | null;
  work_photos: string[] | null;
  latitude: number | null;
  longitude: number | null;
  moderation_status: string | null;
};

type BusinessItem = {
  id: string;
  name: string;
  image: string | null;
  images: string[];
  rating: number | null;
  review_count: number;
  address: string | null;
  city: string | null;
  description: string | null;
  category_name: string | null;
  category_id: string | null;
  specialist_count: number;
  service_count: number;
  latitude: number | null;
  longitude: number | null;
  moderation_status: string | null;
};

const sortOptions = [
  { value: "popular", label: "По популярности" },
  { value: "price_asc", label: "Сначала дешёвые" },
  { value: "price_desc", label: "Сначала дорогие" },
  { value: "rating", label: "По рейтингу" },
  { value: "nearest", label: "Ближайшие" },
  { value: "newest", label: "Новинки" },
];

import { haversineDistance, getSearchVariants } from '@/lib/searchUtils';

const parseFiltersFromURL = (params: URLSearchParams) => ({
  searchQuery: params.get("q") || "",
  categoryFilter: params.get("category") || CATEGORY_ALL,
  tab: (params.get("tab") || "masters") as "masters" | "businesses" | "services",
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
  const [locationFilter, setLocationFilter] = useState(searchParams.get("city") || "");
  const [locationOpen, setLocationOpen] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [masters, setMasters] = useState<MasterItem[]>([]);
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [services, setServices] = useState<ServiceCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [visibleCount, setVisibleCount] = useState(20);
  const [popularityMap, setPopularityMap] = useState<{ masters: Record<string, number>; businesses: Record<string, number> }>({ masters: {}, businesses: {} });
  
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);

  const [citySearch, setCitySearch] = useState("");

  // Date availability filter (Booking-like): фильтруем мастеров с свободными слотами на дату
  const [availabilityDate, setAvailabilityDate] = useState<string>(searchParams.get("avail") || "");
  const [availableMasterIds, setAvailableMasterIds] = useState<Set<string> | null>(null);
  const [availableBizIds, setAvailableBizIds] = useState<Set<string> | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // Extract unique cities from dedicated city column
  const availableCities = useMemo(() => {
    const cities = new Set<string>();
    masters.forEach(m => { if (m.city) cities.add(m.city); });
    businesses.forEach(b => { if (b.city) cities.add(b.city); });
    // Also extract from services
    services.forEach(s => { if ((s as any).city) cities.add((s as any).city); });
    return Array.from(cities).sort();
  }, [masters, businesses, services]);

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
    if (locationFilter) p.set("city", locationFilter);
    setSearchParams(p, { replace: true });
  }, [searchQuery, categoryFilter, tab, priceRange, sortBy, selectedTags, locationFilter, setSearchParams]);

  useEffect(() => { syncURL(); }, [syncURL]);

  // Load user geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => {} // silently fail
      );
    }
  }, []);

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
          id, user_id, description, address, city, category_id, hashtags, latitude, longitude, is_active, work_photos, moderation_status,
          profiles!master_profiles_user_id_fkey(first_name, last_name, avatar_url, bio),
          service_categories!master_profiles_category_id_fkey(name)
        `)
        .eq("is_active", true)
        .eq("moderation_status", "approved");

      if (categoryFilter !== CATEGORY_ALL) {
        query = query.eq("category_id", categoryFilter);
      }

      // Server-side FTS
      if (searchQuery.trim()) {
        const variants = getSearchVariants(searchQuery);
        const ftsQuery = variants.map(v => v.replace(/\s+/g, ' & ')).join(' | ');
        query = query.textSearch("fts", ftsQuery, { type: "websearch", config: "russian" });
      }

      const { data } = await query.range(0, visibleCount + 20 - 1);

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
          location: mp.address || null,
          city: mp.city || null,
          category_id: mp.category_id,
          category_name: mp.service_categories?.name || null,
          min_price: prices.length > 0 ? Math.min(...prices) : null,
          hashtags: mp.hashtags,
          work_photos: (mp.work_photos as string[]) || null,
          latitude: mp.latitude,
          longitude: mp.longitude,
          moderation_status: mp.moderation_status,
        };
      });

      setMasters(mapped);
      setIsLoading(false);
    };
    fetchMasters();
  }, [categoryFilter, searchQuery, visibleCount]);

  // Fetch businesses (with category + counts)
  useEffect(() => {
    const fetchBusinesses = async () => {
      const { data } = await supabase
        .from("business_locations")
        .select(`
          id, name, address, city, category_id, description, hashtags, latitude, longitude, is_active, moderation_status,
          interior_photos, exterior_photos
        `)
        .eq("is_active", true)
        .eq("moderation_status", "approved")
        .limit(50);

      if (!data || data.length === 0) { setBusinesses([]); return; }

      const bizIds = data.map((bl: any) => bl.id);

      // Fetch master counts per business
      const { data: bmData } = await supabase
        .from("business_masters")
        .select("business_id, master_id")
        .in("business_id", bizIds)
        .eq("status", "accepted");

      // Fetch master profile categories separately
      const masterIds = [...new Set((bmData || []).map((bm: any) => bm.master_id))];
      let masterCategoryMap: Record<string, { id: string; name: string } | null> = {};
      if (masterIds.length > 0) {
        const { data: mpData } = await supabase
          .from("master_profiles")
          .select("user_id, category_id, service_categories!master_profiles_category_id_fkey(id, name)")
          .in("user_id", masterIds);
        (mpData || []).forEach((mp: any) => {
          if (mp.service_categories) {
            masterCategoryMap[mp.user_id] = mp.service_categories;
          }
        });
      }

      // Fetch service counts per business
      const { data: svcCountData } = await supabase
        .from("services")
        .select("organization_id")
        .in("organization_id", bizIds)
        .eq("is_active", true);

      const masterCountMap: Record<string, number> = {};
      const bizCategoryMap: Record<string, { id: string; name: string } | null> = {};
      const serviceCountMap: Record<string, number> = {};

      (bmData || []).forEach((bm: any) => {
        masterCountMap[bm.business_id] = (masterCountMap[bm.business_id] || 0) + 1;
        if (!bizCategoryMap[bm.business_id] && masterCategoryMap[bm.master_id]) {
          bizCategoryMap[bm.business_id] = masterCategoryMap[bm.master_id];
        }
      });

      (svcCountData || []).forEach((s: any) => {
        serviceCountMap[s.organization_id] = (serviceCountMap[s.organization_id] || 0) + 1;
      });

      const mapped: BusinessItem[] = data.map((bl: any) => {
        const photos = [...(bl.interior_photos || []), ...(bl.exterior_photos || [])];
        const cat = bizCategoryMap[bl.id];
        return {
          id: bl.id,
          name: bl.name,
          image: photos[0] || null,
          images: photos,
          rating: null,
          review_count: 0,
          address: bl.address || null,
          city: bl.city || null,
          description: bl.description,
          category_name: cat?.name || bl.category_id ? categories.find(c => c.id === bl.category_id)?.name || null : null,
          category_id: bl.category_id || cat?.id || null,
          specialist_count: masterCountMap[bl.id] || 0,
          service_count: serviceCountMap[bl.id] || 0,
          latitude: bl.latitude,
          longitude: bl.longitude,
          moderation_status: bl.moderation_status,
        };
      });

      setBusinesses(mapped);
    };
    fetchBusinesses();
  }, [categories]);

  // Fetch services
  useEffect(() => {
    const fetchServices = async () => {
      // services.master_id -> profiles.id
      let svcQuery = supabase
        .from("services")
        .select(`
          id, name, price, duration_minutes, work_photos, hashtags, is_active, master_id, organization_id,
          profiles!services_master_id_fkey(first_name, last_name, avatar_url)
        `)
        .eq("is_active", true);

      // Server-side FTS for services
      if (searchQuery.trim()) {
        const variants = getSearchVariants(searchQuery);
        const ftsQuery = variants.map(v => v.replace(/\s+/g, ' & ')).join(' | ');
        svcQuery = svcQuery.textSearch("fts", ftsQuery, { type: "websearch", config: "russian" });
      }

      const { data } = await svcQuery.range(0, visibleCount + 20 - 1);

      if (!data || data.length === 0) { setServices([]); return; }

      // Get master_profiles for address + category + city — only approved masters
      const masterIds = [...new Set((data as any[]).map((s: any) => s.master_id))];
      const { data: mpData } = await supabase
        .from("master_profiles")
        .select("user_id, address, city, category_id, latitude, longitude, moderation_status, service_categories!master_profiles_category_id_fkey(name)")
        .in("user_id", masterIds)
        .eq("moderation_status", "approved");

      const mpMap: Record<string, any> = {};
      (mpData || []).forEach((mp: any) => { mpMap[mp.user_id] = mp; });

      // Get business locations for org services
      const orgIds = [...new Set((data as any[]).filter((s: any) => s.organization_id).map((s: any) => s.organization_id))];
      let blMap: Record<string, any> = {};
      if (orgIds.length > 0) {
        const { data: blData } = await supabase
          .from("business_locations")
          .select("id, address, city, category_id, latitude, longitude, moderation_status")
          .in("id", orgIds)
          .eq("moderation_status", "approved");
        (blData || []).forEach((bl: any) => { blMap[bl.id] = bl; });
      }

      const mapped: ServiceCardData[] = (data as any[])
        .filter((s: any) => {
          // Only show services from approved masters or approved businesses
          if (mpMap[s.master_id]) return true;
          if (s.organization_id && blMap[s.organization_id]) return true;
          return false;
        })
        .map((s: any) => {
          const profile = s.profiles;
          const mp = mpMap[s.master_id];
          const bl = s.organization_id ? blMap[s.organization_id] : null;
          const loc = mp || bl;
          return {
            id: s.id,
            name: s.name,
            price: s.price,
            duration_minutes: s.duration_minutes,
            work_photos: (s.work_photos as string[]) || [],
            master_id: s.master_id,
            master_name: [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Мастер",
            master_avatar: profile?.avatar_url || null,
            master_location: loc?.address || null,
            master_rating: null,
            master_review_count: 0,
            category_name: mp?.service_categories?.name || null,
            category_id: loc?.category_id || null,
            city: loc?.city || null,
            latitude: loc?.latitude || null,
            longitude: loc?.longitude || null,
          };
        });
      setServices(mapped);
    };
    fetchServices();
  }, [searchQuery, visibleCount]);

  // Fetch popularity (booking counts) for masters and businesses
  useEffect(() => {
    const fetchPopularity = async () => {
      const masterIds = masters.map(m => m.user_id);
      const bizIds = businesses.map(b => b.id);
      const [{ data: bm }, { data: bb }] = await Promise.all([
        masterIds.length
          ? supabase.from('bookings').select('executor_id').in('executor_id', masterIds).in('status', ['completed', 'confirmed'])
          : Promise.resolve({ data: [] as any[] }),
        bizIds.length
          ? supabase.from('bookings').select('organization_id').in('organization_id', bizIds).in('status', ['completed', 'confirmed'])
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const mm: Record<string, number> = {};
      (bm || []).forEach((r: any) => { mm[r.executor_id] = (mm[r.executor_id] || 0) + 1; });
      const bb2: Record<string, number> = {};
      (bb || []).forEach((r: any) => { if (r.organization_id) bb2[r.organization_id] = (bb2[r.organization_id] || 0) + 1; });
      setPopularityMap({ masters: mm, businesses: bb2 });
    };
    if (masters.length || businesses.length) fetchPopularity();
  }, [masters, businesses]);

  // Available hashtags
  const availableTags = useMemo(() => {
    const counts = new Map<string, number>();
    masters.forEach((m) => (m.hashtags || []).forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([name]) => name);
  }, [masters]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length >= 5 ? prev : [...prev, tag]
    );
  };

  // Recompute availability when date or loaded lists change
  useEffect(() => {
    if (!availabilityDate) {
      setAvailableMasterIds(null);
      setAvailableBizIds(null);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setCheckingAvailability(true);
      // Masters
      const masterUids = masters.map((m) => m.user_id);
      const mResults = await Promise.all(
        masterUids.map(async (uid) => {
          const { data } = await supabase.rpc("has_master_availability_on_date", {
            _master_id: uid,
            _date: availabilityDate,
          });
          return { uid, ok: data === true };
        }),
      );
      if (cancelled) return;
      const okMasters = new Set(mResults.filter((r) => r.ok).map((r) => r.uid));
      setAvailableMasterIds(okMasters);

      // Businesses: считаем доступными те, у которых хотя бы один мастер свободен
      const bizIds = businesses.map((b) => b.id);
      if (bizIds.length > 0) {
        const { data: bm } = await supabase
          .from("business_masters")
          .select("business_id, master_id")
          .in("business_id", bizIds)
          .eq("status", "accepted");
        const okBiz = new Set<string>();
        for (const row of bm || []) {
          if (okMasters.has((row as any).master_id)) okBiz.add((row as any).business_id);
        }
        if (!cancelled) setAvailableBizIds(okBiz);
      } else {
        setAvailableBizIds(new Set());
      }
      setCheckingAvailability(false);
    };
    run();
    return () => { cancelled = true; };
  }, [availabilityDate, masters, businesses]);

  // Filter masters (search is now server-side via FTS)
  const filteredMasters = useMemo(() => {
    return masters
      .filter((m) => {
        if (m.min_price != null) {
          if (m.min_price < priceRange[0] || m.min_price > priceRange[1]) return false;
        }
        if (selectedTags.length > 0) {
          const mTags = (m.hashtags || []).map((t) => t.toLowerCase());
          if (!selectedTags.every((st) => mTags.some((mt) => mt.includes(st.toLowerCase())))) return false;
        }
        if (locationFilter) {
          if (m.city && m.city.toLowerCase() === locationFilter.toLowerCase()) { /* match */ }
          else if (!(m.location || "").toLowerCase().includes(locationFilter.toLowerCase())) return false;
        }
        if (availabilityDate && availableMasterIds && !availableMasterIds.has(m.user_id)) return false;
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "popular": {
            const pa = (popularityMap.masters[a.user_id] || 0) * 2 + (a.review_count || 0) * 3 + (a.rating || 0);
            const pb = (popularityMap.masters[b.user_id] || 0) * 2 + (b.review_count || 0) * 3 + (b.rating || 0);
            return pb - pa;
          }
          case "price_asc": return (a.min_price || 0) - (b.min_price || 0);
          case "price_desc": return (b.min_price || 0) - (a.min_price || 0);
          case "rating": return (b.rating || 0) - (a.rating || 0);
          case "nearest": {
            if (!userLocation) return 0;
            const dA = (a.latitude && a.longitude) ? haversineDistance(userLocation.lat, userLocation.lon, a.latitude, a.longitude) : 99999;
            const dB = (b.latitude && b.longitude) ? haversineDistance(userLocation.lat, userLocation.lon, b.latitude, b.longitude) : 99999;
            return dA - dB;
          }
          default: return 0;
        }
      });
  }, [masters, priceRange, selectedTags, sortBy, locationFilter, userLocation, popularityMap]);

  // Filter businesses (basic client-side filter since no FTS on business_locations)
  const filteredBusinesses = useMemo(() => {
    return businesses
      .filter((b) => {
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const match =
            (b.name || "").toLowerCase().includes(q) ||
            (b.description || "").toLowerCase().includes(q) ||
            (b.category_name || "").toLowerCase().includes(q);
          if (!match) return false;
        }
        if (categoryFilter !== CATEGORY_ALL) {
          if (!b.category_id || b.category_id !== categoryFilter) return false;
        }
        if (locationFilter) {
          if (b.city && b.city.toLowerCase() === locationFilter.toLowerCase()) { /* match */ }
          else if (!(b.address || "").toLowerCase().includes(locationFilter.toLowerCase())) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "popular") {
          const pa = (popularityMap.businesses[a.id] || 0) * 2 + (a.review_count || 0) * 3 + (a.rating || 0);
          const pb = (popularityMap.businesses[b.id] || 0) * 2 + (b.review_count || 0) * 3 + (b.rating || 0);
          return pb - pa;
        }
        if (sortBy === "nearest" && userLocation) {
          const dA = (a.latitude && a.longitude) ? haversineDistance(userLocation.lat, userLocation.lon, a.latitude, a.longitude) : 99999;
          const dB = (b.latitude && b.longitude) ? haversineDistance(userLocation.lat, userLocation.lon, b.latitude, b.longitude) : 99999;
          return dA - dB;
        }
        return 0;
      });
  }, [businesses, searchQuery, categoryFilter, locationFilter, sortBy, userLocation, popularityMap]);

  // Filter services (search is now server-side via FTS)
  const filteredServices = useMemo(() => {
    return services
      .filter((s) => {
        if (s.price != null) {
          if (s.price < priceRange[0] || s.price > priceRange[1]) return false;
        }
        if (categoryFilter !== CATEGORY_ALL) {
          const svc = s as any;
          if (svc.category_id && svc.category_id !== categoryFilter) return false;
          if (!svc.category_id && s.category_name) {
            const cat = categories.find(c => c.id === categoryFilter);
            if (cat && s.category_name !== cat.name) return false;
          }
        }
        if (locationFilter) {
          const svc = s as any;
          if (svc.city && svc.city.toLowerCase() === locationFilter.toLowerCase()) { /* match */ }
          else if (!(s.master_location || "").toLowerCase().includes(locationFilter.toLowerCase())) return false;
        }
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "popular": {
            const pa = popularityMap.masters[a.master_id] || 0;
            const pb = popularityMap.masters[b.master_id] || 0;
            return pb - pa;
          }
          case "price_asc": return (a.price || 0) - (b.price || 0);
          case "price_desc": return (b.price || 0) - (a.price || 0);
          default: return 0;
        }
      });
  }, [services, priceRange, sortBy, categoryFilter, categories, selectedTags, locationFilter, searchQuery, popularityMap]);

  const activeFiltersCount = [
    priceRange[0] > 0 || priceRange[1] < 50000,
    selectedTags.length > 0,
    !!locationFilter,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setPriceRange([0, 50000]);
    setSelectedTags([]);
    setSortBy("popular");
    setSearchQuery("");
    setCategoryFilter(CATEGORY_ALL);
    setLocationFilter("");
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
    if (tab === "services") {
      return filteredServices
        .filter((s: any) => s.latitude && s.longitude)
        .map((s: any) => ({
          id: s.master_id,
          name: s.name,
          latitude: s.latitude,
          longitude: s.longitude,
          avatar_url: s.master_avatar,
          rating: s.master_rating,
          min_price: s.price,
          category_name: s.category_name,
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
  }, [tab, filteredMasters, filteredBusinesses, filteredServices]);

  const currentItems = tab === "masters" ? filteredMasters : tab === "businesses" ? filteredBusinesses : filteredServices;
  const currentCount = currentItems.length;
  const visibleItems = currentItems.slice(0, visibleCount);
  const hasMore = visibleCount < currentCount;

  // Reset visible count when filters change
  useEffect(() => { setVisibleCount(20); }, [tab, searchQuery, categoryFilter, locationFilter, selectedTags, priceRange, sortBy]);

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
              Найдите нужную услугу среди мастеров и организаций
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
              {/* Location picker */}
              <div className="relative">
                <button
                  onClick={() => setLocationOpen(!locationOpen)}
                  className="h-12 px-4 flex items-center gap-2 rounded-md border border-input bg-background text-sm hover:bg-accent transition-colors min-w-[160px]"
                >
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <span className={locationFilter ? "text-foreground" : "text-muted-foreground"}>
                    {locationFilter || "Все города"}
                  </span>
                  {locationFilter && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setLocationFilter(""); setLocationOpen(false); }}
                      className="ml-auto text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </button>
                {locationOpen && (
                  <div className="absolute top-full mt-1 left-0 z-50 w-64 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                    <div className="p-2 border-b border-border">
                      <Input
                        placeholder="Введите город..."
                        autoFocus
                        value={citySearch}
                        className="h-9 text-sm"
                        onChange={(e) => setCitySearch(e.target.value)}
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto p-1">
                      <button
                        onClick={() => { setLocationFilter(""); setLocationOpen(false); setCitySearch(""); }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors ${!locationFilter ? "bg-accent font-medium" : ""}`}
                      >
                        Все города
                      </button>
                      {availableCities
                        .filter(city => !citySearch || city.toLowerCase().includes(citySearch.toLowerCase()))
                        .map((city) => (
                        <button
                          key={city}
                          onClick={() => { setLocationFilter(city); setLocationOpen(false); setCitySearch(""); }}
                          className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors ${locationFilter === city ? "bg-accent font-medium" : ""}`}
                        >
                          {city}
                        </button>
                      ))}
                      {availableCities.filter(city => !citySearch || city.toLowerCase().includes(citySearch.toLowerCase())).length === 0 && (
                        <p className="px-3 py-2 text-sm text-muted-foreground">Нет данных</p>
                      )}
                    </div>
                  </div>
                )}
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

                {/* Price Range - inputs */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Цена (₽)</label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="от"
                      value={priceRange[0] > 0 ? String(priceRange[0]) : ''}
                      onChange={(e) => {
                        const v = parseInt(e.target.value.replace(/\D/g, '')) || 0;
                        setPriceRange([v, priceRange[1]]);
                      }}
                      className="h-10"
                    />
                    <span className="text-muted-foreground">—</span>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="до"
                      value={priceRange[1] < 50000 ? String(priceRange[1]) : ''}
                      onChange={(e) => {
                        const v = parseInt(e.target.value.replace(/\D/g, '')) || 50000;
                        setPriceRange([priceRange[0], v]);
                      }}
                      className="h-10"
                    />
                  </div>
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
          <div className="flex flex-col sm:flex-row gap-2 mb-2">
            <Button
              variant={tab === "masters" ? "default" : "outline"}
              size="sm"
              onClick={() => setTab("masters")}
              className="flex-col h-auto py-2 sm:flex-row sm:py-1.5"
            >
              <span>Мастера ({filteredMasters.length})</span>
              <span className="text-[10px] opacity-70 sm:ml-2 sm:text-xs">стилисты, тренеры, репетиторы</span>
            </Button>
            <Button
              variant={tab === "businesses" ? "default" : "outline"}
              size="sm"
              onClick={() => setTab("businesses")}
              className="flex-col h-auto py-2 sm:flex-row sm:py-1.5"
            >
              <span>Организации ({filteredBusinesses.length})</span>
              <span className="text-[10px] opacity-70 sm:ml-2 sm:text-xs">салоны, студии, пространства</span>
            </Button>
            <Button
              variant={tab === "services" ? "default" : "outline"}
              size="sm"
              onClick={() => setTab("services")}
              className="flex-col h-auto py-2 sm:flex-row sm:py-1.5"
            >
              <span>Услуги ({filteredServices.length})</span>
              <span className="text-[10px] opacity-70 sm:ml-2 sm:text-xs">конкретные услуги с ценой</span>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mb-4 px-1">Выберите формат поиска</p>


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
            <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tab === "masters"
                ? (filteredMasters.slice(0, visibleCount) as MasterItem[]).map((m) => (
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
                      work_photos={m.work_photos}
                      moderation_status={m.moderation_status}
                      onClick={() => navigate(`/master/${m.user_id}`)}
                    />
                  ))
                : tab === "businesses"
                ? (filteredBusinesses.slice(0, visibleCount) as BusinessItem[]).map((b) => (
                    <BusinessCardItem
                      key={b.id}
                      id={b.id}
                      name={b.name}
                      image={b.image}
                      images={b.images}
                      rating={b.rating}
                      review_count={b.review_count}
                      address={b.address}
                      description={b.description}
                      category_name={b.category_name}
                      specialist_count={b.specialist_count}
                      service_count={b.service_count}
                      moderation_status={b.moderation_status}
                      onClick={() => navigate(`/business/${b.id}`)}
                    />
                  ))
                : (filteredServices.slice(0, visibleCount) as ServiceCardData[]).map((s) => (
                    <ServiceCardItem
                      key={s.id}
                      service={s}
                      onClick={() => navigate(`/master/${s.master_id}?book=${s.id}`)}
                    />
                  ))}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setVisibleCount(prev => prev + 20)}
                >
                  Показать ещё ({currentCount - visibleCount} осталось)
                </Button>
              </div>
            )}
            </>
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
