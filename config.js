// ============================================================================
// CropGuard Central Configuration
// Centralized configuration for FastAPI YOLOv8 Backend and Rover Settings
// You can override the backend URL with VITE_BACKEND_URL environment variable in production

const DEFAULT_BACKEND_URL = "https://prominent-sizably-companion.ngrok-free.dev";
const BASE_URL = (typeof import.meta !== "undefined" && import.meta.env?.VITE_BACKEND_URL) || DEFAULT_BACKEND_URL;

export const BACKEND_CONFIG = {
  baseUrl: BASE_URL,
  predictEndpoint: `${BASE_URL.replace(/\/+$/, "")}/predict`,
  fileFieldName: "file", // Field name required by FastAPI: file: UploadFile = File(...)
  timeoutMs: 30000, // 30s timeout for deep learning inference
  headers: {
    "ngrok-skip-browser-warning": "true", // Bypass ngrok interstitial page
  },
};

export const APP_CONFIG = {
  name: "CropGuard",
  version: "2.4.1",
  yoloModel: "YOLOv8 Real-Time Crop/Weed Detector",
};
