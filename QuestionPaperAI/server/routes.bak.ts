import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { z } from "zod";
import { 
  insertStudentSchema, 
  insertPaperSchema, 
  insertQuestionTopicSchema, 
  insertGeneratedPaperSchema,
  insertQuestionBankSchema,
  insertPaperQuestionsSchema
} from "@shared/schema";
import path from "path";
import fs from "fs";
import OpenAI from "openai";
import { randomUUID } from "crypto";
import { parse } from 'csv-parse';

// Initialize OpenAI client
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "" 
});

// Log OpenAI API key status (without showing the key)
console.log(`OpenAI API key status: ${process.env.OPENAI_API_KEY ? "Provided" : "Missing"}`);

// Configure multer for file uploads
const storage_config = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage: storage_config,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // For CSV files, mimetype might not be reliable, check extension as well
    const allowedTypes = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/pdf',
      'text/csv',
      'text/plain', // Some CSV files might be detected as text/plain
      'application/vnd.ms-excel', // Some CSV files might be detected as excel
      'application/octet-stream' // Some CSV files might be detected as binary
    ];
    
    // Check file extension for .csv
    const isCSV = file.originalname.toLowerCase().endsWith('.csv');
    
    if (allowedTypes.includes(file.mimetype) || isCSV) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only DOC, DOCX, PDF, and CSV are allowed.') as any, false);
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Student routes
  app.get("/api/students", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const students = await storage.getStudents(userId);
      res.json(students);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  app.post("/api/students", async (req: Request, res: Response) => {
    try {
      const validatedData = insertStudentSchema.parse(req.body);
      const student = await storage.createStudent(validatedData);
      res.status(201).json(student);
    } catch (error) {
      res.status(400).json({ message: "Invalid student data" });
    }
  });
  
  // Delete a student
  app.delete("/api/students/:id", async (req: Request, res: Response) => {
    try {
      const studentId = parseInt(req.params.id);
      const success = await storage.deleteStudent(studentId);
      
      if (!success) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      res.status(200).json({ message: "Student deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete student" });
    }
  });

  // Bulk upload students (CSV file)
  app.post("/api/students/upload", upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Parse CSV file
      const fileContent = fs.readFileSync(req.file.path, 'utf8');
      const records: any[] = [];

      // Check if the file starts with a BOM (Byte Order Mark) and remove it
      const cleanContent = fileContent.charCodeAt(0) === 0xFEFF 
        ? fileContent.slice(1) 
        : fileContent;

      // Log the first few characters of the file for debugging
      console.log("CSV file content prefix:", cleanContent.substring(0, 100));

      // Try to detect if the first line is the header
      const firstLine = cleanContent.split('\n')[0].trim();
      console.log("First line of CSV:", firstLine);
      
      // Expected header should contain these terms
      const expectedHeaders = ['roll number', 'name', 'class section'];
      const hasHeader = expectedHeaders.some(header => firstLine.toLowerCase().includes(header.toLowerCase()));
      
      // Parse the CSV content
      const parser = parse({
        delimiter: ',',
        columns: hasHeader, // Use first line as column names only if headers are detected
        skip_empty_lines: true,
        trim: true
      });

      console.log("CSV parser using columns (headers):", hasHeader);

      // Process each row of the CSV
      parser.on('readable', function() {
        let record;
        while (record = parser.read()) {
          // Log the record structure for debugging
          console.log("Parsed CSV record:", record);
          
          if (hasHeader) {
            // With headers - we need to map to our expected field names
            const rollNumberField = Object.keys(record).find(k => 
              k.toLowerCase().includes('roll') || k.toLowerCase().includes('number'));
            
            const nameField = Object.keys(record).find(k => 
              k.toLowerCase().includes('name'));
            
            const classSectionField = Object.keys(record).find(k => 
              k.toLowerCase().includes('class') || k.toLowerCase().includes('section'));
            
            if (rollNumberField && nameField && classSectionField) {
              records.push({
                rollNumber: record[rollNumberField],
                name: record[nameField],
                classSection: record[classSectionField],
                userId: 1 // Set to default user ID
              });
              console.log("Added student from header mapping:", record[rollNumberField], record[nameField]);
            } else {
              console.log("Could not match fields in record with headers:", Object.keys(record));
            }
          } else {
            // Without headers - assume the order is: Roll Number, Name, Class Section
            if (Array.isArray(record)) {
              // When no headers, record may be an array
              if (record.length >= 3) {
                records.push({
                  rollNumber: record[0],
                  name: record[1],
                  classSection: record[2],
                  userId: 1
                });
                console.log("Added student from array:", record[0], record[1]);
              }
            } else {
              // Handle record as object with numeric keys
              const keys = Object.keys(record).sort();
              if (keys.length >= 3) {
                records.push({
                  rollNumber: record[keys[0]],
                  name: record[keys[1]],
                  classSection: record[keys[2]],
                  userId: 1
                });
                console.log("Added student from object:", record[keys[0]], record[keys[1]]);
              }
            }
          }
        }
      });

      // Handle parser errors
      let parseError: Error | null = null;
      parser.on('error', function(err) {
        parseError = err;
      });

      // Return the promise that resolves when parsing completes
      await new Promise<void>((resolve, reject) => {
        parser.on('end', function() {
          if (parseError) {
            reject(parseError);
          } else {
            resolve();
          }
        });
        // Feed the parser with the cleaned file content
        parser.write(cleanContent);
        parser.end();
      });

      if (records.length === 0) {
        return res.status(400).json({ message: "No valid student records found in the CSV file" });
      }

      // Create the students
      const students = await storage.createStudents(records);
      res.status(201).json(students);
    } catch (error) {
      console.error("Error processing student upload:", error);
      res.status(400).json({ message: "Failed to process student upload. Check the CSV format." });
    }
  });

  // Paper routes
  app.get("/api/papers", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const papers = await storage.getPapers(userId);
      res.json(papers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch papers" });
    }
  });

  app.get("/api/papers/:id", async (req: Request, res: Response) => {
    try {
      const paperId = parseInt(req.params.id);
      const paper = await storage.getPaper(paperId);
      
      if (!paper) {
        return res.status(404).json({ message: "Paper not found" });
      }

      // Get topics for this paper
      const topics = await storage.getQuestionTopicsByPaperId(paperId);
      const generatedPapers = await storage.getGeneratedPapersByPaperId(paperId);

      res.json({
        ...paper,
        topics,
        generatedPapers
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch paper details" });
    }
  });

  app.post("/api/papers", async (req: Request, res: Response) => {
    try {
      console.log("Paper data received:", JSON.stringify(req.body));
      
      // Schema transform will handle date conversion
      try {
        const validatedData = insertPaperSchema.parse(req.body);
        console.log("Validated paper data:", JSON.stringify(validatedData));
        
        const paper = await storage.createPaper(validatedData);
        res.status(201).json(paper);
      } catch (validationError) {
        console.error("Paper validation error:", validationError);
        res.status(400).json({ 
          message: "Invalid paper data", 
          error: String(validationError),
          details: validationError instanceof Error ? validationError.message : "Unknown validation error" 
        });
      }
    } catch (error) {
      console.error("Paper creation error:", error);
      res.status(500).json({ message: "Error creating paper", error: String(error) });
    }
  });

  app.put("/api/papers/:id", async (req: Request, res: Response) => {
    try {
      const paperId = parseInt(req.params.id);
      const updatedPaper = await storage.updatePaper(paperId, req.body);
      
      if (!updatedPaper) {
        return res.status(404).json({ message: "Paper not found" });
      }
      
      res.json(updatedPaper);
    } catch (error) {
      res.status(400).json({ message: "Failed to update paper" });
    }
  });

  // Template upload route
  app.post("/api/templates/upload", upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      res.status(201).json({ 
        filename: req.file.filename,
        path: req.file.path
      });
    } catch (error) {
      res.status(400).json({ message: "Failed to upload template" });
    }
  });

  // Question Topics routes
  app.get("/api/papers/:paperId/topics", async (req: Request, res: Response) => {
    try {
      const paperId = parseInt(req.params.paperId);
      const topics = await storage.getQuestionTopicsByPaperId(paperId);
      res.json(topics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch topics" });
    }
  });

  app.post("/api/papers/:paperId/topics", async (req: Request, res: Response) => {
    try {
      const paperId = parseInt(req.params.paperId);
      const paper = await storage.getPaper(paperId);
      
      if (!paper) {
        return res.status(404).json({ message: "Paper not found" });
      }

      const topics = Array.isArray(req.body) ? req.body : [req.body];
      const createdTopics = [];

      for (const topic of topics) {
        const validatedData = insertQuestionTopicSchema.parse({
          ...topic,
          paperId
        });
        const createdTopic = await storage.createQuestionTopic(validatedData);
        createdTopics.push(createdTopic);
      }
      
      res.status(201).json(createdTopics);
    } catch (error) {
      res.status(400).json({ message: "Invalid topic data" });
    }
  });

  // Generate papers route
  app.post("/api/papers/:paperId/generate", async (req: Request, res: Response) => {
    try {
      const paperId = parseInt(req.params.paperId);
      const { studentIds } = req.body;
      
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ message: "No students selected" });
      }
      
      const paper = await storage.getPaper(paperId);
      if (!paper) {
        return res.status(404).json({ message: "Paper not found" });
      }
      
      const topics = await storage.getQuestionTopicsByPaperId(paperId);
      if (!topics || topics.length === 0) {
        // Auto-create a default topic with the paper's totalQuestions
        const defaultTopic = {
          topicName: "Main Topic",
          questionType: "Multiple Choice",
          difficultyLevel: "Medium",
          // Default to 5 questions, but we'll adjust this based on available questions later
          numberOfQuestions: paper.totalQuestions || 5,
          marksPerQuestion: Math.ceil((paper.totalMarks || 10) / (paper.totalQuestions || 5)),
          paperId: paperId
        };
        
        const validatedData = insertQuestionTopicSchema.parse(defaultTopic);
        const createdTopic = await storage.createQuestionTopic(validatedData);
        topics.push(createdTopic);
      }

      // Create initial generated papers with pending status
      const generatedPapers: any[] = [];
      for (const studentId of studentIds) {
        const generatedPaper = await storage.createGeneratedPaper({
          paperId,
          studentId: parseInt(studentId),
          status: "Pending"
        });
        generatedPapers.push(generatedPaper);
      }

      // In a real implementation, this would be a background task
      // For simplicity, we'll just return the initial response
      res.status(202).json({
        message: "Paper generation started",
        generatedPapers
      });

      // Process each student paper asynchronously
      // Using setTimeout to ensure the response is sent before processing starts
      setTimeout(() => {
        processGeneratedPapers(paper, topics, generatedPapers)
          .catch(err => console.error("Error in paper generation process:", err));
      }, 100);
      
    } catch (error) {
      res.status(500).json({ message: "Failed to generate papers" });
    }
  });

  // Get generation status
  app.get("/api/generated-papers/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const generatedPaper = await storage.getGeneratedPaper(id);
      
      if (!generatedPaper) {
        return res.status(404).json({ message: "Generated paper not found" });
      }
      
      res.json(generatedPaper);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch generated paper" });
    }
  });

  // Get all generated papers for a paper
  app.get("/api/papers/:paperId/generated-papers", async (req: Request, res: Response) => {
    try {
      const paperId = parseInt(req.params.paperId);
      const generatedPapers = await storage.getGeneratedPapersByPaperId(paperId);
      
      // For each generated paper, get the student info
      const result = [];
      for (const paper of generatedPapers) {
        const student = await storage.getStudent(paper.studentId);
        result.push({
          ...paper,
          student
        });
      }
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch generated papers" });
    }
  });

  // Question Bank Routes
  app.get("/api/questions", async (req: Request, res: Response) => {
    try {
      let questions = [];
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const subject = req.query.subject as string;
      const topic = req.query.topic as string;
      const verifiedOnly = req.query.verified === 'true';
      
      if (verifiedOnly) {
        questions = await storage.getVerifiedQuestions();
      } else if (userId) {
        questions = await storage.getQuestionsByTeacher(userId);
      } else if (subject) {
        questions = await storage.getQuestionsBySubject(subject);
      } else if (topic) {
        questions = await storage.getQuestionsByTopic(topic);
      } else {
        // Default: Get all questions regardless of verification status
        questions = await storage.getQuestionsByTeacher(1); // Default teacher ID
      }
      
      res.json(questions);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  app.get("/api/questions/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const question = await storage.getQuestion(id);
      
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      res.json(question);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch question" });
    }
  });

  app.post("/api/questions", async (req: Request, res: Response) => {
    try {
      const validatedData = insertQuestionBankSchema.parse(req.body);
      const question = await storage.createQuestion(validatedData);
      res.status(201).json(question);
    } catch (error) {
      console.error("Error creating question:", error);
      res.status(400).json({ 
        message: "Invalid question data", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  app.put("/api/questions/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updatedQuestion = await storage.updateQuestion(id, req.body);
      
      if (!updatedQuestion) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      res.json(updatedQuestion);
    } catch (error) {
      res.status(400).json({ message: "Failed to update question" });
    }
  });
  
  app.post("/api/questions/generate", async (req: Request, res: Response) => {
    try {
      const { subject, topic, questionType, difficultyLevel, count } = req.body;
      
      if (!subject || !topic || !questionType || !difficultyLevel || !count) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Check if OpenAI is available
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ message: "OpenAI API key not configured" });
      }
      
      // Construct the prompt based on question type
      let prompt = "";
      
      if (questionType === "Multiple Choice" || questionType === "True/False") {
        prompt = `Generate ${count} ${questionType === "True/False" ? "true/false" : "multiple choice"} questions about ${topic} in ${subject} at ${difficultyLevel} difficulty level.
        ${questionType === "Multiple Choice" ? "Each question should have 4 options (A, B, C, D) with one correct answer." : "Each question should be answerable with True or False."}
        
        Format your response as a JSON object with a "questions" field containing an array of questions, each with the following structure:
        {
          "questionText": "The question text",
          ${questionType === "Multiple Choice" ? 
            `"options": { "A": "First option", "B": "Second option", "C": "Third option", "D": "Fourth option" },
            "correctAnswer": "The letter of the correct option (A, B, C, or D)",` :
            `"options": { "A": "True", "B": "False" },
            "correctAnswer": "The letter of the correct option (A or B)",`
          }
          "explanation": "Explanation of why this answer is correct (optional)"
        }`;
      } else if (questionType === "Short Answer" || questionType === "Long Answer" || questionType === "Problem Solving") {
        prompt = `Generate ${count} ${questionType.toLowerCase()} questions about ${topic} in ${subject} at ${difficultyLevel} difficulty level.
        
        Format your response as a JSON object with a "questions" field containing an array of questions, each with the following structure:
        {
          "questionText": "The question text",
          "correctAnswer": "A sample correct answer that would be expected from a student",
          "explanation": "Guidelines for evaluating answers (optional)"
        }`;
      }
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
        messages: [
          { role: "system", content: "You are a helpful assistant specialized in creating high-quality educational content." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });

      // Parse the response
      const content = response.choices[0].message.content;
      if (!content) {
        return res.status(500).json({ message: "Empty response from OpenAI" });
      }

      const parsedResponse = JSON.parse(content);
      const questions = parsedResponse.questions || [];

      // Save each question to the database
      const savedQuestions = [];
      for (const q of questions) {
        const questionData = {
          subject,
          topic,
          questionType,
          difficultyLevel,
          questionText: q.questionText,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || null,
          marksValue: 1,
          userId: req.body.userId || 1, // Default to user ID 1 if not provided
        };

        const savedQuestion = await storage.createQuestion(questionData);
        savedQuestions.push(savedQuestion);
      }

      return res.json({ success: true, count: savedQuestions.length, questions: savedQuestions });
    } catch (error: any) {
      console.error("Error generating questions:", error);
      return res.status(500).json({ 
        message: `Failed to generate questions: ${error?.message || "Unknown error"}` 
      });
    }
  });

  app.put("/api/questions/:id/verify", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const verifiedQuestion = await storage.verifyQuestion(id);
      
      if (!verifiedQuestion) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      res.json(verifiedQuestion);
    } catch (error) {
      res.status(400).json({ message: "Failed to verify question" });
    }
  });

  app.delete("/api/questions/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteQuestion(id);
      
      if (!success) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      res.status(200).json({ message: "Question deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete question" });
    }
  });

  // Paper Questions Routes
  app.get("/api/papers/:paperId/questions", async (req: Request, res: Response) => {
    try {
      const paperId = parseInt(req.params.paperId);
      const studentId = req.query.studentId ? parseInt(req.query.studentId as string) : undefined;
      
      let questions;
      if (studentId) {
        questions = await storage.getPaperQuestionsByStudentId(paperId, studentId);
      } else {
        questions = await storage.getPaperQuestionsByPaperId(paperId);
      }
      
      res.json(questions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch paper questions" });
    }
  });

  app.post("/api/papers/:paperId/questions", async (req: Request, res: Response) => {
    try {
      const paperId = parseInt(req.params.paperId);
      const validatedData = insertPaperQuestionsSchema.parse({
        ...req.body,
        paperId
      });
      
      const paperQuestion = await storage.createPaperQuestion(validatedData);
      res.status(201).json(paperQuestion);
    } catch (error) {
      console.error("Error creating paper question:", error);
      res.status(400).json({ 
        message: "Invalid paper question data",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to generate content with OpenAI
async function generateWithOpenAI(promptContent: any, topics: any[], student: any, paper: any) {
  let prompt;
  
  // Check if this is an MCQ template
  if (promptContent.templateType === "Multiple Choice Only (MCQ)") {
    // MCQ template format based on provided DOCX
    prompt = `
    Generate a unique MCQ-only question paper with the following details:
    
    University: The Islamia University of Bahawalpur
    Department: Department of ${promptContent.subject}, FoC, Baghdad-Ul-Jadeed Campus
    Program/Semester: ${promptContent.classGrade} (Fall 2025)
    Maximum Marks: ${promptContent.totalMarks}
    Subject: ${promptContent.subject}
    Time: ${promptContent.timeAllowed} Mins
    Instructor: Fill in based on student's teacher
    Exam: Mid Term
    Date: ${promptContent.examDate}
    Paper Type: MCQS (circle the right choice. Cutting and overwriting is not allowed)
    
    Student Name: ${promptContent.studentName}
    Roll No: ${promptContent.studentRollNumber}
    
    You need to generate a unique paper with ${promptContent.totalMarks} multiple choice questions on the following topics:
    ${promptContent.topics.map((t: any) => `${t.topicName} (${t.numberOfQuestions} questions, ${t.marksPerQuestion} marks each, ${t.difficultyLevel} difficulty)`).join('\n')}
    
    Variation Level: ${promptContent.variationLevel} - This means make this paper unique compared to others.
    
    Format your response as a JSON object with:
    1. paperHeader object containing university, department, program, marks, subject, time, examType, date, paperType, studentName, rollNumber
    2. questions array containing questionNumber, questionText, options (object with A,B,C,D keys), correctAnswer (letter)
    
    Make all questions challenging and tailored to the student's level.`;
  } else {
    // Standard paper format
    prompt = `
    Generate a unique question paper with the following details:
    
    Paper Title: ${promptContent.paperTitle}
    Subject: ${promptContent.subject}
    Class/Grade: ${promptContent.classGrade}
    Student Name: ${promptContent.studentName}
    Roll Number: ${promptContent.studentRollNumber}
    Exam Date: ${promptContent.examDate}
    Time Allowed: ${promptContent.timeAllowed} minutes
    Total Marks: ${promptContent.totalMarks}
    
    This paper should include sections for the following topics:
    ${promptContent.topics.map((t: any) => `${t.topicName} (${t.numberOfQuestions} ${t.questionType} questions, ${t.marksPerQuestion} marks each, ${t.difficultyLevel} difficulty)`).join('\n')}
    
    Variation Level: ${promptContent.variationLevel} - This means make this paper unique compared to others.
    
    Format your response as a JSON object with:
    1. paperHeader object containing title, subject, class, studentName, rollNumber, examDate, timeAllowed, totalMarks
    2. sections array, each with topicName, questionType, and questions array
    3. Each question should have questionNumber, questionText, marks, and if it's multiple choice, also include options object and correctAnswer
    
    Make all questions challenging and tailored to the student's level.`;
  }
  
  try {
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
      messages: [
        { role: "system", content: "You are a helpful assistant specialized in creating high-quality educational content." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });
    
    // Parse the response
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }
    
    return JSON.parse(content);
  } catch (error: any) {
    console.error("Error generating paper with OpenAI:", error.message);
    throw new Error(`Failed to generate paper with OpenAI: ${error.message}`);
  }
}

// Helper function to process generated papers with OpenAI
async function processGeneratedPapers(paper: any, topics: any[], generatedPapers: any[]) {
  console.log("Processing papers:", {
    paperDetails: paper,
    topicsCount: topics.length,
    generatedPapersCount: generatedPapers.length
  });
  
  for (const generatedPaper of generatedPapers) {
    try {
      // Get the student information
      const student = await storage.getStudent(generatedPaper.studentId);
      if (!student) {
        // If student not found, mark as failed
        await storage.updateGeneratedPaper(generatedPaper.id, { 
          status: "Failed",
          content: { error: "Student information not found" }
        });
        continue;
      }

      // Update status to Processing
      await storage.updateGeneratedPaper(generatedPaper.id, { status: "Processing" });

      // Format the topics for the prompt
      const formattedTopics = topics.map((topic: any) => ({
        topicName: topic.topicName,
        questionType: topic.questionType,
        numberOfQuestions: topic.numberOfQuestions,
        marksPerQuestion: topic.marksPerQuestion,
        difficultyLevel: topic.difficultyLevel
      }));

      // Get current date in DD/MM/YYYY format if not provided
      const currentDate = new Date();
      const formattedDate = paper.examDate || 
        `${currentDate.getDate().toString().padStart(2, '0')}/${(currentDate.getMonth() + 1).toString().padStart(2, '0')}/${currentDate.getFullYear()}`;

      // Prepare content for paper generation with new university-related fields
      const promptContent = {
        paperTitle: paper.title,
        subject: paper.subject,
        universityName: paper.universityName || "The Islamia University of Bahawalpur",
        departmentName: paper.departmentName || `Department of ${paper.subject}`,
        programName: paper.programName || "BS Computer Science",
        semesterName: paper.semesterName || "Fall 2025",
        className: paper.className || "",
        instructorName: paper.instructorName || "Dr. Faculty Member",
        paperType: paper.paperType || "Midterm",
        studentName: student.name,
        studentRollNumber: student.rollNumber,
        examDate: formattedDate,
        timeAllowed: paper.timeAllowed || 60,
        totalMarks: paper.totalMarks || 0,
        topics: formattedTopics,
        templateType: paper.templateType || "Standard Question Paper"
      };

      let generatedContent;
      
      try {
        console.log(`Getting verified questions from question bank for subject: ${paper.subject}`);
        // Get all verified questions
        const verifiedQuestions = await storage.getVerifiedQuestions();
        
        // Filter to just questions from this subject
        const subjectQuestions = verifiedQuestions.filter(q => 
          q.subject.toLowerCase() === paper.subject.toLowerCase()
        );
        
        console.log(`Found ${subjectQuestions.length} verified questions for subject: ${paper.subject}`);
        
        // Calculate total questions needed across all topics
        let totalQuestionsNeeded = 0;
        
        // If we have topics, calculate from them; otherwise use paper.totalQuestions
        let originalQuestionsNeeded = 0;
        
        if (topics.length === 1 && topics[0].topicName === "Main Topic") {
          // This is our auto-created topic
          originalQuestionsNeeded = paper.totalQuestions || topics[0].numberOfQuestions;
          console.log(`Using default topic with ${originalQuestionsNeeded} questions`);
        } else {
          originalQuestionsNeeded = topics.reduce((sum: number, topic: any) => 
            sum + topic.numberOfQuestions, 0);
          console.log(`Using ${originalQuestionsNeeded} questions from topics configuration`);
        }
        
        // Check if we have enough questions
        if (subjectQuestions.length < originalQuestionsNeeded) {
          console.log(`Warning: Not enough questions available (${subjectQuestions.length}). Using all available instead of requested ${originalQuestionsNeeded}.`);
          
          // Adjust the topics to use available questions
          if (topics.length === 1 && topics[0].topicName === "Main Topic") {
            // This is our auto-created topic, adjust it
            const mainTopic = topics[0];
            const newQuestionCount = subjectQuestions.length;
            
            // Update topic in database
            await storage.updateQuestionTopic(mainTopic.id, {
              numberOfQuestions: newQuestionCount
            });
            
            // Update in our local variable too
            mainTopic.numberOfQuestions = newQuestionCount;
            
            // Also update totalQuestionsNeeded
            totalQuestionsNeeded = newQuestionCount;
          } else {
            // For multiple topics, we'll adjust later when filtering by topic
            totalQuestionsNeeded = subjectQuestions.length;
          }
        } else {
          totalQuestionsNeeded = originalQuestionsNeeded;
        }
          
        // Use whatever questions we have available
        console.log(`Using ${totalQuestionsNeeded} questions from question bank`);
          
          // Shuffle the array to pick random questions
          const shuffledQuestions = [...subjectQuestions].sort(() => 0.5 - Math.random());
          let questionIndex = 0;
          
          // Handle MCQ-only paper format
          if (promptContent.templateType === "Multiple Choice Only (MCQ)") {
            // Filter to only get MCQ questions
            const mcqQuestions = shuffledQuestions.filter(q => 
              q.questionType === 'Multiple Choice'
            );
            
            if (mcqQuestions.length >= totalQuestionsNeeded) {
              // Select random MCQ questions up to the amount needed
              const selectedQuestions = mcqQuestions.slice(0, totalQuestionsNeeded);
              
              // Build the paper with header and question list
              const formattedQuestions = selectedQuestions.map((q, index) => {
                // Parse options if stored as string
                let options = q.options;
                let correctAnswer = q.correctAnswer || "A";
                
                if (typeof options === 'string') {
                  try {
                    options = JSON.parse(options);
                  } catch (e) {
                    options = { A: "Option A", B: "Option B", C: "Option C", D: "Option D" };
                  }
                }
                
                // Randomize MCQ options to prevent cheating
                const typedOptions = options as Record<string, string>;
                const correctOptionText = typedOptions[correctAnswer];
                const optionKeys = ["A", "B", "C", "D"];
                
                // Create shuffled options
                const optionsEntries = Object.entries(typedOptions);
                const shuffledEntries = [...optionsEntries].sort(() => Math.random() - 0.5);
                
                // Create new options object with shuffled options
                const newOptions: Record<string, string> = {};
                let newCorrectAnswer = correctAnswer;
                
                shuffledEntries.forEach((entry, idx) => {
                  const newKey = optionKeys[idx];
                  newOptions[newKey] = entry[1];
                  
                  // Keep track of where the correct answer moved to
                  if (entry[1] === correctOptionText) {
                    newCorrectAnswer = newKey;
                  }
                });
                
                // Record the question usage in paper_questions table
                try {
                  storage.createPaperQuestion({
                    paperId: paper.id,
                    studentId: student.id,
                    questionId: q.id,
                    questionNumber: questionIndex++
                  });
                } catch (e) {
                  console.error("Error saving paper question reference:", e);
                }
                
                // Return the formatted question with randomized options
                return {
                  questionNumber: index + 1,
                  questionText: q.questionText,
                  options: newOptions,
                  correctAnswer: newCorrectAnswer
                };
              });
              
              // Set the paper content with MCQ format using the new university fields
              generatedContent = {
                paperHeader: {
                  university: promptContent.universityName,
                  department: promptContent.departmentName,
                  program: promptContent.programName,
                  semester: promptContent.semesterName,
                  class: promptContent.className,
                  instructor: promptContent.instructorName,
                  marks: `${promptContent.totalMarks}`,
                  subject: promptContent.subject,
                  time: `${promptContent.timeAllowed} Mins`,
                  examType: promptContent.paperType,
                  date: promptContent.examDate,
                  paperType: "MCQS (circle the right choice. Cutting and overwriting is not allowed)",
                  studentName: promptContent.studentName,
                  rollNumber: promptContent.studentRollNumber
                },
                questions: formattedQuestions
              };
            } else {
              // Not enough MCQ questions in the bank, log a warning but continue
              console.log(`Warning: Limited MCQ questions available: found ${mcqQuestions.length}, need ${totalQuestionsNeeded}`);
              
              // Use the questions we have, even if fewer than requested
              const availableQuestions = mcqQuestions.slice(0, mcqQuestions.length);
              const formattedQuestions = availableQuestions.map(q => ({
                question: q.questionText,
                options: q.options || [],
                answer: q.answer || "",
                marks: topic.marksPerQuestion
              }));
              
              generatedContent = {
                paper: {
                  title: promptContent.title,
                  subject: promptContent.subject,
                  class: promptContent.class,
                  totalMarks: promptContent.totalMarks.toString(),
                  studentName: promptContent.studentName,
                  rollNumber: promptContent.studentRollNumber
                },
                questions: formattedQuestions
              };
            }
          } else {
            // Handle standard multi-section paper format
            const sections = [];
            
            // Process each topic as a separate section
            for (const topic of topics) {
              // For the automatically created default topic, don't filter by topic name
              const isDefaultTopic = topic.topicName === "Main Topic";
              
              // Find verified questions matching this topic and question type
              const topicQuestions = shuffledQuestions.filter(q => 
                q.questionType === topic.questionType && 
                (isDefaultTopic || q.topic.toLowerCase() === topic.topicName.toLowerCase() || !q.topic)
              );
              
              // If we don't have enough questions for this topic, adjust the number to what's available
              const availableQuestions = topicQuestions.length;
              const questionCount = Math.min(availableQuestions, topic.numberOfQuestions);

              if (availableQuestions > 0) {
                console.log(`Using ${questionCount}/${topic.numberOfQuestions} questions for topic ${topic.topicName}`);
                
                // Use however many questions we have for this topic
                const selectedTopicQuestions = topicQuestions.slice(0, questionCount);
                
                // Format questions for this section, randomizing MCQ options
                const questionsForSection = selectedTopicQuestions.map((q, index) => {
                  // Parse options if stored as string
                  let options = q.options;
                  let correctAnswer = q.correctAnswer;
                  
                  if (typeof options === 'string') {
                    try {
                      options = JSON.parse(options);
                    } catch (e) {
                      options = {};
                    }
                  }
                  
                  // Randomize options for multiple choice questions
                  if (q.questionType === 'Multiple Choice' && options && typeof options === 'object') {
                    const typedOptions = options as Record<string, string>;
                    if (Object.keys(typedOptions).length > 0 && correctAnswer) {
                      const correctOptionText = typedOptions[correctAnswer];
                      const optionKeys = ["A", "B", "C", "D"];
                      
                      // Shuffle options
                      const optionsEntries = Object.entries(typedOptions);
                      const shuffledEntries = [...optionsEntries].sort(() => Math.random() - 0.5);
                      
                      // Create new options with shuffled order
                      const newOptions: Record<string, string> = {};
                      let newCorrectAnswer = correctAnswer;
                      
                      shuffledEntries.forEach((entry, idx) => {
                        const newKey = optionKeys[idx];
                        newOptions[newKey] = entry[1];
                        
                        // Update correct answer letter
                        if (entry[1] === correctOptionText) {
                          newCorrectAnswer = newKey;
                        }
                      });
                      
                      options = newOptions;
                      correctAnswer = newCorrectAnswer;
                    }
                  }
                  
                  // Record the question usage in paper_questions table
                  try {
                    storage.createPaperQuestion({
                      paperId: paper.id,
                      studentId: student.id,
                      questionId: q.id,
                      questionNumber: questionIndex++
                    });
                  } catch (e) {
                    console.error("Error saving paper question reference:", e);
                  }
                  
                  // Return the formatted question
                  return {
                    questionNumber: index + 1,
                    questionText: q.questionText,
                    marks: topic.marksPerQuestion,
                    options: options,
                    correctAnswer: correctAnswer
                  };
                });
                
                // Add this topic section to the paper (even if we don't have all the questions)
                sections.push({
                  topicName: topic.topicName,
                  questionType: topic.questionType,
                  questions: questionsForSection
                });
              } else {
                console.log(`Warning: No questions found for topic ${topic.topicName}`);
                // Continue to the next topic instead of failing
                continue;
              }
            }
            
            // Build the paper with new university fields
            generatedContent = {
              paperHeader: {
                university: promptContent.universityName,
                department: promptContent.departmentName,
                program: promptContent.programName,
                semester: promptContent.semesterName,
                class: promptContent.className,
                instructor: promptContent.instructorName,
                title: promptContent.paperTitle,
                subject: promptContent.subject,
                examType: promptContent.paperType,
                studentName: promptContent.studentName,
                rollNumber: promptContent.studentRollNumber,
                examDate: promptContent.examDate,
                timeAllowed: `${promptContent.timeAllowed} minutes`,
                totalMarks: promptContent.totalMarks.toString()
              },
              sections: sections
            };
          }
        }
      } catch (error) {
        // Error with question bank generation, fail the paper generation
        console.error("Error using question bank:", error);
        throw error;
      }
      
      // If no generatedContent was created, fail the paper generation
      if (!generatedContent) {
        throw new Error("Failed to generate paper content using the question bank");
      }

      // Create a file path reference
      const filePath = `generated_papers/${paper.id}_${student.rollNumber}_${randomUUID()}.pdf`;

      // Update the generated paper record with the final content
      await storage.updateGeneratedPaper(generatedPaper.id, {
        content: generatedContent,
        filePath,
        status: "Completed"
      });
    } catch (error) {
      // Handle any errors in paper generation
      console.error(`Error generating paper for student ${generatedPaper.studentId}:`, error);
      
      // Mark the paper as failed
      await storage.updateGeneratedPaper(generatedPaper.id, {
        status: "Failed",
        content: { error: String(error) || "Unknown error" }
      });
    }
  }
}
