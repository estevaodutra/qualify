import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function scan(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      scan(full);
    } else if (full.endsWith(".tsx") || full.endsWith(".ts")) {
      const content = fs.readFileSync(full, "utf-8");
      if (content.includes("cn(") && !content.includes("import { cn }") && !content.includes("export function cn")) {
        console.log("MISSING CN IMPORT:", full);
      }
    }
  }
}

scan(path.join(__dirname, "src"));
