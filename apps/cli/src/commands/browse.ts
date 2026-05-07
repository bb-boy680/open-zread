import express, { Request, Response } from "express";
import getPort from "get-port";
import open from "open";
import path from "path";
import { existsSync, readFileSync } from "fs";

interface WikiPage {
  slug: string;
  title: string;
  file: string;
  section: string;
  group?: string;
  level: string;
  associatedFiles?: string[];
}

interface WikiCatalog {
  id: string;
  generated_at: string;
  language: string;
  pages: WikiPage[];
}

// Read code snippet from file
function readCodeSnippet(
  projectPath: string,
  filePath: string,
  lineStart?: number,
  lineEnd?: number,
): string {
  const fullPath = path.join(projectPath, filePath);

  if (!existsSync(fullPath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = readFileSync(fullPath, "utf-8");

  if (!lineStart || !lineEnd) {
    return content;
  }

  const lines = content.split("\n");
  const start = Math.max(0, lineStart - 1);
  const end = Math.min(lines.length, lineEnd);

  return lines.slice(start, end).join("\n");
}

export async function runBrowse(projectPath: string) {
  const app = express();
  const isProduction = process.env.NODE_ENV === "production";

  // Wiki data path
  const wikiPath = path.join(projectPath, ".open-zread", "wiki");
  const wikiJsonPath = path.join(wikiPath, "wiki.json");

  // 1. Get wiki catalog
  app.get("/api/wiki/catalog", (_req: Request, res: Response) => {
    try {
      if (!existsSync(wikiJsonPath)) {
        return res.status(404).json({ error: "Wiki catalog not found" });
      }

      const catalog: WikiCatalog = JSON.parse(
        readFileSync(wikiJsonPath, "utf-8"),
      );
      res.json(catalog);
    } catch (error) {
      res.status(500).json({
        error: "Failed to load wiki catalog",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // 2. Get wiki content by slug
  app.get("/api/wiki/content/:slug", (req: Request, res: Response) => {
    try {
      const { slug } = req.params;

      if (!existsSync(wikiJsonPath)) {
        return res.status(404).json({ error: "Wiki catalog not found" });
      }

      const catalog: WikiCatalog = JSON.parse(
        readFileSync(wikiJsonPath, "utf-8"),
      );
      const page = catalog.pages.find((p) => p.slug === slug);

      if (!page) {
        return res.status(404).json({ error: `Wiki page not found: ${slug}` });
      }

      // Find markdown file
      const sectionPath = path.join(wikiPath, page.section, page.file);
      const directPath = path.join(wikiPath, page.file);

      let mdPath: string | null = null;
      if (existsSync(sectionPath)) {
        mdPath = sectionPath;
      } else if (existsSync(directPath)) {
        mdPath = directPath;
      }

      if (!mdPath) {
        return res
          .status(404)
          .json({ error: `Markdown file not found for: ${slug}` });
      }

      const content = readFileSync(mdPath, "utf-8");

      res.json({
        slug,
        title: page.title,
        section: page.section,
        group: page.group,
        level: page.level,
        content,
        associatedFiles: page.associatedFiles || [],
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to load wiki content",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // 3. Get source code snippet by file path
  // Usage: /api/wiki/source?file=packages/compiler-core/src/tokenizer.ts&startLine=1&endLine=23
  app.get("/api/wiki/source", (req: Request, res: Response) => {
    try {
      // Get file path from query
      const { file, startLine, endLine } = req.query;

      if (!file || typeof file !== "string") {
        return res.status(400).json({ error: "Missing file parameter" });
      }

      const start = startLine ? parseInt(startLine as string, 10) : undefined;
      const end = endLine ? parseInt(endLine as string, 10) : undefined;

      try {
        const code = readCodeSnippet(projectPath, file, start, end);
        res.json({
          file,
          lineStart: start,
          lineEnd: end,
          code,
        });
      } catch (error) {
        res.status(404).json({
          error: "Source file not found",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    } catch (error) {
      res.status(500).json({
        error: "Failed to load source snippet",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  if (isProduction) {
    // Production: static file service
    const webDistPath = path.join(__dirname, "../browse");
    const isStaticFilesAvailable = existsSync(webDistPath);
    // Production mode: serve static files
    if (isStaticFilesAvailable) {
      app.use(express.static(webDistPath));
      app.get("*", (_req: Request, res: Response) => {
        res.sendFile(path.join(webDistPath, "index.html"));
      });
    } else {
      console.error("\n❌ 生产环境未找到前端打包文件");
      console.error("请先运行: bun run build --filter=browse\n");
      process.exit(1);
    }
    const port = await getPort({ port: 3000 });
    app.listen(port, () => {
      console.log(`🌐 API Server running at http://localhost:${port}`);
      console.log(`📖 Wiki API: http://localhost:${port}/api/wiki/catalog\n`);
      open(`http://localhost:${port}`);
    });
  } else {
    // Development: API only mode, fixed port 5173
    app.listen(3000, () => {
      console.log(`\n🌐 API Server running at http://localhost:3000`);
      console.log(`📖 Wiki API: http://localhost:3000/api/wiki/catalog\n`);
    });
  }
}
