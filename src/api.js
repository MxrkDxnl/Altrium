import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5001/api'),
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to add JWT token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


// Resolve uploaded images against the same server used for API requests.
export function getUploadUrl(filePath) {
  if (!filePath) return null;
  const apiUrl = new URL(api.defaults.baseURL, window.location.origin);
  return new URL(filePath, apiUrl.origin).href;
}
export default api;
