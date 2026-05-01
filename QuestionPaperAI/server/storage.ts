import { 
  User, InsertUser, users,
  Student, InsertStudent, students,
  QuestionTopic, InsertQuestionTopic, questionTopics,
  Paper, InsertPaper, papers,
  GeneratedPaper, InsertGeneratedPaper, generatedPapers,
  QuestionBank, InsertQuestionBank, questionBank,
  PaperQuestions, InsertPaperQuestions, paperQuestions
} from "@shared/schema";

import { db } from "./db";
import { eq, and, isNull, sql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Student methods
  getStudent(id: number): Promise<Student | undefined>;
  getStudents(userId?: number): Promise<Student[]>;
  createStudent(student: InsertStudent): Promise<Student>;
  createStudents(students: InsertStudent[]): Promise<Student[]>;
  deleteStudent(id: number): Promise<boolean>;

  // Question Topic methods
  getQuestionTopic(id: number): Promise<QuestionTopic | undefined>;
  getQuestionTopicsByPaperId(paperId: number): Promise<QuestionTopic[]>;
  createQuestionTopic(topic: InsertQuestionTopic): Promise<QuestionTopic>;
  updateQuestionTopic(id: number, topic: Partial<InsertQuestionTopic>): Promise<QuestionTopic | undefined>;
  deleteQuestionTopic(id: number): Promise<boolean>;

  // Paper methods
  getPaper(id: number): Promise<Paper | undefined>;
  getPapers(userId?: number): Promise<Paper[]>;
  createPaper(paper: InsertPaper): Promise<Paper>;
  updatePaper(id: number, paper: Partial<InsertPaper>): Promise<Paper | undefined>;
  deletePaper(id: number): Promise<boolean>;

  // Generated Paper methods
  getGeneratedPaper(id: number): Promise<GeneratedPaper | undefined>;
  getGeneratedPapersByPaperId(paperId: number): Promise<GeneratedPaper[]>;
  getGeneratedPapersByStudentId(studentId: number): Promise<GeneratedPaper[]>;
  createGeneratedPaper(generatedPaper: InsertGeneratedPaper): Promise<GeneratedPaper>;
  updateGeneratedPaper(id: number, generatedPaper: Partial<InsertGeneratedPaper>): Promise<GeneratedPaper | undefined>;
  deleteGeneratedPaper(id: number): Promise<boolean>;
  deleteAllGeneratedPapersByPaperId(paperId: number): Promise<boolean>;
  
  // Question Bank methods
  getQuestion(id: number): Promise<QuestionBank | undefined>;
  getQuestionsBySubject(subject: string): Promise<QuestionBank[]>;
  getQuestionsByTopic(topic: string): Promise<QuestionBank[]>;
  getQuestionsByTeacher(userId: number): Promise<QuestionBank[]>;
  getVerifiedQuestions(): Promise<QuestionBank[]>;
  createQuestion(question: InsertQuestionBank): Promise<QuestionBank>;
  updateQuestion(id: number, question: Partial<InsertQuestionBank>): Promise<QuestionBank | undefined>;
  verifyQuestion(id: number): Promise<QuestionBank | undefined>;
  deleteQuestion(id: number): Promise<boolean>;
  
  // Paper Questions methods
  getPaperQuestion(id: number): Promise<PaperQuestions | undefined>;
  getPaperQuestionsByPaperId(paperId: number): Promise<PaperQuestions[]>;
  getPaperQuestionsByStudentId(paperId: number, studentId: number): Promise<PaperQuestions[]>;
  getCommonPaperQuestions(paperId: number): Promise<PaperQuestions[]>;
  createPaperQuestion(paperQuestion: InsertPaperQuestions): Promise<PaperQuestions>;
  deletePaperQuestion(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Student methods
  async getStudent(id: number): Promise<Student | undefined> {
    // Use direct SQL to ensure proper transformation of field names
    // Import directly from the module to avoid require
    try {
      // First, try direct SQL approach for consistent field transformation
      const { getStudentsDirectSql } = await import('./db');
      const students = await getStudentsDirectSql();
      
      // Find the student with the matching ID
      const student = students.find((s: any) => s.id === id);
      if (student) {
        console.log(`Found student ${id} with class section: ${student.classSection || 'null'}`);
        return student;
      }
    } catch (error) {
      console.error("Error using direct SQL for student retrieval:", error);
      // Continue to ORM fallback on error
    }
    
    // Fallback to ORM
    try {
      const [ormStudent] = await db.select().from(students).where(eq(students.id, id));
      
      // If we get a student from ORM, make sure classSection is set correctly
      if (ormStudent) {
        // Create a complete student object with all required fields in camelCase format
        const student: Student = {
          id: ormStudent.id,
          name: ormStudent.name,
          rollNumber: ormStudent.rollNumber,
          classSection: (ormStudent as any).class_section || null,
          userId: ormStudent.userId
        };
        console.log(`ORM found student ${id} with class section: ${student.classSection || 'null'}`);
        return student;
      }
      
      console.log(`No student found with ID ${id}`);
      return undefined;
    } catch (ormError) {
      console.error("ORM error retrieving student:", ormError);
      return undefined;
    }
  }

  async getStudents(userId?: number): Promise<Student[]> {
    if (userId) {
      return db.select().from(students).where(eq(students.userId, userId));
    }
    return db.select().from(students);
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const [newStudent] = await db.insert(students).values(student).returning();
    return newStudent;
  }

  async createStudents(studentsToCreate: InsertStudent[]): Promise<Student[]> {
    if (studentsToCreate.length === 0) return [];
    const newStudents = await db.insert(students).values(studentsToCreate).returning();
    return newStudents;
  }

  async deleteStudent(id: number): Promise<boolean> {
    await db.delete(students).where(eq(students.id, id));
    return true;
  }

  // Question Topic methods
  async getQuestionTopic(id: number): Promise<QuestionTopic | undefined> {
    const [topic] = await db.select().from(questionTopics).where(eq(questionTopics.id, id));
    return topic;
  }

  async getQuestionTopicsByPaperId(paperId: number): Promise<QuestionTopic[]> {
    return db.select().from(questionTopics).where(eq(questionTopics.paperId, paperId));
  }

  async createQuestionTopic(topic: InsertQuestionTopic): Promise<QuestionTopic> {
    const [newTopic] = await db.insert(questionTopics).values(topic).returning();
    return newTopic;
  }

  async updateQuestionTopic(id: number, topic: Partial<InsertQuestionTopic>): Promise<QuestionTopic | undefined> {
    const [updatedTopic] = await db
      .update(questionTopics)
      .set(topic)
      .where(eq(questionTopics.id, id))
      .returning();
    return updatedTopic;
  }

  async deleteQuestionTopic(id: number): Promise<boolean> {
    await db.delete(questionTopics).where(eq(questionTopics.id, id));
    return true;
  }

  // Paper methods
  async getPaper(id: number): Promise<Paper | undefined> {
    const [paper] = await db.select().from(papers).where(eq(papers.id, id));
    return paper;
  }

  async getPapers(userId?: number): Promise<Paper[]> {
    if (userId) {
      return db.select().from(papers).where(eq(papers.userId, userId));
    }
    return db.select().from(papers);
  }

  async createPaper(paper: InsertPaper): Promise<Paper> {
    const [newPaper] = await db.insert(papers).values(paper).returning();
    return newPaper;
  }

  async updatePaper(id: number, paper: Partial<InsertPaper>): Promise<Paper | undefined> {
    const [updatedPaper] = await db
      .update(papers)
      .set(paper)
      .where(eq(papers.id, id))
      .returning();
    return updatedPaper;
  }

  async deletePaper(id: number): Promise<boolean> {
    try {
      // Delete related topics
      await db.delete(questionTopics).where(eq(questionTopics.paperId, id));
      
      // Delete related paper questions
      await db.delete(paperQuestions).where(eq(paperQuestions.paperId, id));
      
      // Delete generated papers
      await db.delete(generatedPapers).where(eq(generatedPapers.paperId, id));
      
      // Finally delete the paper itself
      await db.delete(papers).where(eq(papers.id, id));
      
      console.log(`Successfully deleted paper with id ${id} and all related data`);
      return true;
    } catch (error) {
      console.error(`Error deleting paper with id ${id}:`, error);
      return false;
    }
  }

  // Generated Paper methods
  async getGeneratedPaper(id: number): Promise<GeneratedPaper | undefined> {
    const [result] = await db.select({
      id: generatedPapers.id,
      paperId: generatedPapers.paperId,
      studentId: generatedPapers.studentId,
      content: generatedPapers.content,
      filePath: generatedPapers.filePath,
      generatedAt: generatedPapers.generatedAt,
      status: generatedPapers.status,
      // Include student fields directly
      studentName: students.name,
      studentRollNumber: students.rollNumber,
      studentClassSection: students.classSection
    })
    .from(generatedPapers)
    .leftJoin(students, eq(generatedPapers.studentId, students.id))
    .where(eq(generatedPapers.id, id));
    
    if (!result) return undefined;
    
    // Transform the result to include the student object
    const { studentName, studentRollNumber, studentClassSection, ...paperData } = result;
    return {
      ...paperData,
      student: studentName ? {
        id: result.studentId,
        name: studentName,
        rollNumber: studentRollNumber || null,
        classSection: studentClassSection || null
      } : null
    };
  }

  async getGeneratedPapersByPaperId(paperId: number): Promise<GeneratedPaper[]> {
    const results = await db.select({
      id: generatedPapers.id,
      paperId: generatedPapers.paperId,
      studentId: generatedPapers.studentId,
      content: generatedPapers.content,
      filePath: generatedPapers.filePath,
      generatedAt: generatedPapers.generatedAt,
      status: generatedPapers.status,
      // Include student fields directly
      studentName: students.name,
      studentRollNumber: students.rollNumber,
      studentClassSection: students.classSection
    })
    .from(generatedPapers)
    .leftJoin(students, eq(generatedPapers.studentId, students.id))
    .where(eq(generatedPapers.paperId, paperId));
    
    // Transform the results to include the student object
    return results.map(result => {
      const { studentName, studentRollNumber, studentClassSection, ...paperData } = result;
      return {
        ...paperData,
        student: studentName ? {
          id: result.studentId,
          name: studentName,
          rollNumber: studentRollNumber || null,
          classSection: studentClassSection || null
        } : null
      };
    });
  }

  async getGeneratedPapersByStudentId(studentId: number): Promise<GeneratedPaper[]> {
    const results = await db.select({
      id: generatedPapers.id,
      paperId: generatedPapers.paperId,
      studentId: generatedPapers.studentId,
      content: generatedPapers.content,
      filePath: generatedPapers.filePath,
      generatedAt: generatedPapers.generatedAt,
      status: generatedPapers.status,
      // Include student fields directly
      studentName: students.name,
      studentRollNumber: students.rollNumber,
      studentClassSection: students.classSection
    })
    .from(generatedPapers)
    .leftJoin(students, eq(generatedPapers.studentId, students.id))
    .where(eq(generatedPapers.studentId, studentId));
    
    // Transform the results to include the student object
    return results.map(result => {
      const { studentName, studentRollNumber, studentClassSection, ...paperData } = result;
      return {
        ...paperData,
        student: studentName ? {
          id: result.studentId,
          name: studentName,
          rollNumber: studentRollNumber || null,
          classSection: studentClassSection || null
        } : null
      };
    });
  }

  async createGeneratedPaper(generatedPaper: InsertGeneratedPaper): Promise<GeneratedPaper> {
    const [newGenPaper] = await db.insert(generatedPapers).values(generatedPaper).returning();
    return newGenPaper;
  }

  async updateGeneratedPaper(id: number, generatedPaper: Partial<InsertGeneratedPaper>): Promise<GeneratedPaper | undefined> {
    const [updatedGenPaper] = await db
      .update(generatedPapers)
      .set(generatedPaper)
      .where(eq(generatedPapers.id, id))
      .returning();
    return updatedGenPaper;
  }
  
  async deleteGeneratedPaper(id: number): Promise<boolean> {
    try {
      // First verify the paper exists 
      const result = await this.getGeneratedPaper(id);
      if (!result) {
        console.log(`Generated paper with ID ${id} not found`);
        return false;
      }
      
      // Then delete it
      console.log(`Deleting generated paper with ID ${id}`);
      await db.delete(generatedPapers).where(eq(generatedPapers.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting generated paper with ID ${id}:`, error);
      return false;
    }
  }
  
  async deleteAllGeneratedPapersByPaperId(paperId: number): Promise<boolean> {
    try {
      console.log(`Deleting all generated papers for paper ID ${paperId}`);
      await db.delete(generatedPapers).where(eq(generatedPapers.paperId, paperId));
      return true;
    } catch (error) {
      console.error(`Error deleting all generated papers for paper ID ${paperId}:`, error);
      return false;
    }
  }

  // Question Bank methods
  async getQuestion(id: number): Promise<QuestionBank | undefined> {
    const [question] = await db.select().from(questionBank).where(eq(questionBank.id, id));
    return question;
  }

  async getQuestionsBySubject(subject: string): Promise<QuestionBank[]> {
    return db.select().from(questionBank).where(eq(questionBank.subject, subject));
  }

  async getQuestionsByTopic(topic: string): Promise<QuestionBank[]> {
    return db.select().from(questionBank).where(eq(questionBank.topic, topic));
  }

  async getQuestionsByTeacher(userId: number): Promise<QuestionBank[]> {
    return db.select().from(questionBank).where(eq(questionBank.userId, userId));
  }

  async getVerifiedQuestions(): Promise<QuestionBank[]> {
    return db.select().from(questionBank).where(eq(questionBank.isVerified, true));
  }

  async getVerifiedQuestionsByType(questionType: string): Promise<QuestionBank[]> {
    // Define common variations of question types
    const shortAnswerTypes = ['Short Answer', 'Brief Answer', 'Short Response'];
    const codingTypes = ['Coding Type Long Question', 'Programming Question', 'Coding Question'];
    const longAnswerTypes = ['Long Answer', 'Essay', 'Detailed Answer'];
    
    // Determine which variations to look for
    let typesToMatch: string[] = [];
    if (shortAnswerTypes.includes(questionType)) {
      typesToMatch = shortAnswerTypes;
    } else if (codingTypes.includes(questionType)) {
      typesToMatch = codingTypes;
    } else if (longAnswerTypes.includes(questionType)) {
      typesToMatch = longAnswerTypes;
    } else {
      typesToMatch = [questionType];
    }
    
    // Get all verified questions of the matching types
    const questions = await db.select()
      .from(questionBank)
      .where(
        and(
          eq(questionBank.isVerified, true),
          sql`${questionBank.questionType} = ANY(ARRAY[${sql.join(typesToMatch)}]::text[])`
        )
      );
    
    console.log(`Found ${questions.length} verified questions of type(s) ${typesToMatch.join(', ')}`);
    return questions;
  }

  async createQuestion(question: InsertQuestionBank): Promise<QuestionBank> {
    const [newQuestion] = await db.insert(questionBank).values(question).returning();
    return newQuestion;
  }

  async updateQuestion(id: number, question: Partial<InsertQuestionBank>): Promise<QuestionBank | undefined> {
    const [updatedQuestion] = await db
      .update(questionBank)
      .set(question)
      .where(eq(questionBank.id, id))
      .returning();
    return updatedQuestion;
  }

  async verifyQuestion(id: number): Promise<QuestionBank | undefined> {
    const [verifiedQuestion] = await db
      .update(questionBank)
      .set({ isVerified: true })
      .where(eq(questionBank.id, id))
      .returning();
    return verifiedQuestion;
  }

  async deleteQuestion(id: number): Promise<boolean> {
    await db.delete(questionBank).where(eq(questionBank.id, id));
    return true;
  }

  // Paper Questions methods
  async getPaperQuestion(id: number): Promise<PaperQuestions | undefined> {
    const [paperQuestion] = await db.select().from(paperQuestions).where(eq(paperQuestions.id, id));
    return paperQuestion;
  }

  async getPaperQuestionsByPaperId(paperId: number): Promise<PaperQuestions[]> {
    return db.select().from(paperQuestions).where(eq(paperQuestions.paperId, paperId));
  }

  async getPaperQuestionsByStudentId(paperId: number, studentId: number): Promise<PaperQuestions[]> {
    return db.select()
      .from(paperQuestions)
      .where(
        and(
          eq(paperQuestions.paperId, paperId),
          eq(paperQuestions.studentId, studentId)
        )
      );
  }

  async getCommonPaperQuestions(paperId: number): Promise<PaperQuestions[]> {
    return db.select()
      .from(paperQuestions)
      .where(
        and(
          eq(paperQuestions.paperId, paperId),
          isNull(paperQuestions.studentId)
        )
      );
  }

  async createPaperQuestion(paperQuestion: InsertPaperQuestions): Promise<PaperQuestions> {
    const [newPaperQuestion] = await db.insert(paperQuestions).values(paperQuestion).returning();
    return newPaperQuestion;
  }

  async deletePaperQuestion(id: number): Promise<boolean> {
    await db.delete(paperQuestions).where(eq(paperQuestions.id, id));
    return true;
  }
}

// Initialize the database with default user if needed
async function initializeDatabase() {
  console.log("Attempting to initialize database...");
  
  // Check database connection first
  try {
    // Just try a simple query to test connection
    await db.execute(sql`SELECT 1 as test`);
    console.log("Database connection successful");
    
    // Check if we already have a teacher account
    try {
      const users = await db.execute(sql`SELECT * FROM users LIMIT 1`);
      console.log("Found user records:", users.rowCount);
    } catch (e) {
      console.log("Users table might not exist or other error:", (e as Error).message);
    }
    
  } catch (e) {
    console.error("Database connection failed:", (e as Error).message);
    return; // Exit if we can't connect
  }
}

// Initialize database on startup
initializeDatabase();

export const storage = new DatabaseStorage();
