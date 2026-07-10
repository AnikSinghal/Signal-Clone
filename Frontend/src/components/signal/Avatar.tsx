import { cn } from "@/lib/utils";

export function Avatar({
  initials,
  color,
  size = 40,
  online,
  imageUrl,
  className,
}: {
  initials: string;
  color: string;
  size?: number;
  online?: boolean;
  imageUrl?: string | null;
  className?: string;
}) {
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={initials}
          className="h-full w-full rounded-full object-cover"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center rounded-full font-semibold text-white select-none"
          style={{ backgroundColor: color, fontSize: size * 0.38 }}
        >
          {initials}
        </div>
      )}
      {online && (
        <span
          className="absolute bottom-0 right-0 block rounded-full ring-2 ring-signal-panel"
          style={{
            width: size * 0.28,
            height: size * 0.28,
            backgroundColor: "#16A34A",
          }}
        />
      )}
    </div>
  );
}
