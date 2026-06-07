import type { Token } from "@/lib/tokens";

export function TokenIcon({ token, size = 32 }: { token: Token; size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-full font-display font-bold text-white shrink-0"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 30% 30%, ${token.color}, color-mix(in oklab, ${token.color} 50%, black))`,
        boxShadow: `0 4px 18px -4px ${token.color}80`,
        fontSize: size * 0.5,
      }}
    >
      {token.glyph}
    </div>
  );
}
