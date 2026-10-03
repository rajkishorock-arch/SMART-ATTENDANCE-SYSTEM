import { createContext, useState, useEffect, useCallback } from 'react';
import { getActiveTenantSlug } from '../utils/tenantConfig';
import { systemApi } from '../api/systemApi.js';

const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const [tenantSlug, setTenantSlug] = useState(() => {
    try {
      const raw = localStorage.getItem('cached_user');
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.institution_slug) return u.institution_slug.toLowerCase().trim();
      }
    } catch {}
    return getActiveTenantSlug() || 'default';
  });

  const [tenantBranding, setTenantBranding] = useState(() => {
    try {
      const rawUser = localStorage.getItem('cached_user');
      if (rawUser) {
        const u = JSON.parse(rawUser);
        if (u?.institution_name) {
          return {
            name: u.institution_name,
            slug: u.institution_slug || 'default',
            primary_color: '#4F46E5',
            secondary_color: '#06B6D4'
          };
        }
      }
      const rawBranding = localStorage.getItem('cached_tenant_branding');
      if (rawBranding) {
        return JSON.parse(rawBranding);
      }
    } catch {}
    return null;
  });

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
    let targetSlug = slugToLoad;
    if (!targetSlug) {
      try {
        const rawUser = localStorage.getItem('cached_user');
        if (rawUser) {
          const u = JSON.parse(rawUser);
          if (u?.institution_slug) targetSlug = u.institution_slug;
        }
      } catch {}
    }
    if (!targetSlug) {
      targetSlug = tenantSlug || getActiveTenantSlug() || 'default';
    }
    targetSlug = (targetSlug || 'default').toLowerCase().trim();

    setIsLoadingBranding(true);
    try {
      const res = await systemApi.fetchBranding(targetSlug);
      if (res && res.ok) {
        const branding = await res.json();
        setTenantBranding(branding);
        try {
          localStorage.setItem('cached_tenant_branding', JSON.stringify(branding));
        } catch {}
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
      let targetSlug = tenantSlug;
      try {
        const rawUser = localStorage.getItem('cached_user');
        if (rawUser) {
          const u = JSON.parse(rawUser);
          if (u?.institution_slug) targetSlug = u.institution_slug;
        }
      } catch {}
      if (!targetSlug) {
        targetSlug = getActiveTenantSlug() || 'default';
      }
      targetSlug = (targetSlug || 'default').toLowerCase().trim();

      try {
        const res = await systemApi.fetchBranding(targetSlug);
        if (res && res.ok && isMounted) {
          const branding = await res.json();
          setTenantBranding(branding);
          try {
            localStorage.setItem('cached_tenant_branding', JSON.stringify(branding));
          } catch {}
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

  // Storage change listener to react to tenant changes safely
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'override_tenant' && e.newValue) {
        // Protect active user's session: never allow another tab to overwrite a logged in session's institution!
        try {
          const rawUser = localStorage.getItem('cached_user');
          if (rawUser) {
            const u = JSON.parse(rawUser);
            if (u?.institution_slug && u.institution_slug.toLowerCase().trim() !== e.newValue.toLowerCase().trim()) {
              console.log('[TenantContext] Prevented cross-tab overwrite of active user tenant:', u.institution_slug);
              return;
            }
          }
        } catch {}
        const newSlug = e.newValue.toLowerCase().trim();
        setTenantSlug(newSlug);
        loadTenantBranding(newSlug);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [loadTenantBranding]);

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
