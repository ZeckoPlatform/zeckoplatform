import { ReactNode, createContext, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
} from "@tanstack/react-query";
import { queryClient, apiRequest } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { SelectUser, InsertUser } from "@db/schema";

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<ReturnType<typeof useAuthState> | null>(null);

function useAuthState() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const {
    data: user,
    error,
    isLoading,
    refetch: refetchUser,
  } = useQuery<SelectUser | null>({
    queryKey: ["/api/user"],
    retry: false,
    retryOnMount: false,
    refetchOnWindowFocus: true,
    staleTime: 30000, // Consider data stale after 30 seconds
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

      console.log("Login response status:", res.status);
      console.log("Login response headers:", res.headers);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      const { user } = await res.json();
      return user;
    },
    onSuccess: async (user: SelectUser) => {
      // Force immediate refetch and update cache
      await refetchUser();
      queryClient.setQueryData(["/api/user"], user);

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

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
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

  const registerMutation = useMutation({
    mutationFn: async (newUser: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", newUser);
      return res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
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

  // Session verification
  useEffect(() => {
    const verifySession = async () => {
      try {
        const res = await fetch("/api/auth/verify", {
          credentials: "include",
        });

        if (!res.ok) {
          if (res.status === 401) {
            console.log("Session verification failed, clearing user state");
            queryClient.setQueryData(["/api/user"], null);
          }
          return;
        }

        const data = await res.json();
        if (data.authenticated && data.user) {
          queryClient.setQueryData(["/api/user"], data.user);
        }
      } catch (error) {
        console.error("Session verification error:", error);
      }
    };

    // Verify session on mount and periodically
    verifySession();
    const interval = setInterval(verifySession, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return {
    user: user ?? null,
    isLoading,
    error,
    loginMutation,
    logoutMutation,
    registerMutation,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthState();

  return (
    <AuthContext.Provider value={auth}>
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