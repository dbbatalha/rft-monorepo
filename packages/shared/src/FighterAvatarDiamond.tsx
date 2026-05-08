import { type LucideIcon } from "lucide-react";

type Size = "sm" | "md" | "lg";

const sizeMap: Record<Size, { box: string; text: string; icon: number }> = {
  sm: { box: "w-7 h-7", text: "text-[10px]", icon: 14 },
  md: { box: "w-9 h-9", text: "text-xs", icon: 16 },
  lg: { box: "w-10 h-10", text: "text-sm", icon: 18 },
};

type Variant = "primary" | "champion" | "interim" | "red" | "yellow" | "rft";

const variantMap: Record<Variant, { bg: string; fg: string }> = {
  primary: {
    bg: "bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20",
    fg: "text-primary",
  },
  champion: {
    bg: "bg-gradient-to-br from-yellow-500/30 to-yellow-600/10 border border-yellow-500/30",
    fg: "text-yellow-400",
  },
  interim: {
    bg: "bg-gradient-to-br from-orange-500/30 to-orange-600/10 border border-orange-500/30",
    fg: "text-orange-400",
  },
  red: {
    bg: "bg-gradient-to-br from-red-500/30 to-red-600/10 border border-red-500/30",
    fg: "text-red-400",
  },
  yellow: {
    bg: "bg-gradient-to-br from-yellow-400/30 to-yellow-500/10 border border-yellow-400/40",
    fg: "text-yellow-400",
  },
  rft: {
    bg: "bg-yellow-400 border-2 border-black",
    fg: "text-black",
  },
};

/**
 * Avatar/marcador em formato de losango (quadrado rotacionado 45°),
 * com gradient sutil e variantes por status. Aceita iniciais OU ícone.
 */
export function FighterAvatarDiamond({
  initials,
  icon: Icon,
  isChampion = false,
  isInterim = false,
  variant,
  size = "md",
  className = "",
}: {
  initials?: string;
  icon?: LucideIcon;
  isChampion?: boolean;
  isInterim?: boolean;
  variant?: Variant;
  size?: Size;
  className?: string;
}) {
  const s = sizeMap[size];
  const resolved: Variant = variant ?? (isInterim ? "interim" : isChampion ? "champion" : "primary");
  const v = variantMap[resolved];

  return (
    <div className={`${s.box} rotate-45 rounded-md flex items-center justify-center ${v.bg} ${className}`}>
      {Icon ? (
        <Icon size={s.icon} className={`-rotate-45 ${v.fg}`} strokeWidth={2.5} />
      ) : (
        <span className={`${s.text} font-black -rotate-45 ${v.fg}`}>{initials}</span>
      )}
    </div>
  );
}
