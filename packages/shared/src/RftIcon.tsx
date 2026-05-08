import { type LucideIcon } from "lucide-react";

type Size = "sm" | "md" | "lg";

const sizeMap: Record<Size, { box: string; icon: number; text: string }> = {
  sm: { box: "w-7 h-7", icon: 12, text: "text-[8px]" },
  md: { box: "w-10 h-10", icon: 16, text: "text-[10px]" },
  lg: { box: "w-14 h-14", icon: 22, text: "text-xs" },
};

type Variant = "yellow" | "red" | "outline";

const variantMap: Record<Variant, { bg: string; fg: string; ring: string }> = {
  yellow: { bg: "bg-yellow-400", fg: "text-black", ring: "shadow-[0_0_15px_rgba(250,204,21,0.4)]" },
  red: { bg: "bg-red-500", fg: "text-black", ring: "shadow-[0_0_15px_rgba(255,51,51,0.4)]" },
  outline: { bg: "bg-transparent border-2 border-yellow-400", fg: "text-yellow-400", ring: "" },
};

/**
 * Placa-diamante RFT: substitui ícones genéricos pelo símbolo da marca.
 * Pode mostrar um ícone Lucide dentro (rotacionado de volta) ou texto curto.
 */
export function RftDiamond({
  icon: Icon,
  text,
  size = "md",
  variant = "yellow",
  className = "",
}: {
  icon?: LucideIcon;
  text?: string;
  size?: Size;
  variant?: Variant;
  className?: string;
}) {
  const s = sizeMap[size];
  const v = variantMap[variant];
  return (
    <div
      className={`${s.box} ${v.bg} ${v.ring} rotate-45 flex items-center justify-center shrink-0 ${className}`}
    >
      {Icon ? (
        <Icon size={s.icon} className={`-rotate-45 ${v.fg}`} strokeWidth={2.5} />
      ) : text ? (
        <span className={`${s.text} ${v.fg} -rotate-45 font-display font-bold tracking-wide`}>
          {text}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Card RFT: borda dourada/vermelha sem radius, com linha decorativa.
 */
export function RftCard({
  children,
  variant = "yellow",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "yellow" | "red";
  className?: string;
}) {
  const color = variant === "yellow" ? "#FFD700" : "#FF3333";
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: "oklch(0.14 0.01 250)",
        border: `1px solid ${color}30`,
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${color}80, transparent)` }}
      />
      {children}
      <div
        className="absolute bottom-0 left-0 h-0.5 w-full"
        style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}
      />
    </div>
  );
}

/**
 * Botão RFT: amarelo com texto preto, font-heading uppercase tracking.
 */
export function RftButton({
  children,
  onClick,
  variant = "primary",
  size = "md",
  type = "button",
  className = "",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  type?: "button" | "submit";
  className?: string;
  disabled?: boolean;
}) {
  const base =
    "font-heading font-bold uppercase tracking-[0.25em] transition-all duration-300 inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = {
    sm: "text-xs px-4 py-2",
    md: "text-sm px-6 py-3",
    lg: "text-sm px-10 py-4",
  };
  const variants = {
    primary:
      "bg-yellow-400 text-black hover:shadow-[0_0_25px_rgba(250,204,21,0.5)]",
    secondary:
      "bg-red-600 text-white hover:bg-red-500 hover:shadow-[0_0_20px_rgba(255,51,51,0.4)]",
    ghost:
      "bg-transparent text-yellow-400 border border-yellow-400/40 hover:bg-yellow-400/10 hover:border-yellow-400",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
