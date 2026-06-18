/**
 * Browse Server - Wiki 文档浏览服务器
 */

import express, { Request, Response } from "express";
import getPort from "get-port";
import open from "open";
import path from "path";
import { existsSync, readFileSync } from "fs";
import type { Server } from "http";
import { resolveBrowseChat, serializeBrowseChatError } from "./browse-chat";
import {
  deleteBrowseChatSession,
  loadBrowseChatHistory,
  saveBrowseChatHistory,
  type BrowseChatHistoryPayload,
} from "./browse-chat-history";

// 打包时通过 tsup define 注入的全局常量
declare global {
  var IS_PACKAGED: boolean | undefined;
}

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

/** Browse 服务器信息 */
export interface BrowseServerInfo {
  port: number;
  url: string;
  server: Server;
  close: () => void;
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

/** 创建 Express app（API 路由） */
function createWikiApp(projectPath: string) {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

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
  app.get("/api/wiki/source", (req: Request, res: Response) => {
    try {
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

  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const result = await resolveBrowseChat(req.body);
      res.json(result);
    } catch (error) {
      const serialized = serializeBrowseChatError(error);
      res.status(serialized.status).json(serialized.body);
    }
  });

  app.get("/api/chat/history", async (_req: Request, res: Response) => {
    try {
      const history = await loadBrowseChatHistory(projectPath);
      res.json(history);
    } catch (error) {
      res.status(500).json({
        error: "Failed to load chat history",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.put("/api/chat/history", async (req: Request, res: Response) => {
    try {
      const history = await saveBrowseChatHistory(
        projectPath,
        req.body as BrowseChatHistoryPayload,
      );
      res.json(history);
    } catch (error) {
      res.status(500).json({
        error: "Failed to save chat history",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.delete("/api/chat/history/:sessionId", async (req: Request, res: Response) => {
    try {
      const sessionId = req.params.sessionId;
      if (typeof sessionId !== "string") {
        return res.status(400).json({
          error: "Invalid chat session id",
          message: "sessionId must be a string",
        });
      }
      const history = await deleteBrowseChatSession(
        projectPath,
        sessionId,
      );
      res.json(history);
    } catch (error) {
      res.status(400).json({
        error: "Failed to delete chat session",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  return { app };
}

/** 启动 Wiki 浏览服务器 */
export async function startWikiBrowseServer(
  projectPath: string,
): Promise<BrowseServerInfo> {
  const { app } = createWikiApp(projectPath);
  const isProduction = typeof globalThis.IS_PACKAGED !== 'undefined' && globalThis.IS_PACKAGED === true;

  if (isProduction) {
    // 生产环境：添加静态文件服务
    const webDistPath = path.resolve(__dirname, "browse");
    const isStaticFilesAvailable = existsSync(webDistPath);

    if (isStaticFilesAvailable) {
      app.use(express.static(webDistPath));
      // SPA fallback
      app.use((req: Request, res: Response) => {
        if (req.path.startsWith("/api/")) {
          return res.status(404).json({ error: "API endpoint not found" });
        }
        res.sendFile(path.join(webDistPath, "index.html"));
      });
    } else {
      throw new Error(`前端打包文件未找到: ${webDistPath}`);
    }

    // 获取可用端口
    const port = await getPort({ port: 3000 });
    const url = `http://localhost:${port}`;

    // 启动服务器
    const server = app.listen(port);

    // 打开浏览器
    open(url);

    return {
      port,
      url,
      server,
      close: () => {
        server.close();
      },
    };
  } else {
    // 开发环境：只启动 API 服务（固定端口 3000），前端由 Vite dev server 处理
    const port = 3000;
    const server = app.listen(port);

    return {
      port,
      url: `http://localhost:5173`, // 前端地址
      server,
      close: () => {
        server.close();
      },
    };
  }
}

/** 检查是否存在 wiki.json */
export function hasWikiCatalog(projectPath: string): boolean {
  const wikiJsonPath = path.join(projectPath, ".open-zread", "wiki", "wiki.json");
  return existsSync(wikiJsonPath);
}
