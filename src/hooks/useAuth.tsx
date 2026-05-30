import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import axios from '../lib/axios';

interface User {
  id: string;
  name: string;
  role: string;
  tenant_id: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  requestOtp: (identifier: string) => Promise<boolean>;
  login: (identifier: string, otp: string) => Promise<boolean>;
  loginSuperAdmin: () => Promise<boolean>;
  loginWithToken: (token: string, user: any) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('lunchos_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const requestOtp = async (identifier: string) => {
    try {
      await axios.post('/auth/request-otp', { identifier });
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const login = async (identifier: string, otp: string) => {
    try {
      const res = await axios.post('/auth/verify-otp', { identifier, otp });
      const { token, user } = res.data;
      localStorage.setItem('lunchos_token', token);
      localStorage.setItem('lunchos_user', JSON.stringify(user));
      setUser(user);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };
  
  const loginWithToken = (token: string, user: any) => {
  localStorage.setItem('lunchos_token', token);
  localStorage.setItem('lunchos_user', JSON.stringify(user));
  setUser(user);
};

  const loginSuperAdmin = async () => {
    try {
      const res = await axios.post('/auth/super-admin-bypass');
      const { token, user } = res.data;
      localStorage.setItem('lunchos_token', token);
      localStorage.setItem('lunchos_user', JSON.stringify(user));
      setUser(user);
      return true;
    } catch (err) {
      console.error('Super Admin bypass login failed:', err);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('lunchos_token');
    localStorage.removeItem('lunchos_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, requestOtp, login, loginSuperAdmin, loginWithToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
