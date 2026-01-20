import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "apple-touch-icon.png", "pwa-garcom-192.png", "pwa-garcom-512.png"],
      manifest: {
        name: "App do Garçom",
        short_name: "Garçom",
        description: "Aplicativo do garçom para gestão de pedidos",
        theme_color: "#1a1a2e",
        background_color: "#1a1a2e",
        display: "standalone",
        orientation: "portrait",
        start_url: "/garcom",
        scope: "/",
        icons: [
          {
            src: "pwa-garcom-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-garcom-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-garcom-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
