// Runtime Environment Configuration & API Base Resolver
// Automatically switches between local dev (http://localhost:7860) and production HTTPS
(function() {
  function resolveApiBase() {
    // 1. Explicitly configured custom API base
    if (window.ENV && window.ENV.API_BASE_URL) {
      let url = window.ENV.API_BASE_URL.replace(/\/$/, '');
      if (window.location.protocol === 'https:' && url.startsWith('http://')) {
        url = url.replace(/^http:\/\//i, 'https://');
      }
      return url;
    }
    if (window.API_CUSTOM_BASE) {
      let url = window.API_CUSTOM_BASE.replace(/\/$/, '');
      if (window.location.protocol === 'https:' && url.startsWith('http://')) {
        url = url.replace(/^http:\/\//i, 'https://');
      }
      return url;
    }

    // 2. HTTPS Protection: When page is on HTTPS, never return http://
    // Use relative path '' so requests go to https://<current-domain>/api/...
    if (window.location.protocol === 'https:') {
      return '';
    }

    // 3. Direct access to Python backend on port 7860
    if (window.location.origin && window.location.origin.includes(':7860')) {
      return '';
    }

    // 4. Local frontend dev servers (Live Server :5500, Vite :5173, Next.js :3000, etc.)
    const localPorts = ['5500', '3000', '8080', '5173', '4173'];
    if (window.location.protocol === 'file:' || 
        localPorts.includes(window.location.port) ||
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1') {
      return 'http://localhost:7860';
    }

    // 5. Default fallback for hosted web apps (relative URL)
    return '';
  }

  window.getApiBase = resolveApiBase;
  window.API_BASE = resolveApiBase();
})();
