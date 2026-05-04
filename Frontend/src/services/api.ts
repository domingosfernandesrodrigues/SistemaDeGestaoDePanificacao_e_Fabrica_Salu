import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5137/api/v1', // Using HTTP to avoid SSL issues locally
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

export default api;
