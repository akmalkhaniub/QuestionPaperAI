// Script to fix database issues

import { db, pool } from "./db";
import { students, papers } from "../shared/schema";
import { eq } from "drizzle-orm";

export async function fixDatabaseIssues() {
  console.log("===== Starting database fix script =====");
  
  try {
    // Step 1: Update student class sections
    await updateStudentClassSections();
    
    // Step 2: Create a sample paper if none exists
    await createSamplePaper();
    
    console.log("===== Database fix script completed =====");
  } catch (error) {
    console.error("Error fixing database:", error);
  }
}

async function updateStudentClassSections() {
  try {
    console.log("Updating student class sections...");
    
    // Get all students with null class_section
    const studentsToUpdate = await db.select()
      .from(students)
      .where(eq(students.classSection, null));
    
    console.log(`Found ${studentsToUpdate.length} students with null class_section`);
    
    // Default class section
    const defaultClassSection = '2ND-M2';
    
    // Update each student
    for (const student of studentsToUpdate) {
      await db.update(students)
        .set({ classSection: defaultClassSection })
        .where(eq(students.id, student.id));
      
      console.log(`Updated student ${student.name} (${student.id}) with class section ${defaultClassSection}`);
    }
    
    // Verify the updates
    const updatedStudents = await db.select()
      .from(students)
      .where(eq(students.classSection, defaultClassSection));
    
    console.log(`Now have ${updatedStudents.length} students with class section ${defaultClassSection}`);
  } catch (error) {
    console.error("Error updating student class sections:", error);
  }
}

async function createSamplePaper() {
  try {
    console.log("Checking for existing papers...");
    
    // Check if papers table has records
    const existingPapers = await db.select().from(papers);
    console.log(`Found ${existingPapers.length} papers`);
    
    if (existingPapers.length > 0) {
      console.log("Papers already exist, no need to create sample");
      return;
    }
    
    // Direct SQL to create a sample paper
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
    
    console.log(`Created sample paper: ${result.rows[0].title} (ID: ${result.rows[0].id})`);
  } catch (error) {
    console.error("Error creating sample paper:", error);
  }
}

// Run the fix script
fixDatabaseIssues().then(() => {
  console.log("Script execution completed");
  process.exit(0);
}).catch(err => {
  console.error("Script execution failed:", err);
  process.exit(1);
});