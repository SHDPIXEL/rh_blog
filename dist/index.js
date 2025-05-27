var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express3 from "express";

// server/routes.ts
import express from "express";
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  ArticleStatus: () => ArticleStatus,
  NotificationType: () => NotificationType,
  UserRole: () => UserRole,
  articleCategories: () => articleCategories,
  articleCategoriesRelations: () => articleCategoriesRelations,
  articleCoAuthors: () => articleCoAuthors,
  articleCoAuthorsRelations: () => articleCoAuthorsRelations,
  articleTags: () => articleTags,
  articleTagsRelations: () => articleTagsRelations,
  articles: () => articles,
  articlesRelations: () => articlesRelations,
  assets: () => assets,
  assetsRelations: () => assetsRelations,
  categories: () => categories,
  categoriesRelations: () => categoriesRelations,
  comments: () => comments,
  commentsRelations: () => commentsRelations,
  extendedArticleSchema: () => extendedArticleSchema,
  extendedInsertNotificationSchema: () => extendedInsertNotificationSchema,
  insertArticleSchema: () => insertArticleSchema,
  insertAssetSchema: () => insertAssetSchema,
  insertCategorySchema: () => insertCategorySchema,
  insertCommentSchema: () => insertCommentSchema,
  insertNotificationSchema: () => insertNotificationSchema,
  insertTagSchema: () => insertTagSchema,
  insertUserSchema: () => insertUserSchema,
  loginUserSchema: () => loginUserSchema,
  notifications: () => notifications,
  notificationsRelations: () => notificationsRelations,
  searchAssetsSchema: () => searchAssetsSchema,
  tags: () => tags,
  tagsRelations: () => tagsRelations,
  updateArticleSchema: () => updateArticleSchema,
  updateAssetSchema: () => updateAssetSchema,
  updateCategorySchema: () => updateCategorySchema,
  updateCommentSchema: () => updateCommentSchema,
  updateExtendedArticleSchema: () => updateExtendedArticleSchema,
  updateNotificationSchema: () => updateNotificationSchema,
  updateUserProfileSchema: () => updateUserProfileSchema,
  users: () => users,
  usersRelations: () => usersRelations
});
import { mysqlTable as pgTable, varchar as text, int as integer, datetime as timestamp, json as jsonb, primaryKey, customType } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var longtext = customType({
  dataType() {
    return "longtext";
  }
});
var UserRole = {
  ADMIN: "admin",
  AUTHOR: "author"
};
var ArticleStatus = {
  DRAFT: "draft",
  REVIEW: "review",
  PUBLISHED: "published"
};
var NotificationType = {
  ARTICLE_APPROVED: "article_approved",
  ARTICLE_REJECTED: "article_rejected",
  ARTICLE_PUBLISHED: "article_published",
  COMMENT_RECEIVED: "comment_received"
};
var users = pgTable("users", {
  id: integer("id").autoincrement().primaryKey(),
  name: text("name", { length: 255 }).notNull(),
  email: text("email", { length: 255 }).notNull().unique(),
  password: text("password", { length: 255 }).notNull(),
  role: text("role", { enum: [UserRole.ADMIN, UserRole.AUTHOR], length: 255 }).notNull(),
  bio: text("bio", { length: 512 }),
  avatarUrl: text("avatar_url", { length: 512 }),
  bannerUrl: text("banner_url", { length: 512 }),
  socialLinks: text("social_links", { length: 512 }),
  // JSON string containing social media links
  canPublish: text("can_publish", { length: 512 }).default("false").notNull(),
  // New: Permission to directly publish articles
  createdAt: timestamp("created_at", { mode: "date", fsp: 3 }).default(/* @__PURE__ */ new Date()).notNull()
});
var assets = pgTable("assets", {
  id: integer("id").autoincrement().primaryKey(),
  filename: text("filename", { length: 512 }).notNull(),
  originalName: text("original_name", { length: 512 }).notNull(),
  path: text("path", { length: 512 }).notNull(),
  url: text("url", { length: 512 }).notNull(),
  mimetype: text("mimetype", { length: 512 }).notNull(),
  size: integer("size").notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title", { length: 512 }),
  description: text("description", { length: 512 }),
  tags: jsonb("tags").default([]),
  createdAt: timestamp("created_at", { mode: "date", fsp: 3 }).default(/* @__PURE__ */ new Date()).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", fsp: 3 }).default(/* @__PURE__ */ new Date())
});
var categories = pgTable("categories", {
  id: integer("id").autoincrement().primaryKey(),
  name: text("name", { length: 512 }).notNull().unique(),
  slug: text("slug", { length: 512 }).notNull().unique(),
  description: text("description", { length: 512 }),
  createdAt: timestamp("created_at", { mode: "date", fsp: 3 }).default(/* @__PURE__ */ new Date()).notNull()
});
var tags = pgTable("tags", {
  id: integer("id").autoincrement().primaryKey(),
  name: text("name", { length: 512 }).notNull().unique(),
  slug: text("slug", { length: 512 }).notNull().unique(),
  createdAt: timestamp("created_at", { mode: "date", fsp: 3 }).default(/* @__PURE__ */ new Date()).notNull()
});
var articles = pgTable("articles", {
  id: integer("id").autoincrement().primaryKey(),
  title: longtext("title", { length: 512 }).notNull(),
  slug: longtext("slug", { length: 512 }).notNull(),
  content: longtext("content").notNull(),
  excerpt: longtext("excerpt"),
  authorId: integer("author_id").references(() => users.id).notNull(),
  status: text("status", { enum: [ArticleStatus.DRAFT, ArticleStatus.REVIEW, ArticleStatus.PUBLISHED], length: 20 }).default(ArticleStatus.DRAFT).notNull(),
  published: text("published", { length: 512 }).default("false").notNull(),
  featuredImage: text("featured_image", { length: 512 }),
  // SEO fields
  metaTitle: text("meta_title", { length: 512 }),
  metaDescription: longtext("meta_description"),
  keywords: jsonb("keywords").default([]),
  canonicalUrl: text("canonical_url", { length: 512 }),
  // Scheduling
  scheduledPublishAt: timestamp("scheduled_publish_at", { fsp: 3 }),
  // Statistics
  viewCount: integer("view_count").default(0).notNull(),
  // Review and approval fields
  reviewRemarks: text("review_remarks", { length: 512 }),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at", { mode: "date", fsp: 3 }).default(/* @__PURE__ */ new Date()).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", fsp: 3 }).default(/* @__PURE__ */ new Date()).notNull(),
  publishedAt: timestamp("published_at", { fsp: 3 })
});
var articleCategories = pgTable("article_categories", {
  articleId: integer("article_id").references(() => articles.id).notNull(),
  categoryId: integer("category_id").references(() => categories.id).notNull()
}, (t) => ({
  pk: primaryKey({ columns: [t.articleId, t.categoryId] })
}));
var articleTags = pgTable("article_tags", {
  articleId: integer("article_id").references(() => articles.id).notNull(),
  tagId: integer("tag_id").references(() => tags.id).notNull()
}, (t) => ({
  pk: primaryKey({ columns: [t.articleId, t.tagId] })
}));
var articleCoAuthors = pgTable("article_co_authors", {
  articleId: integer("article_id").references(() => articles.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull()
}, (t) => ({
  pk: primaryKey({ columns: [t.articleId, t.userId] })
}));
var comments = pgTable("comments", {
  id: integer("id").autoincrement().primaryKey(),
  content: longtext("content").notNull(),
  authorName: text("author_name", { length: 512 }).notNull(),
  authorEmail: text("author_email", { length: 512 }).notNull(),
  articleId: integer("article_id").references(() => articles.id).notNull(),
  parentId: integer("parent_id").references(() => comments.id),
  // For nested replies
  replyCount: integer("reply_count").default(0).notNull(),
  // Store count of replies to this comment
  isApproved: text("is_approved", { length: 512 }).default("true").notNull(),
  createdAt: timestamp("created_at", { mode: "date", fsp: 3 }).default(/* @__PURE__ */ new Date()).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", fsp: 3 }).default(/* @__PURE__ */ new Date()).notNull()
});
var notifications = pgTable("notifications", {
  id: integer("id").autoincrement().primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type", { length: 512 }).notNull(),
  title: text("title", { length: 512 }).notNull(),
  message: text("message", { length: 512 }).notNull(),
  articleId: integer("article_id").references(() => articles.id),
  commentId: integer("comment_id").references(() => comments.id),
  // Reference to the comment if notification is about a comment
  articleSlug: text("article_slug", { length: 512 }),
  // Store article slug for better navigation URLs
  read: text("read", { length: 512 }).default("false").notNull(),
  createdAt: timestamp("created_at", { mode: "date", fsp: 3 }).default(/* @__PURE__ */ new Date()).notNull()
});
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true
});
var updateUserProfileSchema = z.object({
  name: z.string().min(2).optional(),
  bio: z.string().optional(),
  // Accept any string for avatarUrl, including relative paths like "/uploads/image.png"
  avatarUrl: z.union([z.string(), z.string().max(0), z.null()]).optional(),
  // Accept any string for bannerUrl, including relative paths
  bannerUrl: z.union([z.string(), z.string().max(0), z.null()]).optional(),
  socialLinks: z.string().optional().nullable()
});
var loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});
var insertArticleSchema = createInsertSchema(articles).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var updateArticleSchema = z.object({
  title: z.string().min(5).optional(),
  slug: z.string().min(5).optional(),
  content: z.string().min(10).optional(),
  excerpt: z.string().optional(),
  status: z.enum([ArticleStatus.DRAFT, ArticleStatus.REVIEW, ArticleStatus.PUBLISHED]).optional(),
  published: z.boolean().optional(),
  viewCount: z.number().int().nonnegative().optional(),
  // Accept any string for featuredImage, including relative paths
  featuredImage: z.string().optional().nullable(),
  // SEO fields
  metaTitle: z.string().optional(),
  metaDescription: z.string().max(160, "Meta description should be at most 160 characters").optional(),
  canonicalUrl: z.string().optional().nullable(),
  // Scheduling
  scheduledPublishAt: z.union([z.string(), z.date(), z.null()]).optional(),
  publishedAt: z.union([z.string(), z.date(), z.null()]).optional(),
  // Review fields
  reviewRemarks: z.string().optional().nullable(),
  reviewedBy: z.number().optional().nullable(),
  reviewedAt: z.union([z.string(), z.date(), z.null()]).optional()
});
var insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var updateAssetSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional()
});
var searchAssetsSchema = z.object({
  query: z.string().optional(),
  tags: z.array(z.string()).optional(),
  mimetype: z.string().optional(),
  page: z.number().optional(),
  limit: z.number().optional()
});
var usersRelations = relations(users, ({ many }) => ({
  articles: many(articles, { relationName: "userArticles" }),
  coAuthoredArticles: many(articleCoAuthors, { relationName: "userCoAuthoredArticles" }),
  assets: many(assets, { relationName: "userAssets" }),
  notifications: many(notifications, { relationName: "userNotifications" })
}));
var articlesRelations = relations(articles, ({ one, many }) => ({
  author: one(users, {
    fields: [articles.authorId],
    references: [users.id],
    relationName: "userArticles"
  }),
  categories: many(articleCategories, { relationName: "articleCategoriesRelation" }),
  tags: many(articleTags, { relationName: "articleTagsRelation" }),
  coAuthors: many(articleCoAuthors, { relationName: "articleCoAuthorsRelation" }),
  notifications: many(notifications, { relationName: "articleNotifications" }),
  comments: many(comments, { relationName: "articleComments" })
}));
var categoriesRelations = relations(categories, ({ many }) => ({
  articles: many(articleCategories, { relationName: "categoryArticlesRelation" })
}));
var tagsRelations = relations(tags, ({ many }) => ({
  articles: many(articleTags, { relationName: "tagArticlesRelation" })
}));
var articleCategoriesRelations = relations(articleCategories, ({ one }) => ({
  article: one(articles, {
    fields: [articleCategories.articleId],
    references: [articles.id],
    relationName: "articleCategoriesRelation"
  }),
  category: one(categories, {
    fields: [articleCategories.categoryId],
    references: [categories.id],
    relationName: "categoryArticlesRelation"
  })
}));
var articleTagsRelations = relations(articleTags, ({ one }) => ({
  article: one(articles, {
    fields: [articleTags.articleId],
    references: [articles.id],
    relationName: "articleTagsRelation"
  }),
  tag: one(tags, {
    fields: [articleTags.tagId],
    references: [tags.id],
    relationName: "tagArticlesRelation"
  })
}));
var articleCoAuthorsRelations = relations(articleCoAuthors, ({ one }) => ({
  article: one(articles, {
    fields: [articleCoAuthors.articleId],
    references: [articles.id],
    relationName: "articleCoAuthorsRelation"
  }),
  user: one(users, {
    fields: [articleCoAuthors.userId],
    references: [users.id],
    relationName: "userCoAuthoredArticles"
  })
}));
var assetsRelations = relations(assets, ({ one }) => ({
  user: one(users, {
    fields: [assets.userId],
    references: [users.id],
    relationName: "userAssets"
  })
}));
var commentsRelations = relations(comments, ({ one, many }) => ({
  article: one(articles, {
    fields: [comments.articleId],
    references: [articles.id],
    relationName: "articleComments"
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: "parentComment"
  }),
  replies: many(comments, { relationName: "childComments" })
}));
var notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
    relationName: "userNotifications"
  }),
  article: one(articles, {
    fields: [notifications.articleId],
    references: [articles.id],
    relationName: "articleNotifications"
  })
}));
var insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true
});
var updateCategorySchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).optional(),
  description: z.string().optional()
});
var insertTagSchema = createInsertSchema(tags).omit({
  id: true,
  createdAt: true
});
var extendedArticleSchema = insertArticleSchema.extend({
  categoryIds: z.array(z.number()).optional(),
  tagIds: z.array(z.number()).optional(),
  coAuthorIds: z.array(z.number()).optional(),
  keywords: z.array(z.string()).optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().max(160, "Meta description should be at most 160 characters").optional(),
  canonicalUrl: z.string().optional(),
  scheduledPublishAt: z.union([z.string(), z.date(), z.null()]).optional()
});
var updateExtendedArticleSchema = updateArticleSchema.extend({
  categoryIds: z.array(z.number()).optional(),
  tagIds: z.array(z.number()).optional(),
  coAuthorIds: z.array(z.number()).optional(),
  keywords: z.array(z.string()).optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().max(160, "Meta description should be at most 160 characters").optional(),
  canonicalUrl: z.string().optional(),
  scheduledPublishAt: z.union([z.string(), z.date(), z.null()]).optional()
});
var insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true
});
var extendedInsertNotificationSchema = insertNotificationSchema.extend({
  articleSlug: z.string().optional()
});
var updateNotificationSchema = z.object({
  read: z.boolean().optional()
});
var insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var updateCommentSchema = z.object({
  content: z.string().min(1).optional(),
  isApproved: z.boolean().optional()
});

