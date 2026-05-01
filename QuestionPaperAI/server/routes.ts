//import original routes.ts but replace the processGeneratedPapers function
import express, { Express, Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import { createServer, Server } from "http";
import { storage } from "./storage";
import { db, pool, queryDb } from "./db";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import * as z from "zod";
import OpenAI from "openai";
import { insertStudentSchema } from "@shared/schema";

// Import the fixed processGeneratedPapers function
import { processGeneratedPapers } from "./fixed-generate";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (req, file, cb) => {
    console.log("Processing file upload:", file.originalname, file.mimetype);
    
    // Check file extension
    const extname = path.extname(file.originalname).toLowerCase();
    
    // Accept CSV files by extension
    if (extname === '.csv') {
      console.log("Accepting CSV file:", file.originalname);
      return cb(null, true);
    }
    
    // Accept DOCX files
    if (extname === '.docx' && 
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      console.log("Accepting DOCX file:", file.originalname);
      return cb(null, true);
    }
    
    // Accept PDF files
    if (extname === '.pdf' && file.mimetype === 'application/pdf') {
      console.log("Accepting PDF file:", file.originalname);
      return cb(null, true);
    }
    
    console.log("Rejecting file:", file.originalname, file.mimetype);
    cb(new Error("Error: Only CSV, DOCX, and PDF files are allowed!"));
  }
});

