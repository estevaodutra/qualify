import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { execSync } from "child_process";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

function getGitInfo() {
  let commit = process.env.VERCEL_GIT_COMMIT_SHA || "";
  let message = process.env.VERCEL_GIT_COMMIT_MESSAGE || "";
  if (!commit) {
    try {
      commit = execSync("git rev-parse HEAD").toString().trim();
    } catch {
      commit = "";
    }
  }
  if (!message) {
    try {
      message = execSync("git log -1 --pretty=%s").toString().trim();
    } catch {
      message = "";
    }
  }
  return {
    commit,
    shortCommit: commit ? commit.substring(0, 7) : "",
    message,
    builtAt: new Date().toISOString(),
  };
}

function versionTrackerPlugin() {
  return {
    name: "version-tracker",
    buildStart() {
      try {
        const info = getGitInfo();
        const publicDir = path.resolve(__dirname, "public");
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true });
        }
        fs.writeFileSync(
          path.resolve(publicDir, "version.json"),
          JSON.stringify(info, null, 2)
        );
      } catch (err) {
        console.warn("[version-tracker] Failed to write version.json:", err);
      }
    },
    configureServer(server: any) {
      server.middlewares.use("/__git_version", (_req: any, res: any) => {
        const info = getGitInfo();
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        res.end(JSON.stringify(info));
      });
    },
  };
}

const gitInfo = getGitInfo();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __APP_COMMIT_HASH__: JSON.stringify(gitInfo.commit),
    __APP_BUILD_TIME__: JSON.stringify(gitInfo.builtAt),
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    versionTrackerPlugin(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
    exclude: [],
  },
}));
