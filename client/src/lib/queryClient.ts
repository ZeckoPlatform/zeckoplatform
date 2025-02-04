import { QueryClient, QueryFunction } from "@tanstack/react-query";

export const getQueryFn: <T>(options: {
  on401: "returnNull" | "throw";
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
        headers: {
          "Accept": "application/json",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        },
        cache: "no-cache",
      });

      // Handle 401 more gracefully
      if (res.status === 401) {
        console.log("Auth check failed for", queryKey[0]);
        if (unauthorizedBehavior === "returnNull") {
          return null;
        }
        const error = new Error("Authentication required");
        error.name = "AuthenticationError";
        throw error;
      }

      if (!res.ok) {
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          throw new Error(json.message || text);
        } catch {
          throw new Error(text);
        }
      }

      return res.json();
    } catch (error) {
      console.error("Query error:", error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on authentication errors
        if (error?.name === "AuthenticationError") return false;
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      networkMode: "always",
    },
    mutations: {
      retry: false,
      networkMode: "always",
    },
  },
});

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    const res = await fetch(url, {
      method,
      headers: {
        ...(data ? { "Content-Type": "application/json" } : {}),
        "Accept": "application/json",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
      },
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      mode: "cors",
      cache: "no-cache",
    });

    if (!res.ok) {
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        const error = new Error(json.message || text);
        if (res.status === 401) {
          error.name = "AuthenticationError";
        }
        throw error;
      } catch (e) {
        throw new Error(text);
      }
    }
    return res;
  } catch (error) {
    console.error("API request error:", error);
    throw error;
  }
}