import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserProfile } from '../types';
import { authService, profileService } from '../services/scholarsetuService';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isCitizen: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<User>;
  register: (email: string, pass: string, name?: string) => Promise<User>;
  googleLogin: (credential: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initAuth = async () => {
    const tokensStr = localStorage.getItem('scholarsetu_tokens');
    if (tokensStr) {
      try {
        const u = await authService.getMe();
        setUser(u);
        const p = await profileService.getProfile();
        setProfile(p);
      } catch (err) {
        console.error('Session restore failed', err);
        localStorage.removeItem('scholarsetu_tokens');
        setUser(null);
        setProfile(null);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    initAuth();
    const handleLogout = () => {
      setUser(null);
      setProfile(null);
    };
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  const login = async (email: string, pass: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await authService.login({ email, password: pass });
      localStorage.setItem('scholarsetu_tokens', JSON.stringify(res.tokens));
      setUser(res.user);
      const p = await profileService.getProfile();
      setProfile(p);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, pass: string, name?: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await authService.register({ email, password: pass, full_name: name });
      localStorage.setItem('scholarsetu_tokens', JSON.stringify(res.tokens));
      setUser(res.user);
      const p = await profileService.getProfile();
      setProfile(p);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = async (credential: string) => {
    setIsLoading(true);
    try {
      const res = await authService.googleAuth(credential);
      localStorage.setItem('scholarsetu_tokens', JSON.stringify(res.tokens));
      setUser(res.user);
      const p = await profileService.getProfile();
      setProfile(p);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('scholarsetu_tokens');
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      try {
        const p = await profileService.getProfile();
        setProfile(p);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'ADMIN',
        isCitizen: !user || user?.role === 'CITIZEN',
        isLoading,
        login,
        register,
        googleLogin,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
