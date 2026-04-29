import { Crosshair, MapPin } from "lucide-react";

type MapPoint = {
  label: string;
  x: number;
  y: number;
  tone?: "gold" | "paid" | "danger" | "steel";
};

type WireframeMapPanelProps = {
  points: MapPoint[];
  title?: string;
};

const toneClass: Record<NonNullable<MapPoint["tone"]>, string> = {
  gold: "border-gold bg-gold text-black",
  paid: "border-paid bg-paid text-black",
  danger: "border-danger bg-danger text-black",
  steel: "border-zinc-500 bg-zinc-800 text-zinc-200"
};

export function WireframeMapPanel({
  points,
  title = "Nearby demand"
}: WireframeMapPanelProps) {
  return (
    <div className="mesh-panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <div className="flex items-center gap-2">
          <Crosshair className="h-4 w-4 text-gold" aria-hidden="true" />
          <span className="mesh-label text-zinc-300">{title}</span>
        </div>
        <span className="font-mono text-[0.68rem] text-paid">LIVE</span>
      </div>
      <div className="relative h-72 bg-black">
        <div className="absolute inset-0 grid grid-cols-6 grid-rows-6">
          {Array.from({ length: 36 }).map((_, index) => (
            <div key={index} className="border-r border-t border-line/70" />
          ))}
        </div>
        <div className="absolute left-1/2 top-0 h-full border-l border-gold/50" />
        <div className="absolute left-0 top-1/2 w-full border-t border-gold/50" />
        {points.map((point) => (
          <div
            key={point.label}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
          >
            <div
              className={`flex h-6 w-6 items-center justify-center border ${
                toneClass[point.tone ?? "gold"]
              }`}
              title={point.label}
            >
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            </div>
            <span className="mt-1 block whitespace-nowrap bg-black px-1 font-mono text-[0.6rem] text-zinc-300">
              {point.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