// server/db.ts
import * as mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import "dotenv/config";
if (!process.env.MYSQL_HOST || !process.env.MYSQL_USER || !process.env.MYSQL_DATABASE) {
  throw new Error(
    "MySQL configuration missing. Set MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, and MYSQL_DATABASE."
  );
}
var config = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};
var pool = mysql.createPool(config);
var db = drizzle(pool, { schema: schema_exports, mode: "default" });
console.log("Using MySQL database connection");

// server/storage.ts
import { eq, and, or, desc, sql, asc, inArray } from "drizzle-orm";
import * as bcrypt from "bcrypt";
function getISTFormattedDateTime() {
  const date = /* @__PURE__ */ new Date();
  const istOffset = 5.5 * 60 * 60 * 1e3;
  const istDate = new Date(date.getTime() + istOffset);
  const year = istDate.getUTCFullYear();
  const month = String(istDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(istDate.getUTCDate()).padStart(2, "0");
  const hours = String(istDate.getUTCHours()).padStart(2, "0");
  const minutes = String(istDate.getUTCMinutes()).padStart(2, "0");
  const seconds = String(istDate.getUTCSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
var DatabaseStorage = class {
  // Helper function to generate slug from string
  generateSlug(text2) {
    return text2.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/--+/g, "-").trim();
  }
  // User methods
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  async getUsers(role) {
    if (role) {
      return db.select().from(users).where(sql`${users.role} = ${role}`);
    }
    return db.select().from(users);
  }
  async updateUserPublishingRights(id, canPublish) {
    const [user] = await db.update(users).set({ canPublish }).where(eq(users.id, id));
    return user;
  }
  async createUser(insertUser) {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const [user] = await db.insert(users).values({
      ...insertUser,
      password: hashedPassword
    });
    return user;
  }
  async updateUserProfile(id, profileData) {
    const [user] = await db.update(users).set(profileData).where(eq(users.id, id));
    return user;
  }
  // Article methods
  async getArticle(id) {
    const [article] = await db.select().from(articles).where(eq(articles.id, id));
    return article;
  }
  async getArticlesByAuthor(authorId) {
    return await db.select().from(articles).where(eq(articles.authorId, authorId)).orderBy(desc(articles.createdAt));
  }
  async getArticlesByStatus(authorId, status) {
    return await db.select().from(articles).where(and(eq(articles.authorId, authorId), eq(articles.status, status))).orderBy(desc(articles.createdAt));
  }
  async getPublishedArticles() {
    return await db.select().from(articles).where(eq(articles.published, "true")).orderBy(desc(articles.createdAt));
  }
  async getCoAuthoredArticles(userId, status) {
    const coAuthoredIds = await db.select({ articleId: articleCoAuthors.articleId }).from(articleCoAuthors).where(eq(articleCoAuthors.userId, userId));
    if (coAuthoredIds.length === 0) {
      return [];
    }
    const articleIds = coAuthoredIds.map((item) => item.articleId);
    const conditions = [inArray(articles.id, articleIds)];
    if (status) {
      conditions.push(eq(articles.status, status));
    }
    return await db.select().from(articles).where(and(...conditions)).orderBy(desc(articles.createdAt));
  }
  async createArticle(insertArticle) {
    const articleData = { ...insertArticle };
    if (!articleData.slug && articleData.title) {
      articleData.slug = this.generateSlug(articleData.title);
    }
    if (typeof articleData.scheduledPublishAt === "string" && articleData.scheduledPublishAt) {
      articleData.scheduledPublishAt = new Date(articleData.scheduledPublishAt);
    } else if (articleData.scheduledPublishAt === void 0) {
      delete articleData.scheduledPublishAt;
    }
    if (articleData.published === "true" && (!("scheduledPublishAt" in articleData) || !articleData.scheduledPublishAt || typeof articleData.scheduledPublishAt !== "string")) {
      const istDate = getISTFormattedDateTime();
      console.log("from in : ", istDate);
      articleData.publishedAt = istDate;
    }
    console.log("from out : ", getISTFormattedDateTime());
    const [result] = await db.insert(articles).values(articleData);
    const insertedId = result.insertId || result.id;
    const article = await db.select().from(articles).where(eq(articles.id, insertedId)).limit(1);
    return article[0];
  }
  async updateArticle(id, updateData) {
    const dataToUpdate = { ...updateData };
    try {
      console.log(
        `Updating article ${id} with data:`,
        JSON.stringify(dataToUpdate, null, 2)
      );
      if (dataToUpdate.reviewedAt) {
        dataToUpdate.reviewedAt = new Date(dataToUpdate.reviewedAt);
      }
      if (dataToUpdate.scheduledPublishAt) {
        dataToUpdate.scheduledPublishAt = new Date(
          dataToUpdate.scheduledPublishAt
        );
      } else if (dataToUpdate.scheduledPublishAt === null) {
        dataToUpdate.scheduledPublishAt = null;
      } else {
        delete dataToUpdate.scheduledPublishAt;
      }
      if (dataToUpdate.publishedAt) {
        dataToUpdate.publishedAt = new Date(dataToUpdate.publishedAt);
      }
      if (dataToUpdate.title && !dataToUpdate.slug) {
        dataToUpdate.slug = this.generateSlug(dataToUpdate.title);
      }
      if (dataToUpdate.keywords === void 0) {
        delete dataToUpdate.keywords;
      } else if (dataToUpdate.keywords === null) {
        dataToUpdate.keywords = [];
      }
      await db.update(articles).set({
        ...dataToUpdate
      }).where(eq(articles.id, id));
      const updated = await db.query.articles.findFirst({
        where: (articles2, { eq: eq4 }) => eq4(articles2.id, id)
      });
      return updated ?? void 0;
    } catch (error) {
      console.error(`Error in updateArticle for article ${id}:`, error);
      throw error;
    }
  }
  async updateArticleStatus(id, status) {
    const updateFields = {
      status,
      // Set published flag based on status
      published: (status === "published").toString()
    };
    if (status === "published") {
      updateFields.publishedAt = (/* @__PURE__ */ new Date()).toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour12: false });
    }
    const [article] = await db.update(articles).set(updateFields).where(eq(articles.id, id));
    return article;
  }
  async deleteArticle(id) {
    try {
      return await db.transaction(async (tx) => {
        console.log(`Starting transaction to delete article ${id}`);
        await tx.delete(articleCategories).where(eq(articleCategories.articleId, id));
        await tx.delete(articleTags).where(eq(articleTags.articleId, id));
        await tx.delete(articleCoAuthors).where(eq(articleCoAuthors.articleId, id));
        await tx.delete(notifications).where(eq(notifications.articleId, id));
        await tx.delete(comments).where(eq(comments.articleId, id));
        const result = await tx.delete(articles).where(eq(articles.id, id));
        console.log(`Article ${id} deletion complete`);
        console.log(" Result : ", result);
        return result.rowCount > 0;
      });
    } catch (error) {
      console.error(`Error deleting article ${id}:`, error);
      throw error;
    }
  }
  // Asset methods
  async getAsset(id) {
    const [asset] = await db.select().from(assets).where(eq(assets.id, id));
    return asset;
  }
  async getAssetsByUser(userId) {
    return await db.select().from(assets).where(eq(assets.userId, userId));
  }
  async searchAssets(params, userId) {
    const baseCondition = eq(assets.userId, userId);
    let conditions = [baseCondition];
    if (params.query) {
      const searchTerm = `%${params.query}%`;
      const textCondition = or(
        sql`${assets.title} ILIKE ${searchTerm}`,
        sql`${assets.description} ILIKE ${searchTerm}`,
        sql`${assets.originalName} ILIKE ${searchTerm}`
      );
      conditions.push(textCondition);
    }
    if (params.mimetype) {
      conditions.push(sql`${assets.mimetype} LIKE ${params.mimetype + "%"}`);
    }
    if (params.tags && params.tags.length > 0) {
      const tagConditions = params.tags.map(
        (tag) => sql`${assets.tags} @> ${JSON.stringify([tag])}`
      );
      if (tagConditions.length > 0) {
        conditions.push(or(...tagConditions));
      }
    }
    const baseQuery = db.select().from(assets).where(and(...conditions));
    const countQuery = db.select({ count: sql`count(*)` }).from(assets).where(and(...conditions));
    const totalCount = await countQuery;
    const total = totalCount[0]?.count || 0;
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;
    const results = await baseQuery.orderBy(desc(assets.createdAt)).limit(limit).offset(offset);
    return {
      assets: results,
      total: Number(total)
    };
  }
  async createAsset(asset) {
    const [createdAsset] = await db.insert(assets).values(asset);
    return createdAsset;
  }
  async updateAsset(id, assetData) {
    const [asset] = await db.update(assets).set({
      ...assetData
    }).where(eq(assets.id, id));
    return asset;
  }
  async deleteAsset(id) {
    const result = await db.delete(assets).where(eq(assets.id, id));
    return result.length > 0;
  }
  // Category methods
  async getAllCategories() {
    return db.select().from(categories).orderBy(asc(categories.name));
  }
  async getCategory(id) {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }
  async getCategoryBySlug(slug) {
    const [category] = await db.select().from(categories).where(eq(categories.slug, slug));
    return category;
  }
  async createCategory(categoryData) {
    if (!categoryData.slug) {
      categoryData = {
        ...categoryData,
        slug: this.generateSlug(categoryData.name)
      };
    }
    const [category] = await db.insert(categories).values(categoryData);
    return category;
  }
  async updateCategory(id, categoryData) {
    if (categoryData.name && !categoryData.slug) {
      categoryData = {
        ...categoryData,
        slug: this.generateSlug(categoryData.name)
      };
    }
    const [category] = await db.update(categories).set(categoryData).where(eq(categories.id, id));
    return category;
  }
  async deleteCategory(id) {
    await db.delete(articleCategories).where(eq(articleCategories.categoryId, id));
    const result = await db.delete(categories).where(eq(categories.id, id)).returning({ id: categories.id });
    return result.length > 0;
  }
  // Tag methods
  async getAllTags() {
    return db.select().from(tags).orderBy(asc(tags.name));
  }
  async getTag(id) {
    const [tag] = await db.select().from(tags).where(eq(tags.id, id));
    return tag;
  }
  async getTagBySlug(slug) {
    const [tag] = await db.select().from(tags).where(eq(tags.slug, slug));
    return tag;
  }
  async createTag(tagData) {
    if (!tagData.slug) {
      tagData = {
        ...tagData,
        slug: this.generateSlug(tagData.name)
      };
    }
    const [tag] = await db.insert(tags).values(tagData);
    return tag;
  }
  async deleteTag(id) {
    await db.delete(articleTags).where(eq(articleTags.tagId, id));
    const result = await db.delete(tags).where(eq(tags.id, id)).returning({ id: tags.id });
    return result.length > 0;
  }
  // Article relation methods
  async getArticleCategories(articleId) {
    const articleCategoryRows = await db.select({
      categoryId: articleCategories.categoryId
    }).from(articleCategories).where(eq(articleCategories.articleId, articleId));
    if (articleCategoryRows.length === 0) {
      return [];
    }
    const categoryIds = articleCategoryRows.map((row) => row.categoryId);
    return db.select().from(categories).where(inArray(categories.id, categoryIds));
  }
  async getArticleTags(articleId) {
    const articleTagRows = await db.select({
      tagId: articleTags.tagId
    }).from(articleTags).where(eq(articleTags.articleId, articleId));
    if (articleTagRows.length === 0) {
      return [];
    }
    const tagIds = articleTagRows.map((row) => row.tagId);
    return db.select().from(tags).where(inArray(tags.id, tagIds));
  }
  async getArticleCoAuthors(articleId) {
    const articleCoAuthorRows = await db.select({
      userId: articleCoAuthors.userId
    }).from(articleCoAuthors).where(eq(articleCoAuthors.articleId, articleId));
    if (articleCoAuthorRows.length === 0) {
      return [];
    }
    const userIds = articleCoAuthorRows.map((row) => row.userId);
    return db.select().from(users).where(inArray(users.id, userIds));
  }
  async getArticleWithRelations(id) {
    const article = await this.getArticle(id);
    if (!article) {
      return void 0;
    }
    const [categories2, tags2, coAuthors] = await Promise.all([
      this.getArticleCategories(id),
      this.getArticleTags(id),
      this.getArticleCoAuthors(id)
    ]);
    return {
      article,
      categories: categories2,
      tags: tags2,
      coAuthors
    };
  }
  async createExtendedArticle(extendedArticle) {
    const { categoryIds, tagIds, coAuthorIds, ...articleData } = extendedArticle;
    if (typeof articleData.scheduledPublishAt === "string" && articleData.scheduledPublishAt) {
      articleData.scheduledPublishAt = new Date(
        new Date(articleData.scheduledPublishAt).toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
      );
    } else if (articleData.scheduledPublishAt === void 0) {
      delete articleData.scheduledPublishAt;
    }
    const article = await this.createArticle(articleData);
    if (categoryIds && categoryIds.length > 0) {
      await Promise.all(
        categoryIds.map(
          (categoryId) => db.insert(articleCategories).values({
            articleId: article.id,
            categoryId
          })
        )
      );
    }
    if (tagIds && tagIds.length > 0) {
      await Promise.all(
        tagIds.map(
          (tagId) => db.insert(articleTags).values({
            articleId: article.id,
            tagId
          })
        )
      );
    }
    if (coAuthorIds && coAuthorIds.length > 0) {
      await Promise.all(
        coAuthorIds.map(
          (userId) => db.insert(articleCoAuthors).values({
            articleId: article.id,
            userId
          })
        )
      );
    }
    return article;
  }
  async updateExtendedArticle(id, extendedArticle) {
    const { categoryIds, tagIds, coAuthorIds, ...articleData } = extendedArticle;
    if (typeof articleData.scheduledPublishAt === "string" && articleData.scheduledPublishAt) {
      articleData.scheduledPublishAt = new Date(articleData.scheduledPublishAt);
    } else if (articleData.scheduledPublishAt === null) {
      articleData.scheduledPublishAt = null;
    }
    const article = await this.updateArticle(id, articleData);
    if (!article) {
      return void 0;
    }
    if (categoryIds) {
      await db.delete(articleCategories).where(eq(articleCategories.articleId, id));
      if (categoryIds.length > 0) {
        await Promise.all(
          categoryIds.map(
            (categoryId) => db.insert(articleCategories).values({
              articleId: id,
              categoryId
            })
          )
        );
      }
    }
    if (tagIds) {
      await db.delete(articleTags).where(eq(articleTags.articleId, id));
      if (tagIds.length > 0) {
        await Promise.all(
          tagIds.map(
            (tagId) => db.insert(articleTags).values({
              articleId: id,
              tagId
            })
          )
        );
      }
    }
    if (coAuthorIds) {
      await db.delete(articleCoAuthors).where(eq(articleCoAuthors.articleId, id));
      if (coAuthorIds.length > 0) {
        await Promise.all(
          coAuthorIds.map(
            (userId) => db.insert(articleCoAuthors).values({
              articleId: id,
              userId
            })
          )
        );
      }
    }
    return article;
  }
  async searchArticles(filters) {
    let conditions = [];
    if (filters.authorId) {
      conditions.push(eq(articles.authorId, filters.authorId));
    }
    if (filters.status) {
      conditions.push(eq(articles.status, filters.status));
    }
    if (filters.published !== void 0) {
      conditions.push(eq(articles.published, filters.published));
    }
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      const searchCondition = or(
        sql`${articles.title} ILIKE ${searchTerm}`,
        sql`${articles.content} ILIKE ${searchTerm}`,
        sql`${articles.excerpt} ILIKE ${searchTerm}`
      );
      conditions.push(searchCondition);
    }
    let baseQuery = db.select().from(articles);
    if (conditions.length > 0) {
      baseQuery = baseQuery.where(and(...conditions));
    }
    let countQuery = db.select({ count: sql`count(*)` }).from(articles);
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }
    const totalCount = await countQuery;
    const total = totalCount[0]?.count || 0;
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;
    let orderByField = desc(articles.createdAt);
    if (filters.orderBy) {
      switch (filters.orderBy) {
        case "title":
          orderByField = asc(articles.title);
          break;
        case "title-desc":
          orderByField = desc(articles.title);
          break;
        case "newest":
          orderByField = desc(articles.createdAt);
          break;
        case "oldest":
          orderByField = asc(articles.createdAt);
          break;
        case "views":
          orderByField = desc(articles.viewCount);
          break;
      }
    }
    const results = await baseQuery.orderBy(orderByField).limit(limit).offset(offset);
    return {
      articles: results,
      total: Number(total)
    };
  }
  // Notification methods
  async createNotification(notificationData) {
    const [notification] = await db.insert(notifications).values(notificationData);
    return notification;
  }
  async getUserNotifications(userId) {
    return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }
  async markNotificationAsRead(id) {
    const [notification] = await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
    return notification;
  }
  async markAllNotificationsAsRead(userId) {
    const result = await db.update(notifications).set({ read: true }).where(eq(notifications.userId, userId)).returning({ id: notifications.id });
    return result.length > 0;
  }
  // Comment methods
  async getArticleComments(articleId) {
    return await db.select().from(comments).where(
      and(
        eq(comments.articleId, articleId),
        sql`${comments.parentId} IS NULL`
      )
    ).orderBy(asc(comments.createdAt));
  }
  async getCommentReplies(commentId) {
    return await db.select().from(comments).where(eq(comments.parentId, commentId)).orderBy(asc(comments.createdAt));
  }
  async getComment(id) {
    const [comment] = await db.select().from(comments).where(eq(comments.id, id));
    return comment;
  }
  async createComment(comment) {
    const [newComment] = await db.insert(comments).values(comment);
    if (comment.parentId) {
      await db.update(comments).set({
        replyCount: sql`${comments.replyCount} + 1`,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(comments.id, comment.parentId));
      const parentComment = await this.getComment(comment.parentId);
      if (parentComment) {
        const article = await this.getArticle(comment.articleId);
        if (article) {
          await this.createNotification({
            userId: article.authorId,
            type: "comment_received",
            title: "New Reply to Comment",
            message: `${comment.authorName} replied to a comment on your article "${article.title}"`,
            articleId: article.id,
            commentId: newComment.id,
            articleSlug: article.slug
            // Add slug for better navigation
          });
        }
      }
    } else {
      const article = await this.getArticle(comment.articleId);
      if (article) {
        await this.createNotification({
          userId: article.authorId,
          type: "comment_received",
          title: "New Comment on Article",
          message: `${comment.authorName} commented on your article "${article.title}"`,
          articleId: article.id,
          commentId: newComment.id,
          articleSlug: article.slug
          // Add slug for better navigation
        });
      }
    }
    return newComment;
  }
  async updateComment(id, commentData) {
    const [comment] = await db.update(comments).set({
      ...commentData,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(comments.id, id));
    return comment;
  }
  async deleteComment(id) {
    const comment = await this.getComment(id);
    if (!comment) return false;
    await db.delete(comments).where(eq(comments.parentId, id));
    const result = await db.delete(comments).where(eq(comments.id, id)).returning({ id: comments.id });
    if (comment.parentId) {
      await db.update(comments).set({
        replyCount: sql`GREATEST(${comments.replyCount} - 1, 0)`,
        // Ensure replyCount never goes below 0
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(comments.id, comment.parentId));
    }
    return result.length > 0;
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
import bcrypt2 from "bcrypt";
import jwt2 from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { z as z2 } from "zod";
import { sql as sql2, eq as eq2, desc as desc2, inArray as inArray2 } from "drizzle-orm";

// server/middleware/auth.ts
import jwt from "jsonwebtoken";
var JWT_SECRET = process.env.JWT_SECRET || "blog-platform-jwt-secret";
var authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }
    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
      if (err) {
        console.error("JWT verification error:", err.name, err.message);
        return res.status(403).json({
          message: "Invalid or expired token",
          error: err.message,
          name: err.name
        });
      }
      if (!decoded || !decoded.id || !decoded.email || !decoded.role) {
        console.error("Invalid token content:", decoded);
        return res.status(403).json({
          message: "Invalid token format",
          content: decoded ? "Missing user properties" : "No decoded content"
        });
      }
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role
      };
      console.log("Authenticated user:", req.user.email, "Role:", req.user.role);
      next();
    });
  } catch (error) {
    return res.status(500).json({ message: "Authentication error" });
  }
};
var requireAdmin = (req, res, next) => {
  if (!req.user) {
    console.error("Admin middleware: No user in request");
    return res.status(401).json({ message: "Authentication required" });
  }
  console.log("Admin middleware: Checking role", req.user.role, "Expected:", UserRole.ADMIN);
  if (req.user.role !== UserRole.ADMIN) {
    console.error("Admin access required but user role is:", req.user.role);
    return res.status(403).json({
      message: "Admin access required",
      userRole: req.user.role,
      requiredRole: UserRole.ADMIN
    });
  }
  next();
};
var requireAuthor = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (req.user.role !== UserRole.AUTHOR) {
    return res.status(403).json({ message: "Author access required" });
  }
  next();
};
var requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

