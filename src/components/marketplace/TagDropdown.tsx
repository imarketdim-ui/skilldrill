import { useState, useRef, useEffect } from "react";
import { X, ChevronDown, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface Props {
  label: string;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  presets?: string[];
  placeholder?: string;
  maxTags?: number;
}

const TagDropdown = ({ label, tags, onTagsChange, presets = [], placeholder = "Добавить...", maxTags = 15 }: Props) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || tags.includes(trimmed) || tags.length >= maxTags) return;
    onTagsChange([...tags, trimmed]);
    setInput("");
  };

  const removeTag = (tag: string) => {
    onTagsChange(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(input);
    }
  };

  const filteredPresets = presets.filter(
    (p) => !tags.includes(p) && p.toLowerCase().includes(input.toLowerCase())
  );

  return (
    <div className="space-y-2" ref={ref}>
      <label className="text-sm font-medium text-foreground">{label}</label>

      {/* Selected tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 pr-1">
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="hover:text-destructive transition-colors">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Dropdown trigger */}
      <div className="relative">
        <div
          className="flex items-center border border-input rounded-lg bg-background cursor-pointer"
          onClick={() => setOpen(!open)}
        >
          <Input
            value={input}
            onChange={(e) => { setInput(e.target.value); setOpen(true); }}
            onKeyDown={handleKeyDown}
            onClick={(e) => { e.stopPropagation(); setOpen(true); }}
            placeholder={tags.length >= maxTags ? `Максимум ${maxTags}` : placeholder}
            disabled={tags.length >= maxTags}
            className="border-0 shadow-none focus-visible:ring-0"
          />
          <ChevronDown className="w-4 h-4 text-muted-foreground mr-3 shrink-0" />
        </div>

        {open && filteredPresets.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filteredPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => addTag(preset)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 transition-colors flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5 text-primary" />
                {preset}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {tags.length}/{maxTags} · Выберите из списка или введите свой
      </p>
    </div>
  );
};

export default TagDropdown;
