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

  const geojson = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: mappable.map((item) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [item.longitude!, item.latitude!] },
      properties: {
        id: item.id,
        name: item.name,
        avatar_url: item.avatar_url || "",
        rating: item.rating || 0,
        min_price: item.min_price || 0,
        category_name: item.category_name || "",
        type: item.type,
      },
    })),
  }), [mappable]);

  useEffect(() => {
    if (!containerRef.current || mappable.length === 0) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [91.42, 53.72],
      zoom: 12,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      map.addSource("items", {
        type: "geojson",
        data: geojson,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // Cluster circles
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "items",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": ["step", ["get", "point_count"], "#2f9e76", 10, "#1a7a5a", 30, "#0f5c40"],
          "circle-radius": ["step", ["get", "point_count"], 22, 10, 28, 30, 36],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      // Cluster count labels
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "items",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["Open Sans Bold"],
          "text-size": 14,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      // Individual points
      map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "items",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#2f9e76",
          "circle-radius": 8,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      // Click on cluster → zoom in
      map.on("click", "clusters", async (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
        if (!features.length) return;
        const clusterId = features[0].properties.cluster_id;
        const source = map.getSource("items") as maplibregl.GeoJSONSource;
        const zoom = await source.getClusterExpansionZoom(clusterId);
        map.easeTo({
          center: (features[0].geometry as any).coordinates,
          zoom,
        });
      });

      // Click on individual point → popup
      map.on("click", "unclustered-point", (e) => {
        if (!e.features?.length) return;
        const props = e.features[0].properties as any;
        const coords = (e.features[0].geometry as any).coordinates.slice();

        const ratingHtml = props.rating > 0 ? `<span style="color:#e5a100">★ ${Number(props.rating).toFixed(1)}</span>` : "";
        const priceHtml = props.min_price > 0 ? `<strong style="font-size:13px">от ${Number(props.min_price).toLocaleString("ru-RU")} ₽</strong>` : "";
        const link = props.type === "master" ? `/master/${props.id}` : `/business/${props.id}`;

        const popupHtml = `
          <a href="${link}" style="text-decoration:none;color:inherit;display:block;max-width:220px">
            ${props.avatar_url ? `<img src="${props.avatar_url}" alt="" style="width:100%;height:80px;object-fit:cover;border-radius:6px;margin-bottom:6px"/>` : ""}
            <div style="font-weight:600;font-size:13px;margin-bottom:2px">${props.name}</div>
            ${props.category_name ? `<div style="font-size:11px;color:#888;margin-bottom:4px">${props.category_name}</div>` : ""}
            <div style="display:flex;justify-content:space-between;align-items:center">
              ${priceHtml}
              ${ratingHtml}
            </div>
            <div style="margin-top:6px;color:hsl(162,63%,41%);font-size:11px;font-weight:600">Открыть →</div>
          </a>
        `;

        new maplibregl.Popup({ maxWidth: "250px" }).setLngLat(coords).setHTML(popupHtml).addTo(map);
      });

      // Cursor styles
      map.on("mouseenter", "clusters", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "clusters", () => { map.getCanvas().style.cursor = ""; });
      map.on("mouseenter", "unclustered-point", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "unclustered-point", () => { map.getCanvas().style.cursor = ""; });

      // Fit bounds
      if (mappable.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        mappable.forEach((item) => bounds.extend([item.longitude!, item.latitude!]));
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
        }
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mappable, geojson]);

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
