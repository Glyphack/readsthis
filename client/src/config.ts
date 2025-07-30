// API configuration
// In development, use relative URLs so that Vite dev-server proxy can forward
// API requests to the Cloudflare worker running at localhost:8787. In
// production we point to the deployed Workers domain.

export const API_URL = import.meta.env.DEV
  ? "http://localhost:8787"
  : "https://readsthis.bombastic.workers.dev";
