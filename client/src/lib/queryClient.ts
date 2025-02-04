import { QueryClient, QueryFunction } from "@tanstack/react-query";

export const getQueryFn: <T>(options: {
  on401: "returnNull" | "throw";
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      console.log(`Query request - ${queryKey[0]}`);
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
        headers: {
          "Accept": "application/json",
        },
      });

      console.log(`Query response status: ${res.status}`);
      console.log(`Query response headers:`, res.headers);

      if (res.status === 401) {
        console.log("Authentication failed, clearing user state");
        if (unauthorizedBehavior === "returnNull") {
          return null;
        }
        const error = new Error("Authentication required");
        error.name = "AuthenticationError";
        throw error;
      }

      if (!res.ok) {
        const text = await res.text();
        let errorMessage: string;
        try {
          const json = JSON.parse(text);
          errorMessage = json.message || text;
        } catch {
          errorMessage = text;
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      return data;
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
        if (error?.name === "AuthenticationError") return false;
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    console.log(`API Request - ${method} ${url}`);
    const res = await fetch(url, {
      method,
      credentials: "include",
      headers: {
        ...(data ? { "Content-Type": "application/json" } : {}),
        "Accept": "application/json",
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    console.log(`Response status: ${res.status}`);
    console.log(`Response headers:`, res.headers);

    if (!res.ok) {
      const text = await res.text();
      let errorMessage: string;
      try {
        const json = JSON.parse(text);
        errorMessage = json.message || text;
      } catch {
        errorMessage = text;
      }
      const error = new Error(errorMessage);
      if (res.status === 401) {
        error.name = "AuthenticationError";
      }
      throw error;
    }
    return res;
  } catch (error) {
    console.error("API request error:", error);
    throw error;
  }
}