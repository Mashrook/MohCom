import { cn } from "@/lib/utils";
import splashLogo from "@/assets/splash-logo.jpg";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  showImage?: boolean;
}

export function Logo({ className, size = "md", showTagline = true, showImage = true }: LogoProps) {
  const sizes = {
    sm: {
      container: "gap-2",
      text: "text-xl",
      tagline: "text-[10px]",
      icon: "text-2xl",
      image: "w-8 h-8",
    },
    md: {
      container: "gap-3",
      text: "text-2xl",
      tagline: "text-xs",
      icon: "text-3xl",
      image: "w-10 h-10",
    },
    lg: {
      container: "gap-4",
      text: "text-4xl",
      tagline: "text-sm",
      icon: "text-5xl",
      image: "w-14 h-14",
    },
  };

  return (
    <div className={cn("flex items-center", sizes[size].container, className)}>
      {/* Logo Image */}
      {showImage && (
        <div 
          className={cn(
            "rounded-full overflow-hidden border border-[hsl(35,70%,40%,0.4)] shadow-lg shadow-[hsl(35,60%,35%,0.2)] transition-all duration-500 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)] hover:scale-110 hover:rotate-[15deg] hover:shadow-[0_0_25px_hsl(43,66%,52%,0.6),0_0_50px_hsl(43,66%,52%,0.3)] hover:border-[hsl(43,66%,52%,0.8)]",
            sizes[size].image
          )}
        >
          <img 
            src={splashLogo} 
            alt="شعار محامي كوم" 
            className="w-full h-full object-cover transition-all duration-500"
            style={{
              filter: 'sepia(100%) saturate(200%) brightness(75%) hue-rotate(-5deg) contrast(1.1)',
            }}
          />
        </div>
      )}
      
      {/* Logo Text - Hidden on small screens */}
      <div className="hidden sm:flex flex-col">
        <div className="flex items-baseline">
          <span 
            className={cn(
              "font-bold tracking-tight animate-fade-in",
              sizes[size].text,
              "bg-gradient-to-l from-[hsl(43,66%,52%)] via-[hsl(48,90%,60%)] to-[hsl(43,66%,52%)] bg-clip-text text-transparent bg-[length:200%_auto] animate-[shimmer_3s_linear_infinite]"
            )}
            style={{ fontFamily: "'Cairo', sans-serif" }}
          >
            محامي
          </span>
          <span 
            className={cn(
              "font-black mr-0.5 animate-fade-in [animation-delay:150ms]",
              sizes[size].text,
              "bg-gradient-to-l from-[hsl(48,90%,60%)] to-[hsl(43,66%,52%)] bg-clip-text text-transparent bg-[length:200%_auto] animate-[shimmer_3s_linear_infinite]"
            )}
            style={{ fontFamily: "'Cairo', sans-serif" }}
          >
            كوم
          </span>
        </div>
        {showTagline && (
          <span className={cn("text-muted-foreground font-medium -mt-1", sizes[size].tagline)}>
            ADVISOR AI
          </span>
        )}
      </div>
    </div>
  );
}
