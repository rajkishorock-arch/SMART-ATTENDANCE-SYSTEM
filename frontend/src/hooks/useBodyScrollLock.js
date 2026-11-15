import { useEffect } from 'react';

/**
 * Custom hook to lock body scrolling when a modal, drawer, or dialog is active.
 * Restores original body overflow style on unmount or when locked becomes false.
 */
export default function useBodyScrollLock(isLocked = true) {
  useEffect(() => {
    if (!isLocked) return;
    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [isLocked]);
}
