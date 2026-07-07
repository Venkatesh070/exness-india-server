import type { Request, Response } from "express";
import * as adminNews from "../services/adminNews.service.js";

export async function listArticles(_req: Request, res: Response): Promise<void> {
  const articles = await adminNews.listNewsArticles();
  res.json({ articles });
}

export async function getArticle(req: Request, res: Response): Promise<void> {
  const article = await adminNews.getNewsArticle(String(req.params.id));
  if (!article) {
    res.status(404).json({ error: "Article not found." });
    return;
  }
  res.json({ article });
}

export async function createArticle(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    title?: string;
    category?: string;
    excerpt?: string;
    body?: string;
    source?: string;
  };

  const title = body.title?.trim();
  const category = body.category?.trim();
  const excerpt = (body.excerpt ?? body.body)?.trim();

  if (!title) {
    res.status(400).json({ error: "Title is required." });
    return;
  }
  if (!category) {
    res.status(400).json({ error: "Category is required." });
    return;
  }
  if (!excerpt) {
    res.status(400).json({ error: "Body is required." });
    return;
  }

  const article = await adminNews.createNewsArticle({
    title,
    category,
    excerpt,
    source: body.source,
  });
  res.status(201).json({ article });
}

export async function updateArticle(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    title?: string;
    category?: string;
    excerpt?: string;
    body?: string;
    source?: string;
    active?: boolean;
  };

  const patch = {
    title: body.title,
    category: body.category,
    excerpt: body.excerpt ?? body.body,
    source: body.source,
    active: body.active,
  };

  const article = await adminNews.updateNewsArticle(String(req.params.id), patch);
  if (!article) {
    res.status(404).json({ error: "Article not found." });
    return;
  }
  res.json({ article });
}

export async function deleteArticle(req: Request, res: Response): Promise<void> {
  const deleted = await adminNews.deleteNewsArticle(String(req.params.id));
  if (!deleted) {
    res.status(404).json({ error: "Article not found." });
    return;
  }
  res.json({ message: "Article deleted." });
}
