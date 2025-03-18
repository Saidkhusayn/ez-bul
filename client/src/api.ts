interface FetchOptions extends RequestInit {
  headers?: HeadersInit;
}

const API_URL = import.meta.env.VITE_API_URL;

export const fetchWithAuth = async (url: string, options: FetchOptions = {}): Promise<any> => {
  const isFormData = options.body instanceof FormData;

  // Build headers differently based on the body type
  let baseHeaders: HeadersInit = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    ...options.headers,
  };

  if (!isFormData) {
    baseHeaders = { "Content-Type": "application/json", ...baseHeaders };
  }

  try {
    let response = await fetch(`${API_URL}${url}`, {
      ...options,
      credentials: "include",
      headers: baseHeaders,
    });

    if (response.status === 403) {
      const refreshResponse = await fetch(`${API_URL}/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (refreshResponse.ok) {
        const { accessToken } = await refreshResponse.json();
        localStorage.setItem("token", accessToken);

        // Retry original request with new token
        response = await fetch(`${API_URL}${url}`, {
          ...options,
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            ...options.headers,
          },
        });
      } else {
        // Refresh failed, log user out
        localStorage.removeItem("token");
        window.dispatchEvent(new CustomEvent("showLoginModal"));
        throw new Error("Session expired. Please log in again.");
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})); // Try parsing error message
      throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
    }

    return await response.json(); 
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
};
