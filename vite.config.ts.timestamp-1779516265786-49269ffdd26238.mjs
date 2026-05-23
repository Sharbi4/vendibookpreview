// vite.config.ts
import { defineConfig } from "file:///C:/Users/Aweso/OneDrive/Documents/vendibookpreview/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Aweso/OneDrive/Documents/vendibookpreview/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///C:/Users/Aweso/OneDrive/Documents/vendibookpreview/node_modules/lovable-tagger/dist/index.js";
import { VitePWA } from "file:///C:/Users/Aweso/OneDrive/Documents/vendibookpreview/node_modules/vite-plugin-pwa/dist/index.js";
var __vite_injected_original_dirname = "C:\\Users\\Aweso\\OneDrive\\Documents\\vendibookpreview";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "app-icon-512.png", "pwa-512x512.png", "images/vendibook-email-logo.png"],
      // Use ONE service worker (/sw.js) for both PWA caching + push notifications
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      injectManifest: {
        // Fix build failure when a JS chunk exceeds Workbox's default 2MiB limit
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024
      },
      manifest: {
        name: "Vendibook - Food Truck & Mobile Vendor Marketplace",
        short_name: "Vendibook",
        description: "Rent or buy food trucks, trailers, shared kitchens, and vendor lots. Verified listings, secure payments, and 24/7 support.",
        theme_color: "#FF5124",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        categories: ["business", "food", "shopping"],
        icons: [
          {
            src: "/favicon.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/favicon.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable"
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ],
        screenshots: [
          {
            src: "/screenshots/mobile.png",
            sizes: "390x844",
            type: "image/png",
            form_factor: "narrow",
            label: "Vendibook Home"
          },
          {
            src: "/screenshots/desktop.png",
            sizes: "1280x720",
            type: "image/png",
            form_factor: "wide",
            label: "Vendibook Desktop"
          }
        ]
      },
      // Used to generate the precache manifest injected into src/sw.ts
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    },
    dedupe: ["react", "react-dom"]
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxBd2Vzb1xcXFxPbmVEcml2ZVxcXFxEb2N1bWVudHNcXFxcdmVuZGlib29rcHJldmlld1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcQXdlc29cXFxcT25lRHJpdmVcXFxcRG9jdW1lbnRzXFxcXHZlbmRpYm9va3ByZXZpZXdcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL0F3ZXNvL09uZURyaXZlL0RvY3VtZW50cy92ZW5kaWJvb2twcmV2aWV3L3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IHsgY29tcG9uZW50VGFnZ2VyIH0gZnJvbSBcImxvdmFibGUtdGFnZ2VyXCI7XHJcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tIFwidml0ZS1wbHVnaW4tcHdhXCI7XHJcblxyXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiAoe1xyXG4gIHNlcnZlcjoge1xyXG4gICAgaG9zdDogXCI6OlwiLFxyXG4gICAgcG9ydDogODA4MCxcclxuICB9LFxyXG4gIHBsdWdpbnM6IFtcclxuICAgIHJlYWN0KCksXHJcbiAgICBtb2RlID09PSBcImRldmVsb3BtZW50XCIgJiYgY29tcG9uZW50VGFnZ2VyKCksXHJcbiAgICBWaXRlUFdBKHtcclxuICAgICAgcmVnaXN0ZXJUeXBlOiBcImF1dG9VcGRhdGVcIixcclxuICAgICAgaW5jbHVkZUFzc2V0czogW1wiZmF2aWNvbi5wbmdcIiwgXCJhcHAtaWNvbi01MTIucG5nXCIsIFwicHdhLTUxMng1MTIucG5nXCIsIFwiaW1hZ2VzL3ZlbmRpYm9vay1lbWFpbC1sb2dvLnBuZ1wiXSxcclxuXHJcbiAgICAgIC8vIFVzZSBPTkUgc2VydmljZSB3b3JrZXIgKC9zdy5qcykgZm9yIGJvdGggUFdBIGNhY2hpbmcgKyBwdXNoIG5vdGlmaWNhdGlvbnNcclxuICAgICAgc3RyYXRlZ2llczogXCJpbmplY3RNYW5pZmVzdFwiLFxyXG4gICAgICBzcmNEaXI6IFwic3JjXCIsXHJcbiAgICAgIGZpbGVuYW1lOiBcInN3LnRzXCIsXHJcbiAgICAgIGluamVjdE1hbmlmZXN0OiB7XHJcbiAgICAgICAgLy8gRml4IGJ1aWxkIGZhaWx1cmUgd2hlbiBhIEpTIGNodW5rIGV4Y2VlZHMgV29ya2JveCdzIGRlZmF1bHQgMk1pQiBsaW1pdFxyXG4gICAgICAgIG1heGltdW1GaWxlU2l6ZVRvQ2FjaGVJbkJ5dGVzOiA4ICogMTAyNCAqIDEwMjQsXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICBtYW5pZmVzdDoge1xyXG4gICAgICAgIG5hbWU6IFwiVmVuZGlib29rIC0gRm9vZCBUcnVjayAmIE1vYmlsZSBWZW5kb3IgTWFya2V0cGxhY2VcIixcclxuICAgICAgICBzaG9ydF9uYW1lOiBcIlZlbmRpYm9va1wiLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOlxyXG4gICAgICAgICAgXCJSZW50IG9yIGJ1eSBmb29kIHRydWNrcywgdHJhaWxlcnMsIHNoYXJlZCBraXRjaGVucywgYW5kIHZlbmRvciBsb3RzLiBWZXJpZmllZCBsaXN0aW5ncywgc2VjdXJlIHBheW1lbnRzLCBhbmQgMjQvNyBzdXBwb3J0LlwiLFxyXG4gICAgICAgIHRoZW1lX2NvbG9yOiBcIiNGRjUxMjRcIixcclxuICAgICAgICBiYWNrZ3JvdW5kX2NvbG9yOiBcIiNmZmZmZmZcIixcclxuICAgICAgICBkaXNwbGF5OiBcInN0YW5kYWxvbmVcIixcclxuICAgICAgICBvcmllbnRhdGlvbjogXCJwb3J0cmFpdC1wcmltYXJ5XCIsXHJcbiAgICAgICAgc2NvcGU6IFwiL1wiLFxyXG4gICAgICAgIHN0YXJ0X3VybDogXCIvXCIsXHJcbiAgICAgICAgY2F0ZWdvcmllczogW1wiYnVzaW5lc3NcIiwgXCJmb29kXCIsIFwic2hvcHBpbmdcIl0sXHJcbiAgICAgICAgaWNvbnM6IFtcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgc3JjOiBcIi9mYXZpY29uLnBuZ1wiLFxyXG4gICAgICAgICAgICBzaXplczogXCIxOTJ4MTkyXCIsXHJcbiAgICAgICAgICAgIHR5cGU6IFwiaW1hZ2UvcG5nXCIsXHJcbiAgICAgICAgICAgIHB1cnBvc2U6IFwiYW55XCIsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBzcmM6IFwiL2Zhdmljb24ucG5nXCIsXHJcbiAgICAgICAgICAgIHNpemVzOiBcIjE5MngxOTJcIixcclxuICAgICAgICAgICAgdHlwZTogXCJpbWFnZS9wbmdcIixcclxuICAgICAgICAgICAgcHVycG9zZTogXCJtYXNrYWJsZVwiLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgc3JjOiBcIi9wd2EtNTEyeDUxMi5wbmdcIixcclxuICAgICAgICAgICAgc2l6ZXM6IFwiNTEyeDUxMlwiLFxyXG4gICAgICAgICAgICB0eXBlOiBcImltYWdlL3BuZ1wiLFxyXG4gICAgICAgICAgICBwdXJwb3NlOiBcImFueVwiLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgc3JjOiBcIi9wd2EtNTEyeDUxMi5wbmdcIixcclxuICAgICAgICAgICAgc2l6ZXM6IFwiNTEyeDUxMlwiLFxyXG4gICAgICAgICAgICB0eXBlOiBcImltYWdlL3BuZ1wiLFxyXG4gICAgICAgICAgICBwdXJwb3NlOiBcIm1hc2thYmxlXCIsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgc2NyZWVuc2hvdHM6IFtcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgc3JjOiBcIi9zY3JlZW5zaG90cy9tb2JpbGUucG5nXCIsXHJcbiAgICAgICAgICAgIHNpemVzOiBcIjM5MHg4NDRcIixcclxuICAgICAgICAgICAgdHlwZTogXCJpbWFnZS9wbmdcIixcclxuICAgICAgICAgICAgZm9ybV9mYWN0b3I6IFwibmFycm93XCIsXHJcbiAgICAgICAgICAgIGxhYmVsOiBcIlZlbmRpYm9vayBIb21lXCIsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBzcmM6IFwiL3NjcmVlbnNob3RzL2Rlc2t0b3AucG5nXCIsXHJcbiAgICAgICAgICAgIHNpemVzOiBcIjEyODB4NzIwXCIsXHJcbiAgICAgICAgICAgIHR5cGU6IFwiaW1hZ2UvcG5nXCIsXHJcbiAgICAgICAgICAgIGZvcm1fZmFjdG9yOiBcIndpZGVcIixcclxuICAgICAgICAgICAgbGFiZWw6IFwiVmVuZGlib29rIERlc2t0b3BcIixcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgXSxcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIFVzZWQgdG8gZ2VuZXJhdGUgdGhlIHByZWNhY2hlIG1hbmlmZXN0IGluamVjdGVkIGludG8gc3JjL3N3LnRzXHJcbiAgICAgIHdvcmtib3g6IHtcclxuICAgICAgICBnbG9iUGF0dGVybnM6IFtcIioqLyoue2pzLGNzcyxodG1sLGljbyxwbmcsc3ZnLHdvZmYsd29mZjJ9XCJdLFxyXG4gICAgICB9LFxyXG4gICAgfSksXHJcbiAgXS5maWx0ZXIoQm9vbGVhbiksXHJcbiAgcmVzb2x2ZToge1xyXG4gICAgYWxpYXM6IHtcclxuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXHJcbiAgICB9LFxyXG4gICAgZGVkdXBlOiBbXCJyZWFjdFwiLCBcInJlYWN0LWRvbVwiXSxcclxuICB9LFxyXG59KSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBb1YsU0FBUyxvQkFBb0I7QUFDalgsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUNqQixTQUFTLHVCQUF1QjtBQUNoQyxTQUFTLGVBQWU7QUFKeEIsSUFBTSxtQ0FBbUM7QUFPekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE9BQU87QUFBQSxFQUN6QyxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsRUFDUjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sU0FBUyxpQkFBaUIsZ0JBQWdCO0FBQUEsSUFDMUMsUUFBUTtBQUFBLE1BQ04sY0FBYztBQUFBLE1BQ2QsZUFBZSxDQUFDLGVBQWUsb0JBQW9CLG1CQUFtQixpQ0FBaUM7QUFBQTtBQUFBLE1BR3ZHLFlBQVk7QUFBQSxNQUNaLFFBQVE7QUFBQSxNQUNSLFVBQVU7QUFBQSxNQUNWLGdCQUFnQjtBQUFBO0FBQUEsUUFFZCwrQkFBK0IsSUFBSSxPQUFPO0FBQUEsTUFDNUM7QUFBQSxNQUVBLFVBQVU7QUFBQSxRQUNSLE1BQU07QUFBQSxRQUNOLFlBQVk7QUFBQSxRQUNaLGFBQ0U7QUFBQSxRQUNGLGFBQWE7QUFBQSxRQUNiLGtCQUFrQjtBQUFBLFFBQ2xCLFNBQVM7QUFBQSxRQUNULGFBQWE7QUFBQSxRQUNiLE9BQU87QUFBQSxRQUNQLFdBQVc7QUFBQSxRQUNYLFlBQVksQ0FBQyxZQUFZLFFBQVEsVUFBVTtBQUFBLFFBQzNDLE9BQU87QUFBQSxVQUNMO0FBQUEsWUFDRSxLQUFLO0FBQUEsWUFDTCxPQUFPO0FBQUEsWUFDUCxNQUFNO0FBQUEsWUFDTixTQUFTO0FBQUEsVUFDWDtBQUFBLFVBQ0E7QUFBQSxZQUNFLEtBQUs7QUFBQSxZQUNMLE9BQU87QUFBQSxZQUNQLE1BQU07QUFBQSxZQUNOLFNBQVM7QUFBQSxVQUNYO0FBQUEsVUFDQTtBQUFBLFlBQ0UsS0FBSztBQUFBLFlBQ0wsT0FBTztBQUFBLFlBQ1AsTUFBTTtBQUFBLFlBQ04sU0FBUztBQUFBLFVBQ1g7QUFBQSxVQUNBO0FBQUEsWUFDRSxLQUFLO0FBQUEsWUFDTCxPQUFPO0FBQUEsWUFDUCxNQUFNO0FBQUEsWUFDTixTQUFTO0FBQUEsVUFDWDtBQUFBLFFBQ0Y7QUFBQSxRQUNBLGFBQWE7QUFBQSxVQUNYO0FBQUEsWUFDRSxLQUFLO0FBQUEsWUFDTCxPQUFPO0FBQUEsWUFDUCxNQUFNO0FBQUEsWUFDTixhQUFhO0FBQUEsWUFDYixPQUFPO0FBQUEsVUFDVDtBQUFBLFVBQ0E7QUFBQSxZQUNFLEtBQUs7QUFBQSxZQUNMLE9BQU87QUFBQSxZQUNQLE1BQU07QUFBQSxZQUNOLGFBQWE7QUFBQSxZQUNiLE9BQU87QUFBQSxVQUNUO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQTtBQUFBLE1BR0EsU0FBUztBQUFBLFFBQ1AsY0FBYyxDQUFDLDJDQUEyQztBQUFBLE1BQzVEO0FBQUEsSUFDRixDQUFDO0FBQUEsRUFDSCxFQUFFLE9BQU8sT0FBTztBQUFBLEVBQ2hCLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUN0QztBQUFBLElBQ0EsUUFBUSxDQUFDLFNBQVMsV0FBVztBQUFBLEVBQy9CO0FBQ0YsRUFBRTsiLAogICJuYW1lcyI6IFtdCn0K
