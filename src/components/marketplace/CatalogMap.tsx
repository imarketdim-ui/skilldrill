import { useEffect, useRef, useMemo } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export interface MapMaster {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  avatar_url?: string | null;
  rating?: number | null;
  review_count?: number | null;
  min_price?: number | null;
  category_name?: string | null;
  type: "master" | "business";
}

interface Props {
  items: MapMaster[];
}

const CatalogMap = ({ items }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const mappable = useMemo(() => items.filter((i) => i.latitude && i.longitude), [items]);

  useEffect(() => {
    if (!containerRef.current || mappable.length === 0) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [91.42, 53.72], // Abakan center
      zoom: 12,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    const bounds = new maplibregl.LngLatBounds();

    mappable.forEach((item) => {
      const lat = item.latitude!;
      const lng = item.longitude!;
      bounds.extend([lng, lat]);

      const ratingHtml =
        item.rating && item.rating > 0
          ? `<span style="color:#e5a100">★ ${Number(item.rating).toFixed(1)}</span>`
          : "";

      const priceHtml =
        item.min_price && item.min_price > 0
          ? `<strong style="font-size:13px">от ${item.min_price.toLocaleString("ru-RU")} ₽</strong>`
          : "";

      const link = item.type === "master" ? `/master/${item.id}` : `/business/${item.id}`;

      const popupHtml = `
        <a href="${link}" style="text-decoration:none;color:inherit;display:block;max-width:220px">
          ${item.avatar_url ? `<img src="${item.avatar_url}" alt="" style="width:100%;height:80px;object-fit:cover;border-radius:6px;margin-bottom:6px"/>` : ""}
          <div style="font-weight:600;font-size:13px;margin-bottom:2px">${item.name}</div>
          ${item.category_name ? `<div style="font-size:11px;color:#888;margin-bottom:4px">${item.category_name}</div>` : ""}
          <div style="display:flex;justify-content:space-between;align-items:center">
            ${priceHtml}
            ${ratingHtml}
          </div>
          <div style="margin-top:6px;color:hsl(162,63%,41%);font-size:11px;font-weight:600">Открыть →</div>
        </a>
      `;

      const popup = new maplibregl.Popup({ maxWidth: "250px" }).setHTML(popupHtml);
      new maplibregl.Marker({ color: "#2f9e76" })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);
    });

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mappable]);

  if (mappable.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="rounded-xl overflow-hidden border border-border shadow-md"
      style={{ height: 520 }}
    />
  );
};

export default CatalogMap;