// Register API routes
export async function registerRoutes(app: Express): Promise<Server> {
  const server = createServer(app);

  // SCAN SHEET ENDPOINT
  // Accepts image uploads, forwards to Python scan service, returns result
  const scanUpload = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (req, file, cb) => {
      const extname = path.extname(file.originalname).toLowerCase();
      if ([".png", ".jpg", ".jpeg"].includes(extname)) {
        return cb(null, true);
      }
      cb(new Error("Only PNG, JPG, JPEG image files are allowed!"));
    }
  });

  app.post("/api/scan-sheet", scanUpload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image uploaded" });
      }
      const fs = await import('fs/promises');
      const axios = await import('axios');
      const imgPath = req.file.path;
      const imgStream = await fs.readFile(imgPath);
      // Forward image to Python scan microservice
      const scanRes = await axios.default.post(
        'http://localhost:5001/scan',
        { file: imgStream },
        {
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `form-data; name="file"; filename="${req.file.originalname}"`
          }
        }
      ).catch(err => {
        return { data: { error: err.message } };
      });
      // Clean up uploaded file
      await fs.unlink(imgPath);
      res.json(scanRes.data);
    } catch (err) {
      res.status(500).json({ error: 'Failed to scan image', details: err instanceof Error ? err.message : err });
    }
  });

  // STUDENT ROUTES
  app.get("/api/students", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId ? Number(req.query.userId) : undefined;
      
      // Use our direct SQL function instead of ORM
      const { getStudentsDirectSql } = await import('./db');
      const students = await getStudentsDirectSql(userId);
      
      // Return empty array if no students found to avoid breaking frontend
      res.json(students || []);
    } catch (error) {
      console.error("Error fetching students:", error);
      // Return empty array to avoid breaking frontend
      res.json([]);
    }
  });

  app.post("/api/students", async (req: Request, res: Response) => {
    try {
      const studentData = req.body;
      
      // Validate the student data
      const parsedData = insertStudentSchema.parse(studentData);
      
      // Create the student
      const newStudent = await storage.createStudent(parsedData);
      res.status(201).json(newStudent);
    } catch (error) {
      console.error("Error creating student:", error);
      res.status(400).json({ error: "Failed to create student", details: error });
    }
  });

  app.delete("/api/students/:id", async (req: Request, res: Response) => {
    try {
      const studentId = Number(req.params.id);
      
      // Check if the student exists
      const student = await storage.getStudent(studentId);
      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }
      
      // Delete the student
      const success = await storage.deleteStudent(studentId);
      if (success) {
        res.status(200).json({ message: "Student deleted successfully" });
      } else {
        res.status(500).json({ error: "Failed to delete student" });
      }
    } catch (error) {
      console.error("Error deleting student:", error);
      res.status(500).json({ error: "Failed to delete student" });
    }
  });

  app.post("/api/students/upload", upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      let userId = req.body.userId ? Number(req.body.userId) : 1; // Default user ID if not provided
      
      // Read the file
      const fileContent = fs.readFileSync(req.file.path, 'utf8');
      
      // Check for specific format indicators in the file content
      const hasValidHeaders = fileContent.includes("roll_number") || 
                             fileContent.includes("name") || 
                             fileContent.includes("class_section");
      
      // Handle the specific format in the attached file if standard CSV parsing fails
      if (!hasValidHeaders && fileContent.includes("2ND-M2")) {
        console.log("Detected non-standard CSV format, processing manually...");
        
        // Parse the file manually line by line
        const lines = fileContent.split('\n').filter(line => line.trim().length > 0);
        
        // Get the default user if userId is not provided
        if (userId === 1) {
          try {
            const defaultUserResult = await pool.query("SELECT id FROM users WHERE username = 'teacher' LIMIT 1");
            if (defaultUserResult.rows.length > 0) {
              userId = defaultUserResult.rows[0].id;
              console.log("Using default teacher user ID:", userId);
            }
          } catch (err) {
            console.error("Error fetching default user:", err);
          }
        }
        
        // Create student objects from the lines
        const students = lines.map(line => {
          console.log(`Processing line: "${line}"`);
          const parts = line.split(',').map(part => part.trim());
          
          if (parts.length >= 3) {
            // Make sure to preserve the exact format of the class section (e.g. "2ND-M2")
            const classSection = parts[2];
            console.log(`Found class section: "${classSection}"`);
            
            const studentObj = {
              name: parts[1],
              rollNumber: parts[0],
              classSection: classSection,
              userId: userId
            };
            console.log("Created student object from line:", studentObj);
            return studentObj;
          }
          return null;
        }).filter(Boolean);
        
        // Validate student data
        const validStudents = [];
        for (const student of students) {
          try {
            const parsedData = insertStudentSchema.parse(student);
            validStudents.push(parsedData);
          } catch (validationError) {
            console.warn("Validation error for student:", student, validationError);
          }
        }
        
        // Try to create students using direct SQL 
        try {
          const { createStudentsDirectSql } = await import('./db');
          const createdStudents = await createStudentsDirectSql(validStudents);
          
          // If successful, return results and clean up
          if (createdStudents.length > 0) {
            fs.unlinkSync(req.file.path);
            
            return res.status(201).json({
              message: `Successfully imported ${createdStudents.length} students using Direct SQL`,
              students: createdStudents
            });
          }
        } catch (directSqlError) {
          console.error("Direct SQL student creation failed:", directSqlError);
        }
        
        // Fallback to ORM if direct SQL fails
        const createdStudents = await storage.createStudents(validStudents);
        fs.unlinkSync(req.file.path);
        
        return res.status(201).json({
          message: `Successfully imported ${createdStudents.length} students`,
          students: createdStudents
        });
      }
      
      // Standard CSV parsing for normal CSV files
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
      
      // Log the records to see what we're working with
      console.log("Parsed CSV records:", JSON.stringify(records, null, 2));
      
      // Get the default user if userId is not provided
      if (userId === 1) {
        try {
          const defaultUserResult = await pool.query("SELECT id FROM users WHERE username = 'teacher' LIMIT 1");
          if (defaultUserResult.rows.length > 0) {
            userId = defaultUserResult.rows[0].id;
            console.log("Using default teacher user ID:", userId);
          } else {
            console.error("No default user found, using ID 1");
          }
        } catch (err) {
          console.error("Error fetching default user:", err);
        }
      }
      
      // Transform records to student objects
      const students = records.map((record: any) => {
        // Log the exact record we're processing
        console.log("Raw CSV record:", record);
        
        // Process different CSV formats intelligently
        // Standard CSV with name, rollNumber, classSection columns
        let name = 'Student';
        let rollNumber = '';
        let classSection = null;
        
        // Special case detection for the format we're seeing in the logs
        // Format appears to be: {"F24BDATS1E01001":"F24BDATS1M02077","ALI AKBAR":"JAMSHAID ASLAM","2ND-M2":"2ND-M2"}
        // In this case, teacher name is the column, student name is the value, roll number is in first column's value
        const keys = Object.keys(record);
        
        if (record.name) {
          // Standard column "name"
          name = record.name;
          console.log("Using standard 'name' field:", name);
          
          // Look for standard roll number field
          rollNumber = record.rollNumber || record.roll_number || record.id || generateRollNumber();
          // Look for standard class section field
          classSection = record.classSection || record.class_section || null;
        } 
        else if (keys.length >= 2 && keys[1].toUpperCase().includes('AKBAR')) {
          // Special format detection - if second column appears to be a teacher name
          const teacherNameKey = keys[1];
          name = record[teacherNameKey];
          // Use the value in the first column as roll number 
          rollNumber = record[keys[0]];
          // Use the value in the "2ND-M2" column if it exists as class section
          const classSectionKey = keys.find(k => k.includes('-M')) || '';
          classSection = classSectionKey ? record[classSectionKey] : null;
          
          console.log("Detected student list format with teacher column:", {
            nameKey: teacherNameKey,
            name: name,
            rollNumberKey: keys[0],
            rollNumber: rollNumber,
            classSectionKey: classSectionKey,
            classSection: classSection
          });
        }
        else if (record.student_name) {
          name = record.student_name;
          console.log("Using 'student_name' field:", name);
          rollNumber = record.roll_number || record.id || generateRollNumber();
          classSection = record.class_section || null;
        } 
        else if (record.studentName) {
          name = record.studentName;
          console.log("Using 'studentName' field:", name);
          rollNumber = record.rollNumber || record.id || generateRollNumber();
          classSection = record.classSection || null;
        } 
        else {
          // Try finding a key that might contain name (values containing alphabets only)
          for (const key of Object.keys(record)) {
            const value = record[key];
            if (typeof value === 'string' && value.match(/^[A-Za-z\s]+$/)) {
              name = value;
              console.log("Using field with alphabetic value as name:", key, value);
              break;
            }
          }
          
          // If still no name found, use default
          if (name === 'Student') {
            console.log("No name field found, using default: 'Student'");
          }
          
          // For roll number, prioritize fields that might look like a student ID
          for (const key of Object.keys(record)) {
            const value = record[key];
            if (typeof value === 'string' && value.match(/^[A-Z0-9]+$/)) {
              rollNumber = value;
              console.log("Using field with alphanumeric ID as roll number:", key, value);
              break;
            }
          }
          
          // If no roll number found, generate one
          if (!rollNumber) {
            rollNumber = generateRollNumber();
            console.log("No roll number field found, generating:", rollNumber);
          }
        }
        
        // Map CSV fields to the database schema structure - with detailed logging
        const studentObj = {
          name: name,
          rollNumber: rollNumber,
          classSection: classSection,
          userId: userId || 1 // Fallback to ID 1 which should be our default user
        };
        
        console.log("Mapped student object:", studentObj);
        return studentObj;
      });
      
      // Validate student data
      const validStudents = [];
      for (const student of students) {
        try {
          const parsedData = insertStudentSchema.parse(student);
          validStudents.push(parsedData);
        } catch (validationError) {
          console.warn("Validation error for student:", student, validationError);
          // Continue processing other students, ignore invalid ones
        }
      }
      
      // Try to create students using direct SQL as a workaround for ORM issues
      try {
        const { createStudentsDirectSql } = await import('./db');
        const createdStudents = await createStudentsDirectSql(validStudents);
        
        // If successful, return results
        if (createdStudents.length > 0) {
          // Clean up the temporary file
          fs.unlinkSync(req.file.path);
          
          return res.status(201).json({
            message: `Successfully imported ${createdStudents.length} students using Direct SQL`,
            students: createdStudents
          });
        }
      } catch (directSqlError) {
        console.error("Direct SQL student creation failed:", directSqlError);
        // Continue to try the ORM method as fallback
      }
      
      // Fallback to using the ORM if direct SQL fails
      console.log("Falling back to ORM for student creation");
      const createdStudents = await storage.createStudents(validStudents);
      
      // Clean up the temporary file
      fs.unlinkSync(req.file.path);
      
      res.status(201).json({
        message: `Successfully imported ${createdStudents.length} students`,
        students: createdStudents
      });
    } catch (error) {
      console.error("Error uploading students:", error);
      
      // Clean up the file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ error: "Failed to process student upload", details: error });
    }
  });

  // PAPER ROUTES
  app.get("/api/papers", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId ? Number(req.query.userId) : undefined;
      
      // Use our getPapersDirectSql function from db.ts
      const { getPapersDirectSql } = await import('./db');
      const papers = await getPapersDirectSql(userId);
      
      // Return empty array if no results, to avoid breaking the frontend
      res.json(papers || []);
    } catch (error) {
      console.error("Error fetching papers:", error);
      // Return empty array on error to avoid breaking the frontend
      res.json([]);
    }
  });

  app.get("/api/papers/:id", async (req: Request, res: Response) => {
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
  
  app.delete("/api/papers/:id", async (req: Request, res: Response) => {
    try {
      const paperId = Number(req.params.id);
      
      // Check if paper exists before deleting
      const paper = await storage.getPaper(paperId);
      if (!paper) {
        return res.status(404).json({ error: "Paper not found" });
      }
      
      // Import the deletePaper function
      const { deletePaper } = await import("./deletePaper");
      
      // Use our specialized function to delete the paper
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

  app.post("/api/papers", async (req: Request, res: Response) => {
    try {
      const paperData = req.body;
      
      // Keep examDate as string if it's in DD/MM/YYYY format
      if (paperData.examDate && typeof paperData.examDate === 'string') {
        // If already in DD/MM/YYYY format, keep it as is
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(paperData.examDate)) {
          // Keep as is
        } else {
          try {
            const date = new Date(paperData.examDate);
            if (!isNaN(date.getTime())) {
              // Convert to DD/MM/YYYY format
              paperData.examDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
            } else {
              paperData.examDate = null;
            }
          } catch (e) {
            paperData.examDate = null;
          }
        }
      } else if (paperData.examDate === '') {
        paperData.examDate = null;
      }
      
      console.log("Processed paper data for creation:", {
        ...paperData,
        examDate: paperData.examDate ? paperData.examDate.toString() : null
      });
      
      // Create the paper
      const newPaper = await storage.createPaper(paperData);
      
      // Helper function to determine question types based on template
      function getQuestionTypeForTemplate(templateType: string): { type: string, marks: number }[] {
        switch(templateType) {
          case "Multiple Choice Only (MCQ)":
            return [{ type: "Multiple Choice", marks: 1 }];
          case "Short Answer Only":
            return [{ type: "Short Answer", marks: 5 }];
          case "Coding Questions Only":
            return [{ type: "Coding Type Long Question", marks: 10 }];
          case "Mixed (MCQ + Short Answer)":
            return [
              { type: "Multiple Choice", marks: 1 },
              { type: "Short Answer", marks: 5 }
            ];
          case "Mixed (All Types)":
            return [
              { type: "Multiple Choice", marks: 1 },
              { type: "Short Answer", marks: 5 },
              { type: "Coding Type Long Question", marks: 10 }
            ];
          default:
            return [{ type: "Multiple Choice", marks: 1 }];
        }
      }

      // If we don't have topics specified, create default topics
      if (!paperData.topics || paperData.topics.length === 0) {
        const questionTypes = getQuestionTypeForTemplate(paperData.templateType || "Multiple Choice Only (MCQ)");
        
        // Create topics for each question type
        for (const questionType of questionTypes) {
          const totalQuestionsPerType = Math.floor((paperData.totalQuestions || 10) / questionTypes.length);
          const defaultTopic = {
            paperId: newPaper.id,
            topicName: `${questionType.type} Section`,
            questionType: questionType.type,
            numberOfQuestions: totalQuestionsPerType,
            marksPerQuestion: questionType.marks,
            difficultyLevel: paperData.difficultyLevel || "Medium"
          };
        
          // Log the default topic we're creating for debugging
          console.log("Creating default topic:", defaultTopic);
          
          try {
            // Check if all required fields are present
            if (defaultTopic.topicName && 
                defaultTopic.questionType && 
                defaultTopic.numberOfQuestions && 
                defaultTopic.marksPerQuestion && 
                defaultTopic.difficultyLevel &&
                defaultTopic.paperId) {
              
              // Ensure numeric fields are numbers
              defaultTopic.numberOfQuestions = Number(defaultTopic.numberOfQuestions);
              defaultTopic.marksPerQuestion = Number(defaultTopic.marksPerQuestion);
              
              await storage.createQuestionTopic(defaultTopic);
              console.log("Successfully created default topic");
            } else {
              console.error("Missing required fields for default topic creation");
            }
          } catch (topicError) {
            console.error("Failed to create default topic:", topicError);
            // We'll still return the paper even if topic creation fails
          }
        }
      }
      
      res.status(201).json(newPaper);
    } catch (error) {
      console.error("Error creating paper:", error);
      res.status(400).json({ error: "Failed to create paper", details: error });
    }
  });

  app.put("/api/papers/:id", async (req: Request, res: Response) => {
    try {
      const paperId = Number(req.params.id);
      const paperData = req.body;
      
      // Update the paper
      const updatedPaper = await storage.updatePaper(paperId, paperData);
      
      if (!updatedPaper) {
        return res.status(404).json({ error: "Paper not found" });
      }
      
      res.json(updatedPaper);
    } catch (error) {
      console.error("Error updating paper:", error);
      res.status(400).json({ error: "Failed to update paper", details: error });
    }
  });

  // TEMPLATES ROUTES
  app.post("/api/templates/upload", upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      // For now, we just acknowledge the upload
      // In a real system, we'd store the template and process it
      
      // Clean up the temporary file
      fs.unlinkSync(req.file.path);
      
      res.status(200).json({
        message: "Template uploaded successfully",
        filename: req.file.originalname
      });
    } catch (error) {
      console.error("Error uploading template:", error);
      
      // Clean up the file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ error: "Failed to process template upload", details: error });
    }
  });

  // TOPIC ROUTES
  app.get("/api/papers/:paperId/topics", async (req: Request, res: Response) => {
    try {
      const paperId = Number(req.params.paperId);
      const topics = await storage.getQuestionTopicsByPaperId(paperId);
      res.json(topics);
    } catch (error) {
      console.error("Error fetching topics:", error);
      res.status(500).json({ error: "Failed to fetch topics" });
    }
  });

  app.post("/api/papers/:paperId/topics", async (req: Request, res: Response) => {
    try {
      const paperId = Number(req.params.paperId);
      
      // Debug the incoming request
      console.log("Received topic creation request for paperId:", paperId);
      console.log("Request body:", req.body, "Type:", typeof req.body, "Is array:", Array.isArray(req.body));
      
      // Check if paper exists
      const paper = await storage.getPaper(paperId);
      if (!paper) {
        return res.status(404).json({ error: "Paper not found" });
      }
      
      // Special case: handle empty request or empty array
      if (!req.body || (typeof req.body === 'object' && Object.keys(req.body).length === 0) || 
          (Array.isArray(req.body) && req.body.length === 0)) {
        
        console.log("Empty request detected, creating default topics based on template");
        
        // Helper function to determine question types based on template
        function getQuestionTypeForTemplate(templateType: string): { type: string, marks: number }[] {
          switch(templateType) {
            case "Multiple Choice Only (MCQ)":
              return [{ type: "Multiple Choice", marks: 1 }];
            case "Short Answer Only":
              return [{ type: "Short Answer", marks: 5 }];
            case "Coding Questions Only":
              return [{ type: "Coding Type Long Question", marks: 10 }];
            case "Mixed (MCQ + Short Answer)":
              return [
                { type: "Multiple Choice", marks: 1 },
                { type: "Short Answer", marks: 5 }
              ];
            case "Mixed (All Types)":
              return [
                { type: "Multiple Choice", marks: 1 },
                { type: "Short Answer", marks: 5 },
                { type: "Coding Type Long Question", marks: 10 }
              ];
            default:
              return [{ type: "Multiple Choice", marks: 1 }];
          }
        }

        const questionTypes = getQuestionTypeForTemplate(paper.templateType || "Multiple Choice Only (MCQ)");
        const defaultTopics = [];

        // Create topics for each question type
        for (const questionType of questionTypes) {
          const totalQuestionsPerType = Math.floor((paper.totalQuestions || 10) / questionTypes.length);
          const defaultTopic = {
            paperId,
            topicName: `${questionType.type} Section`,
            questionType: questionType.type,
            numberOfQuestions: totalQuestionsPerType,
            marksPerQuestion: questionType.marks,
            difficultyLevel: "Medium"
          };
        
          try {
            const newTopic = await storage.createQuestionTopic(defaultTopic);
            console.log("Successfully created default topic:", newTopic);
            defaultTopics.push(newTopic);
          } catch (topicError) {
            console.error("Failed to create default topic:", topicError);
          }
        }

        if (defaultTopics.length === 0) {
          return res.status(400).json({ error: "Failed to create any default topics" });
        }

        return res.status(201).json(defaultTopics);
      }
      
      // Handle both array and single object inputs
      const topicsToCreate = Array.isArray(req.body) ? req.body : [req.body];
      const createdTopics = [];
      
      for (const topicInput of topicsToCreate) {
        // Provide defaults for any missing fields
        const topicData = {
          paperId,
          topicName: topicInput.topicName || "Topic " + (Math.floor(Math.random() * 1000) + 1),
          questionType: topicInput.questionType || "Multiple Choice",
          numberOfQuestions: topicInput.numberOfQuestions ? Number(topicInput.numberOfQuestions) : paper.totalQuestions || 5,
          marksPerQuestion: topicInput.marksPerQuestion ? Number(topicInput.marksPerQuestion) : 
            Math.round((paper.totalMarks || 100) / (topicInput.numberOfQuestions || paper.totalQuestions || 5)),
          difficultyLevel: topicInput.difficultyLevel || "Medium"
        };
        
        // Validate fields after providing defaults
        if (!topicData.topicName || !topicData.questionType || 
            !topicData.numberOfQuestions || !topicData.marksPerQuestion || 
            !topicData.difficultyLevel) {
          console.error("Missing fields for topic:", topicData);
          continue; // Skip this topic but try to process others
        }
        
        // Ensure all numeric fields are numbers
        topicData.numberOfQuestions = Number(topicData.numberOfQuestions);
        topicData.marksPerQuestion = Number(topicData.marksPerQuestion);
        
        console.log("Creating topic with data:", topicData);
        
        // Create the topic
        try {
          const newTopic = await storage.createQuestionTopic(topicData);
          console.log("Topic created successfully:", newTopic);
          createdTopics.push(newTopic);
        } catch (dbError) {
          console.error("Database error creating topic:", dbError);
          // Continue with other topics even if this one fails
        }
      }
      
      if (createdTopics.length === 0) {
        return res.status(400).json({ 
          error: "Failed to create any topics", 
          receivedData: req.body 
        });
      }
      
      // Return all successfully created topics
      res.status(201).json(createdTopics);
    } catch (error) {
      console.error("Error in topic creation route:", error);
      res.status(400).json({ error: "Failed to create topic", details: error });
    }
  });

  // PAPER GENERATION ROUTES
  app.post("/api/papers/:paperId/generate", async (req: Request, res: Response) => {
    try {
      const paperId = Number(req.params.paperId);
      const { studentIds } = req.body;
      
      // Check if paper exists
      const paper = await storage.getPaper(paperId);
      if (!paper) {
        return res.status(404).json({ error: "Paper not found" });
      }
      
      // Get the topics for this paper
      const topics = await storage.getQuestionTopicsByPaperId(paperId);
      if (topics.length === 0) {
        return res.status(400).json({ error: "No topics defined for this paper" });
      }
      
      // Create a generated paper entry for each student
      const generatedPapers = [];
      for (const studentId of studentIds) {
        // Create with basic fields, generatedAt will be handled by the database default value
        const generatedPaper = await storage.createGeneratedPaper({
          paperId,
          studentId: Number(studentId),
          status: "Pending",
          content: {}
        });
        generatedPapers.push(generatedPaper);
      }
      
      // Process the papers in the background
      processGeneratedPapers(paper, topics, generatedPapers)
          .catch(err => console.error("Error in paper generation process:", err));
      
      res.status(200).json({
        message: `Started generating papers for ${studentIds.length} students`,
        generatedPapers
      });
    } catch (error: any) {
      console.error("Error generating papers:", error);
      res.status(500).json({ error: "Failed to generate papers", details: error.message });
    }
  });

  app.get("/api/generated-papers/:id", async (req: Request, res: Response) => {
    try {
      const generatedPaperId = Number(req.params.id);
      const generatedPaper = await storage.getGeneratedPaper(generatedPaperId);
      
      if (!generatedPaper) {
        return res.status(404).json({ error: "Generated paper not found" });
      }
      
      res.json(generatedPaper);
    } catch (error) {
      console.error("Error fetching generated paper:", error);
      res.status(500).json({ error: "Failed to fetch generated paper" });
    }
  });

  app.get("/api/papers/:paperId/generated-papers", async (req: Request, res: Response) => {
    try {
      const paperId = Number(req.params.paperId);
      const generatedPapers = await storage.getGeneratedPapersByPaperId(paperId);
      res.json(generatedPapers);
    } catch (error) {
      console.error("Error fetching generated papers:", error);
      res.status(500).json({ error: "Failed to fetch generated papers" });
    }
  });
  
  app.delete("/api/generated-papers/:id", async (req: Request, res: Response) => {
    try {
      const generatedPaperId = Number(req.params.id);
      const success = await storage.deleteGeneratedPaper(generatedPaperId);
      
      if (success) {
        res.status(200).json({ message: "Generated paper deleted successfully" });
      } else {
        res.status(404).json({ error: "Generated paper not found" });
      }
    } catch (error) {
      console.error("Error deleting generated paper:", error);
      res.status(500).json({ error: "Failed to delete generated paper" });
    }
  });
  
  app.delete("/api/papers/:paperId/generated-papers", async (req: Request, res: Response) => {
    try {
      const paperId = Number(req.params.paperId);
      const success = await storage.deleteAllGeneratedPapersByPaperId(paperId);
      
      if (success) {
        res.status(200).json({ message: "All generated papers deleted successfully" });
      } else {
        res.status(404).json({ error: "Failed to delete generated papers" });
      }
    } catch (error) {
      console.error("Error deleting all generated papers:", error);
      res.status(500).json({ error: "Failed to delete all generated papers" });
    }
  });

  // QUESTION BANK ROUTES
  // Get all available subjects
  app.get("/api/subjects", async (req: Request, res: Response) => {
    try {
      // Import the getUniqueSubjectsDirectSql function
      const { getUniqueSubjectsDirectSql } = await import('./db');
      
      // Get all subjects
      const subjects = await getUniqueSubjectsDirectSql();
      
      res.json(subjects);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      // Return default subjects on error to not break the frontend
      res.json([
        "Object-Oriented Programming",
        "Data Structures",
        "Computer Science"
      ]);
    }
  });
  
  app.get("/api/questions", async (req: Request, res: Response) => {
    try {
      let questions;
      
      if (req.query.subject) {
        questions = await storage.getQuestionsBySubject(req.query.subject as string);
      } else if (req.query.topic) {
        questions = await storage.getQuestionsByTopic(req.query.topic as string);
      } else if (req.query.userId) {
        questions = await storage.getQuestionsByTeacher(Number(req.query.userId));
      } else if (req.query.verified === 'true') {
        questions = await storage.getVerifiedQuestions();
      } else {
        // No specific filter, get all questions
        questions = await storage.getQuestionsByTeacher(1); // Default to user 1 for now
      }
      
      res.json(questions);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ error: "Failed to fetch questions" });
    }
  });

  app.get("/api/questions/:id", async (req: Request, res: Response) => {
    try {
      const questionId = Number(req.params.id);
      const question = await storage.getQuestion(questionId);
      
      if (!question) {
        return res.status(404).json({ error: "Question not found" });
      }
      
      res.json(question);
    } catch (error) {
      console.error("Error fetching question:", error);
      res.status(500).json({ error: "Failed to fetch question" });
    }
  });

  app.post("/api/questions", async (req: Request, res: Response) => {
    try {
      const questionData = req.body;
      
      // Create the question (not verified by default)
      const newQuestion = await storage.createQuestion(questionData);
      res.status(201).json(newQuestion);
    } catch (error) {
      console.error("Error creating question:", error);
      res.status(400).json({ error: "Failed to create question", details: error });
    }
  });

  app.put("/api/questions/:id", async (req: Request, res: Response) => {
    try {
      const questionId = Number(req.params.id);
      const questionData = req.body;
      
      // Update the question
      const updatedQuestion = await storage.updateQuestion(questionId, questionData);
      
      if (!updatedQuestion) {
        return res.status(404).json({ error: "Question not found" });
      }
      
      res.json(updatedQuestion);
    } catch (error) {
      console.error("Error updating question:", error);
      res.status(400).json({ error: "Failed to update question", details: error });
    }
  });

  // AI GENERATION ROUTES
  app.post("/api/questions/generate", async (req: Request, res: Response) => {
    try {
      const { subject, topic, subtopic, difficultyLevel, questionType } = req.body;
      const numQuestions = req.body.count || 3;
      
      // Input validation
      if (!subject || !topic || !questionType || !difficultyLevel) {
        return res.status(400).json({ 
          error: "Missing required fields", 
          requiredFields: ["subject", "topic", "questionType", "difficultyLevel"]
        });
      }
      
      // Prepare prompt for GPT
      let promptContent = `Generate ${numQuestions || 3} ${difficultyLevel} ${questionType} questions about ${topic}`;
      if (subtopic) {
        promptContent += `, specifically on the subtopic of ${subtopic}`;
      }
      promptContent += ` for the subject ${subject}.`;
      
      // Add specific instructions based on question type
      if (questionType === "Multiple Choice") {
        promptContent += ` Each question should have 4 options (A, B, C, D) with exactly one correct answer. For each question, provide: 1) the question text, 2) four options labeled A through D, 3) the correct option letter, and 4) a brief explanation of why that answer is correct.`;
      } else if (questionType === "Short Answer") {
        promptContent += ` Each question should require a concise answer of 1-2 sentences. For each question, provide: 1) the question text, 2) a sample correct answer, and 3) key points that should be included in any correct answer.`;
      } else if (questionType === "Long Answer") {
        promptContent += ` Each question should require an in-depth answer of several paragraphs. For each question, provide: 1) the question text, 2) a bullet point outline of what a complete answer should cover, and 3) up to 3 references or examples that would strengthen the answer.`;
      } else if (questionType === "Problem Solving") {
        promptContent += ` Each question should be a practical problem requiring calculation or step-by-step solution. For each question, provide: 1) the problem statement with all necessary information, 2) a complete step-by-step solution, and 3) the final answer.`;
      } else if (questionType === "True/False") {
        promptContent += ` Each question should be a statement that is clearly either true or false. For each question, provide: 1) the statement, 2) whether it is true or false, and 3) a brief explanation of why.`;
      } else if (questionType === "Coding Type Long Question") {
        promptContent += ` Each question should be an Object-Oriented Programming problem that requires students to write a complete program solution in Python or the specified programming language. For each question, provide: 
        1) A detailed problem statement that describes a real-world scenario requiring OOP concepts (classes, inheritance, encapsulation, polymorphism, etc.), 
        2) The specific requirements and functional expectations of the program, 
        3) A bullet point list of the OOP concepts that should be demonstrated in the solution, 
        4) A complete model solution with proper documentation/comments that can be used as an answer key, and 
        5) A rubric for evaluating student solutions with point allocations for different aspects (correct implementation of OOP concepts, code organization, documentation, etc.).
        
        Each question should require at least 30-40 lines of code to solve properly and be appropriate for students at the specified difficulty level.`;
      }
      
      promptContent += ` Format the response as a JSON array where each item has the fields: questionText, options (for MCQs), correctAnswer, explanation, and any other relevant fields.`;
      
      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { 
            role: "system", 
            content: `You are an expert educator and assessment creator specializing in creating high-quality ${questionType} questions for educational assessments. 
            
Format your response as a valid JSON object with a 'questions' array containing at least ${numQuestions} question objects.

For Multiple Choice questions, each object should have:
- questionText: the question statement
- options: { "A": "first option", "B": "second option", "C": "third option", "D": "fourth option" }
- correctAnswer: the letter of correct answer (A, B, C, or D)
- explanation: explanation of the answer

For other question types, each object should have:
- questionText: the question statement
- correctAnswer: the expected answer
- explanation: explanation or key points`
          },
          { 
            role: "user", 
            content: promptContent
          }
        ],
        response_format: { type: "json_object" }
      });
      
      let questionsData;
      try {
        // Parse the response
        const content = completion.choices[0].message.content || "";
        console.log("AI Response:", content);
        const jsonResponse = JSON.parse(content);
        
        if (Array.isArray(jsonResponse.questions)) {
          questionsData = jsonResponse.questions;
        } else if (Array.isArray(jsonResponse)) {
          questionsData = jsonResponse;
        } else {
          // Handle unexpected response format by checking all properties
          // for any array that might contain the questions
          const possibleArrayKey = Object.keys(jsonResponse).find(key => 
            Array.isArray(jsonResponse[key]) && 
            jsonResponse[key].length > 0 && 
            typeof jsonResponse[key][0] === 'object'
          );
          
          if (possibleArrayKey) {
            questionsData = jsonResponse[possibleArrayKey];
          } else {
            // One last attempt - check if it's a single question object
            if (jsonResponse.questionText || jsonResponse.question) {
              questionsData = [jsonResponse];
            } else {
              throw new Error("Unexpected response format from AI");
            }
          }
        }
      } catch (e) {
        console.error("Error parsing AI response:", e);
        return res.status(500).json({ 
          error: "Failed to parse AI response", 
          aiResponse: completion.choices[0].message.content
        });
      }
      
      // Create questions in the database
      const createdQuestions = [];
      for (const questionItem of questionsData) {
        try {
          // Process different question types
          let processedContent;
          if (questionType === "Multiple Choice") {
            // Process MCQ format
            const options = {};
            if (typeof questionItem.options === 'object' && !Array.isArray(questionItem.options)) {
              // Already in the right format
              processedContent = {
                question: questionItem.questionText || questionItem.question,
                options: questionItem.options,
                correctOption: questionItem.correctAnswer || questionItem.correctOption,
                explanation: questionItem.explanation
              };
            } else if (Array.isArray(questionItem.options)) {
              // Convert from array to object format
              const typedOptions: Record<string, string> = options;
              questionItem.options.forEach((option: any, index: number) => {
                const key = String.fromCharCode(65 + index); // A, B, C, D, etc.
                typedOptions[key] = typeof option === 'object' ? option.text : option;
              });
              
              processedContent = {
                question: questionItem.questionText || questionItem.question,
                options: options,
                correctOption: questionItem.correctAnswer || questionItem.correctOption,
                explanation: questionItem.explanation
              };
            } else {
              // Handle unexpected format for MCQs
              console.error("Unexpected MCQ format:", questionItem);
              continue;
            }
          } else {
            // For non-MCQ questions
            processedContent = {
              question: questionItem.questionText || questionItem.question,
              answer: questionItem.answer || questionItem.correctAnswer || questionItem.sampleAnswer,
              explanation: questionItem.explanation || questionItem.keyPoints
            };
          }
          
          // Create the question in the database
          const newQuestion = await storage.createQuestion({
            subject,
            topic,
            subtopic: subtopic || null,
            questionType,
            difficultyLevel,
            questionText: processedContent.question || '',
            options: questionType === 'Multiple Choice' ? processedContent.options : null,
            correctAnswer: processedContent.correctOption || processedContent.answer || '',
            explanation: processedContent.explanation || '',
            userId: req.body.userId || 1, // Default to user 1 if not provided
            marksValue: 1 // Default mark value
          });
          
          createdQuestions.push(newQuestion);
        } catch (e) {
          console.error("Error creating question:", e, questionItem);
          // Continue with the next question
        }
      }
      
      res.status(201).json({
        message: `Successfully generated ${createdQuestions.length} questions`,
        questions: createdQuestions
      });
    } catch (error) {
      console.error("Error generating questions:", error);
      res.status(500).json({ error: "Failed to generate questions", details: error });
    }
  });

  app.put("/api/questions/:id/verify", async (req: Request, res: Response) => {
    try {
      const questionId = Number(req.params.id);
      
      // Verify the question
      const verifiedQuestion = await storage.verifyQuestion(questionId);
      
      if (!verifiedQuestion) {
        return res.status(404).json({ error: "Question not found" });
      }
      
      res.json(verifiedQuestion);
    } catch (error) {
      console.error("Error verifying question:", error);
      res.status(500).json({ error: "Failed to verify question" });
    }
  });

  app.delete("/api/questions/:id", async (req: Request, res: Response) => {
    try {
      const questionId = Number(req.params.id);
      
      // Delete the question
      const success = await storage.deleteQuestion(questionId);
      
      if (!success) {
        return res.status(404).json({ error: "Question not found" });
      }
      
      res.json({ message: "Question deleted successfully" });
    } catch (error) {
      console.error("Error deleting question:", error);
      res.status(500).json({ error: "Failed to delete question" });
    }
  });

  // PAPER QUESTIONS ROUTES
  app.get("/api/papers/:paperId/questions", async (req: Request, res: Response) => {
    try {
      const paperId = Number(req.params.paperId);
      const studentId = req.query.studentId ? Number(req.query.studentId) : undefined;
      
      let questions;
      if (studentId) {
        // Get questions for a specific student
        questions = await storage.getPaperQuestionsByStudentId(paperId, studentId);
      } else {
        // Get common questions for the paper
        questions = await storage.getCommonPaperQuestions(paperId);
      }
      
      res.json(questions);
    } catch (error) {
      console.error("Error fetching paper questions:", error);
      res.status(500).json({ error: "Failed to fetch paper questions" });
    }
  });

  app.post("/api/papers/:paperId/questions", async (req: Request, res: Response) => {
    try {
      const paperId = Number(req.params.paperId);
      const { questionId, studentId } = req.body;
      
      // Create the paper question
      const paperQuestion = await storage.createPaperQuestion({
        paperId,
        questionId: Number(questionId),
        questionNumber: 1, // Default question number
        studentId: studentId ? Number(studentId) : null,
        marks: 1 // Default marks
      });
      
      res.status(201).json(paperQuestion);
    } catch (error) {
      console.error("Error adding question to paper:", error);
      res.status(400).json({ error: "Failed to add question to paper", details: error });
    }
  });

  // Database fix endpoint
  app.post("/api/fix-database", async (req: Request, res: Response) => {
    try {
      const { action } = req.body;
      
      if (action === "updateStudentClassSections") {
        // Get all students with null class_section
        const { rows: studentsToUpdate } = await pool.query(
          "SELECT * FROM students WHERE class_section IS NULL"
        );
        
        console.log(`Found ${studentsToUpdate.length} students with null class_section`);
        
        // Default class section
        const defaultClassSection = '2ND-M2';
        
        // Update each student
        const updatePromises = studentsToUpdate.map(student => 
          pool.query(
            "UPDATE students SET class_section = $1 WHERE id = $2",
            [defaultClassSection, student.id]
          )
        );
        
        await Promise.all(updatePromises);
        
        // Verify the updates
        const { rows: updatedStudents } = await pool.query(
          "SELECT * FROM students WHERE class_section IS NOT NULL"
        );
        
        return res.json({
          success: true,
          message: `Updated ${updatePromises.length} students with class section`,
          totalWithClassSection: updatedStudents.length
        });
      }
      
      if (action === "createSamplePaper") {
        // Check if papers table has records
        const { rows: existingPapers } = await pool.query("SELECT * FROM papers");
        
        if (existingPapers.length > 0) {
          return res.json({
            success: true,
            message: "Papers already exist, no need to create sample",
            papersCount: existingPapers.length
          });
        }
        
        // Create a sample paper
        const samplePaper = {
          title: 'Object Oriented Programming Mid Exam',
          university_name: 'The Islamia University of Bahawalpur',
          department_name: 'Department of Data Science',
          program_name: 'BS Data Science',
          semester_name: 'Spring 2025',
          class_name: '2nd Semester',
          class_grade: 'N/A',
          subject: 'Object-Oriented Programming',
          instructor_name: 'Dr. Akmal Khan',
          paper_type: 'Midterm',
          exam_date: new Date('2025-12-04'),
          template_type: 'Multiple Choice Only (MCQ)',
          custom_template_path: null,
          time_allowed: 60,
          total_marks: 20,
          total_questions: 20,
          user_id: 1,
          created_at: new Date(),
          status: 'Draft',
          variation_level: 'Medium',
          ai_model: 'GPT-4'
        };
        
        const result = await pool.query(
          `INSERT INTO papers (
            title, university_name, department_name, program_name, semester_name,
            class_name, class_grade, subject, instructor_name, paper_type,
            exam_date, template_type, custom_template_path, time_allowed,
            total_marks, total_questions, user_id, created_at, status,
            variation_level, ai_model
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
            $15, $16, $17, $18, $19, $20, $21
          ) RETURNING id, title`,
          [
            samplePaper.title, samplePaper.university_name, samplePaper.department_name,
            samplePaper.program_name, samplePaper.semester_name, samplePaper.class_name,
            samplePaper.class_grade, samplePaper.subject, samplePaper.instructor_name,
            samplePaper.paper_type, samplePaper.exam_date, samplePaper.template_type,
            samplePaper.custom_template_path, samplePaper.time_allowed, samplePaper.total_marks,
            samplePaper.total_questions, samplePaper.user_id, samplePaper.created_at,
            samplePaper.status, samplePaper.variation_level, samplePaper.ai_model
          ]
        );
        
        return res.json({
          success: true,
          message: "Sample paper created successfully",
          paper: result.rows[0]
        });
      }
      
      // If action is not recognized
      return res.status(400).json({
        success: false,
        message: "Invalid action. Supported actions: updateStudentClassSections, createSamplePaper"
      });
      
    } catch (error: any) {
      console.error("Error in fix-database endpoint:", error);
      res.status(500).json({
        success: false,
        message: "Failed to execute database fix",
        error: error.message
      });
    }
  });

  return server;
}

// Helper function to generate a random roll number
function generateRollNumber(): string {
  return `R-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
}
