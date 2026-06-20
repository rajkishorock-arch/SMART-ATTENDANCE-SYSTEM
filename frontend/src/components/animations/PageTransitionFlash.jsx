import { useEffect, useState } from 'react';

export default function PageTransitionFlash({ activeTab }) {
  const [flashKey, setFlashKey] = useState(0);

  useEffect(() => {
    setFlashKey((k) => k + 1);
  }, [activeTab]);

  return (
    <div key={flashKey} className={`page-transition-flash page-flash-${activeTab}`} aria-hidden="true" />
  );
}
