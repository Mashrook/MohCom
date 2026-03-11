import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface SectionSetting {
  id: string;
  section_key: string;
  section_name: string;
  is_enabled: boolean;
  display_order: number;
}

interface SortableSectionItemProps {
  section: SectionSetting;
  onToggle: (id: string, currentState: boolean) => void;
}

export function SortableSectionItem({ section, onToggle }: SortableSectionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-300 ${
        section.is_enabled
          ? "bg-green-500/10 border-green-500/30"
          : "bg-red-500/10 border-red-500/30"
      } ${isDragging ? "shadow-xl opacity-90 scale-105" : ""}`}
    >
      <div className="flex items-center gap-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted/50 transition-colors touch-none"
        >
          <GripVertical className="w-5 h-5 text-muted-foreground" />
        </button>
        <div
          className={`w-3 h-3 rounded-full ${
            section.is_enabled ? "bg-green-500" : "bg-red-500"
          }`}
        />
        <span className="font-medium">{section.section_name}</span>
        <span className="text-xs text-muted-foreground">
          ({section.section_key})
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`text-sm ${
            section.is_enabled ? "text-green-400" : "text-red-400"
          }`}
        >
          {section.is_enabled ? "مفعّل" : "معطّل"}
        </span>
        <Switch
          checked={section.is_enabled}
          onCheckedChange={() => onToggle(section.id, section.is_enabled)}
        />
      </div>
    </div>
  );
}