// shared/utils/dateTime.ts
import * as dateFnsTz from "date-fns-tz";
var IST_TIMEZONE = "Asia/Kolkata";
function utcToIst(utcDate) {
  if (!utcDate) return null;
  const date = typeof utcDate === "string" ? new Date(utcDate) : utcDate;
  return dateFnsTz.toZonedTime(date, IST_TIMEZONE);
}
function istToUtc(istDate) {
  if (!istDate) return null;
  const date = typeof istDate === "string" ? new Date(istDate) : istDate;
  return dateFnsTz.zonedTimeToUtc(date, IST_TIMEZONE);
}
var IST_OFFSET = 5.5 * 60 * 60 * 1e3;
function getNowInIst() {
  const now = /* @__PURE__ */ new Date();
  return new Date(now.getTime() + 5.5 * 60 * 60 * 1e3);
}
function formatIstDate(date) {
  if (!date) return "";
  const istDate = utcToIst(date);
  if (!istDate) return "";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(istDate) + " IST";
}

// server/routes.ts
var JWT_SECRET2 = process.env.JWT_SECRET || "blog-platform-jwt-secret";
async function registerRoutes(app2) {
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(409).json({ message: "Email already registered" });
      }
      const newUser = await storage.createUser(validatedData);
      const { password, ...userWithoutPassword } = newUser;
      return res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors
        });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const validatedData = loginUserSchema.parse(req.body);
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const isValidPassword = await bcrypt2.compare(
        validatedData.password,
        user.password
      );
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const token = jwt2.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET2,
        { expiresIn: "24h" }
      );
      const { password, ...userWithoutPassword } = user;
      return res.json({
        user: userWithoutPassword,
        token
      });
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors
        });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/auth/me", authenticateToken, async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...userWithoutPassword } = user;
      return res.json(userWithoutPassword);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });
  app2.get(
    "/api/auth/permissions",
    authenticateToken,
    async (req, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }
        const user = await storage.getUser(req.user.id);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        const permissions = {
          canPublish: user.canPublish || user.role === "admin",
          isAdmin: user.role === "admin",
          role: user.role
        };
        return res.status(200).json(permissions);
      } catch (error) {
        console.error("Error fetching user permissions:", error);
        return res.status(500).json({ message: "Server error while retrieving permissions" });
      }
    }
  );
  app2.get(
    "/api/admin/dashboard",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
      try {
        const [usersCount, articlesCount, commentsCount] = await Promise.all([
          db.select({ count: sql2`count(*)` }).from(users),
          db.select({ count: sql2`count(*)` }).from(articles),
          db.select({ count: sql2`count(*)` }).from(comments)
        ]);
        const viewsResult = await db.select({ totalViews: sql2`COALESCE(SUM(view_count), 0)` }).from(articles).where(eq2(articles.published, true));
        const currentDate = /* @__PURE__ */ new Date();
        const firstDayOfMonth = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          1
        );
        const postsThisMonthQuery = `
          SELECT COUNT(*) as count
          FROM articles
          WHERE published = true
          AND published_at >= '${firstDayOfMonth.toISOString()}'
        `;
        const postsThisMonthResult = await db.execute(
          sql2.raw(postsThisMonthQuery)
        );
        const categoryStatsQuery = `
          SELECT c.id, c.name, COUNT(ac.article_id) as count
          FROM categories c
          JOIN article_categories ac ON c.id = ac.category_id
          JOIN articles a ON ac.article_id = a.id
          WHERE a.published = true
          GROUP BY c.id, c.name
          ORDER BY count DESC
          LIMIT 5
        `;
        const popularCategoriesResult = await db.execute(
          sql2.raw(categoryStatsQuery)
        );
        const postsByStatusQuery = `
          SELECT status, COUNT(*) as count
          FROM articles
          GROUP BY status
          ORDER BY count DESC
        `;
        const postsByStatusResult = await db.execute(sql2.raw(postsByStatusQuery));
        const viewsOverTime = [];
        for (let i = 13; i >= 0; i--) {
          const date = /* @__PURE__ */ new Date();
          date.setDate(date.getDate() - i);
          const formattedDate = date.toISOString().split("T")[0];
          const totalViewsValue = Number(viewsResult[0].totalViews) || 0;
          const baseViews = Math.floor(totalViewsValue / 20);
          const randomFactor = 0.5 + Math.random();
          const dailyViews = Math.floor(baseViews * randomFactor);
          viewsOverTime.push({
            date: formattedDate,
            views: dailyViews
          });
        }
        const recentArticles = await db.select({
          id: articles.id,
          title: articles.title,
          authorId: articles.authorId,
          status: articles.status,
          published: articles.published,
          createdAt: articles.createdAt,
          updatedAt: articles.updatedAt,
          publishedAt: articles.publishedAt,
          reviewedAt: articles.reviewedAt,
          reviewedBy: articles.reviewedBy
        }).from(articles).orderBy(desc2(articles.updatedAt)).limit(5);
        const recentUsers = await db.select({
          id: users.id,
          name: users.name,
          role: users.role,
          createdAt: users.createdAt
        }).from(users).orderBy(desc2(users.createdAt)).limit(3);
        const recentComments = await db.select({
          id: comments.id,
          content: comments.content,
          authorName: comments.authorName,
          authorEmail: comments.authorEmail,
          articleId: comments.articleId,
          parentId: comments.parentId,
          createdAt: comments.createdAt
        }).from(comments).orderBy(desc2(comments.createdAt)).limit(5);
        const recentNotifications = await db.select({
          id: notifications.id,
          type: notifications.type,
          title: notifications.title,
          userId: notifications.userId,
          articleId: notifications.articleId,
          commentId: notifications.commentId,
          createdAt: notifications.createdAt
        }).from(notifications).orderBy(desc2(notifications.createdAt)).limit(5);
        const articleIds = Array.from(
          new Set(recentComments.map((comment) => comment.articleId))
        );
        const articleTitles = await db.select({
          id: articles.id,
          title: articles.title,
          slug: articles.slug
        }).from(articles).where(inArray2(articles.id, articleIds));
        const articleTitlesMap = Object.fromEntries(
          articleTitles.map((article) => [
            article.id,
            { title: article.title, slug: article.slug }
          ])
        );
        const userIds = [
          ...recentArticles.map((article) => article.authorId),
          ...recentArticles.filter((article) => article.reviewedBy !== null).map((article) => article.reviewedBy)
        ].filter((id) => id !== null && id !== void 0);
        const usersData = await db.select({
          id: users.id,
          name: users.name
        }).from(users).where(inArray2(users.id, userIds));
        const usersMap = Object.fromEntries(
          usersData.map((user) => [user.id, user.name])
        );
        const activityItems = [
          // Articles activities
          ...recentArticles.map((article) => {
            const authorName = usersMap[article.authorId] || "Unknown";
            let action = "";
            if (article.reviewedAt && article.reviewedBy) {
              const reviewerName = usersMap[article.reviewedBy] || "Administrator";
              action = article.status === "published" ? `${reviewerName} approved "${article.title}"` : `${reviewerName} reviewed "${article.title}"`;
            } else if (article.published && article.publishedAt) {
              action = `${authorName} published "${article.title}"`;
            } else if (article.status === "review") {
              action = `${authorName} submitted "${article.title}" for review`;
            } else {
              action = `${authorName} created "${article.title}"`;
            }
            return {
              id: `article-${article.id}-${article.status}`,
              action,
              user: article.reviewedBy ? usersMap[article.reviewedBy] : authorName,
              timestamp: (article.reviewedAt || article.publishedAt || article.updatedAt || article.createdAt).toISOString()
            };
          }),
          // User registration activities
          ...recentUsers.map((user) => ({
            id: `user-${user.id}`,
            action: `New ${user.role} account registered`,
            user: user.name,
            timestamp: user.createdAt.toISOString()
          })),
          // Comment activities
          ...recentComments.map((comment) => {
            const articleInfo = articleTitlesMap[comment.articleId] || {
              title: "Unknown article"
            };
            const isReply = comment.parentId !== null;
            return {
              id: `comment-${comment.id}`,
              action: isReply ? `${comment.authorName} replied to a comment on "${articleInfo.title}"` : `${comment.authorName} commented on "${articleInfo.title}"`,
              user: comment.authorName,
              timestamp: comment.createdAt.toISOString()
            };
          })
        ].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ).slice(0, 10);
        return res.json({
          totalUsers: Number(usersCount[0].count),
          totalPosts: Number(articlesCount[0].count),
          totalViews: Number(viewsResult[0].totalViews) || 0,
          postsThisMonth: Number(postsThisMonthResult?.rows?.[0]?.count) || 0,
          popularCategories: popularCategoriesResult?.rows?.map((row) => ({
            name: String(row.name),
            count: Number(row.count)
          })),
          postsByStatus: postsByStatusResult?.rows?.map((row) => ({
            status: String(row.status),
            count: Number(row.count)
          })),
          viewsOverTime,
          recentActivity: activityItems
        });
      } catch (error) {
        console.error("Error fetching admin dashboard data:", error);
        return res.status(500).json({ message: "Error fetching dashboard data" });
      }
    }
  );
  app2.get(
    "/api/author/dashboard",
    authenticateToken,
    requireAuthor,
    async (req, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }
        const articles2 = await storage.getArticlesByAuthor(req.user.id);
        const published = articles2.filter((a) => a.published).length;
        const drafts = articles2.filter((a) => !a.published).length;
        const publishedArticles = articles2.filter(
          (a) => a.published && a.status === ArticleStatus.PUBLISHED
        );
        const totalViews = publishedArticles.reduce(
          (sum, article) => sum + (article.viewCount || 0),
          0
        );
        return res.json({
          stats: {
            published,
            drafts,
            totalViews
          },
          articles: articles2
        });
      } catch (error) {
        console.error("Error in author dashboard:", error);
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
  app2.get(
    "/api/author/profile",
    authenticateToken,
    requireAuthor,
    async (req, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }
        const user = await storage.getUser(req.user.id);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        const { password, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
  app2.get(
    "/api/admin/profile",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }
        const user = await storage.getUser(req.user.id);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        const { password, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      } catch (error) {
        console.error("Error fetching admin profile:", error);
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
  app2.patch(
    "/api/author/profile",
    authenticateToken,
    requireAuthor,
    async (req, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }
        const validatedData = updateUserProfileSchema.parse(req.body);
        const updatedUser = await storage.updateUserProfile(
          req.user.id,
          validatedData
        );
        if (!updatedUser) {
          return res.status(404).json({ message: "User not found" });
        }
        const { password, ...userWithoutPassword } = updatedUser;
        return res.json(userWithoutPassword);
      } catch (error) {
        if (error instanceof z2.ZodError) {
          return res.status(400).json({
            message: "Validation error",
            errors: error.errors
          });
        }
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
  app2.patch(
    "/api/admin/profile",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }
        const validatedData = updateUserProfileSchema.parse(req.body);
        const updatedUser = await storage.updateUserProfile(
          req.user.id,
          validatedData
        );
        if (!updatedUser) {
          return res.status(404).json({ message: "User not found" });
        }
        const { password, ...userWithoutPassword } = updatedUser;
        return res.json(userWithoutPassword);
      } catch (error) {
        if (error instanceof z2.ZodError) {
          return res.status(400).json({
            message: "Validation error",
            errors: error.errors
          });
        }
        console.error("Error updating admin profile:", error);
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
  app2.get(
    "/api/author/articles/:status",
    authenticateToken,
    requireAuthor,
    async (req, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }
        const { status } = req.params;
        if (!Object.values(ArticleStatus).includes(status)) {
          return res.status(400).json({ message: "Invalid status parameter" });
        }
        const articles2 = await storage.getArticlesByStatus(
          req.user.id,
          status
        );
        return res.json(articles2);
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
  app2.get(
    "/api/author/articles",
    authenticateToken,
    requireAuthor,
    async (req, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }
        const articles2 = await storage.getArticlesByAuthor(req.user.id);
        return res.json(articles2);
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
  app2.post(
    "/api/articles",
    authenticateToken,
    requireAuth,
    async (req, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }
        if (req.body.categoryIds || req.body.tags || req.body.coAuthorIds || req.body.keywords || req.body.metaTitle || req.body.metaDescription) {
          let tagIds = [];
          if (req.body.tags && Array.isArray(req.body.tags)) {
            const tagPromises = req.body.tags.map(async (tagName) => {
              let tag = await storage.getTagBySlug(
                tagName.toLowerCase().replace(/\s+/g, "-")
              );
              if (!tag) {
                tag = await storage.createTag({
                  name: tagName,
                  slug: tagName.toLowerCase().replace(/\s+/g, "-")
                });
              }
              return tag.id;
            });
            tagIds = await Promise.all(tagPromises);
          }
          const validatedData = extendedArticleSchema.parse({
            ...req.body,
            authorId: req.user.id,
            tagIds
            // Replace tags array with tag IDs
          });
          delete validatedData.tags;
          const article = await storage.createExtendedArticle(validatedData);
          return res.status(201).json(article);
        } else {
          const validatedData = insertArticleSchema.parse({
            ...req.body,
            authorId: req.user.id
          });
          const article = await storage.createArticle(validatedData);
          return res.status(201).json(article);
        }
      } catch (error) {
        if (error instanceof z2.ZodError) {
          return res.status(400).json({
            message: "Validation error",
            errors: error.errors
          });
        }
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
  app2.patch(
    "/api/articles/:id",
    authenticateToken,
    requireAuth,
    async (req, res) => {
      const articleId = parseInt(req.params.id);
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }
        if (isNaN(articleId)) {
          return res.status(400).json({ message: "Invalid article ID" });
        }
        console.log(
          `Attempting to update article ${articleId}:`,
          JSON.stringify(req.body).substring(0, 200)
        );
        if (req.body.keywords === null || req.body.keywords === void 0) {
          req.body.keywords = [];
        } else if (!Array.isArray(req.body.keywords)) {
          try {
            if (typeof req.body.keywords === "string") {
              req.body.keywords = JSON.parse(req.body.keywords);
            }
            if (!Array.isArray(req.body.keywords)) {
              req.body.keywords = [];
            }
          } catch (e) {
            console.warn(
              "Error parsing keywords, defaulting to empty array:",
              e
            );
            req.body.keywords = [];
          }
        }
        const article = await storage.getArticle(articleId);
        if (!article) {
          return res.status(404).json({ message: "Article not found" });
        }
        if (article.authorId !== req.user.id && req.user.role !== UserRole.ADMIN) {
          return res.status(403).json({
            message: "You don't have permission to update this article"
          });
        }
        if (req.body.categoryIds || req.body.tags || req.body.tagIds || req.body.coAuthorIds || req.body.keywords || req.body.metaTitle || req.body.metaDescription) {
          if (req.body.tags && Array.isArray(req.body.tags)) {
            const tagPromises = req.body.tags.map(async (tagName) => {
              let tag = await storage.getTagBySlug(
                tagName.toLowerCase().replace(/\s+/g, "-")
              );
              if (!tag) {
                tag = await storage.createTag({
                  name: tagName,
                  slug: tagName.toLowerCase().replace(/\s+/g, "-")
                });
              }
              return tag.id;
            });
            req.body.tagIds = await Promise.all(tagPromises);
            delete req.body.tags;
          }
          const validatedData = updateExtendedArticleSchema.parse(req.body);
          const updatedArticle = await storage.updateExtendedArticle(
            articleId,
            validatedData
          );
          return res.json(updatedArticle);
        } else {
          const validatedData = updateArticleSchema.parse(req.body);
          const updatedArticle = await storage.updateArticle(
            articleId,
            validatedData
          );
          return res.json(updatedArticle);
        }
      } catch (error) {
        if (error instanceof z2.ZodError) {
          return res.status(400).json({
            message: "Validation error",
            errors: error.errors
          });
        }
        console.error(`Error updating article ${articleId}:`, error);
        console.log("erooor here");
        console.error("Error updating article:", error);
        return res.status(500).json({
          message: "Server error",
          details: error instanceof Error ? error.message : String(error)
        });
      }
    }
  );
  app2.patch(
    "/api/articles/:id/status",
    authenticateToken,
    requireAuth,
    async (req, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }
        const articleId = parseInt(req.params.id);
        if (isNaN(articleId)) {
          return res.status(400).json({ message: "Invalid article ID" });
        }
        const { status } = req.body;
        if (!Object.values(ArticleStatus).includes(status)) {
          return res.status(400).json({ message: "Invalid status" });
        }
        const article = await storage.getArticle(articleId);
        if (!article) {
          return res.status(404).json({ message: "Article not found" });
        }
        if (article.authorId !== req.user.id && req.user.role !== UserRole.ADMIN) {
          return res.status(403).json({
            message: "You don't have permission to update this article"
          });
        }
        const updatedArticle = await storage.updateArticleStatus(
          articleId,
          status
        );
        return res.json(updatedArticle);
      } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server error", error });
      }
    }
  );
  app2.patch(
    "/api/admin/articles/:id/status",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }
        const articleId = parseInt(req.params.id);
        if (isNaN(articleId)) {
          return res.status(400).json({ message: "Invalid article ID" });
        }
        const { status, remarks, scheduledPublishAt } = req.body;
        console.log("Admin article status update request:", {
          status,
          remarks,
          scheduledPublishAt
        });
        if (!Object.values(ArticleStatus).includes(status)) {
          return res.status(400).json({ message: "Invalid status" });
        }
        const article = await storage.getArticle(articleId);
        if (!article) {
          return res.status(404).json({ message: "Article not found" });
        }
        const updateData = {
          status,
          reviewRemarks: remarks || null,
          reviewedBy: req.user.id,
          reviewedAt: getNowInIst()
        };
        if (scheduledPublishAt) {
          const scheduleDate = new Date(scheduledPublishAt);
          if (isNaN(scheduleDate.getTime())) {
            console.error("Failed to parse scheduledPublishAt date:", scheduledPublishAt);
            return res.status(400).json({ message: "Invalid scheduled publish date format" });
          }
          const scheduleDateUTC = istToUtc(scheduleDate);
          console.log("Setting scheduled publish date:", scheduledPublishAt);
          console.log(
            `Converted from IST to UTC: ${scheduleDate?.toISOString()} ->
            ${scheduleDateUTC?.toISOString()}`
          );
          if (scheduleDate) {
            updateData.scheduledPublishAt = scheduleDate.toISOString();
            if (status === ArticleStatus.PUBLISHED) {
              updateData.published = "false";
            }
          } else {
            console.error(
              "Failed to convert IST date to UTC:",
              scheduledPublishAt
            );
            return res.status(400).json({ message: "Invalid scheduled publish date format" });
          }
        } else if (status === ArticleStatus.PUBLISHED) {
          updateData.published = "true";
          updateData.publishedAt = getNowInIst();
        }
        console.log("Updating article with data:", updateData);
        const updatedArticle = await storage.updateArticle(
          articleId,
          updateData
        );
        if (status === ArticleStatus.PUBLISHED) {
          try {
            let scheduleTimeDisplay = "";
            if (scheduledPublishAt) {
              scheduleTimeDisplay = formatIstDate(scheduledPublishAt);
            }
            const notificationMessage = scheduledPublishAt ? `Your article "${article.title}" has been approved and scheduled to publish on ${scheduleTimeDisplay}.` : `Your article "${article.title}" has been approved and published.`;
            await storage.createNotification({
              userId: article.authorId,
              type: NotificationType.ARTICLE_APPROVED,
              title: scheduledPublishAt ? "Article Scheduled" : "Article Approved",
              message: notificationMessage,
              articleId: article.id,
              read: false
            });
          } catch (notificationError) {
            console.error("Error creating notification:", notificationError);
          }
        } else if (status === ArticleStatus.DRAFT && article.status === ArticleStatus.REVIEW) {
          try {
            await storage.createNotification({
              userId: article.authorId,
              type: NotificationType.ARTICLE_REJECTED,
              title: "Article Needs Revision",
              message: `Your article "${article.title}" requires revisions before it can be published.`,
              articleId: article.id,
              read: false
            });
          } catch (notificationError) {
            console.error("Error creating notification:", notificationError);
          }
        }
        return res.json(updatedArticle);
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
  app2.get("/api/articles/published", async (req, res) => {
    try {
      const articles2 = await storage.getPublishedArticles();
      const articlesWithRelations = await Promise.all(
        articles2.map(async (article) => {
          try {
            const author = article.authorId ? await storage.getUser(article.authorId) : null;
            const categories2 = await storage.getArticleCategories(article.id);
            const tags2 = await storage.getArticleTags(article.id);
            const coAuthors = await storage.getArticleCoAuthors(article.id);
            const formattedCoAuthors = coAuthors.map((coAuthor) => ({
              id: coAuthor.id,
              name: coAuthor.name,
              avatarUrl: coAuthor.avatarUrl
            }));
            return {
              ...article,
              author: author ? {
                id: author.id,
                name: author.name,
                avatarUrl: author.avatarUrl
              } : null,
              categories: categories2,
              tags: tags2,
              coAuthors: formattedCoAuthors
            };
          } catch (err) {
            console.error(
              `Error fetching relations for article ${article.id}:`,
              err
            );
            return article;
          }
        })
      );
      res.json(articlesWithRelations);
    } catch (error) {
      console.error("Error fetching published articles:", error);
      res.status(500).json({ message: "Failed to fetch published articles" });
    }
  });
  app2.get("/api/articles/:identifier/public", async (req, res) => {
    try {
      let article;
      const { identifier } = req.params;
      if (!isNaN(Number(identifier))) {
        article = await storage.getArticle(parseInt(identifier));
      } else {
        article = await storage.getArticleBySlug(identifier);
      }
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }
      if (article.status !== ArticleStatus.PUBLISHED) {
        return res.status(404).json({ message: "Article not found" });
      }
      let currentViewCount = article.viewCount || 0;
      let newViewCount = currentViewCount + 1;
      try {
        console.log(`Updating article ${article.id} with data:`, {
          viewCount: newViewCount
        });
        storage.updateArticle(article.id, { viewCount: newViewCount }).catch((err) => {
          console.error(
            `Failed to update view count for article ${article.id}:`,
            err
          );
        });
      } catch (viewCountError) {
        console.error(
          `Error processing view count for article ${article.id}:`,
          viewCountError
        );
      }
      const fullArticle = await storage.getArticleWithRelations(article.id);
      if (!fullArticle) {
        return res.status(404).json({ message: "Article not found" });
      }
      fullArticle.article.viewCount = newViewCount;
      const author = fullArticle.article.authorId ? await storage.getUser(fullArticle.article.authorId) : null;
      return res.json({
        ...fullArticle,
        article: {
          ...fullArticle.article,
          author: author ? {
            id: author.id,
            name: author.name,
            avatarUrl: author.avatarUrl,
            bio: author.bio
          } : null
        }
      });
    } catch (error) {
      console.error("Error fetching article:", error);
      res.status(500).json({ message: "Failed to fetch article" });
    }
  });
  app2.get(
    "/api/articles/:id/preview",
    authenticateToken,
    async (req, res) => {
      try {
        const articleId = parseInt(req.params.id);
        if (isNaN(articleId)) {
          return res.status(400).json({ message: "Invalid article ID" });
        }
        if (!req.user) {
          return res.status(401).json({ message: "Authentication required" });
        }
        const fullArticle = await storage.getArticleWithRelations(articleId);
        if (!fullArticle) {
          return res.status(404).json({ message: "Article not found" });
        }
        const article = fullArticle.article;
        const userId = req.user.id;
        const userRole = req.user.role;
        const isAdmin = userRole === UserRole.ADMIN;
        const isAuthor = article.authorId === userId;
        const isCoAuthor = fullArticle.coAuthors.some(
          (coAuthor) => coAuthor.id === userId
        );
        console.log(`Preview access check for article ${articleId}:`, {
          userId,
          userRole,
          isAdmin,
          isAuthor,
          isCoAuthor
        });
        if (!isAdmin && !isAuthor && !isCoAuthor) {
          return res.status(403).json({
            message: "You don't have permission to preview this article"
          });
        }
        const author = await storage.getUser(article.authorId);
        return res.json({
          ...fullArticle,
          article: {
            ...article,
            author: author ? {
              id: author.id,
              name: author.name,
              avatarUrl: author.avatarUrl,
              bio: author.bio
            } : null
          }
        });
      } catch (error) {
        console.error("Error fetching article preview:", error);
        res.status(500).json({ message: "Failed to fetch article preview" });
      }
    }
  );
  app2.get("/api/authors/:id/public", async (req, res) => {
    try {
      const authorId = parseInt(req.params.id);
      if (isNaN(authorId)) {
        return res.status(400).json({ message: "Invalid author ID" });
      }
      const author = await storage.getUser(authorId);
      if (!author) {
        return res.status(404).json({ message: "Author not found" });
      }
      const ownArticles = await storage.searchArticles({
        authorId,
        published: true,
        status: ArticleStatus.PUBLISHED,
        page: 1,
        limit: 10
      });
      const coAuthoredArticles = await storage.getCoAuthoredArticles(
        authorId,
        ArticleStatus.PUBLISHED
      );
      const allArticles = [...ownArticles.articles, ...coAuthoredArticles];
      const { password, email, ...authorPublicInfo } = author;
      return res.json({
        author: authorPublicInfo,
        articles: {
          own: ownArticles.articles,
          coAuthored: coAuthoredArticles,
          all: allArticles
        },
        totalArticles: ownArticles.total + coAuthoredArticles.length
      });
    } catch (error) {
      console.error("Error fetching author profile:", error);
      res.status(500).json({ message: "Failed to fetch author profile" });
    }
  });
  app2.get(
    "/api/articles/:id/full",
    authenticateToken,
    requireAuth,
    async (req, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }
        const articleId = parseInt(req.params.id);
        if (isNaN(articleId)) {
          return res.status(400).json({ message: "Invalid article ID" });
        }
        const articleWithRelations = await storage.getArticleWithRelations(
          articleId
        );
        if (!articleWithRelations) {
          return res.status(404).json({ message: "Article not found" });
        }
        const { article } = articleWithRelations;
        if (!article.published && article.authorId !== req.user.id && req.user.role !== UserRole.ADMIN && !articleWithRelations.coAuthors.some(
          (author) => author.id === req.user.id
        )) {
          return res.status(403).json({
            message: "You don't have permission to access this article"
          });
        }
        return res.json(articleWithRelations);
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
  app2.delete(
    "/api/articles/:id",
    authenticateToken,
    requireAuth,
    async (req, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }
        const articleId = parseInt(req.params.id);
        if (isNaN(articleId)) {
          return res.status(400).json({ message: "Invalid article ID" });
        }
        const article = await storage.getArticle(articleId);
        if (!article) {
          return res.status(404).json({ message: "Article not found" });
        }
        if (article.authorId !== req.user.id && req.user.role !== UserRole.ADMIN) {
          return res.status(403).json({
            message: "You don't have permission to delete this article"
          });
        }
        const success = await storage.deleteArticle(articleId);
        if (!success) {
          return res.status(500).json({ message: "Failed to delete article" });
        }
        return res.status(204).send();
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
  const uploadsFolder = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsFolder)) {
    fs.mkdirSync(uploadsFolder, { recursive: true });
  }
  const storage_config = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsFolder);
    },
    filename: (req, file, cb) => {
      const fileExt = path.extname(file.originalname);
      const fileName = `${randomUUID()}${fileExt}`;
      cb(null, fileName);
    }
  });
  const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error("Invalid file type. Only images and documents are allowed.")
      );
    }
  };
  const upload = multer({
    storage: storage_config,
    fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024
      // 5MB max size
    }
  });
  app2.get(
    "/api/assets",
    authenticateToken,
    requireAuth,
    async (req, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }
        const assets2 = await storage.getAssetsByUser(req.user.id);
        return res.json(assets2);
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
  app2.get(
    "/api/assets/search",
    authenticateToken,
    requireAuth,
    async (req, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }
        const searchParams = searchAssetsSchema.parse({
          query: req.query.query,
          tags: req.query.tags ? req.query.tags.split(",") : void 0,
          mimetype: req.query.mimetype,
          page: req.query.page ? parseInt(req.query.page) : 1,
          limit: req.query.limit ? parseInt(req.query.limit) : 20
        });
        const result = await storage.searchAssets(searchParams, req.user.id);
        return res.json(result);
      } catch (error) {
        if (error instanceof z2.ZodError) {
          return res.status(400).json({
            message: "Validation error",
            errors: error.errors
          });
        }
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
  app2.get(
    "/api/assets/:id",
    authenticateToken,
    requireAuth,
    async (req, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }
        const assetId = parseInt(req.params.id);
        if (isNaN(assetId)) {
          return res.status(400).json({ message: "Invalid asset ID" });
        }
        const asset = await storage.getAsset(assetId);
        if (!asset) {
          return res.status(404).json({ message: "Asset not found" });
        }
        if (asset.userId !== req.user.id && req.user.role !== UserRole.ADMIN) {
          return res.status(403).json({
            message: "You don't have permission to access this asset"
          });
        }
        return res.json(asset);
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
  app2.post(
    "/api/assets",
    authenticateToken,
    requireAuth,
    upload.single("file"),
    async (req, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }
        const assetData = {
          filename: req.file.filename,
          originalName: req.file.originalname,
          path: req.file.path,
          url: `/uploads/${req.file.filename}`,
          // URL path to access the file
          mimetype: req.file.mimetype,
          size: req.file.size,
          userId: req.user.id,
          title: req.body.title || req.file.originalname,
          description: req.body.description || "",
          tags: req.body.tags ? JSON.parse(req.body.tags) : []
        };
        const asset = await storage.createAsset(assetData);
        return res.status(201).json(asset);
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
  app2.patch(
    "/api/assets/:id",
    authenticateToken,
    requireAuth,
    async (req, res) => {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const assetId = parseInt(req.params.id);
      if (isNaN(assetId)) {
        return res.status(400).json({ message: "Invalid asset ID" });
      }
      const asset = await storage.getAsset(assetId);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      if (asset.userId !== req.user.id && req.user.role !== UserRole.ADMIN) {
        return res.status(403).json({
          message: "You don't have permission to update this asset"
        });
      }
      const validatedData = updateAssetSchema.parse(req.body);
      const updatedAsset = await storage.updateAsset(assetId, validatedData);
      return res.json(updatedAsset);
    }
  );
  app2.get("/api/categories", async (req, res) => {
    try {
      const categories2 = await storage.getAllCategories();
      return res.json(categories2);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });
  app2.post(
    "/api/categories",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
      try {
        const validatedData = insertCategorySchema.parse(req.body);
        const category = await storage.createCategory(validatedData);
        return res.status(201).json(category);
      } catch (error) {
        if (error instanceof z2.ZodError) {
          return res.status(400).json({
            message: "Validation error",
            errors: error.errors
          });
        }
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
  app2.patch(
    "/api/categories/:id",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
      try {
        const categoryId = parseInt(req.params.id);
        if (isNaN(categoryId)) {
          return res.status(400).json({ message: "Invalid category ID" });
        }
        const validatedData = updateCategorySchema.parse(req.body);
        const updatedCategory = await storage.updateCategory(
          categoryId,
          validatedData
        );
        if (!updatedCategory) {
          return res.status(404).json({ message: "Category not found" });
        }
        return res.json(updatedCategory);
      } catch (error) {
        if (error instanceof z2.ZodError) {
          return res.status(400).json({
            message: "Validation error",
            errors: error.errors
          });
        }
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
  app2.delete(
    "/api/categories/:id",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
      try {
        const categoryId = parseInt(req.params.id);
        if (isNaN(categoryId)) {
          return res.status(400).json({ message: "Invalid category ID" });
        }
        const success = await storage.deleteCategory(categoryId);
        if (!success) {
          return res.status(404).json({ message: "Category not found or could not be deleted" });
        }
        return res.status(204).send();
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
  app2.get("/api/tags", async (req, res) => {
    try {
      const tags2 = await storage.getAllTags();
      return res.json(tags2);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });
  app2.post(
    "/api/tags",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
      try {
        const validatedData = insertTagSchema.parse(req.body);
        const tag = await storage.createTag(validatedData);
        return res.status(201).json(tag);
      } catch (error) {
        if (error instanceof z2.ZodError) {
          return res.status(400).json({
            message: "Validation error",
            errors: error.errors
          });
        }
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
  app2.delete(
    "/api/tags/:id",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
      try {
        const tagId = parseInt(req.params.id);
        if (isNaN(tagId)) {
          return res.status(400).json({ message: "Invalid tag ID" });
        }
        const success = await storage.deleteTag(tagId);
        if (!success) {
          return res.status(404).json({ message: "Tag not found or could not be deleted" });
        }
        return res.status(204).send();
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
  app2.get(
    "/api/users/authors",
    authenticateToken,
    requireAuth,
    async (req, res) => {
      try {
        const users2 = await storage.getUsers(UserRole.AUTHOR);
        const usersWithoutPassword = users2.map((user) => {
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        });
        return res.json(usersWithoutPassword);
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
  app2.delete(
    "/api/assets/:id",
    authenticateToken,
    requireAuth,
    async (req, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }
        const assetId = parseInt(req.params.id);
        if (isNaN(assetId)) {
          return res.status(400).json({ message: "Invalid asset ID" });
        }
        const asset = await storage.getAsset(assetId);
        if (!asset) {
          return res.status(404).json({ message: "Asset not found" });
        }
        if (asset.userId !== req.user.id && req.user.role !== UserRole.ADMIN) {
          return res.status(403).json({
            message: "You don't have permission to delete this asset"
          });
        }
        const filePath = asset.path;
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        await storage.deleteAsset(assetId);
        return res.status(200).json({ message: "Asset deleted successfully" });
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
  app2.use("/uploads", express.static(uploadsFolder));
  app2.get(
    "/api/admin/profile",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }
        const user = await storage.getUser(req.user.id);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        const { password, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
  app2.patch(
    "/api/admin/profile",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }
        const validatedData = updateUserProfileSchema.parse(req.body);
        const updatedUser = await storage.updateUserProfile(
          req.user.id,
          validatedData
        );
        if (!updatedUser) {
          return res.status(404).json({ message: "User not found" });
        }
        const { password, ...userWithoutPassword } = updatedUser;
        return res.json(userWithoutPassword);
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
  app2.get(
    "/api/admin/authors",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }
        const users2 = await storage.getUsers(UserRole.AUTHOR);
        const authorsWithExtendedInfo = await Promise.all(
          users2.map(async (user) => {
            const authorArticles = await storage.getArticlesByAuthor(user.id);
            return {
              ...user,
              postCount: authorArticles.length,
              // Actual article count from database
              activeStatus: true
              // We'll keep this as true for now, could be replaced with a real status field later
            };
          })
        );
        return res.json(authorsWithExtendedInfo);
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
  app2.post(
    "/api/admin/authors",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }
        const { name, email, password, bio, canPublish, avatarUrl } = req.body;
        console.log(avatarUrl);
        if (!name || !email || !password) {
          return res.status(400).json({ message: "Name, email and password are required" });
        }
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
          return res.status(400).json({ message: "A user with this email already exists" });
        }
        const newAuthor = await storage.createUser({
          name,
          email,
          password,
          role: UserRole.AUTHOR,
          bio: bio || null,
          canPublish: canPublish || false
        });
        const { password: _, ...authorWithoutPassword } = newAuthor;
        return res.status(201).json(authorWithoutPassword);
      } catch (error) {
        console.error("Error creating author:", error);
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
  app2.patch(
    "/api/admin/authors/:id/status",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }
        const authorId = parseInt(req.params.id);
        if (isNaN(authorId)) {
          return res.status(400).json({ message: "Invalid author ID" });
        }
        const { active } = req.body;
        if (typeof active !== "boolean") {
          return res.status(400).json({ message: "Active status must be a boolean" });
        }
        return res.json({ success: true, id: authorId, active });
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
  app2.patch(
    "/api/admin/authors/:id/permissions",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }
        const authorId = parseInt(req.params.id);
        if (isNaN(authorId)) {
          return res.status(400).json({ message: "Invalid author ID" });
        }
        const { canPublish } = req.body;
        if (typeof canPublish !== "boolean") {
          return res.status(400).json({ message: "Publishing rights must be a boolean" });
        }
        const updatedUser = await storage.updateUserPublishingRights(
          authorId,
          canPublish
        );
        if (!updatedUser) {
          return res.status(404).json({ message: "Author not found" });
        }
        return res.json(updatedUser);
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
  app2.get(
    "/api/admin/articles",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }
        const statusFilter = req.query.status;
        const filters = {};
        if (statusFilter) {
          filters.status = statusFilter;
        }
        const articles2 = await storage.searchArticles(filters);
        const extendedArticles = await Promise.all(
          articles2.articles.map(async (article) => {
            const author = await storage.getUser(article.authorId);
            const categories2 = await storage.getArticleCategories(article.id);
            return {
              ...article,
              author: author?.name || "Unknown Author",
              categories: categories2.map((cat) => cat.name)
            };
          })
        );
        return res.json(extendedArticles);
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
  app2.patch(
    "/api/admin/articles/bulk/status/update",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
      try {
        console.error(req.body);
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }
        const { ids, status, scheduledPublishAt = null } = req.body;
        console.log(
          "Bulk article status update request received from user:",
          req.user.email
        );
        console.log("Request body:", JSON.stringify(req.body, null, 2));
        if (ids === void 0) {
          console.error("Missing 'ids' in request body");
          return res.status(400).json({
            message: "Article IDs are required",
            received: req.body
          });
        }
        if (!status) {
          console.error("Missing 'status' in request body");
          return res.status(400).json({
            message: "Status is required",
            received: req.body
          });
        }
        console.log("Detailed IDs inspection:", {
          status,
          scheduledPublishAt,
          idsValue: ids,
          idsType: typeof ids,
          isArray: Array.isArray(ids),
          idsLength: Array.isArray(ids) ? ids.length : "N/A",
          idsDetails: Array.isArray(ids) ? ids.map((id) => ({
            value: id,
            type: typeof id,
            valueAsString: String(id),
            isValid: !isNaN(Number(id))
          })) : "not an array"
        });
        if (!Array.isArray(ids)) {
          console.error("IDs is not an array:", ids);
          return res.status(400).json({
            message: "Article IDs must be an array",
            received: typeof ids
          });
        }
        if (ids.length === 0) {
          console.error("Empty IDs array");
          return res.status(400).json({ message: "Empty article IDs array" });
        }
        console.log("ids : ", ids);
        const numericIds = ids.map((id) => {
          console.log(`Processing ID '${id}' (type: ${typeof id})`);
          let numId;
          if (typeof id === "string") {
            numId = parseInt(id.trim());
          } else if (typeof id === "number") {
            numId = id;
          } else {
            numId = Number(id);
          }
          const isValid = !isNaN(numId) && numId > 0;
          console.log(`Converted to numeric: ${numId}, valid: ${isValid}`);
          return isValid ? numId : null;
        }).filter((id) => id !== null);
        console.log("Final processed IDs for update:", numericIds);
        if (numericIds.length === 0) {
          console.error("No valid IDs found after processing");
          return res.status(400).json({
            message: "No valid article IDs found",
            originalIds: ids,
            validationDetails: Array.isArray(ids) ? ids.map((id) => ({
              original: id,
              asNumber: Number(id),
              isValid: !isNaN(Number(id)) && Number(id) > 0
            })) : "not an array"
          });
        }
        if (!Object.values(ArticleStatus).includes(status)) {
          return res.status(400).json({ message: "Invalid status" });
        }
        const results = await Promise.all(
          numericIds.map(async (id) => {
            const article = await storage.getArticle(id);
            if (!article) {
              console.error(`Article with ID ${id} not found`);
              return { id, success: false, error: "Article not found" };
            }
            let updatedArticle;
            if (scheduledPublishAt && status === ArticleStatus.PUBLISHED) {
              const scheduleDate = istToUtc(scheduledPublishAt);
              console.log(
                "Setting bulk scheduled publish date:",
                scheduledPublishAt
              );
              console.log(
                "Converted from IST to UTC:",
                scheduleDate?.toISOString()
              );
              if (scheduleDate) {
                updatedArticle = await storage.updateArticle(id, {
                  status,
                  scheduledPublishAt: scheduleDate.toISOString(),
                  published: false,
                  // Will be set to true by the scheduler
                  reviewedBy: req.user.id,
                  reviewedAt: (/* @__PURE__ */ new Date()).toISOString()
                });
              } else {
                console.error(
                  "Failed to convert IST date to UTC:",
                  scheduledPublishAt
                );
                return {
                  id,
                  success: false,
                  error: "Invalid scheduled publish date format"
                };
              }
            } else {
              updatedArticle = await storage.updateArticleStatus(id, status);
            }
            if (updatedArticle) {
              if (status === ArticleStatus.PUBLISHED) {
                let scheduleTimeDisplay = "";
                if (scheduledPublishAt) {
                  scheduleTimeDisplay = formatIstDate(scheduledPublishAt);
                }
                const notificationMessage = scheduledPublishAt ? `Your article "${article.title}" has been approved and scheduled to publish on ${scheduleTimeDisplay}.` : `Your article "${article.title}" has been approved and published.`;
                await storage.createNotification({
                  userId: article.authorId,
                  type: NotificationType.ARTICLE_APPROVED,
                  title: scheduledPublishAt ? "Article Scheduled" : "Article Approved",
                  message: notificationMessage,
                  articleId: article.id,
                  read: false
                });
              } else if (status === ArticleStatus.DRAFT && article.status === ArticleStatus.REVIEW) {
                await storage.createNotification({
                  userId: article.authorId,
                  type: NotificationType.ARTICLE_REJECTED,
                  title: "Article Needs Revision",
                  message: `Your article "${article.title}" requires revisions before it can be published.`,
                  articleId: article.id,
                  read: false
                });
              }
            }
            return { id, success: !!updatedArticle };
          })
        );
        return res.json({ success: true, results });
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
  app2.delete(
    "/api/admin/articles/bulk",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }
        const { ids } = req.body;
        console.log(req.body);
        console.log("Bulk delete request. Raw ids:", ids);
        console.log("Type of ids:", typeof ids);
        console.log("Is array?", Array.isArray(ids));
        if (!Array.isArray(ids) || ids.length === 0) {
          return res.status(400).json({ message: "Invalid or empty article IDs" });
        }
        const numericIds = ids.map((id) => {
          console.log("Processing ID:", id, "type:", typeof id);
          return typeof id === "string" ? parseInt(id) : Number(id);
        }).filter((id) => !isNaN(id));
        console.log("Processed numeric IDs:", numericIds);
        if (numericIds.length === 0) {
          return res.status(400).json({ message: "All provided article IDs were invalid" });
        }
        const results = [];
        for (const id of numericIds) {
          console.log(`Starting transaction to delete article ${id}`);
          try {
            const result = await storage.deleteArticle(id);
            console.log(`Article ${id} deletion complete:`, result);
            results.push({ id, success: true });
          } catch (err) {
            console.error(`Error deleting article ${id}:`, err);
            results.push({ id, success: false, error: err.message });
          }
        }
        return res.json({
          success: true,
          results
        });
      } catch (error) {
        console.error("Bulk delete error:", error);
        return res.status(500).json({ message: error.message });
      }
    }
  );
  app2.patch(
    "/api/admin/articles/bulk/featured",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }
        const { ids, featured } = req.body;
        console.log("Bulk feature request. Raw ids:", ids);
        console.log("Type of ids:", typeof ids);
        console.log("Is array?", Array.isArray(ids));
        console.log("Featured value:", featured, "type:", typeof featured);
        if (!Array.isArray(ids) || ids.length === 0) {
          return res.status(400).json({ message: "Invalid or empty article IDs" });
        }
        const numericIds = ids.map((id) => {
          console.log("Processing ID:", id, "type:", typeof id);
          const numId = typeof id === "string" ? parseInt(id) : Number(id);
          console.log("Converted to numeric:", numId, "isNaN?", isNaN(numId));
          return isNaN(numId) ? null : numId;
        }).filter((id) => id !== null);
        console.log("Processed IDs for featured update:", numericIds);
        if (numericIds.length === 0) {
          return res.status(400).json({ message: "Invalid 0 article IDs", data: numericIds });
        }
        if (typeof featured !== "boolean") {
          return res.status(400).json({ message: "Featured must be a boolean" });
        }
        return res.json({
          success: true,
          results: numericIds.map((id) => ({ id, success: true }))
        });
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
  app2.get(
    "/api/notifications",
    authenticateToken,
    async (req, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }
        const notifications2 = await storage.getUserNotifications(req.user.id);
        return res.json(notifications2);
      } catch (error) {
        console.error("Error getting notifications:", error);
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
  app2.patch(
    "/api/notifications/:id",
    authenticateToken,
    async (req, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          return res.status(400).json({ message: "Invalid notification ID" });
        }
        const notification = await storage.markNotificationAsRead(id);
        if (!notification) {
          return res.status(404).json({ message: "Notification not found" });
        }
        return res.json(notification);
      } catch (error) {
        console.error("Error marking notification as read:", error);
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
  app2.patch(
    "/api/notifications",
    authenticateToken,
    async (req, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }
        const success = await storage.markAllNotificationsAsRead(req.user.id);
        return res.json({ success });
      } catch (error) {
        console.error("Error marking all notifications as read:", error);
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
  app2.get("/api/articles/:id/comments", async (req, res) => {
    try {
      const articleId = parseInt(req.params.id);
      if (isNaN(articleId)) {
        return res.status(400).json({ message: "Invalid article ID" });
      }
      const comments2 = await storage.getArticleComments(articleId);
      return res.json(comments2);
    } catch (error) {
      console.error("Error getting article comments:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/comments/:id/replies", async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      if (isNaN(commentId)) {
        return res.status(400).json({ message: "Invalid comment ID" });
      }
      const replies = await storage.getCommentReplies(commentId);
      return res.json(replies);
    } catch (error) {
      console.error("Error getting comment replies:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  app2.post(
    "/api/articles/:id/comments",
    async (req, res) => {
      try {
        const articleId = parseInt(req.params.id);
        if (isNaN(articleId)) {
          return res.status(400).json({ message: "Invalid article ID" });
        }
        const article = await storage.getArticle(articleId);
        if (!article) {
          return res.status(404).json({ message: "Article not found" });
        }
        if (!article.published) {
          return res.status(403).json({ message: "Cannot comment on unpublished articles" });
        }
        const authHeader = req.headers.authorization;
        let authenticatedUser = null;
        if (authHeader) {
          const token = authHeader.split(" ")[1];
          try {
            const decoded = jwt2.verify(token, JWT_SECRET2);
            authenticatedUser = await storage.getUser(decoded.id);
          } catch (e) {
            console.log(
              "Invalid auth token for comment, continuing as anonymous"
            );
          }
        }
        let commentData = { ...req.body, articleId };
        if (authenticatedUser) {
          const roleLabel = authenticatedUser.role === UserRole.ADMIN ? "[Admin]" : authenticatedUser.role === UserRole.AUTHOR ? "[Author]" : "";
          commentData.authorName = `${roleLabel} ${authenticatedUser.name}`.trim();
          commentData.authorEmail = authenticatedUser.email;
        }
        const validatedData = insertCommentSchema.parse(commentData);
        const comment = await storage.createComment(validatedData);
        const isCommentByAuthor = authenticatedUser && authenticatedUser.id === article.authorId;
        if (article.authorId && !isCommentByAuthor) {
          try {
            const notificationTitle = validatedData.parentId ? "New Reply to Comment" : "New Comment on Article";
            const notificationMessage = validatedData.parentId ? `${validatedData.authorName} replied to a comment on your article "${article.title}"` : `${validatedData.authorName} commented on your article "${article.title}"`;
            await storage.createNotification({
              userId: article.authorId,
              type: "comment_received",
              title: notificationTitle,
              message: notificationMessage,
              articleId: article.id,
              commentId: comment.id,
              articleSlug: article.slug
              // Add slug for better navigation
            });
            console.log(
              `Created notification for author ID ${article.authorId} for new comment`
            );
          } catch (notificationError) {
            console.error(
              "Error creating comment notification:",
              notificationError
            );
          }
        } else if (isCommentByAuthor) {
          console.log(
            `Skipping notification since comment is by the article author (${authenticatedUser?.id})`
          );
        }
        return res.status(201).json(comment);
      } catch (error) {
        console.error("Error creating comment:", error);
        if (error instanceof z2.ZodError) {
          return res.status(400).json({
            message: "Validation error",
            errors: error.errors
          });
        }
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
  app2.patch(
    "/api/comments/:id",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
      try {
        const commentId = parseInt(req.params.id);
        if (isNaN(commentId)) {
          return res.status(400).json({ message: "Invalid comment ID" });
        }
        const comment = await storage.getComment(commentId);
        if (!comment) {
          return res.status(404).json({ message: "Comment not found" });
        }
        const validatedData = updateCommentSchema.parse(req.body);
        const updatedComment = await storage.updateComment(
          commentId,
          validatedData
        );
        if (!updatedComment) {
          return res.status(400).json({ message: "Failed to update comment" });
        }
        return res.json(updatedComment);
      } catch (error) {
        console.error("Error updating comment:", error);
        if (error instanceof z2.ZodError) {
          return res.status(400).json({
            message: "Validation error",
            errors: error.errors
          });
        }
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
  app2.delete(
    "/api/comments/:id",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
      try {
        const commentId = parseInt(req.params.id);
        if (isNaN(commentId)) {
          return res.status(400).json({ message: "Invalid comment ID" });
        }
        const comment = await storage.getComment(commentId);
        if (!comment) {
          return res.status(404).json({ message: "Comment not found" });
        }
        const success = await storage.deleteComment(commentId);
        if (!success) {
          return res.status(400).json({ message: "Failed to delete comment" });
        }
        return res.json({ message: "Comment deleted successfully" });
      } catch (error) {
        console.error("Error deleting comment:", error);
        return res.status(500).json({ message: "Server error" });
      }
    }
  );
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express2 from "express";
import fs2 from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path2 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path2.dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path2.resolve(__dirname, "client", "src"),
      "@shared": path2.resolve(__dirname, "shared"),
      "@assets": path2.resolve(__dirname, "attached_assets")
    }
  },
  root: path2.resolve(__dirname, "client"),
  build: {
    outDir: path2.resolve(__dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
import { fileURLToPath as fileURLToPath2 } from "url";
var viteLogger = createLogger();
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path3.dirname(__filename2);
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        __dirname2,
        "..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(__dirname2, "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/services/scheduler.ts
import cron from "node-cron";

// server/jobs/scheduledPublishing.ts
import { eq as eq3, and as and3, lte, isNotNull } from "drizzle-orm";
async function processScheduledArticles() {
  try {
    const now = getNowInIst();
    const nowIst = utcToIst(now);
    log(`now : ${now}, nowist : ${nowIst}`);
    log(`Checking for scheduled articles to publish at ${now.toISOString()} (${formatIstDate(now)})`, "scheduler");
    const allScheduledArticles = await db.select({
      id: articles.id,
      title: articles.title,
      status: articles.status,
      published: articles.published,
      scheduledPublishAt: articles.scheduledPublishAt
    }).from(articles).where(
      and3(
        eq3(articles.status, "published"),
        eq3(articles.published, "false"),
        isNotNull(articles.scheduledPublishAt)
      )
    );
    if (allScheduledArticles.length > 0) {
      log(`Debug: Found ${allScheduledArticles.length} articles with scheduledPublishAt dates:`, "scheduler");
      for (const article of allScheduledArticles) {
        const scheduleTime = article.scheduledPublishAt instanceof Date ? article.scheduledPublishAt.toISOString() : article.scheduledPublishAt;
        if (scheduleTime && !isNaN(new Date(scheduleTime).getTime())) {
          const scheduleTimeIst = formatIstDate(article.scheduledPublishAt);
          log(`- Article ID ${article.id}: "${article.title}" status=${article.status}, published=${article.published}
             UTC: ${scheduleTime}
             IST: ${scheduleTimeIst}`, "scheduler");
        } else {
          log(`- Article ID ${article.id}: "${article.title}" has an invalid scheduledPublishAt date`, "scheduler");
        }
      }
    } else {
      log(`Debug: No articles with scheduledPublishAt dates found`, "scheduler");
    }
    const scheduledArticles = await db.select().from(articles).where(
      and3(
        eq3(articles.status, ArticleStatus.PUBLISHED),
        eq3(articles.published, "false"),
        isNotNull(articles.scheduledPublishAt),
        lte(articles.scheduledPublishAt, now)
      )
    );
    if (scheduledArticles.length === 0) {
      log("No scheduled articles to publish", "scheduler");
      return { success: true, published: 0, message: "No scheduled articles to publish" };
    }
    log(`Found ${scheduledArticles.length} scheduled article(s) to publish at ${formatIstDate(now)}`, "scheduler");
    for (const article of scheduledArticles) {
      log(`update for Arcticle : ${article.publishedAt?.toISOString()}, ${article.id} , ${article.title}, ${article.published}, ${article.status}, ${article.scheduledPublishAt?.toISOString()}`);
      if (article.scheduledPublishAt && !isNaN(new Date(article.scheduledPublishAt).getTime())) {
        await db.update(articles).set({
          published: "true",
          publishedAt: now
          // Set the actual publish time
        }).where(eq3(articles.id, article.id));
        const scheduledTimeIst = formatIstDate(article.scheduledPublishAt);
        const publishTimeIst = formatIstDate(now);
        log(`Published scheduled article: ${article.title} (ID: ${article.id})
           Scheduled for: ${scheduledTimeIst}
           Published at: ${publishTimeIst}`, "scheduler");
      } else {
        log(`Article ID ${article.id} has an invalid scheduledPublishAt date, skipping publish`, "scheduler");
      }
    }
    return {
      success: true,
      published: scheduledArticles.length,
      message: `Published ${scheduledArticles.length} scheduled article(s)`
    };
  } catch (error) {
    console.error("Error processing scheduled articles:", error);
    return {
      success: false,
      published: 0,
      message: `Error processing scheduled articles: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// server/services/scheduler.ts
async function processWithRetry(retries, delay) {
  let attempt = 0;
  while (attempt < retries) {
    try {
      const result = await processScheduledArticles();
      if (result.published > 0) {
        log(`Published ${result.published} scheduled article(s)`, "scheduler");
      }
      return;
    } catch (error) {
      attempt++;
      log(`Error in attempt ${attempt}: ${error.message}`, "scheduler");
      if (attempt >= retries) {
        log("Max retries reached, job failed permanently", "scheduler");
      } else {
        log(`Retrying in ${delay / 1e3} seconds...`, "scheduler");
        await sleep(delay);
      }
    }
  }
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function startCronJobs() {
  const retries = 3;
  const delay = 3e3;
  processWithRetry(retries, delay).then(() => log("Initial run completed successfully", "scheduler")).catch((error) => log(`Initial run failed: ${error.message}`, "scheduler"));
  cron.schedule("* * * * *", async () => {
    await processWithRetry(retries, delay);
  });
}

// server/index.ts
var SchedulerService = class {
  isRunning = false;
  constructor() {
  }
  start() {
    if (this.isRunning) {
      log("Scheduler service is already running", "scheduler");
      return;
    }
    this.isRunning = true;
    log("Starting scheduler service", "scheduler");
    startCronJobs();
  }
  stop() {
  }
};
var app = express3();
app.use(express3.json());
app.use(express3.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5002;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
    const scheduler = new SchedulerService();
    scheduler.start();
  });
})();
