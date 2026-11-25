export const getSubdomainTenantSlug = () => {
  if (typeof window === 'undefined') return '';
  const hostname = window.location.hostname; // e.g. "du.attendance.io" or "localhost"
  const parts = hostname.split('.');

  const isIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname);
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local');
  const isPublicDomain = hostname.endsWith('.vercel.app') || hostname.endsWith('.onrender.com');

  if (!isIP && !isLocalhost) {
    if (isPublicDomain) {
      if (parts.length > 3) {
        return parts[0].toLowerCase().trim();
      }
    } else if (parts.length > 2) {
      return parts[0].toLowerCase().trim();
    }
  }
  return '';
};

export const getActiveTenantSlug = () => {
  // 1. Highest Priority: Logged in user's verified institution slug
  try {
    const rawUser = localStorage.getItem('cached_user');
    if (rawUser) {
      const u = JSON.parse(rawUser);
      if (u && u.institution_slug) {
        return u.institution_slug.toLowerCase().trim();
      }
    }
  } catch { /* ignore parse error */ }

  // Capacitor Android app runs on capacitor://localhost — treat as mobile app
  // In this case, always use localStorage override set by the institution dropdown in LoginPortal
  const isCapacitor = window.location.protocol === 'capacitor:' || 
                      (typeof window.Capacitor !== 'undefined');
  
  if (isCapacitor) {
    // Mobile app: user selects institution from dropdown → saved in localStorage
    return localStorage.getItem('override_tenant') || localStorage.getItem('active_tenant_slug') || 'default';
  }

  const subdomainSlug = getSubdomainTenantSlug();
  if (subdomainSlug) {
    return subdomainSlug;
  }
  
  // Fallback to localStorage override (useful for testing multi-tenancy locally) or 'default'
  return localStorage.getItem('override_tenant') || localStorage.getItem('active_tenant_slug') || 'default';
};

// Dynamic helper to construct headers including the X-Tenant-Slug
export const getTenantHeaders = () => {
  return {
    'X-Tenant-Slug': getActiveTenantSlug()
  };
};
