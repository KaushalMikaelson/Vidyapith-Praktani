export const API_BASE_URL = 'http://localhost:8000/api/v1';

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
