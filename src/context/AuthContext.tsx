import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { apiClient, tokenStorage } from "@/api/client";
import { ROLE_RANK, type User, type UserRole } from "@/api/types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  role: UserRole | null;
  /** True when the signed-in user's rank meets or exceeds `role`. */
  hasRank: (role: UserRole) => boolean;
  isAdmin: boolean;
  canManageTeam: boolean;
  canManageChannels: boolean;
  canManageOperations: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const { data } = await apiClient.get<User>("/auth/me");
    setUser(data);
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      if (!tokenStorage.getAccess()) {
        setIsLoading(false);
        return;
      }
      try {
        await refreshUser();
      } catch {
        tokenStorage.clear();
      } finally {
        setIsLoading(false);
      }
    };
    bootstrap();
  }, [refreshUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await apiClient.post("/auth/login", { email, password });
      tokenStorage.set(data.access_token, data.refresh_token);
      await refreshUser();
    },
    [refreshUser],
  );

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const rank = user ? (ROLE_RANK[user.role] ?? 0) : 0;
    const hasRank = (role: UserRole) => rank >= ROLE_RANK[role];

    return {
      user,
      isLoading,
      role: user?.role ?? null,
      hasRank,
      isAdmin: hasRank("admin"),
      // Team accounts, deletions, credential resets.
      canManageTeam: hasRank("admin"),
      // Channel feed URLs are calendar credentials — manager and above.
      canManageChannels: hasRank("manager"),
      // Day-to-day: properties, bookings, orders.
      canManageOperations: hasRank("staff"),
      login,
      logout,
      refreshUser,
    };
  }, [user, isLoading, login, logout, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}