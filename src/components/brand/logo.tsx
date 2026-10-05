import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  iconClassName?: string;
  showWordmark?: boolean;
  href?: string;
};

export function Logo({
  className,
  iconClassName,
  showWordmark = true,
  href = "/",
}: LogoProps) {
  return (
    <Link
      href={href}
      className="rounded-md outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <span
        className={cn(
          "inline-flex items-center gap-2 font-semibold tracking-tight text-foreground",
          className
        )}
      >
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-transform duration-200 hover:scale-[1.02]",
            iconClassName
          )}
        >
          {/* YOUR CUSTOM ICON */}
          <Image
            src="/logo2.png"
            alt="envario logo"
            width={40}
            height={40}
          />
        </span>

        {showWordmark && (
          <span className="text-base sm:text-lg">
            en<span className="text-primary">vario</span>
          </span>
        )}
      </span>
    </Link>
  );
}
