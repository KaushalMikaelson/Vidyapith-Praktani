let rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
if (rawApiUrl && !rawApiUrl.endsWith('/api/v1') && !rawApiUrl.endsWith('/api/v1/')) {
  rawApiUrl = rawApiUrl.replace(/\/$/, '') + '/api/v1';
}
export const API_BASE_URL = rawApiUrl;

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  // Retrieve the stored JWT token
  const token = typeof window !== 'undefined' ? localStorage.getItem('rkmv_auth_token') : null;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }

  return response.json();
};

/**
 * Upload helper for multipart/form-data (file uploads).
 * Does NOT set Content-Type — lets the browser set the correct
 * multipart boundary automatically.
 */
export const apiUploadFetch = async (endpoint: string, formData: FormData) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('rkmv_auth_token') : null;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      // NOTE: Do NOT set Content-Type here — browser handles multipart boundary
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Upload failed with status ${response.status}`);
  }

  return response.json();
};
