// Get the backend URL from environment variables or use default
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export { API_BASE_URL }; 