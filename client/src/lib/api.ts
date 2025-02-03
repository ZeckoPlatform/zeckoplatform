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
      throw new Error(text);
    }
    return res;
  } catch (error) {
    console.error("API request error:", error);
    throw error;
  }
}
