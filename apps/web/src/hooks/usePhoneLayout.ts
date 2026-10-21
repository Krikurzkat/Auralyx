import { useEffect, useState } from 'react';

const PHONE_LAYOUT_QUERY = '(max-width: 520px) and (max-height: 1100px)';

function matchesPhoneLayout() {
  return typeof window !== 'undefined' && window.matchMedia(PHONE_LAYOUT_QUERY).matches;
}

/** Shared compact layout profile for phone-sized CSS viewports across vendors. */
export function usePhoneLayout() {
  const [isPhoneLayout, setIsPhoneLayout] = useState(matchesPhoneLayout);

  useEffect(() => {
    const mediaQuery = window.matchMedia(PHONE_LAYOUT_QUERY);
    const updateLayout = () => setIsPhoneLayout(mediaQuery.matches);
    updateLayout();
    mediaQuery.addEventListener('change', updateLayout);
    return () => mediaQuery.removeEventListener('change', updateLayout);
  }, []);

  return isPhoneLayout;
}
