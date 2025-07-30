// API configuration
export const APP_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost"
    : "https://r.glyphack.com";
