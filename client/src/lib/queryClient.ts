import { QueryClient, QueryFunction } from "@tanstack/react-query";

export const getQueryFn: <T>(options: {
  on401: "returnNull" | "throw";
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(queryKey[0] as string, {
        credentials: 'include',
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
      });

      console.log(`Query request - ${queryKey[0]}`);
      console.log(`Query response status: ${res.status}`);

      // Check for new token in headers
      const newToken = res.headers.get('X-New-Token');
      if (newToken) {
        console.log('Received new token, updating local storage');
        localStorage.setItem("token", newToken);
      }

      if (res.status === 401) {
        console.log("Authentication failed, clearing user state");
        localStorage.removeItem("token");
        if (unauthorizedBehavior === "returnNull") {
          return null;
        }
        const error = new Error("Authentication required");
        error.name = "AuthenticationError";
        throw error;
      }

      if (res.status === 403) {
        const data = await res.json();
        console.log("Access forbidden:", data);
        const error = new Error(data.message || "Access forbidden");
        error.name = "ForbiddenError";
        if (data.subscriptionRequired) {
          error.name = "SubscriptionRequiredError";
          (error as any).userType = data.userType;
        }
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
      staleTime: 0, // Set staleTime to 0 to always refetch
      cacheTime: 5 * 60 * 1000, // Cache for 5 minutes
      retry: (failureCount, error: any) => {
        if (error?.name === "AuthenticationError" || error?.name === "SubscriptionRequiredError") return false;
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
    const token = localStorage.getItem("token");

    const fetchOptions: RequestInit = {
      method,
      credentials: 'include',
      headers: {
        ...(data ? { "Content-Type": "application/json" } : {}),
        "Accept": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      },
      body: data ? JSON.stringify(data) : undefined,
    };

    const res = await fetch(url, fetchOptions);
    console.log(`Response status: ${res.status}`);

    // Check for new token in headers
    const newToken = res.headers.get('X-New-Token');
    if (newToken) {
      console.log('Received new token, updating local storage');
      localStorage.setItem("token", newToken);
    }

    if (!res.ok) {
      const text = await res.text();
      let errorMessage: string;
      try {
        const json = JSON.parse(text);
        errorMessage = json.message || text;
        if (json.subscriptionRequired) {
          const error = new Error(errorMessage);
          error.name = "SubscriptionRequiredError";
          (error as any).userType = json.userType;
          throw error;
        }
      } catch {
        errorMessage = text;
      }
      const error = new Error(errorMessage);
      if (res.status === 401) {
        localStorage.removeItem("token");
        error.name = "AuthenticationError";
      }
      if (res.status === 403) {
        error.name = "ForbiddenError";
      }
      throw error;
    }
    return res;
  } catch (error) {
    console.error("API request error:", error);
    throw error;
  }
}