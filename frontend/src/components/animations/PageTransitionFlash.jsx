import { useEffect, useState } from 'react';

export default function PageTransitionFlash({ activeTab, enabled = true }) {
  const [flashKey, setFlashKey] = useState(0);

  useEffect(() => {
    if (enabled) setFlashKey((k) => k + 1);
  }, [activeTab, enabled]);

  if (!enabled) return null;

  return (
    <div key={flashKey} className={`page-transition-flash page-flash-${activeTab}`} aria-hidden="true" />
  );
}
