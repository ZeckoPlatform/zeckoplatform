import { Router } from "express";
import { authenticateToken } from "../auth";
import { db } from "@db";
import { documents, documentVersions, documentAccess } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import fs from 'fs';

const router = Router();

// Middleware to check document access
const checkDocumentAccess = async (req, res, next) => {
  const userId = req.user?.id;
  const documentId = parseInt(req.params.documentId);

  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    // Check if user is document owner or has explicit access
    const [document] = await db.select()
      .from(documents)
      .where(eq(documents.id, documentId));

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (document.userId === userId) {
      req.document = document;
      return next();
    }

    // Check access rights
    const [access] = await db.select()
      .from(documentAccess)
      .where(
        and(
          eq(documentAccess.documentId, documentId),
          eq(documentAccess.userId, userId)
        )
      );

    if (!access && !document.isPublic) {
      return res.status(403).json({ message: "Access denied" });
    }

    req.document = document;
    req.accessLevel = access?.accessLevel;
    next();
  } catch (error) {
    console.error("Document access check error:", error);
    res.status(500).json({ message: "Failed to check document access" });
  }
};

// Upload a new document
router.post("/documents", authenticateToken, async (req, res) => {
  try {
    const { title, description, file, fileType, isPublic = false } = req.body;

    if (!file || !title || !fileType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Create uploads directory if it doesn't exist
    const uploadDir = 'uploads/documents';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `${Date.now()}-${title.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const filePath = `${uploadDir}/${fileName}`;

    // Save the file
    const buffer = Buffer.from(file, 'base64');
    await fs.promises.writeFile(filePath, buffer);

    // Create document record
    const [document] = await db.insert(documents)
      .values({
        userId: req.user.id,
        title,
        description,
        filePath,
        fileType,
        fileSize: buffer.length,
        isPublic,
        metadata: {
          originalName: title,
          contentType: fileType,
        },
      })
      .returning();

    // Create initial version
    await db.insert(documentVersions)
      .values({
        documentId: document.id,
        version: 1,
        filePath,
        fileSize: buffer.length,
        createdBy: req.user.id,
      });

    res.status(201).json(document);
  } catch (error) {
    console.error("Document upload error:", error);
    res.status(500).json({ message: "Failed to upload document" });
  }
});

// Get all accessible documents
router.get("/documents", authenticateToken, async (req, res) => {
  try {
    // Get documents owned by user or publicly accessible
    const userDocuments = await db.query.documents.findMany({
      where: and(
        eq(documents.userId, req.user.id),
        eq(documents.isPublic, true)
      ),
      with: {
        versions: true,
        access: true,
      },
    });

    res.json(userDocuments);
  } catch (error) {
    console.error("Documents fetch error:", error);
    res.status(500).json({ message: "Failed to fetch documents" });
  }
});

// Get a specific document
router.get("/documents/:documentId", authenticateToken, checkDocumentAccess, async (req, res) => {
  try {
    const document = await db.query.documents.findFirst({
      where: eq(documents.id, parseInt(req.params.documentId)),
      with: {
        versions: true,
        access: true,
      },
    });

    res.json(document);
  } catch (error) {
    console.error("Document fetch error:", error);
    res.status(500).json({ message: "Failed to fetch document" });
  }
});

// Update document metadata
router.patch("/documents/:documentId", authenticateToken, checkDocumentAccess, async (req, res) => {
  try {
    if (req.accessLevel && req.accessLevel !== "edit" && req.accessLevel !== "admin") {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    const { title, description, isPublic } = req.body;

    const [updatedDocument] = await db.update(documents)
      .set({
        title,
        description,
        isPublic,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, parseInt(req.params.documentId)))
      .returning();

    res.json(updatedDocument);
  } catch (error) {
    console.error("Document update error:", error);
    res.status(500).json({ message: "Failed to update document" });
  }
});

// Upload new version
router.post("/documents/:documentId/versions", authenticateToken, checkDocumentAccess, async (req, res) => {
  try {
    if (req.accessLevel && req.accessLevel !== "edit" && req.accessLevel !== "admin") {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    const { file, changeLog } = req.body;
    if (!file) {
      return res.status(400).json({ message: "File is required" });
    }

    // Get latest version number
    const [latestVersion] = await db.select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, parseInt(req.params.documentId)))
      .orderBy(desc(documentVersions.version))
      .limit(1);

    const newVersionNumber = (latestVersion?.version || 0) + 1;

    // Save new version file
    const uploadDir = 'uploads/documents';
    const fileName = `${Date.now()}-v${newVersionNumber}-${req.document.title.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const filePath = `${uploadDir}/${fileName}`;

    const buffer = Buffer.from(file, 'base64');
    await fs.promises.writeFile(filePath, buffer);

    // Create version record
    const [newVersion] = await db.insert(documentVersions)
      .values({
        documentId: parseInt(req.params.documentId),
        version: newVersionNumber,
        filePath,
        fileSize: buffer.length,
        createdBy: req.user.id,
        changeLog,
      })
      .returning();

    // Update document's updated_at timestamp
    await db.update(documents)
      .set({ updatedAt: new Date() })
      .where(eq(documents.id, parseInt(req.params.documentId)));

    res.status(201).json(newVersion);
  } catch (error) {
    console.error("Version upload error:", error);
    res.status(500).json({ message: "Failed to upload new version" });
  }
});

// Manage document access
router.post("/documents/:documentId/access", authenticateToken, checkDocumentAccess, async (req, res) => {
  try {
    // Only document owner or admin access level can manage access
    if (req.document.userId !== req.user.id && req.accessLevel !== "admin") {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    const { userId, accessLevel, expiresAt } = req.body;

    const [access] = await db.insert(documentAccess)
      .values({
        documentId: parseInt(req.params.documentId),
        userId,
        accessLevel,
        grantedBy: req.user.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      })
      .returning();

    res.status(201).json(access);
  } catch (error) {
    console.error("Access grant error:", error);
    res.status(500).json({ message: "Failed to grant access" });
  }
});

// Revoke document access
router.delete("/documents/:documentId/access/:userId", authenticateToken, checkDocumentAccess, async (req, res) => {
  try {
    // Only document owner or admin access level can revoke access
    if (req.document.userId !== req.user.id && req.accessLevel !== "admin") {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    await db.delete(documentAccess)
      .where(
        and(
          eq(documentAccess.documentId, parseInt(req.params.documentId)),
          eq(documentAccess.userId, parseInt(req.params.userId))
        )
      );

    res.json({ message: "Access revoked successfully" });
  } catch (error) {
    console.error("Access revocation error:", error);
    res.status(500).json({ message: "Failed to revoke access" });
  }
});

export default router;
