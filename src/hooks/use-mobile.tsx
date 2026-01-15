import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Safari < 14 uses addListener/removeListener instead of addEventListener/removeEventListener
    const add = (mql as any).addEventListener ? 'addEventListener' : 'addListener';
    const remove = (mql as any).removeEventListener ? 'removeEventListener' : 'removeListener';

    (mql as any)[add]('change', onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);

    return () => {
      (mql as any)[remove]('change', onChange);
    };
  }, []);

  return !!isMobile;
}
