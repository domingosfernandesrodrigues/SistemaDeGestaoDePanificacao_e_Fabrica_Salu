import axios from 'axios';

const isDevelopment = import.meta.env.DEV;

const api = axios.create({
  baseURL: isDevelopment 
    ? 'http://localhost:5137/api/v1' 
    : `http://${window.location.hostname}:5000/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add interceptor to add JWT token if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sgpf_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add interceptor to handle 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Se não for a rota de login, limpa o token e redireciona
      if (!error.config.url?.includes('/Auth/login')) {
        localStorage.clear();
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
