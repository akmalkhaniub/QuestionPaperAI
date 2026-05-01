import express, { Request, Response } from "express";
import { deletePaper } from "./deletePaper";
import { storage } from "./storage";

const router = express.Router();

// Get all papers
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId ? Number(req.query.userId) : undefined;
    const papers = await storage.getPapers(userId);
    res.json(papers);
  } catch (error) {
    console.error("Error fetching papers:", error);
    res.status(500).json({ error: "Failed to fetch papers" });
  }
});

// Get paper by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const paperId = Number(req.params.id);
    const paper = await storage.getPaper(paperId);
    
    if (!paper) {
      return res.status(404).json({ error: "Paper not found" });
    }
    
    res.json(paper);
  } catch (error) {
    console.error("Error fetching paper:", error);
    res.status(500).json({ error: "Failed to fetch paper" });
  }
});

// Delete a paper and all related data
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const paperId = Number(req.params.id);
    
    // Check if paper exists before deleting
    const paper = await storage.getPaper(paperId);
    if (!paper) {
      return res.status(404).json({ error: "Paper not found" });
    }
    
    // Use the dedicated delete function
    const success = await deletePaper(paperId);
    
    if (success) {
      res.status(200).json({ message: "Paper deleted successfully" });
    } else {
      res.status(500).json({ error: "Failed to delete paper" });
    }
  } catch (error) {
    console.error("Error deleting paper:", error);
    res.status(500).json({ error: "Failed to delete paper" });
  }
});

export default router;