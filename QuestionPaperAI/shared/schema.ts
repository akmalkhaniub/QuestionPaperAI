import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, primaryKey, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User schema (teacher)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Define user relations
export const usersRelations = relations(users, ({ many }) => ({
  students: many(students),
  papers: many(papers),
  questions: many(questionBank),
}));

// Student schema
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  rollNumber: text("roll_number").notNull(),
  classSection: text("class_section"),
  userId: integer("user_id").references(() => users.id),
});

export const insertStudentSchema = createInsertSchema(students).pick({
  name: true,
  rollNumber: true,
  classSection: true,
  userId: true,
});

export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;

// Define student relations
export const studentsRelations = relations(students, ({ one, many }) => ({
  user: one(users, {
    fields: [students.userId],
    references: [users.id],
  }),
  generatedPapers: many(generatedPapers),
}));

// Question Topic schema
export type QuestionType = 'Multiple Choice' | 'Short Answer' | 'Long Answer' | 'True/False' | 'Problem Solving';
export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export const questionTopics = pgTable("question_topics", {
  id: serial("id").primaryKey(),
  topicName: text("topic_name").notNull(),
  questionType: text("question_type").notNull(),
  numberOfQuestions: integer("number_of_questions").notNull(),
  marksPerQuestion: integer("marks_per_question").notNull(),
  difficultyLevel: text("difficulty_level").notNull(),
  paperId: integer("paper_id").references(() => papers.id),
});

export const insertQuestionTopicSchema = createInsertSchema(questionTopics).omit({
  id: true,
});

export type InsertQuestionTopic = z.infer<typeof insertQuestionTopicSchema>;
export type QuestionTopic = typeof questionTopics.$inferSelect;

// Define question topic relations
export const questionTopicsRelations = relations(questionTopics, ({ one }) => ({
  paper: one(papers, {
    fields: [questionTopics.paperId],
    references: [papers.id],
  }),
}));

// Paper schema
export const papers = pgTable("papers", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  universityName: text("university_name"),
  departmentName: text("department_name"),
  programName: text("program_name"),
  semesterName: text("semester_name"),
  className: text("class_name"),
  classGrade: text("class_grade").notNull().default('N/A'),
  subject: text("subject").notNull(),
  instructorName: text("instructor_name"),
  paperType: text("paper_type"),
  examDate: timestamp("exam_date"),
  templateType: text("template_type"),
  customTemplatePath: text("custom_template_path"),
  timeAllowed: integer("time_allowed"),
  totalMarks: integer("total_marks"),
  totalQuestions: integer("total_questions"),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  status: text("status").notNull().default('Draft'),
  variationLevel: text("variation_level").notNull().default('Medium'),
  aiModel: text("ai_model").notNull().default('GPT-4'),
});

// Create the basic schema
const baseInsertPaperSchema = createInsertSchema(papers)
  .omit({
    id: true,
    createdAt: true,
  });

// Define a custom schema for examDate to handle different types
export const insertPaperSchema = baseInsertPaperSchema.extend({
  // Override the examDate field with custom handling
  examDate: z.preprocess(
    // Preprocess to handle different input types
    (val) => {
      // For empty string, null, or undefined values, return null
      if (val === '' || val === null || val === undefined) {
        return null;
      }
      
      // If it's already a Date, return it directly
      if (val instanceof Date) {
        return val;
      }
      
      // For string values, try to parse as Date
      if (typeof val === 'string') {
        const date = new Date(val);
        return isNaN(date.getTime()) ? null : date;
      }
      
      // For any other type, return null
      return null;
    },
    // The resulting value will be a nullable Date
    z.date().nullable()
  )
});

export type InsertPaper = z.infer<typeof insertPaperSchema>;
export type Paper = typeof papers.$inferSelect;

// Define paper relations
export const papersRelations = relations(papers, ({ one, many }) => ({
  user: one(users, {
    fields: [papers.userId],
    references: [users.id],
  }),
  questionTopics: many(questionTopics),
  generatedPapers: many(generatedPapers),
  paperQuestions: many(paperQuestions),
}));

