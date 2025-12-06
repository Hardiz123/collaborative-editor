import api from '@/lib/api';

export interface User {
  userID: string;
  username: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export const login = async (credentials: { email: string; password: string }) => {
  try {
    const response = await api.post<AuthResponse>('/login', credentials);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Login failed');
  }
};

export const signup = async (data: { username: string; email: string; password: string }) => {
  try {
    const response = await api.post<AuthResponse>('/signup', data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Signup failed');
  }
};

export const logout = async () => {
  const response = await api.get('/logout');
  return response.data;
};

export const getUser = async () => {
  const response = await api.get<User>('/getUser');
  return response.data;
};
