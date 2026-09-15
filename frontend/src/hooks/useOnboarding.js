import { useState, useEffect } from 'react';

export default function useOnboarding(token) {
  const [showOnboardingGuide, setShowOnboardingGuide] = useState(false);
  const [showOnboardingTour, setShowOnboardingTour] = useState(false);

  useEffect(() => {
    const justLoggedIn = sessionStorage.getItem('just_logged_in_tour') === 'true';
    if (token && justLoggedIn) {
      if (!localStorage.getItem('onboarding_guide_done')) {
        setTimeout(() => setShowOnboardingGuide(true), 0);
        localStorage.setItem('onboarding_guide_done', 'true');
      }
      if (!localStorage.getItem('onboarding_tour_done')) {
        setTimeout(() => setShowOnboardingTour(true), 1500);
        localStorage.setItem('onboarding_tour_done', 'true');
      }
      sessionStorage.removeItem('just_logged_in_tour');
    }
  }, [token]);

  return {
    showOnboardingGuide,
    setShowOnboardingGuide,
    showOnboardingTour,
    setShowOnboardingTour,
  };
}
