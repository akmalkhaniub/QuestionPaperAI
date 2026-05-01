// This script creates a sample paper if none exists

// Database connection
import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;
dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function createSamplePaper() {
  try {
    console.log('Connecting to database...');
    
    // Check if papers table exists and has records
    const { rows: papers } = await pool.query('SELECT * FROM papers');
    console.log(`Found ${papers.length} papers`);

    if (papers.length > 0) {
      console.log('Papers already exist, no need to create sample');
      return;
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
    
    // Insert the sample paper
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
      ) RETURNING *`,
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
    
    console.log('Created sample paper:', result.rows[0]);
    
  } catch (error) {
    console.error('Error creating sample paper:', error);
  } finally {
    await pool.end();
  }
}

// Run the function
createSamplePaper().then(() => {
  console.log('Script completed');
});