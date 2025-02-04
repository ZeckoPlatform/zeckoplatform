export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    const fetchOptions: RequestInit = {
      method,
      credentials: 'include',
      headers: {
        ...(data ? { "Content-Type": "application/json" } : {}),
        "Accept": "application/json",
      },
      body: data ? JSON.stringify(data) : undefined,
    };

    const res = await fetch(url, fetchOptions);

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