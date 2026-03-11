import { useState, useEffect, useRef, memo } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  priority?: boolean; // للصور المهمة فوق الطي
  blur?: boolean; // تأثير blur أثناء التحميل
}

export const LazyImage = memo(({
  src,
  alt,
  className,
  placeholderClassName,
  priority = false,
  blur = true,
  ...props
}: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (priority) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "200px", // تحميل مسبق قبل الظهور
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setError(true);
    setIsLoaded(true);
  };

  return (
    <div ref={imgRef} className={cn("relative overflow-hidden", className)}>
      {/* Skeleton placeholder */}
      {!isLoaded && (
        <Skeleton
          className={cn(
            "absolute inset-0 w-full h-full",
            placeholderClassName
          )}
        />
      )}
      
      {/* الصورة */}
      {isInView && !error && (
        <img
          src={src}
          alt={alt}
          className={cn(
            "w-full h-full object-cover transition-all duration-500",
            isLoaded ? "opacity-100" : "opacity-0",
            blur && !isLoaded && "blur-sm scale-105",
            className
          )}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          {...props}
        />
      )}
      
      {/* Fallback للأخطاء */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <span className="text-muted-foreground text-sm">فشل تحميل الصورة</span>
        </div>
      )}
    </div>
  );
});

LazyImage.displayName = "LazyImage";
