import { ReactNode, createContext, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import type { SelectUser, InsertUser } from "@db/schema";
import { queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

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
  const [, setLocation] = useLocation();

  // Use staleTime: 0 to ensure fresh data on each request
  const {
    data: user,
    error,
    isLoading,
    refetch: refetchUser,
  } = useQuery<SelectUser | null>({
    queryKey: ["/api/user"],
    retry: false,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      const { user } = await res.json();
      return user;
    },
    onSuccess: async (user: SelectUser) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      await refetchUser();
      toast({
        title: "Welcome back!",
        description: `Logged in as ${user.username}`,
      });

      // Redirect based on user type
      switch (user.userType) {
        case "vendor":
          setLocation("/vendor");
          break;
        case "business":
        case "free":
          setLocation("/leads");
          break;
        default:
          setLocation("/");
      }
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
        },
        body: JSON.stringify(newUser),
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      const { user } = await res.json();
      return user;
    },
    onSuccess: async (user: SelectUser) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      await refetchUser();
      toast({
        title: "Welcome!",
        description: "Your account has been created successfully.",
      });

      if (user.userType !== "free") {
        setLocation("/subscription");
      } else {
        setLocation("/leads");
      }
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
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setLocation("/");
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

  // Enhanced session verification
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const res = await fetch("/api/auth/verify", {
          credentials: "include",
        });

        if (!res.ok) {
          if (user) {
            await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
            await refetchUser();
          }
          return;
        }

        const data = await res.json();
        if (!data.authenticated) {
          if (user) {
            await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
            await refetchUser();
          }
        }
      } catch (error) {
        console.error("Auth verification error:", error);
      }
    };

    // Verify auth state periodically and on mount
    const interval = setInterval(verifyAuth, 15000);
    verifyAuth();

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