import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import {
  loginUserSchema,
  insertUserSchema,
  updateUserProfileSchema,
  updateArticleSchema,
  extendedArticleSchema,
  updateExtendedArticleSchema,
  insertCategorySchema,
  updateCategorySchema,
  insertTagSchema,
  UserRole,
  ArticleStatus,
  NotificationType,
  insertArticleSchema,
  searchAssetsSchema,
  updateAssetSchema,
  insertCommentSchema,
  updateCommentSchema,
  articles,
  users,
  comments,
  notifications,
} from "@shared/schema";
import { z } from "zod";
import { sql, eq, and, desc, inArray, gte } from "drizzle-orm";
import {
  authenticateToken,
  requireAdmin,
  requireAuthor,
  requireAuth,
  type AuthRequest,
} from "./middleware/auth";
import { istToUtc, utcToIst, formatIstDate, getNowInIst } from "@shared/utils/dateTime";

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "blog-platform-jwt-secret";



export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      // Validate request body
      const validatedData = insertUserSchema.parse(req.body);

      // Check if user with email already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(409).json({ message: "Email already registered" });
      }

      // Create user (password will be hashed in storage implementation)
      const newUser = await storage.createUser(validatedData);

      // Return user without password
      const { password, ...userWithoutPassword } = newUser;
      return res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors,
        });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      // Validate request body
      const validatedData = loginUserSchema.parse(req.body);

      // Find user by email
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(
        validatedData.password,
        user.password
      );
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      // Return user info and token
      const { password, ...userWithoutPassword } = user;
      return res.json({
        user: userWithoutPassword,
        token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors,
        });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });

  // User info route
  app.get("/api/auth/me", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return user without password
      const { password, ...userWithoutPassword } = user;
      return res.json(userWithoutPassword);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // User permissions API - dedicated endpoint for checking user permissions
  app.get(
    "/api/auth/permissions",
    authenticateToken,
    async (req: AuthRequest, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }

        const user = await storage.getUser(req.user.id);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Return only the permissions data, not the full user object
        const permissions = {
          canPublish: user.canPublish || user.role === "admin",
          isAdmin: user.role === "admin",
          role: user.role,
        };

        return res.status(200).json(permissions);
      } catch (error) {
        console.error("Error fetching user permissions:", error);
        return res
          .status(500)
          .json({ message: "Server error while retrieving permissions" });
      }
    }
  );

  // Admin routes
  app.get(
    "/api/admin/dashboard",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
      try {
      // Get real stats from database
      const [usersCount, articlesCount, commentsCount] = await Promise.all([
        db.select({ count: sql`count(*)` }).from(users),
        db.select({ count: sql`count(*)` }).from(articles),
        db.select({ count: sql`count(*)` }).from(comments),
      ]);

      // Calculate total page views by summing all article view counts
      const viewsResult = await db
        .select({ totalViews: sql`COALESCE(SUM(view_count), 0)` })
        .from(articles)
        .where(eq(articles.published, true));

      // Get posts this month
      const currentDate = new Date();
      const firstDayOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
      );

      // Calculate posts this month using raw SQL since we need date comparison
      const postsThisMonthQuery = `
          SELECT COUNT(*) as count
          FROM articles
          WHERE published = true
          AND published_at >= '${firstDayOfMonth.toISOString()}'
        `;

      const postsThisMonthResult = await db.execute(
        sql.raw(postsThisMonthQuery)
      );

      // Get popular categories
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
        sql.raw(categoryStatsQuery)
      );

      // Get post status counts
      const postsByStatusQuery = `
          SELECT status, COUNT(*) as count
          FROM articles
          GROUP BY status
          ORDER BY count DESC
        `;

      const postsByStatusResult = await db.execute(sql.raw(postsByStatusQuery));

      // Generate views over time (last 14 days)
      const viewsOverTime = [];

      for (let i = 13; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const formattedDate = date.toISOString().split("T")[0];

        // In a real implementation, we would query daily view data from a table
        // For now, calculate a realistic value based on total views
        const totalViewsValue = Number(viewsResult[0].totalViews) || 0;
        const baseViews = Math.floor(totalViewsValue / 20); // Base daily views
        const randomFactor = 0.5 + Math.random(); // Random factor between 0.5 and 1.5
        const dailyViews = Math.floor(baseViews * randomFactor);

        viewsOverTime.push({
          date: formattedDate,
          views: dailyViews,
        });
      }

      // Get recent activities from multiple sources
      // 1. Recent articles (created/published/updated)
      const recentArticles = await db
        .select({
          id: articles.id,
          title: articles.title,
          authorId: articles.authorId,
          status: articles.status,
          published: articles.published,
          createdAt: articles.createdAt,
          updatedAt: articles.updatedAt,
          publishedAt: articles.publishedAt,
          reviewedAt: articles.reviewedAt,
          reviewedBy: articles.reviewedBy,
        })
        .from(articles)
        .orderBy(desc(articles.updatedAt))
        .limit(5);

      // 2. Recent users (new registrations)
      const recentUsers = await db
        .select({
          id: users.id,
          name: users.name,
          role: users.role,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(3);

      // 3. Recent comments on articles
      const recentComments = await db
        .select({
          id: comments.id,
          content: comments.content,
          authorName: comments.authorName,
          authorEmail: comments.authorEmail,
          articleId: comments.articleId,
          parentId: comments.parentId,
          createdAt: comments.createdAt,
        })
        .from(comments)
        .orderBy(desc(comments.createdAt))
        .limit(5);

      // 4. Recent notifications (for additional activity context)
      const recentNotifications = await db
        .select({
          id: notifications.id,
          type: notifications.type,
          title: notifications.title,
          userId: notifications.userId,
          articleId: notifications.articleId,
          commentId: notifications.commentId,
          createdAt: notifications.createdAt,
        })
        .from(notifications)
        .orderBy(desc(notifications.createdAt))
        .limit(5);

      // Get article titles for comments to make activities more descriptive
      const articleIds = Array.from(
        new Set(recentComments.map((comment) => comment.articleId))
      );

      const articleTitles = await db
        .select({
          id: articles.id,
          title: articles.title,
          slug: articles.slug,
        })
        .from(articles)
        .where(inArray(articles.id, articleIds));

      const articleTitlesMap = Object.fromEntries(
        articleTitles.map((article) => [
          article.id,
          { title: article.title, slug: article.slug },
        ])
      );

      // Get user names for activities
      const userIds = [
        ...recentArticles.map((article) => article.authorId),
        ...recentArticles
          .filter((article) => article.reviewedBy !== null)
          .map((article) => article.reviewedBy),
      ].filter((id) => id !== null && id !== undefined);

      const usersData = await db
        .select({
          id: users.id,
          name: users.name,
        })
        .from(users)
        .where(inArray(users.id, userIds));

      const usersMap = Object.fromEntries(
        usersData.map((user) => [user.id, user.name])
      );

      // Format activities with enriched information
      const activityItems = [
        // Articles activities
        ...recentArticles.map((article) => {
          const authorName = usersMap[article.authorId] || "Unknown";
          let action = "";

          // Determine the most relevant action based on article state
          if (article.reviewedAt && article.reviewedBy) {
            const reviewerName =
              usersMap[article.reviewedBy] || "Administrator";
            action =
              article.status === "published"
                ? `${reviewerName} approved "${article.title}"`
                : `${reviewerName} reviewed "${article.title}"`;
          } else if (article.published && article.publishedAt) {
            action = `${authorName} published "${article.title}"`;
          } else if (article.status === "review") {
            action = `${authorName} submitted "${article.title}" for review`;
          } else {
            action = `${authorName} created "${article.title}"`;
          }

          return {
            id: `article-${article.id}-${article.status}`,
            action: action,
            user: article.reviewedBy
              ? usersMap[article.reviewedBy]
              : authorName,
            timestamp: (
              article.reviewedAt ||
              article.publishedAt ||
              article.updatedAt ||
              article.createdAt
            ).toISOString(),
          };
        }),

        // User registration activities
        ...recentUsers.map((user) => ({
          id: `user-${user.id}`,
          action: `New ${user.role} account registered`,
          user: user.name,
          timestamp: user.createdAt.toISOString(),
        })),

        // Comment activities
        ...recentComments.map((comment) => {
          const articleInfo = articleTitlesMap[comment.articleId] || {
            title: "Unknown article",
          };
          const isReply = comment.parentId !== null;
          return {
            id: `comment-${comment.id}`,
            action: isReply
              ? `${comment.authorName} replied to a comment on "${articleInfo.title}"`
              : `${comment.authorName} commented on "${articleInfo.title}"`,
            user: comment.authorName,
            timestamp: comment.createdAt.toISOString(),
          };
        }),
      ]
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        .slice(0, 10); // Get the 10 most recent activities

      return res.json({
        totalUsers: Number(usersCount[0].count),
        totalPosts: Number(articlesCount[0].count),
        totalViews: Number(viewsResult[0].totalViews) || 0,
        postsThisMonth: Number(postsThisMonthResult?.rows?.[0]?.count) || 0,
        popularCategories: popularCategoriesResult?.rows?.map((row) => ({
          name: String(row.name),
          count: Number(row.count),
        })),
        postsByStatus: postsByStatusResult?.rows?.map((row) => ({
          status: String(row.status),
          count: Number(row.count),
        })),
        viewsOverTime,
        recentActivity: activityItems,
      });
      
      } catch (error) {
        console.error("Error fetching admin dashboard data:", error);
        return res
          .status(500)
          .json({ message: "Error fetching dashboard data" });
      }
    }
  );

  // Author routes
  app.get(
    "/api/author/dashboard",
    authenticateToken,
    requireAuthor,
    async (req: AuthRequest, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }

        // Get articles by author
        const articles = await storage.getArticlesByAuthor(req.user.id);

        // Calculate stats
        const published = articles.filter((a) => a.published).length;
        const drafts = articles.filter((a) => !a.published).length;

        // Calculate actual total views from author's published articles
        // Instead of direct DB query, use filtered articles and sum their view counts
        const publishedArticles = articles.filter(
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
            totalViews,
          },
          articles,
        });
      } catch (error) {
        console.error("Error in author dashboard:", error);
        return res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Author profile
  app.get(
    "/api/author/profile",
    authenticateToken,
    requireAuthor,
    async (req: AuthRequest, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }

        const user = await storage.getUser(req.user.id);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Return user without password
        const { password, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Admin profile
  app.get(
    "/api/admin/profile",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }

        const user = await storage.getUser(req.user.id);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Return user without password
        const { password, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      } catch (error) {
        console.error("Error fetching admin profile:", error);
        return res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Update author profile
  app.patch(
    "/api/author/profile",
    authenticateToken,
    requireAuthor,
    async (req: AuthRequest, res) => {
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

        // Return user without password
        const { password, ...userWithoutPassword } = updatedUser;
        return res.json(userWithoutPassword);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            message: "Validation error",
            errors: error.errors,
          });
        }
        return res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Update admin profile
  app.patch(
    "/api/admin/profile",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
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

        // Return user without password
        const { password, ...userWithoutPassword } = updatedUser;
        return res.json(userWithoutPassword);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            message: "Validation error",
            errors: error.errors,
          });
        }
        console.error("Error updating admin profile:", error);
        return res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Get author's articles by status
  app.get(
    "/api/author/articles/:status",
    authenticateToken,
    requireAuthor,
    async (req: AuthRequest, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }

        const { status } = req.params;

        // Validate status
        if (!Object.values(ArticleStatus).includes(status as any)) {
          return res.status(400).json({ message: "Invalid status parameter" });
        }

        const articles = await storage.getArticlesByStatus(
          req.user.id,
          status as any
        );

        return res.json(articles);
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Get all author's articles
  app.get(
    "/api/author/articles",
    authenticateToken,
    requireAuthor,
    async (req: AuthRequest, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }

        const articles = await storage.getArticlesByAuthor(req.user.id);
        return res.json(articles);
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Create article
  app.post(
    "/api/articles",
    authenticateToken,
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }

        // Check if extended data is present (categories, tags, etc.)
        if (
          req.body.categoryIds ||
          req.body.tags ||
          req.body.coAuthorIds ||
          req.body.keywords ||
          req.body.metaTitle ||
          req.body.metaDescription
        ) {
          // Handle custom tags - create new tags if needed
          let tagIds: number[] = [];
          if (req.body.tags && Array.isArray(req.body.tags)) {
            // For each tag in the array, either find existing or create new
            const tagPromises = req.body.tags.map(async (tagName: string) => {
              // Try to find existing tag by name
              let tag = await storage.getTagBySlug(
                tagName.toLowerCase().replace(/\s+/g, "-")
              );

              // If tag doesn't exist, create it
              if (!tag) {
                tag = await storage.createTag({
                  name: tagName,
                  slug: tagName.toLowerCase().replace(/\s+/g, "-"),
                });
              }

              return tag.id;
            });

            // Wait for all tag creation/fetching to complete
            tagIds = await Promise.all(tagPromises);
          }

          // Use extended schema and create method
          const validatedData = extendedArticleSchema.parse({
            ...req.body,
            authorId: req.user.id,
            tagIds, // Replace tags array with tag IDs
          });

          // Remove tags property which isn't in the schema
          delete (validatedData as any).tags;

          const article = await storage.createExtendedArticle(validatedData);
          return res.status(201).json(article);
        } else {
          // Use regular schema if no extended data
          const validatedData = insertArticleSchema.parse({
            ...req.body,
            authorId: req.user.id,
          });

          const article = await storage.createArticle(validatedData);
          return res.status(201).json(article);
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            message: "Validation error",
            errors: error.errors,
          });
        }
        return res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Update article
  app.patch(
    "/api/articles/:id",
    authenticateToken,
    requireAuth,
    async (req: AuthRequest, res) => {
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

        // Special case for keywords field to ensure it's an array
        if (req.body.keywords === null || req.body.keywords === undefined) {
          req.body.keywords = [];
        } else if (!Array.isArray(req.body.keywords)) {
          try {
            // Try to parse if it's a JSON string
            if (typeof req.body.keywords === "string") {
              req.body.keywords = JSON.parse(req.body.keywords);
            }
            // If parsing fails or it's still not an array, make it an empty array
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

        // Check if article exists and belongs to the author
        const article = await storage.getArticle(articleId);

        if (!article) {
          return res.status(404).json({ message: "Article not found" });
        }

        if (
          article.authorId !== req.user.id &&
          req.user.role !== UserRole.ADMIN
        ) {
          return res.status(403).json({
            message: "You don't have permission to update this article",
          });
        }

        // Check if extended data is present (categories, tags, etc.)
        if (
          req.body.categoryIds ||
          req.body.tags ||
          req.body.tagIds ||
          req.body.coAuthorIds ||
          req.body.keywords ||
          req.body.metaTitle ||
          req.body.metaDescription
        ) {
          // Handle custom tags - create new tags if needed
          if (req.body.tags && Array.isArray(req.body.tags)) {
            // For each tag in the array, either find existing or create new
            const tagPromises = req.body.tags.map(async (tagName: string) => {
              // Try to find existing tag by name
              let tag = await storage.getTagBySlug(
                tagName.toLowerCase().replace(/\s+/g, "-")
              );

              // If tag doesn't exist, create it
              if (!tag) {
                tag = await storage.createTag({
                  name: tagName,
                  slug: tagName.toLowerCase().replace(/\s+/g, "-"),
                });
              }

              return tag.id;
            });

            // Wait for all tag creation/fetching to complete
            req.body.tagIds = await Promise.all(tagPromises);

            // Remove tags property which isn't in the schema
            delete req.body.tags;
          }

          // Use extended schema and update method
          const validatedData = updateExtendedArticleSchema.parse(req.body);
          const updatedArticle = await storage.updateExtendedArticle(
            articleId,
            validatedData
          );
          return res.json(updatedArticle);
        } else {
          // Use regular schema if no extended data
          const validatedData = updateArticleSchema.parse(req.body);
          const updatedArticle = await storage.updateArticle(
            articleId,
            validatedData
          );
          return res.json(updatedArticle);
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            message: "Validation error",
            errors: error.errors,
          });
        }

        console.error(`Error updating article ${articleId}:`, error);
        console.log("erooor here");
        console.error("Error updating article:", error);
        return res.status(500).json({
          message: "Server error",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  // Update article status
  app.patch(
    "/api/articles/:id/status",
    authenticateToken,
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }

        const articleId = parseInt(req.params.id);
        if (isNaN(articleId)) {
          return res.status(400).json({ message: "Invalid article ID" });
        }

        const { status } = req.body;

        // Validate status
        if (!Object.values(ArticleStatus).includes(status)) {
          return res.status(400).json({ message: "Invalid status" });
        }

        // Check if article exists and belongs to the author
        const article = await storage.getArticle(articleId);

        if (!article) {
          return res.status(404).json({ message: "Article not found" });
        }

        if (
          article.authorId !== req.user.id &&
          req.user.role !== UserRole.ADMIN
        ) {
          return res.status(403).json({
            message: "You don't have permission to update this article",
          });
        }

        const updatedArticle = await storage.updateArticleStatus(
          articleId,
          status
        );

        return res.json(updatedArticle);
      } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server error",error });
      }
    }
  );

  // Admin route for article status update with remarks
  app.patch(
    "/api/admin/articles/:id/status",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
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
          scheduledPublishAt,
        });

        // Validate status
        if (!Object.values(ArticleStatus).includes(status)) {
          return res.status(400).json({ message: "Invalid status" });
        }

        // Check if article exists
        const article = await storage.getArticle(articleId);

        if (!article) {
          return res.status(404).json({ message: "Article not found" });
        }

        // Prepare update data with status and review information
        const updateData: any = {
          status,
          reviewRemarks: remarks || null,
          reviewedBy: req.user.id,
          reviewedAt: getNowInIst()
        };

        // If scheduledPublishAt is provided, add it to the update data
        if (scheduledPublishAt) {
          const scheduleDate = new Date(scheduledPublishAt);

          if (isNaN(scheduleDate.getTime())) {
            console.error("Failed to parse scheduledPublishAt date:", scheduledPublishAt);
            return res.status(400).json({ message: "Invalid scheduled publish date format" });
          }
          
          // Convert IST time input to UTC for storage
          const scheduleDateUTC = istToUtc(scheduleDate);
          console.log("Setting scheduled publish date:", scheduledPublishAt);
          console.log(
            `Converted from IST to UTC: ${scheduleDate?.toISOString()} ->
            ${scheduleDateUTC?.toISOString() }`
          );

          if (scheduleDate) {
            updateData.scheduledPublishAt = scheduleDate.toISOString();

            // When scheduling a post, we want status=published but published=false
            // The scheduler will set published=true when the time comes
            if (status === ArticleStatus.PUBLISHED) {
              updateData.published = "false";
            }
          } else {
            // Log error if conversion failed
            console.error(
              "Failed to convert IST date to UTC:",
              scheduledPublishAt
            );
            return res
              .status(400)
              .json({ message: "Invalid scheduled publish date format" });
          }
        } else if (status === ArticleStatus.PUBLISHED) {
          // If no schedule is set but status is published, ensure it's published immediately
          updateData.published = "true";
          updateData.publishedAt = getNowInIst();
        }

        console.log("Updating article with data:", updateData);
        const updatedArticle = await storage.updateArticle(
          articleId,
          updateData
        );

        // Create a notification for the author
        if (status === ArticleStatus.PUBLISHED) {
          try {
            let scheduleTimeDisplay = "";

            if (scheduledPublishAt) {
              // Format the IST time for display
              scheduleTimeDisplay = formatIstDate(scheduledPublishAt);
            }

            const notificationMessage = scheduledPublishAt
              ? `Your article "${article.title}" has been approved and scheduled to publish on ${scheduleTimeDisplay}.`
              : `Your article "${article.title}" has been approved and published.`;

            await storage.createNotification({
              userId: article.authorId,
              type: NotificationType.ARTICLE_APPROVED,
              title: scheduledPublishAt
                ? "Article Scheduled"
                : "Article Approved",
              message: notificationMessage,
              articleId: article.id,
              read: false,
            });
          } catch (notificationError) {
            console.error("Error creating notification:", notificationError);
            // Continue execution even if notification creation fails
          }
        } else if (
          status === ArticleStatus.DRAFT &&
          article.status === ArticleStatus.REVIEW
        ) {
          try {
            await storage.createNotification({
              userId: article.authorId,
              type: NotificationType.ARTICLE_REJECTED,
              title: "Article Needs Revision",
              message: `Your article "${article.title}" requires revisions before it can be published.`,
              articleId: article.id,
              read: false,
            });
          } catch (notificationError) {
            console.error("Error creating notification:", notificationError);
            // Continue execution even if notification creation fails
          }
        }

        return res.json(updatedArticle);
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Get article with relations
  // Public endpoints for the blog interface
  app.get("/api/articles/published", async (req, res) => {
    try {
      const articles = await storage.getPublishedArticles();

      // For each article, fetch the author, co-authors, categories, and tags
      const articlesWithRelations = await Promise.all(
        articles.map(async (article) => {
          try {
            const author = article.authorId
              ? await storage.getUser(article.authorId)
              : null;
            const categories = await storage.getArticleCategories(article.id);
            const tags = await storage.getArticleTags(article.id);
            const coAuthors = await storage.getArticleCoAuthors(article.id);

            // Format co-authors to only include necessary info
            const formattedCoAuthors = coAuthors.map((coAuthor) => ({
              id: coAuthor.id,
              name: coAuthor.name,
              avatarUrl: coAuthor.avatarUrl,
            }));

            return {
              ...article,
              author: author
                ? {
                    id: author.id,
                    name: author.name,
                    avatarUrl: author.avatarUrl,
                  }
                : null,
              categories,
              tags,
              coAuthors: formattedCoAuthors,
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

  // Public endpoint for a single article with all its relations
  app.get("/api/articles/:identifier/public", async (req, res) => {
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

      // Only published articles should be accessible to public
      if (article.status !== ArticleStatus.PUBLISHED) {
        return res.status(404).json({ message: "Article not found" });
      }

      // Increment view count asynchronously with proper logging
      let currentViewCount = article.viewCount || 0;
      let newViewCount = currentViewCount + 1;

      try {
        // Record the view in logs with timestamp and article info
        console.log(`Updating article ${article.id} with data:`, {
          viewCount: newViewCount,
        });

        // Update the article view count in the database
        storage
          .updateArticle(article.id, { viewCount: newViewCount })
          .catch((err) => {
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
        // Don't fail the request if view counting fails
      }

      // Get full article with relations
      const fullArticle = await storage.getArticleWithRelations(article.id);
      if (!fullArticle) {
        return res.status(404).json({ message: "Article not found" });
      }

      // Update the view count in the response
      fullArticle.article.viewCount = newViewCount;

      // Get author info with limited fields
      const author = fullArticle.article.authorId
        ? await storage.getUser(fullArticle.article.authorId)
        : null;

      // Return article with author info but limited fields for security
      return res.json({
        ...fullArticle,
        article: {
          ...fullArticle.article,
          author: author
            ? {
                id: author.id,
                name: author.name,
                avatarUrl: author.avatarUrl,
                bio: author.bio,
              }
            : null,
        },
      });
    } catch (error) {
      console.error("Error fetching article:", error);
      res.status(500).json({ message: "Failed to fetch article" });
    }
  });

  // Preview endpoint for articles - requires authentication and permission check
  app.get(
    "/api/articles/:id/preview",
    authenticateToken,
    async (req: AuthRequest, res) => {
      try {
        const articleId = parseInt(req.params.id);
        if (isNaN(articleId)) {
          return res.status(400).json({ message: "Invalid article ID" });
        }

        if (!req.user) {
          return res.status(401).json({ message: "Authentication required" });
        }

        // Get article and relations
        const fullArticle = await storage.getArticleWithRelations(articleId);
        if (!fullArticle) {
          return res.status(404).json({ message: "Article not found" });
        }

        const article = fullArticle.article;
        const userId = req.user.id;
        const userRole = req.user.role;

        // Permission check:
        // 1. User is an admin, or
        // 2. User is the author, or
        // 3. User is a co-author
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
          isCoAuthor,
        });

        if (!isAdmin && !isAuthor && !isCoAuthor) {
          return res.status(403).json({
            message: "You don't have permission to preview this article",
          });
        }

        // Get full author info
        const author = await storage.getUser(article.authorId);

        // Return article with full details for preview
        return res.json({
          ...fullArticle,
          article: {
            ...article,
            author: author
              ? {
                  id: author.id,
                  name: author.name,
                  avatarUrl: author.avatarUrl,
                  bio: author.bio,
                }
              : null,
          },
        });
      } catch (error) {
        console.error("Error fetching article preview:", error);
        res.status(500).json({ message: "Failed to fetch article preview" });
      }
    }
  );

  // Public endpoint for author profile and published articles
  app.get("/api/authors/:id/public", async (req, res) => {
    try {
      const authorId = parseInt(req.params.id);
      if (isNaN(authorId)) {
        return res.status(400).json({ message: "Invalid author ID" });
      }

      // Get author info
      const author = await storage.getUser(authorId);
      if (!author) {
        return res.status(404).json({ message: "Author not found" });
      }

      // Get author's own published articles
      const ownArticles = await storage.searchArticles({
        authorId,
        published: true,
        status: ArticleStatus.PUBLISHED,
        page: 1,
        limit: 10,
      });

      // Get articles where author is a co-author
      const coAuthoredArticles = await storage.getCoAuthoredArticles(
        authorId,
        ArticleStatus.PUBLISHED
      );

      // Combine all articles
      const allArticles = [...ownArticles.articles, ...coAuthoredArticles];

      // Return author info but limited fields for security
      const { password, email, ...authorPublicInfo } = author;

      return res.json({
        author: authorPublicInfo,
        articles: {
          own: ownArticles.articles,
          coAuthored: coAuthoredArticles,
          all: allArticles,
        },
        totalArticles: ownArticles.total + coAuthoredArticles.length,
      });
    } catch (error) {
      console.error("Error fetching author profile:", error);
      res.status(500).json({ message: "Failed to fetch author profile" });
    }
  });

  app.get(
    "/api/articles/:id/full",
    authenticateToken,
    requireAuth,
    async (req: AuthRequest, res) => {
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

        // Check if user has access to this article
        // If article is not published, only author, co-authors or admin can see it
        const { article } = articleWithRelations;
        if (
          !article.published &&
          article.authorId !== req.user.id &&
          req.user.role !== UserRole.ADMIN &&
          !articleWithRelations.coAuthors.some(
            (author) => author.id === req.user.id
          )
        ) {
          return res.status(403).json({
            message: "You don't have permission to access this article",
          });
        }

        return res.json(articleWithRelations);
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Delete article
  app.delete(
    "/api/articles/:id",
    authenticateToken,
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }

        const articleId = parseInt(req.params.id);
        if (isNaN(articleId)) {
          return res.status(400).json({ message: "Invalid article ID" });
        }

        // Check if article exists and belongs to the author
        const article = await storage.getArticle(articleId);

        if (!article) {
          return res.status(404).json({ message: "Article not found" });
        }

        if (
          article.authorId !== req.user.id &&
          req.user.role !== UserRole.ADMIN
        ) {
          return res.status(403).json({
            message: "You don't have permission to delete this article",
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

  // Configure multer for file uploads
  const uploadsFolder = path.join(process.cwd(), "uploads");

  // Ensure uploads directory exists
  if (!fs.existsSync(uploadsFolder)) {
    fs.mkdirSync(uploadsFolder, { recursive: true });
  }

  // Configure storage
  const storage_config = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsFolder);
    },
    filename: (req, file, cb) => {
      // Generate a unique filename with original extension
      const fileExt = path.extname(file.originalname);
      const fileName = `${randomUUID()}${fileExt}`;
      cb(null, fileName);
    },
  });

  // File filter function
  const fileFilter = (
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    // Accept images and common document types
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
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error("Invalid file type. Only images and documents are allowed.")
      );
    }
  };

  // Initialize multer upload
  const upload = multer({
    storage: storage_config,
    fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max size
    },
  });

  // Asset routes

  // Get assets by user
  app.get(
    "/api/assets",
    authenticateToken,
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }

        const assets = await storage.getAssetsByUser(req.user.id);
        return res.json(assets);
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Search assets
  app.get(
    "/api/assets/search",
    authenticateToken,
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }

        // Parse query parameters
        const searchParams = searchAssetsSchema.parse({
          query: req.query.query as string | undefined,
          tags: req.query.tags
            ? (req.query.tags as string).split(",")
            : undefined,
          mimetype: req.query.mimetype as string | undefined,
          page: req.query.page ? parseInt(req.query.page as string) : 1,
          limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        });

        const result = await storage.searchAssets(searchParams, req.user.id);
        return res.json(result);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            message: "Validation error",
            errors: error.errors,
          });
        }
        return res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Get asset by ID
  app.get(
    "/api/assets/:id",
    authenticateToken,
    requireAuth,
    async (req: AuthRequest, res) => {
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

        // Check if user owns the asset or is admin
        if (asset.userId !== req.user.id && req.user.role !== UserRole.ADMIN) {
          return res.status(403).json({
            message: "You don't have permission to access this asset",
          });
        }

        return res.json(asset);
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Upload asset
  app.post(
    "/api/assets",
    authenticateToken,
    requireAuth,
    upload.single("file"),
    async (req: AuthRequest, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }

        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        // Create asset record in database
        const assetData = {
          filename: req.file.filename,
          originalName: req.file.originalname,
          path: req.file.path,
          url: `/uploads/${req.file.filename}`, // URL path to access the file
          mimetype: req.file.mimetype,
          size: req.file.size,
          userId: req.user.id,
          title: req.body.title || req.file.originalname,
          description: req.body.description || "",
          tags: req.body.tags ? JSON.parse(req.body.tags) : [],
        };

        const asset = await storage.createAsset(assetData);
        return res.status(201).json(asset);
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Update asset metadata
  app.patch(
    "/api/assets/:id",
    authenticateToken,
    requireAuth,
    async (req: AuthRequest, res) => {
      //try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }

        const assetId = parseInt(req.params.id);
        if (isNaN(assetId)) {
          return res.status(400).json({ message: "Invalid asset ID" });
        }

        // Check if asset exists and belongs to the user
        const asset = await storage.getAsset(assetId);

        if (!asset) {
          return res.status(404).json({ message: "Asset not found" });
        }

        if (asset.userId !== req.user.id && req.user.role !== UserRole.ADMIN) {
          return res.status(403).json({
            message: "You don't have permission to update this asset",
          });
        }

        const validatedData = updateAssetSchema.parse(req.body);
        const updatedAsset = await storage.updateAsset(assetId, validatedData);

        return res.json(updatedAsset);
      // } catch (error) {
      //   if (error instanceof z.ZodError) {
      //     return res.status(400).json({
      //       message: "Validation error",
      //       errors: error.errors,
      //     });
      //   }
      //   return res.status(500).json({ message: "Server error" });
      // }
    }
  );

  // Category routes
  // Get all categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      return res.json(categories);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Create category (admin only)
  app.post(
    "/api/categories",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const validatedData = insertCategorySchema.parse(req.body);
        const category = await storage.createCategory(validatedData);
        return res.status(201).json(category);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            message: "Validation error",
            errors: error.errors,
          });
        }
        return res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Update category (admin only)
  app.patch(
    "/api/categories/:id",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
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
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            message: "Validation error",
            errors: error.errors,
          });
        }
        return res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Delete category (admin only)
  app.delete(
    "/api/categories/:id",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const categoryId = parseInt(req.params.id);
        if (isNaN(categoryId)) {
          return res.status(400).json({ message: "Invalid category ID" });
        }

        const success = await storage.deleteCategory(categoryId);

        if (!success) {
          return res
            .status(404)
            .json({ message: "Category not found or could not be deleted" });
        }

        return res.status(204).send();
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Tag routes
  // Get all tags
  app.get("/api/tags", async (req, res) => {
    try {
      const tags = await storage.getAllTags();
      return res.json(tags);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Create tag (admin only)
  app.post(
    "/api/tags",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const validatedData = insertTagSchema.parse(req.body);
        const tag = await storage.createTag(validatedData);
        return res.status(201).json(tag);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            message: "Validation error",
            errors: error.errors,
          });
        }
        return res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Delete tag (admin only)
  app.delete(
    "/api/tags/:id",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const tagId = parseInt(req.params.id);
        if (isNaN(tagId)) {
          return res.status(400).json({ message: "Invalid tag ID" });
        }

        const success = await storage.deleteTag(tagId);

        if (!success) {
          return res
            .status(404)
            .json({ message: "Tag not found or could not be deleted" });
        }

        return res.status(204).send();
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );

  // User routes for author selection
  // Get all authors
  app.get(
    "/api/users/authors",
    authenticateToken,
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const users = await storage.getUsers(UserRole.AUTHOR);

        // Return users without their password
        const usersWithoutPassword = users.map((user) => {
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        });

        return res.json(usersWithoutPassword);
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Delete asset
  app.delete(
    "/api/assets/:id",
    authenticateToken,
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }

        const assetId = parseInt(req.params.id);
        if (isNaN(assetId)) {
          return res.status(400).json({ message: "Invalid asset ID" });
        }

        // Check if asset exists and belongs to the user
        const asset = await storage.getAsset(assetId);

        if (!asset) {
          return res.status(404).json({ message: "Asset not found" });
        }

        if (asset.userId !== req.user.id && req.user.role !== UserRole.ADMIN) {
          return res.status(403).json({
            message: "You don't have permission to delete this asset",
          });
        }

        // Delete file from disk
        const filePath = asset.path;
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }

        // Delete from database
        await storage.deleteAsset(assetId);

        return res.status(200).json({ message: "Asset deleted successfully" });
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Serve static files from uploads directory
  app.use("/uploads", express.static(uploadsFolder));

  // Admin routes
  // Admin profile
  app.get(
    "/api/admin/profile",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }

        const user = await storage.getUser(req.user.id);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Return user without password
        const { password, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Update admin profile
  app.patch(
    "/api/admin/profile",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
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

        // Return updated user without password
        const { password, ...userWithoutPassword } = updatedUser;
        return res.json(userWithoutPassword);
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Dashboard stats
  // app.get(
  //   "/api/admin/dashboard",
  //   authenticateToken,
  //   requireAdmin,
  //   async (req: AuthRequest, res) => {
  //     try {
  //       if (!req.user?.id) {
  //         return res.status(401).json({ message: "Authentication required" });
  //       }

  //       // Get user count
  //       const users = await storage.getUsers();
  //       const totalUsers = users.length;

  //       // Get post count
  //       const articles = await storage.getPublishedArticles();
  //       const totalPosts = articles.length;

  //       // Sample data for dashboard - in a real app, these would be calculated from the database
  //       const dashboardData = {
  //         totalUsers,
  //         totalPosts,
  //         totalViews: 1245, // Sample data
  //         postsThisMonth: 12, // Sample data
  //         popularCategories: [
  //           { name: "Technology", count: 8 },
  //           { name: "Business", count: 6 },
  //           { name: "Design", count: 4 },
  //           { name: "Marketing", count: 3 },
  //         ],
  //         recentActivity: [
  //           {
  //             id: 1,
  //             action: "Published new article",
  //             user: "Sarah Johnson",
  //             timestamp: new Date().toISOString(),
  //           },
  //           {
  //             id: 2,
  //             action: "Updated profile",
  //             user: "John Smith",
  //             timestamp: new Date(Date.now() - 3600000).toISOString(),
  //           },
  //           {
  //             id: 3,
  //             action: "Created new category",
  //             user: "Admin User",
  //             timestamp: new Date(Date.now() - 86400000).toISOString(),
  //           },
  //         ],
  //         postsByStatus: [
  //           { status: "Published", count: 15 },
  //           { status: "Draft", count: 8 },
  //           { status: "Review", count: 3 },
  //         ],
  //         viewsOverTime: Array.from({ length: 14 }, (_, i) => {
  //           const date = new Date();
  //           date.setDate(date.getDate() - (13 - i));
  //           return {
  //             date: date.toISOString().split("T")[0],
  //             views: Math.floor(Math.random() * 100) + 50,
  //           };
  //         }),
  //       };

  //       return res.json(dashboardData);
  //     } catch (error) {
  //       return res.status(500).json({ message: "Server error" });
  //     }
  //   },
  // );

  // Get all authors with extended info
  app.get(
    "/api/admin/authors",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }

        // Get all authors
        const users = await storage.getUsers(UserRole.AUTHOR);

        // Add extended info with actual data
        const authorsWithExtendedInfo = await Promise.all(
          users.map(async (user) => {
            // Get actual article count for this author
            const authorArticles = await storage.getArticlesByAuthor(user.id);

            return {
              ...user,
              postCount: authorArticles.length, // Actual article count from database
              activeStatus: true, // We'll keep this as true for now, could be replaced with a real status field later
            };
          })
        );

        return res.json(authorsWithExtendedInfo);
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Create a new author
  app.post(
    "/api/admin/authors",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }

        const { name, email, password, bio, canPublish, avatarUrl } = req.body;
        console.error(avatarUrl);
        // Basic validation
        if (!name || !email || !password) {
          return res
            .status(400)
            .json({ message: "Name, email and password are required" });
        }

        // Check if email already exists
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
          return res
            .status(400)
            .json({ message: "A user with this email already exists" });
        }

        // Create the new author
        const newAuthor = await storage.createUser({
          name,
          email,
          password,
          role: UserRole.AUTHOR,
          bio: bio || null,
          canPublish: canPublish || false,
          avatarUrl: avatarUrl || null,
        });

        // Remove password from response
        const { password: _, ...authorWithoutPassword } = newAuthor;

        return res.status(201).json(authorWithoutPassword);
      } catch (error) {
        console.error("Error creating author:", error);
        return res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Update author status (active/inactive)
  app.patch(
    "/api/admin/authors/:id/status",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
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
          return res
            .status(400)
            .json({ message: "Active status must be a boolean" });
        }

        // For now just return success - in a real app this would update a status field in the database
        return res.json({ success: true, id: authorId, active });
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Update author permissions
  app.patch(
    "/api/admin/authors/:id/permissions",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
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
          return res
            .status(400)
            .json({ message: "Publishing rights must be a boolean" });
        }

        // Update user publishing rights
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

  // Get all blog posts with extended info
  app.get(
    "/api/admin/articles",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }

        // Get status filter from query params
        const statusFilter = req.query.status as string | undefined;

        // Build filters
        const filters: any = {};
        if (statusFilter) {
          filters.status = statusFilter;
        }

        // Get articles
        const articles = await storage.searchArticles(filters);

        // Prepare extended article info
        const extendedArticles = await Promise.all(
          articles.articles.map(async (article) => {
            // Get author info
            const author = await storage.getUser(article.authorId);

            // Get categories
            const categories = await storage.getArticleCategories(article.id);

            return {
              ...article,
              author: author?.name || "Unknown Author",
              categories: categories.map((cat) => cat.name),
            };
          })
        );

        return res.json(extendedArticles);
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Bulk update article status
  app.patch(
    "/api/admin/articles/bulk/status/update",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
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

        // Detailed inspection of the IDs array
        if (ids === undefined) {
          console.error("Missing 'ids' in request body");
          return res.status(400).json({
            message: "Article IDs are required",
            received: req.body,
          });
        }

        if (!status) {
          console.error("Missing 'status' in request body");
          return res.status(400).json({
            message: "Status is required",
            received: req.body,
          });
        }

        // Log complete details of what we received
        console.log("Detailed IDs inspection:", {
          status,
          scheduledPublishAt,
          idsValue: ids,
          idsType: typeof ids,
          isArray: Array.isArray(ids),
          idsLength: Array.isArray(ids) ? ids.length : "N/A",
          idsDetails: Array.isArray(ids)
            ? ids.map((id) => ({
                value: id,
                type: typeof id,
                valueAsString: String(id),
                isValid: !isNaN(Number(id)),
              }))
            : "not an array",
        });

        // Ensure IDs is actually an array
        if (!Array.isArray(ids)) {
          console.error("IDs is not an array:", ids);
          return res.status(400).json({
            message: "Article IDs must be an array",
            received: typeof ids,
          });
        }

        if (ids.length === 0) {
          console.error("Empty IDs array");
          return res.status(400).json({ message: "Empty article IDs array" });
        }

        console.log("ids : ", ids);
        // Make sure all IDs are valid numbers
        const numericIds = ids
          .map((id) => {
            console.log(`Processing ID '${id}' (type: ${typeof id})`);
            // Handle different potential formats
            let numId: number;
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
          })
          .filter((id) => id !== null) as number[];

        console.log("Final processed IDs for update:", numericIds);

        if (numericIds.length === 0) {
          console.error("No valid IDs found after processing");
          return res.status(400).json({
            message: "No valid article IDs found",
            originalIds: ids,
            validationDetails: Array.isArray(ids)
              ? ids.map((id) => ({
                  original: id,
                  asNumber: Number(id),
                  isValid: !isNaN(Number(id)) && Number(id) > 0,
                }))
              : "not an array",
          });
        }

        if (!Object.values(ArticleStatus).includes(status)) {
          return res.status(400).json({ message: "Invalid status" });
        }

        // Update each article's status and send notifications
        const results = await Promise.all(
          numericIds.map(async (id) => {
            // try {
              // First get the article to know who the author is and current status
              const article = await storage.getArticle(id);
              if (!article) {
                console.error(`Article with ID ${id} not found`);
                return { id, success: false, error: "Article not found" };
              }

              // Prepare update data with status
              let updatedArticle;

              if (scheduledPublishAt && status === ArticleStatus.PUBLISHED) {
                // Convert IST time input to UTC for storage
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
                  // Use updateArticle for scheduled publishing
                  updatedArticle = await storage.updateArticle(id, {
                    status,
                    scheduledPublishAt: scheduleDate.toISOString(),
                    published: false, // Will be set to true by the scheduler
                    reviewedBy: req.user.id,
                    reviewedAt: new Date().toISOString(),
                  });
                } else {
                  console.error(
                    "Failed to convert IST date to UTC:",
                    scheduledPublishAt
                  );
                  return {
                    id,
                    success: false,
                    error: "Invalid scheduled publish date format",
                  };
                }
              } else {
                // Regular status update (immediate publishing or other statuses)
                updatedArticle = await storage.updateArticleStatus(id, status);
              }

              // Create notifications based on status change
              if (updatedArticle) {
                if (status === ArticleStatus.PUBLISHED) {
                  // try {
                    let scheduleTimeDisplay = "";

                    if (scheduledPublishAt) {
                      // Format the IST time for display
                      scheduleTimeDisplay = formatIstDate(scheduledPublishAt);
                    }

                    const notificationMessage = scheduledPublishAt
                      ? `Your article "${article.title}" has been approved and scheduled to publish on ${scheduleTimeDisplay}.`
                      : `Your article "${article.title}" has been approved and published.`;

                    await storage.createNotification({
                      userId: article.authorId,
                      type: NotificationType.ARTICLE_APPROVED,
                      title: scheduledPublishAt
                        ? "Article Scheduled"
                        : "Article Approved",
                      message: notificationMessage,
                      articleId: article.id,
                      read: false,
                    });
                  // } catch (notificationError) {
                  //   console.error(
                  //     "Error creating notification:",
                  //     notificationError
                  //   );
                  //   // Continue execution even if notification creation fails
                  // }
                } else if (
                  status === ArticleStatus.DRAFT &&
                  article.status === ArticleStatus.REVIEW
                ) {
                  // try {
                    await storage.createNotification({
                      userId: article.authorId,
                      type: NotificationType.ARTICLE_REJECTED,
                      title: "Article Needs Revision",
                      message: `Your article "${article.title}" requires revisions before it can be published.`,
                      articleId: article.id,
                      read: false,
                    });
                  // } catch (notificationError) {
                  //   console.error(
                  //     "Error creating notification:",
                  //     notificationError
                  //   );
                    // Continue execution even if notification creation fails
                  // }
                }
              }

              return { id, success: !!updatedArticle };
            // } catch (error) {
            //   console.error(`Error updating article ${id}:`, error);
            //   return { id, success: false };
            // }
          })
        );

        return res.json({ success: true, results });
       } catch (error) {
         return res.status(500).json({ message: "Server error" });
       }
    }
  );

  // Bulk delete articles
  app.delete(
    "/api/admin/articles/bulk",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
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
          return res
            .status(400)
            .json({ message: "Invalid or empty article IDs" });
        }

        // Process IDs to ensure they're all numbers
        const numericIds = ids
          .map((id) => {
            console.log("Processing ID:", id, "type:", typeof id);
            return typeof id === "string" ? parseInt(id) : Number(id);
          })
          .filter((id) => !isNaN(id));

        console.log("Processed numeric IDs:", numericIds);

        if (numericIds.length === 0) {
          return res
            .status(400)
            .json({ message: "All provided article IDs were invalid" });
        }

        const results = [];

        // Delete each article one by one
        for (const id of numericIds) {
          console.log(`Starting transaction to delete article ${id}`);
          try {
            // Delete article and related records
            const result = await storage.deleteArticle(id);
            console.log(`Article ${id} deletion complete:`, result);
            results.push({ id, success: true });
          } catch (err) {
            console.error(`Error deleting article ${id}:`, err);
            results.push({ id, success: false, error: (err as Error).message });
          }
        }

        return res.json({
          success: true,
          results,
        });
      } catch (error) {
        console.error("Bulk delete error:", error);
        return res.status(500).json({ message: (error as Error).message });
      }
    }
  );

  // Bulk update article featured status
  app.patch(
    "/api/admin/articles/bulk/featured",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
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
          return res
            .status(400)
            .json({ message: "Invalid or empty article IDs" });
        }

        // Make sure all IDs are valid numbers
        const numericIds = ids
          .map((id) => {
            console.log("Processing ID:", id, "type:", typeof id);
            const numId = typeof id === "string" ? parseInt(id) : Number(id);
            console.log("Converted to numeric:", numId, "isNaN?", isNaN(numId));
            return isNaN(numId) ? null : numId;
          })
          .filter((id) => id !== null) as number[];

        console.log("Processed IDs for featured update:", numericIds);

        if (numericIds.length === 0) {
          return res
            .status(400)
            .json({ message: "Invalid 0 article IDs", data: numericIds });
        }

        if (typeof featured !== "boolean") {
          return res
            .status(400)
            .json({ message: "Featured must be a boolean" });
        }

        // For now just return success - in a real app this would update each article
        return res.json({
          success: true,
          results: numericIds.map((id) => ({ id, success: true })),
        });
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Get user notifications
  app.get(
    "/api/notifications",
    authenticateToken,
    async (req: AuthRequest, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ message: "Authentication required" });
        }

        const notifications = await storage.getUserNotifications(req.user.id);
        return res.json(notifications);
      } catch (error) {
        console.error("Error getting notifications:", error);
        return res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Mark notification as read
  app.patch(
    "/api/notifications/:id",
    authenticateToken,
    async (req: AuthRequest, res) => {
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

  // Mark all notifications as read
  app.patch(
    "/api/notifications",
    authenticateToken,
    async (req: AuthRequest, res) => {
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

  // Comment routes

  // Get all comments for an article (top-level only)
  app.get("/api/articles/:id/comments", async (req, res) => {
    try {
      const articleId = parseInt(req.params.id);
      if (isNaN(articleId)) {
        return res.status(400).json({ message: "Invalid article ID" });
      }

      const comments = await storage.getArticleComments(articleId);
      return res.json(comments);
    } catch (error) {
      console.error("Error getting article comments:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Get replies for a specific comment
  app.get("/api/comments/:id/replies", async (req, res) => {
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

  // Create a new comment or reply with optional authentication
  app.post(
    "/api/articles/:id/comments",
    async (req: Request & Partial<AuthRequest>, res) => {
      try {
        const articleId = parseInt(req.params.id);
        if (isNaN(articleId)) {
          return res.status(400).json({ message: "Invalid article ID" });
        }

        // Check if the article exists and is published
        const article = await storage.getArticle(articleId);
        if (!article) {
          return res.status(404).json({ message: "Article not found" });
        }

        if (!article.published) {
          return res
            .status(403)
            .json({ message: "Cannot comment on unpublished articles" });
        }

        // Check for authenticated user
        const authHeader = req.headers.authorization;
        let authenticatedUser = null;

        if (authHeader) {
          const token = authHeader.split(" ")[1];
          try {
            const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
            authenticatedUser = await storage.getUser(decoded.id);
          } catch (e) {
            // Invalid token, continue as anonymous user
            console.log(
              "Invalid auth token for comment, continuing as anonymous"
            );
          }
        }

        // Auto-fill author name and email for authenticated users
        let commentData = { ...req.body, articleId };

        if (authenticatedUser) {
          // If authenticated user, use their info and add role label
          const roleLabel =
            authenticatedUser.role === UserRole.ADMIN
              ? "[Admin]"
              : authenticatedUser.role === UserRole.AUTHOR
              ? "[Author]"
              : "";

          commentData.authorName =
            `${roleLabel} ${authenticatedUser.name}`.trim();
          commentData.authorEmail = authenticatedUser.email;
        }

        // Validate the comment data
        const validatedData = insertCommentSchema.parse(commentData);

        // Create the comment
        const comment = await storage.createComment(validatedData);

        // Create a notification for the article author only if commenter is not the author
        const isCommentByAuthor =
          authenticatedUser && authenticatedUser.id === article.authorId;

        if (article.authorId && !isCommentByAuthor) {
          try {
            // Get article slug for the notification URL
            const notificationTitle = validatedData.parentId
              ? "New Reply to Comment"
              : "New Comment on Article";
            const notificationMessage = validatedData.parentId
              ? `${validatedData.authorName} replied to a comment on your article "${article.title}"`
              : `${validatedData.authorName} commented on your article "${article.title}"`;

            // Use the extended notification schema to include the article slug
            await storage.createNotification({
              userId: article.authorId,
              type: "comment_received",
              title: notificationTitle,
              message: notificationMessage,
              articleId: article.id,
              commentId: comment.id,
              articleSlug: article.slug, // Add slug for better navigation
            });
            console.log(
              `Created notification for author ID ${article.authorId} for new comment`
            );
          } catch (notificationError) {
            console.error(
              "Error creating comment notification:",
              notificationError
            );
            // Don't fail the whole request if notification creation fails
          }
        } else if (isCommentByAuthor) {
          console.log(
            `Skipping notification since comment is by the article author (${authenticatedUser?.id})`
          );
        }

        return res.status(201).json(comment);
      } catch (error) {
        console.error("Error creating comment:", error);
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            message: "Validation error",
            errors: error.errors,
          });
        }
        return res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Update a comment (admin only)
  app.patch(
    "/api/comments/:id",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const commentId = parseInt(req.params.id);
        if (isNaN(commentId)) {
          return res.status(400).json({ message: "Invalid comment ID" });
        }

        // Check if comment exists
        const comment = await storage.getComment(commentId);
        if (!comment) {
          return res.status(404).json({ message: "Comment not found" });
        }

        // Validate update data
        const validatedData = updateCommentSchema.parse(req.body);

        // Update the comment
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
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            message: "Validation error",
            errors: error.errors,
          });
        }
        return res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Delete a comment (admin only)
  app.delete(
    "/api/comments/:id",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const commentId = parseInt(req.params.id);
        if (isNaN(commentId)) {
          return res.status(400).json({ message: "Invalid comment ID" });
        }

        // Check if comment exists
        const comment = await storage.getComment(commentId);
        if (!comment) {
          return res.status(404).json({ message: "Comment not found" });
        }

        // Delete the comment
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

  const httpServer = createServer(app);
  return httpServer;
}
