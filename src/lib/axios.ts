import axios from 'axios';
import toast from 'react-hot-toast';

const axiosInstance = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('lunchos_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403 && error.response?.data?.isReadOnly) {
      toast.error(
        `Operation Denied: This workspace is in Read-Only Mode. Contact support at ${error.response.data.supportEmail} or ${error.response.data.supportPhone} to restore access.`,
        { id: 'readonly-lock', duration: 8000 }
      );
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
