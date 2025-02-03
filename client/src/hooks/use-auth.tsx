import { ReactNode, createContext, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import type { SelectUser, InsertUser } from "@db/schema";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  // Modified user query to handle auth state properly
  const {
    data: user,
    error,
    isLoading,
    refetch: refetchUser,
  } = useQuery<SelectUser | null>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/user", {
          credentials: "include",
          mode: "cors",
          cache: "no-cache",
          headers: {
            "Accept": "application/json",
          }
        });

        if (res.status === 401) {
          return null;
        }

        if (!res.ok) {
          throw new Error(await res.text());
        }

        return res.json();
      } catch (error) {
        console.error("User fetch error:", error);
        return null;
      }
    },
    staleTime: 30000, // Cache for 30 seconds
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(credentials),
        credentials: "include",
        mode: "cors",
        cache: "no-cache",
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }

      return res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Welcome back!",
        description: `Logged in as ${user.username}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (newUser: InsertUser) => {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(newUser),
        credentials: "include",
        mode: "cors",
        cache: "no-cache",
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }

      return res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Welcome!",
        description: "Your account has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
        mode: "cors",
        cache: "no-cache",
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Effect to verify auth state periodically
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const res = await fetch("/api/auth/verify", {
          credentials: "include",
          mode: "cors",
          cache: "no-cache",
        });
        if (!res.ok && user) {
          await refetchUser();
        }
      } catch (error) {
        console.error("Auth verification error:", error);
      }
    };

    const interval = setInterval(verifyAuth, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [user, refetchUser]);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}