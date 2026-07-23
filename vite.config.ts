import path from "path";
import { fileURLToPath } from "url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  let env: Record<string, string> = {};
  const rootEnvDir = process.cwd();
  try {
    env = loadEnv(mode, rootEnvDir, "");
  } catch (error) {
    // If env files don't exist or can't be read, continue without them
    console.warn("Could not load environment variables:", error);
  }

  return {
    envDir: rootEnvDir,
    server: {
      port: 3000,
      host: "0.0.0.0",
    },
    plugins: [react(), tailwindcss()],
    define: {
      "process.env.SUPABASE_ANON_KEY": JSON.stringify(env.SUPABASE_ANON_KEY || ""),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
  };
});
