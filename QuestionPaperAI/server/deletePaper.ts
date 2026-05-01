import { db } from "./db";
import { sql } from "drizzle-orm";
import { storage } from "./storage";
import { eq } from "drizzle-orm";
import { generatedPapers, paperQuestions, questionTopics, papers } from "../shared/schema";

/**
 * Delete a paper and all its related records
 * This function handles the deletion of a paper and all related records
 * by manually deleting related records and then the paper itself
 */
export async function deletePaper(paperId: number): Promise<boolean> {
  try {
    console.log(`Starting paper deletion process for paper ID: ${paperId}`);
    
    try {
      // Step 1: Delete all generated papers for this paper
      const deleteGeneratedResult = await storage.deleteAllGeneratedPapersByPaperId(paperId);
      console.log(`Deleted generated papers: ${deleteGeneratedResult}`);
    } catch (e) {
      console.error(`Error deleting generated papers for paper ${paperId}:`, e);
      // Continue with other steps even if this fails
    }
    
    try {
      // Step 2: Delete all question topics for this paper
      await db.delete(questionTopics).where(eq(questionTopics.paperId, paperId));
      console.log(`Deleted question topics for paper ${paperId}`);
    } catch (e) {
      console.error(`Error deleting question topics for paper ${paperId}:`, e);
      // Continue with other steps even if this fails
    }
    
    try {
      // Step 3: Delete all paper questions for this paper
      await db.delete(paperQuestions).where(eq(paperQuestions.paperId, paperId));
      console.log(`Deleted paper questions for paper ${paperId}`);
    } catch (e) {
      console.error(`Error deleting paper questions for paper ${paperId}:`, e);
      // Continue with other steps even if this fails
    }
    
    try {
      // Step 4: Finally delete the paper itself using direct SQL to avoid issues with deletePaper method
      const result = await db.delete(papers).where(eq(papers.id, paperId));
      console.log(`Deleted paper ${paperId} directly`);
      return true;
    } catch (e) {
      console.error(`Error deleting paper ${paperId} directly:`, e);
      return false;
    }
  } catch (error) {
    console.error(`Error in main deletion process for paper ID ${paperId}:`, error);
    return false;
  }
}