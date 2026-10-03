import { useState } from 'react';

/**
 * Onboarding hook - permanently disabled per user request
 * All welcome tours and onboarding popups are suppressed across the entire app.
 */
export default function useOnboarding() {
  const [showOnboardingGuide, setShowOnboardingGuide] = useState(false);
  const [showOnboardingTour, setShowOnboardingTour] = useState(false);

  return {
    showOnboardingGuide: false,
    setShowOnboardingGuide,
    showOnboardingTour: false,
    setShowOnboardingTour,
  };
}
