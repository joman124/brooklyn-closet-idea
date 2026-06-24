import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Brooklyn Closet",
    short_name: "Closet",
    description: "Upload your wardrobe and let AI plan your outfits for the week.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf7f2",
    theme_color: "#b4552f",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
