import { useMemo } from "react";
import { SlidersHorizontal, Home } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useAirbnb } from "@/lib/airbnb/context";

const fmt = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;

export function DashboardSidebar() {
  const { filters, setFilters, bounds, rows } = useAirbnb();

  const toggle = (list: string[], v: string) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  const summary = useMemo(() => `${rows.length.toLocaleString()} listings`, [rows.length]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Home className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight">Estate Intel</span>
            <span className="text-[10px] text-muted-foreground">{summary}</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>


        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <SlidersHorizontal className="h-3 w-3" /> Filtros
          </SidebarGroupLabel>
          <SidebarGroupContent className="space-y-5 px-3 py-3">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Room Type
              </Label>
              <div className="space-y-1.5">
                {bounds.roomTypes.map((rt) => (
                  <label
                    key={rt}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-sidebar-accent"
                  >
                    <Checkbox
                      checked={filters.roomTypes.includes(rt)}
                      onCheckedChange={() =>
                        setFilters({ roomTypes: toggle(filters.roomTypes, rt) })
                      }
                    />
                    <span>{rt}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Neighborhood Group
              </Label>
              <div className="space-y-1.5">
                {bounds.groups.map((g) => (
                  <label
                    key={g}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-sidebar-accent"
                  >
                    <Checkbox
                      checked={filters.neighbourhoodGroups.includes(g)}
                      onCheckedChange={() =>
                        setFilters({
                          neighbourhoodGroups: toggle(filters.neighbourhoodGroups, g),
                        })
                      }
                    />
                    <span>{g}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Custo Real
                </Label>
                <span className="text-xs font-medium tabular-nums">
                  {fmt(filters.priceRange[0])} – {fmt(filters.priceRange[1])}
                </span>
              </div>
              <Slider
                min={bounds.priceMin}
                max={bounds.priceMax}
                step={Math.max(1, Math.round((bounds.priceMax - bounds.priceMin) / 200))}
                value={filters.priceRange}
                onValueChange={(v) =>
                  setFilters({ priceRange: [v[0], v[1]] as [number, number] })
                }
              />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
