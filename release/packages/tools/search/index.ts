import fs from "fs-extra";
import path from "path";
import { registry } from "../index.js";

const TEXT_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".json", ".css", ".html", 
  ".md", ".txt", ".xml", ".yml", ".yaml", ".ini", ".conf", ".sh"
]);

registry.register({
  name: "search_files",
  description: "Search files and file contents for a keyword",
  schema: {
    type: "object",
    properties: {
      keyword: { type: "string" }
    },
    required: ["keyword"]
  },
  handler: async (input: any) => {
    const keyword = String(input.keyword).toLowerCase();

    const results: string[] = [];

    async function scan(dir: string): Promise<void> {
      const entries = await fs.readdir(dir);

      for (const entry of entries) {
        const full_path = path.join(dir, entry);
        const stat = await fs.stat(full_path);

        if (stat.isDirectory()) {
          if (
            entry === "node_modules" ||
            entry === ".git" ||
            entry === "dist" ||
            entry === "tsc" ||
            entry === "storage" ||
            entry === ".gemini" ||
            entry.startsWith(".")
          ) {
            continue;
          }

          await scan(full_path);
        } else {
          const lowerEntry = entry.toLowerCase();
          if (lowerEntry.includes(keyword)) {
            results.push(full_path);
          } else {
            // Check contents of text files under 100KB only
            try {
              const ext = path.extname(entry).toLowerCase();
              if (stat.size < 100000 && TEXT_EXTENSIONS.has(ext)) {
                const content = await fs.readFile(full_path, "utf-8");
                if (content.toLowerCase().includes(keyword)) {
                  results.push(full_path);
                }
              }
            } catch (e) {}
          }
        }
      }
    }

    await scan(process.cwd());

    return results.slice(0, 30); // Limit to top 30 results
  }
});
