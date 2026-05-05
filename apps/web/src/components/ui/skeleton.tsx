import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-md", className)}
      style={{
        background: "linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--muted-foreground) / 0.06) 50%, hsl(var(--muted)) 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.6s infinite linear",
      }}
      {...props}
    />
  )
}

export { Skeleton }
