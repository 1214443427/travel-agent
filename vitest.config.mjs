import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

function nextStaticImages() {
  const IMAGE = /\.(png|jpe?g|gif|webp|avif|svg)$/;
  return {
    name: "next-static-images",
    enforce: "pre",
    load(id) {
      const [file] = id.split("?");
      if (!IMAGE.test(file)) return null;
      const src = "/" + file.split("/").pop();
      return `export default ${JSON.stringify({
        src,
        width: 100,
        height: 100,
        blurDataURL: src,
        blurWidth: 8,
        blurHeight: 8,
      })};`;
    },
  };
}

export default defineConfig({
  plugins: [nextStaticImages(), tsconfigPaths(), react()],
  resolve: {
    alias: {
      "server-only": new URL("./__tests__/stubs/server-only.js", import.meta.url).pathname,
    },
  },
  test: {
    setupFiles: ["./__tests__/test-setup.js"],
    environment: "jsdom",
    env: {
      WEATHER_API: "test-weather-key",
      RAPID_API_KEY: "test-rapid-key",
      GEOAPIFY_KEY: "test-geo-key",
      AI_KEY: "test",
      AI_URL: "http://localhost/ai",
      AI_MODEL: "test-model",
      FORMATTER_MODEL: "test-model",
    },
  },
});
