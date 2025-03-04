import { ReactNode, createContext, useContext } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { SelectUser } from "@db/schema";

type LoginData = {
  email: string;
  password: string;
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  token?: string;
  user?: T;
};

export const AuthContext = createContext<ReturnType<typeof useAuthState> | null>(null);

function useAuthState() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: user, error, isLoading } = useQuery<SelectUser | null>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      if (!token) return null;

      try {
        const res = await fetch("/api/user", {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json'
          },
        });

        if (!res.ok) {
          if (res.status === 401) {
            localStorage.removeItem("token");
            return null;
          }
          throw new Error("Failed to fetch user data");
        }

        const data = await res.json() as ApiResponse<SelectUser>;
        return data.success && data.user ? data.user : null;
      } catch (error) {
        console.error('User fetch error:', error);
        return null;
      }
    },
    retry: false,
    retryOnMount: false,
    refetchOnWindowFocus: true,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      if (!credentials.email || !credentials.password) {
        throw new Error("Email and password are required");
      }

      console.log('Login attempt:', {
        email: credentials.email,
        password: credentials.password // Temporarily log for debugging
      });

      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password
        }),
      });

      const text = await res.text();
      console.log('Raw login response:', text);

      const data = JSON.parse(text) as ApiResponse<SelectUser>;
      console.log('Parsed login response:', data);

      if (!data.success) {
        throw new Error(data.message || "Login failed");
      }

      if (!data.token || !data.user) {
        throw new Error("Invalid server response");
      }

      localStorage.setItem("token", data.token);
      return data.user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Welcome back!",
        description: "Logged in successfully",
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      localStorage.removeItem("token");
      queryClient.setQueryData(["/api/user"], null);
    },
    onSuccess: () => {
      setLocation("/");
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    },
  });

  return {
    user,
    isLoading,
    error,
    loginMutation,
    logoutMutation
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthState();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}