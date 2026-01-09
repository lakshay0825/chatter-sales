import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import { authService } from '../services/auth.service';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => {
      // Initialize loading state if there's a token (we need to verify it)
      const initialToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      return {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: !!initialToken, // Set loading to true if token exists

        login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await authService.login({ email, password });
          localStorage.setItem('token', response.token);
          // Fetch full user data
          const user = await authService.getCurrentUser();
          set({
            user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        authService.logout();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      checkAuth: async () => {
        set({ isLoading: true });
        const token = localStorage.getItem('token');
        if (!token) {
          set({ isAuthenticated: false, user: null, token: null, isLoading: false });
          return;
        }

        try {
          const user = await authService.getCurrentUser();
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user });
      },

      setToken: (token: string | null) => {
        set({ token });
      },
      };
    },
    {
      name: 'auth-storage',
      partialize: (state: AuthState) => ({ token: state.token, user: state.user }),
    }
  )
);

