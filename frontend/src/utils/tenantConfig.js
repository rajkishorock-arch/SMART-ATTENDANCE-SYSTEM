// Utility to determine active tenant slug based on subdomain or override
export const getActiveTenantSlug = () => {
  const hostname = window.location.hostname; // e.g. "du.attendance.io" or "localhost"
  const parts = hostname.split('.');
  
  // Check if it's an IP address or localhost
  const isIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname);
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local');
  
  if (parts.length > 2 && !isIP && !isLocalhost) {
    // Extract first part as subdomain (e.g. du)
    return parts[0];
  }
  
  // Fallback to localStorage override (useful for testing multi-tenancy locally) or 'default'
  return localStorage.getItem('override_tenant') || 'default';
};

// Dynamic helper to construct headers including the X-Tenant-Slug
export const getTenantHeaders = () => {
  return {
    'X-Tenant-Slug': getActiveTenantSlug()
  };
};
