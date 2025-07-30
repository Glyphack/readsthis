export function showToast(
  title: string,
  description: string,
  type = "success",
) {
  const toast = document.createElement("div");
  toast.className = `toast ${type === "success" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"} border p-4 rounded-lg`;
  toast.innerHTML = `
        <h3 class="${type === "success" ? "text-green-800" : "text-red-800"} font-medium">${title}</h3>
        <p class="${type === "success" ? "text-green-700" : "text-red-700"} text-sm">${description}</p>
      `;
  const toastContainer = document.getElementById("toast-container")!;
  toastContainer.appendChild(toast);
  toast.offsetHeight;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      toastContainer.removeChild(toast);
    }, 300);
  }, 3000);
}

export function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
  showToast(
    "Link copied to clipboard",
    "You can now paste it anywhere you want.",
  );
}

// ---------------------------------------------------------------------------
// Authentication token helpers
// ---------------------------------------------------------------------------

/** Storage key used for persisting the management/authentication token. */
export const AUTH_TOKEN_KEY = "rt_auth_token";

/**
 * Persist the given authentication token in sessionStorage. The token is only
 * kept for the lifetime of the browser session which is generally safer than
 * localStorage while still allowing page refreshes and navigation without the
 * token query-string parameter.
 */
export function setAuthToken(token: string): void {
  try {
    if (token) {
      sessionStorage.setItem(AUTH_TOKEN_KEY, token);
    }
  } catch {
    // Silently ignore storage errors (e.g. Safari private mode)
  }
}

/**
 * Returns the currently stored authentication token, or null if none is
 * present.
 */
export function getAuthToken(): string | null {
  try {
    return sessionStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Removes the stored authentication token.
 */
export function clearAuthToken(): void {
  try {
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Clears any stored authentication token and sends the user to the login page.
 * Call this when the server indicates the provided token is invalid or expired.
 */
export function redirectToLogin(): void {
  clearAuthToken();
  try {
    window.location.href = "/login";
  } catch {
    // If navigation fails for some reason, fall back to reloading the page
    window.location.reload();
  }
}

/**
 * Gets an element using querySelector and throws an error if the element is not found.
 * This is useful for elements that must exist for the app to function properly.
 *
 * @param selector - The CSS selector to find the element
 * @param parent - Optional parent element to search within (defaults to document)
 * @param errorMessage - Optional custom error message
 * @returns The found element with the correct type
 * @throws Error if the element is not found
 */
export function getRequiredElement<T extends Element = Element>(
  selector: string,
  parent: Document | Element = document,
  errorMessage?: string,
): T {
  const element = parent.querySelector<T>(selector);

  if (!element) {
    const message = errorMessage || `Required element not found: "${selector}"`;
    console.error(message);
    throw new Error(message);
  }

  return element;
}
