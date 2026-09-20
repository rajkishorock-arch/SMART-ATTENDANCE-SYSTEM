import { createContext, useState, useEffect, useCallback } from 'react';
import { getActiveTenantSlug } from '../utils/tenantConfig';
import { systemApi } from '../api/systemApi';

const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const [tenantSlug, setTenantSlug] = useState(() => getActiveTenantSlug() || 'default');
  const [tenantBranding, setTenantBranding] = useState(null);
  const [isLoadingBranding, setIsLoadingBranding] = useState(false);

  // Apply branding CSS variables & document title
  const applyBrandingTheme = useCallback((branding) => {
    if (!branding) return;
    if (branding.primary_color) {
      document.documentElement.style.setProperty('--color-primary', branding.primary_color);
      document.documentElement.style.setProperty('--border-color-glow', `${branding.primary_color}59`);
      document.documentElement.style.setProperty('--glow-shadow', `0 0 25px ${branding.primary_color}33`);
    }
    if (branding.secondary_color) {
      document.documentElement.style.setProperty('--color-secondary', branding.secondary_color);
    }
    if (branding.name) {
      document.title = `${branding.name} - Smart Attendance System`;
    }
  }, []);

  // Fetch tenant branding from backend
  const loadTenantBranding = useCallback(async (slugToLoad) => {
    const targetSlug = slugToLoad || tenantSlug || getActiveTenantSlug() || 'default';
    setIsLoadingBranding(true);
    try {
      const res = await systemApi.fetchBranding(targetSlug);
      if (res && res.ok) {
        const branding = await res.json();
        setTenantBranding(branding);
        applyBrandingTheme(branding);
        return branding;
      }
    } catch (err) {
      console.error('Branding load error:', err);
    } finally {
      setIsLoadingBranding(false);
    }
    return null;
  }, [tenantSlug, applyBrandingTheme]);

  // Initial branding load effect
  useEffect(() => {
    let isMounted = true;
    const initBranding = async () => {
      const targetSlug = tenantSlug || getActiveTenantSlug() || 'default';
      try {
        const res = await systemApi.fetchBranding(targetSlug);
        if (res && res.ok && isMounted) {
          const branding = await res.json();
          setTenantBranding(branding);
          applyBrandingTheme(branding);
        }
      } catch (err) {
        console.error('Branding load error:', err);
      }
    };
    initBranding();
    return () => {
      isMounted = false;
    };
  }, [tenantSlug, applyBrandingTheme]);

  // Switch tenant helper
  const switchTenant = useCallback(async (newSlug) => {
    const slug = (newSlug || 'default').toLowerCase().trim();
    localStorage.setItem('override_tenant', slug);
    localStorage.setItem('active_tenant_slug', slug);
    setTenantSlug(slug);
    await loadTenantBranding(slug);
  }, [loadTenantBranding]);

  const value = {
    tenantSlug,
    setTenantSlug,
    tenantBranding,
    setTenantBranding,
    isLoadingBranding,
    loadTenantBranding,
    switchTenant,
  };

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export default TenantContext;
