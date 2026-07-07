import { Schema, model, type InferSchemaType } from "mongoose";
import { randomUUID } from "node:crypto";

const newsArticleSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    title: { type: String, required: true },
    source: { type: String, required: true },
    category: { type: String, required: true },
    excerpt: { type: String, required: true },
    publishedAt: { type: Date, required: true, index: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: false, versionKey: false },
);

export type NewsArticleDoc = InferSchemaType<typeof newsArticleSchema> & { _id: string };

export const NewsArticle = model("NewsArticle", newsArticleSchema, "news_articles");
