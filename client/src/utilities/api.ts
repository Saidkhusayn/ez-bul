interface FetchOptions extends RequestInit {
  headers?: HeadersInit;
}

const API_URL = import.meta.env.VITE_API_URL;

export const fetchWithAuth = async (url: string, options: FetchOptions = {}): Promise<any> => {
  const storedToken = localStorage.getItem("token");
  if (!storedToken) {
    window.location.href = '/login'; // work on that
    throw new Error("No access token found. Please log in.");
  }

  const isFormData = options.body instanceof FormData;

  // Build headers differently based on the body type
  let baseHeaders: HeadersInit = {
    ...options.headers,
    Authorization: `Bearer ${localStorage.getItem("token")}`,
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

    if (response.status === 401 || response.status === 403) { //from the server i am giving 403 for token expired instead of 401
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
            ...options.headers,
            Authorization: `Bearer ${accessToken}`,
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
