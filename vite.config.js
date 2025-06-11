import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 3002, // CHANGED THIS LINE to 3002
    host: "0.0.0.0",
    proxy: {
      "/upload-image": {
        target: "http://localhost:3001", // Backend is still on 3001
        changeOrigin: true,
        secure: false,
      },
    },
  },
  optimizeDeps: {
    include: ["inferencejs"],
  },
});
