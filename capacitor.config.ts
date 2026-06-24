import type { CapacitorConfig } from "@capacitor/cli";

// The app has server-side API routes and writes to a local JSON file + disk
// uploads, so it can't run as a static bundle inside the WebView. Point the
// shell at a deployed instance of this Next.js app instead. Override with
// the CAPACITOR_SERVER_URL env var per environment (dev/staging/prod).
const serverUrl = process.env.CAPACITOR_SERVER_URL ?? "http://localhost:3000";

const config: CapacitorConfig = {
  appId: "com.brooklyncloset.app",
  appName: "Brooklyn Closet",
  webDir: "public",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
  },
  ios: {
    contentInset: "automatic",
  },
};

export default config;
