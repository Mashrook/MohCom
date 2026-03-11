import { Link, LinkProps } from "react-router-dom";
import { prefetchPage } from "@/hooks/usePrefetch";
import { useCallback } from "react";

interface PrefetchLinkProps extends LinkProps {
  prefetch?: boolean;
}

export const PrefetchLink = ({ 
  to, 
  prefetch = true, 
  children, 
  ...props 
}: PrefetchLinkProps) => {
  const handleMouseEnter = useCallback(() => {
    if (prefetch && typeof to === "string") {
      prefetchPage(to);
    }
  }, [to, prefetch]);

  const handleFocus = useCallback(() => {
    if (prefetch && typeof to === "string") {
      prefetchPage(to);
    }
  }, [to, prefetch]);

  return (
    <Link
      to={to}
      onMouseEnter={handleMouseEnter}
      onFocus={handleFocus}
      {...props}
    >
      {children}
    </Link>
  );
};
