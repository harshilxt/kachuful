import { useEffect, useState } from "react";

export interface ViewportInfo {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isShortHeight: boolean;
}

function read(): ViewportInfo {
  if (typeof window === "undefined") {
    return {
      width: 1024,
      height: 800,
      isMobile: false,
      isTablet: false,
      isShortHeight: false,
    };
  }
  const w = window.innerWidth;
  const h = window.innerHeight;
  return {
    width: w,
    height: h,
    isMobile: w < 640,
    isTablet: w >= 640 && w < 1024,
    isShortHeight: h < 700,
  };
}

export function useViewport(): ViewportInfo {
  const [vp, setVp] = useState<ViewportInfo>(read);
  useEffect(() => {
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setVp(read()));
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      cancelAnimationFrame(raf);
    };
  }, []);
  return vp;
}