// Generated Paper schema
export const generatedPapers = pgTable("generated_papers", {
  id: serial("id").primaryKey(),
  paperId: integer("paper_id").references(() => papers.id).notNull(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  content: jsonb("content"),
  filePath: text("file_path"),
  generatedAt: timestamp("generated_at").defaultNow(),
  status: text("status").notNull().default('Pending'),
});

export const insertGeneratedPaperSchema = createInsertSchema(generatedPapers).omit({
  id: true,
  generatedAt: true,
});

export type InsertGeneratedPaper = z.infer<typeof insertGeneratedPaperSchema>;
export type GeneratedPaper = typeof generatedPapers.$inferSelect & {
  student?: {
    id: number;
    name: string;
    rollNumber: string | null;
    classSection: string | null;
  } | null;
};

// Define generated paper relations
export const generatedPapersRelations = relations(generatedPapers, ({ one }) => ({
  paper: one(papers, {
    fields: [generatedPapers.paperId],
    references: [papers.id],
  }),
  student: one(students, {
    fields: [generatedPapers.studentId],
    references: [students.id],
  }),
}));

// Question Bank schema
export const questionBank = pgTable("question_bank", {
  // Primary key
  id: serial("id").primaryKey(),
  
  // Core fields with indexes for common queries
  subject: text("subject").notNull(),
  topic: text("topic").notNull(),
  subtopic: text("subtopic"),
  questionType: text("question_type").notNull(),
  difficultyLevel: text("difficulty_level").notNull(),
  questionText: text("question_text").notNull(),
  options: jsonb("options"),  // For MCQs: {a: "option text", b: "option text", ...}
  correctAnswer: text("correct_answer"), // For MCQs, the correct option key (a, b, c, d)
  explanation: text("explanation"), // Explanation of the answer/solution
  marksValue: integer("marks_value").notNull().default(1),
  isVerified: boolean("is_verified").notNull().default(false),
  userId: integer("user_id").references(() => users.id).notNull(), // Teacher who created the question
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  tags: text("tags").array() // Array of tags for easier searching/filtering
}, (table) => ({
  // Add indexes for commonly queried fields
  subjectIdx: uniqueIndex("question_bank_subject_idx").on(table.subject),
  questionTypeIdx: uniqueIndex("question_bank_type_idx").on(table.questionType),
  verifiedIdx: uniqueIndex("question_bank_verified_idx").on(table.isVerified),
  // Composite index for verified questions by type
  verifiedTypeIdx: uniqueIndex("question_bank_verified_type_idx").on(table.isVerified, table.questionType)
}));

// Export the QuestionBank type
export type QuestionBank = typeof questionBank.$inferSelect;

export const questionBankRelations = relations(questionBank, ({ one }) => ({
  user: one(users, {
    fields: [questionBank.userId],
    references: [users.id],
  }),
}));

export const insertQuestionBankSchema = createInsertSchema(questionBank).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isVerified: true,
});

export type InsertQuestionBank = z.infer<typeof insertQuestionBankSchema>;
export type QuestionBank = typeof questionBank.$inferSelect;

// Table for tracking which questions are used in which papers
export const paperQuestions = pgTable("paper_questions", {
  id: serial("id").primaryKey(),
  paperId: integer("paper_id").references(() => papers.id).notNull(),
  questionId: integer("question_id").references(() => questionBank.id).notNull(),
  studentId: integer("student_id").references(() => students.id),  // NULL means the question is used for all students
  questionNumber: integer("question_number").notNull(), // Position in the paper
  marks: integer("marks").notNull().default(1),
});

// Define relations
export const paperQuestionsRelations = relations(paperQuestions, ({ one }) => ({
  paper: one(papers, {
    fields: [paperQuestions.paperId],
    references: [papers.id],
  }),
  question: one(questionBank, {
    fields: [paperQuestions.questionId],
    references: [questionBank.id],
  }),
  student: one(students, {
    fields: [paperQuestions.studentId],
    references: [students.id],
  }),
}));

export const insertPaperQuestionsSchema = createInsertSchema(paperQuestions).omit({
  id: true,
});

export type InsertPaperQuestions = z.infer<typeof insertPaperQuestionsSchema>;
export type PaperQuestions = typeof paperQuestions.$inferSelect;
