import axios from 'axios';


const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';


const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});


// Request interceptor - ADD TOKEN TO EVERY REQUEST
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log('Token being sent:', token ? 'EXISTS' : 'MISSING');
    console.log('API Base URL:', API_BASE_URL);
    
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log('Authorization header set');
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);


// Response interceptor - HANDLE ERRORS
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log('API Error:', error.response?.status, error.response?.data);
    console.log('Full error:', error);
    
    // Only redirect on 401 for protected routes
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);


// Auth endpoints
export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);
export const getCurrentUser = () => api.get('/auth/me');


// Habits endpoints
export const getHabits = () => api.get('/habits');
export const createHabit = (data) => api.post('/habits', data);
export const updateHabit = (id, data) => api.put(`/habits/${id}`, data);
export const deleteHabit = (id) => api.delete(`/habits/${id}`);
export const createCheckin = (habitId, data) => api.post(`/habits/${habitId}/checkins`, data);


// Workouts endpoints
export const getWorkouts = () => api.get('/workouts');
export const createWorkout = (data) => api.post('/workouts', data);
export const updateWorkout = (id, data) => api.put(`/workouts/${id}`, data);
export const deleteWorkout = (id) => api.delete(`/workouts/${id}`);


// Dashboard endpoints
export const getDashboard = () => api.get('/stats/dashboard');


export default api;
