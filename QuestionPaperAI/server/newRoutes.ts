// New route handler for paper deletion
import { Request, Response } from "express";
import { storage } from "./storage";
import { deletePaper } from "./deletePaper";

/**
 * Handle the DELETE request for a paper
 * This is a standalone route handler to fix the paper deletion functionality
 */
export async function handlePaperDelete(req: Request, res: Response) {
  try {
    const paperId = Number(req.params.id);
    
    // Check if paper exists before deleting
    const paper = await storage.getPaper(paperId);
    if (!paper) {
      return res.status(404).json({ error: "Paper not found" });
    }
    
    // Use the specialized function to delete the paper
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
}