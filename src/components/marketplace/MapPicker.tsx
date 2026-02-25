import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  latitude: number | null;
  longitude: number | null;
  address: string;
  onLocationChange: (lat: number, lng: number, address: string) => void;
}

const MapPicker = ({ latitude, longitude, address, onLocationChange }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [locating, setLocating] = useState(false);

  const reverseGeocode = async (lat: number, lng: number) => {
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ru`
      );
      const data = await res.json();
      const addr = data.display_name || "";
      onLocationChange(lat, lng, addr);
    } catch {
      onLocationChange(lat, lng, "");
    } finally {
      setGeocoding(false);
    }
  };

  const placeMarker = (lngLat: maplibregl.LngLat) => {
    if (!mapRef.current) return;
    if (markerRef.current) markerRef.current.remove();
    markerRef.current = new maplibregl.Marker({ color: "#2f9e76", draggable: true })
      .setLngLat(lngLat)
      .addTo(mapRef.current);

    markerRef.current.on("dragend", () => {
      const pos = markerRef.current!.getLngLat();
      reverseGeocode(pos.lat, pos.lng);
    });

    reverseGeocode(lngLat.lat, lngLat.lng);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const center: [number, number] = longitude && latitude ? [longitude, latitude] : [91.42, 53.72];
    const zoom = longitude && latitude ? 15 : 12;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center,
      zoom,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    if (latitude && longitude) {
      markerRef.current = new maplibregl.Marker({ color: "#2f9e76", draggable: true })
        .setLngLat([longitude, latitude])
        .addTo(map);

      markerRef.current.on("dragend", () => {
        const pos = markerRef.current!.getLngLat();
        reverseGeocode(pos.lat, pos.lng);
      });
    }

    map.on("click", (e) => placeMarker(e.lngLat));

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const handleGeolocate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lngLat = new maplibregl.LngLat(pos.coords.longitude, pos.coords.latitude);
        mapRef.current?.flyTo({ center: lngLat, zoom: 15 });
        placeMarker(lngLat);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">Местоположение на карте</label>
        <Button type="button" variant="outline" size="sm" onClick={handleGeolocate} disabled={locating} className="gap-1.5">
          {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
          Моё местоположение
        </Button>
      </div>
      <div
        ref={containerRef}
        className="rounded-xl overflow-hidden border border-border"
        style={{ height: 300 }}
      />
      {address && (
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          {geocoding ? "Определяем адрес..." : address}
        </p>
      )}
      <p className="text-xs text-muted-foreground">Кликните на карту или перетащите маркер для указания местоположения</p>
    </div>
  );
};

export default MapPicker;
