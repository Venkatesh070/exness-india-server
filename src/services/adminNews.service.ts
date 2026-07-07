import { NewsArticle } from "../models/NewsArticle.js";

export interface AdminNewsArticle {
  id: string;
  title: string;
  source: string;
  category: string;
  excerpt: string;
  publishedAt: string;
  active: boolean;
}

function toAdminNews(doc: {
  _id: string;
  title: string;
  source: string;
  category: string;
  excerpt: string;
  publishedAt: Date;
  active?: boolean;
}): AdminNewsArticle {
  return {
    id: doc._id,
    title: doc.title,
    source: doc.source,
    category: doc.category,
    excerpt: doc.excerpt,
    publishedAt: doc.publishedAt.toISOString(),
    active: doc.active ?? true,
  };
}

export async function listNewsArticles(): Promise<AdminNewsArticle[]> {
  const docs = await NewsArticle.find().sort({ publishedAt: -1 }).lean();
  return docs.map((doc) => toAdminNews(doc as Parameters<typeof toAdminNews>[0]));
}

export async function getNewsArticle(id: string): Promise<AdminNewsArticle | null> {
  const doc = await NewsArticle.findById(id).lean();
  if (!doc) return null;
  return toAdminNews(doc as Parameters<typeof toAdminNews>[0]);
}

export async function createNewsArticle(input: {
  title: string;
  category: string;
  excerpt: string;
  source?: string;
}): Promise<AdminNewsArticle> {
  const doc = await NewsArticle.create({
    title: input.title.trim(),
    category: input.category.trim(),
    excerpt: input.excerpt.trim(),
    source: input.source?.trim() || "Exness India",
    publishedAt: new Date(),
    active: true,
  });
  return toAdminNews(doc.toObject());
}

export async function updateNewsArticle(
  id: string,
  input: {
    title?: string;
    category?: string;
    excerpt?: string;
    source?: string;
    active?: boolean;
  },
): Promise<AdminNewsArticle | null> {
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.category !== undefined) patch.category = input.category.trim();
  if (input.excerpt !== undefined) patch.excerpt = input.excerpt.trim();
  if (input.source !== undefined) patch.source = input.source.trim();
  if (input.active !== undefined) patch.active = input.active;

  const doc = await NewsArticle.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean();
  if (!doc) return null;
  return toAdminNews(doc as Parameters<typeof toAdminNews>[0]);
}

export async function deleteNewsArticle(id: string): Promise<boolean> {
  const result = await NewsArticle.findByIdAndDelete(id);
  return !!result;
}
