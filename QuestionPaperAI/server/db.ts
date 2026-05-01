import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// We should specifically use DB_URL as mentioned by the user
const connectionString = process.env.DB_URL;
//console.log("DB_URL:", dbUrl);

console.log("Database connection string available:", !!connectionString);

if (!connectionString) {
  throw new Error(
    "DB_URL must be set. Did you forget to provision a database?",
  );
}

// Validate the connection string format (without showing sensitive details)
try {
  const url = new URL(connectionString);
  console.log(`Connection details: 
  - Protocol: ${url.protocol}
  - Host: ${url.hostname} 
  - Contains username/password: ${!!url.username}
  - Database name in path: ${url.pathname.substring(1)}`);
} catch (err) {
  console.error("Invalid database URL format");
}

// Log that we're using the DB_URL specifically
console.log("Using DB_URL for Neon database connection");

export const pool = new Pool({ connectionString });

// Function for debugging database tables
async function debugDatabaseTables() {
  try {
    console.log('Database connection successful');
    
    // First list all tables in the schema to see what's really there
    console.log('Getting complete list of tables in database...');
    const allTablesQuery = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    if (allTablesQuery.rows.length > 0) {
      console.log('All tables in database:');
      console.log(allTablesQuery.rows.map(r => r.table_name).join(', '));
    } else {
      console.log('No tables found in the database at all');
    }
    
    // Query for detailed table and column information
    const tableCheck = await pool.query(`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      ORDER BY table_name, column_name
    `);
    
    if (tableCheck.rows.length > 0) {
      console.log('Database tables found with columns:');
      const tables: Record<string, string[]> = {};
      tableCheck.rows.forEach(row => {
        const tableName = row.table_name as string;
        const columnName = row.column_name as string;
        
        if (!tables[tableName]) {
          tables[tableName] = [];
        }
        tables[tableName].push(columnName);
      });
      
      // Print table structure
      Object.keys(tables).forEach(tableName => {
        console.log(`- ${tableName}: ${tables[tableName].join(', ')}`);
      });
      
      // Try direct SQL query to some important tables
      try {
        console.log('Testing direct SQL query to users table...');
        const usersQuery = await pool.query('SELECT * FROM users LIMIT 1');
        console.log('Users direct query successful:', usersQuery.rows);
      } catch (err: any) {
        console.error('Users table might not exist or other error:', err.message);
      }
      
      try {
        console.log('Testing direct SQL query to papers table...');
        const papersQuery = await pool.query('SELECT * FROM papers LIMIT 1');
        console.log('Papers direct query successful:', papersQuery.rows);
      } catch (err: any) {
        console.error('Papers table might not exist or other error:', err.message);
      }
      
      try {
        console.log('Testing direct SQL query to students table...');
        const studentsQuery = await pool.query('SELECT * FROM students LIMIT 1');
        console.log('Students direct query successful:', studentsQuery.rows);
      } catch (err: any) {
        console.error('Students table might not exist or other error:', err.message);
      }
    } else {
      console.log('No columns found in any tables in the public schema');
    }
  } catch (err: any) {
    console.error('Database debugging failed:', err.message);
  }
}

// Function to initialize database schema
async function initializeDatabase() {
  console.log("Attempting to initialize database...");
  try {
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const { sql } = await import("drizzle-orm");
    
    // Create the db connection
    const drizzleDb = drizzle(pool, { schema });
    
    // Check if we have any tables
    const tablesExist = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (!tablesExist.rows[0].exists) {
      console.log("No tables found, creating schema...");
      
      // Create schema from our schema.ts definitions
      try {
        // Create users table first
        await pool.query(`
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL
          );
        `);
        
        // Create students table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS students (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            roll_number TEXT NOT NULL,
            class_section TEXT,
            user_id INTEGER REFERENCES users(id)
          );
        `);
        
        // Create papers table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS papers (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            university_name TEXT,
            department_name TEXT,
            program_name TEXT,
            semester_name TEXT,
            class_name TEXT,
            class_grade TEXT NOT NULL DEFAULT 'N/A',
            subject TEXT NOT NULL,
            instructor_name TEXT,
            paper_type TEXT,
            exam_date TIMESTAMP,
            template_type TEXT,
            custom_template_path TEXT,
            time_allowed INTEGER,
            total_marks INTEGER,
            total_questions INTEGER,
            user_id INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT NOW(),
            status TEXT NOT NULL DEFAULT 'Draft',
            variation_level TEXT NOT NULL DEFAULT 'Medium',
            ai_model TEXT NOT NULL DEFAULT 'GPT-4'
          );
        `);
        
        // Create question_topics table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS question_topics (
            id SERIAL PRIMARY KEY,
            topic_name TEXT NOT NULL,
            question_type TEXT NOT NULL,
            number_of_questions INTEGER NOT NULL,
            marks_per_question INTEGER NOT NULL,
            difficulty_level TEXT NOT NULL,
            paper_id INTEGER REFERENCES papers(id)
          );
        `);
        
        // Create question_bank table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS question_bank (
            id SERIAL PRIMARY KEY,
            subject TEXT NOT NULL,
            topic TEXT NOT NULL,
            subtopic TEXT,
            question_type TEXT NOT NULL,
            difficulty_level TEXT NOT NULL,
            question_text TEXT NOT NULL,
            options JSONB,
            correct_answer TEXT,
            explanation TEXT,
            marks_value INTEGER NOT NULL DEFAULT 1,
            is_verified BOOLEAN NOT NULL DEFAULT false,
            user_id INTEGER NOT NULL REFERENCES users(id),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            tags TEXT[]
          );
        `);
        
        // Create generated_papers table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS generated_papers (
            id SERIAL PRIMARY KEY,
            paper_id INTEGER NOT NULL REFERENCES papers(id),
            student_id INTEGER NOT NULL REFERENCES students(id),
            content JSONB,
            file_path TEXT,
            generated_at TIMESTAMP DEFAULT NOW(),
            status TEXT NOT NULL DEFAULT 'Pending'
          );
        `);
        
        // Create paper_questions table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS paper_questions (
            id SERIAL PRIMARY KEY,
            paper_id INTEGER NOT NULL REFERENCES papers(id),
            question_id INTEGER NOT NULL REFERENCES question_bank(id),
            student_id INTEGER REFERENCES students(id),
            question_number INTEGER NOT NULL,
            marks INTEGER NOT NULL DEFAULT 1
          );
        `);
        
        // Create deletion function for papers
        await pool.query(`
          CREATE OR REPLACE FUNCTION delete_paper_cascade(paper_id_param INTEGER) RETURNS BOOLEAN AS
          $$
          BEGIN
            -- Delete paper questions
            DELETE FROM paper_questions WHERE paper_id = paper_id_param;
            
            -- Delete generated papers
            DELETE FROM generated_papers WHERE paper_id = paper_id_param;
            
            -- Delete question topics
            DELETE FROM question_topics WHERE paper_id = paper_id_param;
            
            -- Delete the paper itself
            DELETE FROM papers WHERE id = paper_id_param;
            
            -- Return true if we got here (no errors)
            RETURN TRUE;
          EXCEPTION
            WHEN OTHERS THEN
              -- Log the error
              RAISE NOTICE 'Error deleting paper: %', SQLERRM;
              RETURN FALSE;
          END;
          $$ LANGUAGE plpgsql;
        `);
        
        console.log("Successfully created database schema");
        
        // Create a default user account after creating tables
        try {
          console.log("Checking for default user account...");
          const userCheck = await pool.query("SELECT * FROM users WHERE username = 'teacher'");
          
          if (userCheck.rowCount === 0) {
            console.log("Creating default user account");
            // Create a default user for testing (in production, we would use proper authentication)
            await pool.query(`
              INSERT INTO users (username, password) 
              VALUES ('teacher', 'password123') 
              ON CONFLICT (username) DO NOTHING
            `);
            console.log("Default user created successfully");
          } else {
            console.log("Default user already exists");
          }
        } catch (userErr) {
          console.error("Error creating default user:", userErr);
        }
      } catch (err) {
        console.error("Error creating schema:", err);
      }
    } else {
      console.log("Database schema already exists");
      
      // Check for default user even if schema already exists
      try {
        console.log("Checking for default user account...");
        const userCheck = await pool.query("SELECT * FROM users WHERE username = 'teacher'");
        
        if (userCheck.rowCount === 0) {
          console.log("Creating default user account");
          // Create a default user for testing
          await pool.query(`
            INSERT INTO users (username, password) 
            VALUES ('teacher', 'password123') 
            ON CONFLICT (username) DO NOTHING
          `);
          console.log("Default user created successfully");
        } else {
          console.log("Default user already exists");
        }
      } catch (userErr) {
        console.error("Error checking/creating default user:", userErr);
      }
    }
  } catch (err) {
    console.error("Error initializing database:", err);
  }
}

// Run debug and initialization functions
debugDatabaseTables();
initializeDatabase();

// Use standard configuration for Drizzle, but provide a custom wrapper
export const db = drizzle(pool, { schema }); 

// Add a query logging wrapper function to help debug the raw queries
export const logQuery = (query: string, params: any[] = []): void => {
  console.log('Generated SQL:', query.replace(/\s+/g, ' ').trim());
  console.log('Query params:', params);
};

// Create a simpler API for debugging and production use
export const queryDb = async (sql: string, params: any[] = []) => {
  try {
    const result = await pool.query(sql, params);
    return result.rows;
  } catch (err: any) {
    console.error('Query failed:', err.message);
    throw err;
  }
};

// Create a function to execute a direct SQL query to get papers
export const getPapersDirectSql = async (userId?: number) => {
  try {
    let query = 'SELECT * FROM papers';
    let params: any[] = [];
    
    if (userId) {
      query += ' WHERE user_id = $1';
      params.push(userId);
    }
    
    console.log('Executing direct SQL:', query, params);
    const result = await pool.query(query, params);
    console.log('Direct SQL result count:', result.rowCount);
    return result.rows;
  } catch (err: any) {
    console.error('Direct SQL getPapers failed:', err.message);
    return [];
  }
};

// Create a function to execute a direct SQL query to get students
export const getStudentsDirectSql = async (userId?: number) => {
  try {
    let query = 'SELECT * FROM students';
    let params: any[] = [];
    
    if (userId) {
      query += ' WHERE user_id = $1';
      params.push(userId);
    }
    
    console.log('Executing direct SQL for students:', query, params);
    const result = await pool.query(query, params);
    console.log('Direct SQL students result count:', result.rowCount);
    
    // Map the snake_case database fields to camelCase for frontend compatibility
    const students = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      rollNumber: row.roll_number, // Convert snake_case to camelCase
      classSection: row.class_section, // Convert snake_case to camelCase
      userId: row.user_id // Convert snake_case to camelCase
    }));
    
    console.log('Student data with classSection transformed:', 
      students.map(s => `${s.id}: ${s.name}, classSection: ${s.classSection || 'null'}`));
    
    return students;
  } catch (err: any) {
    console.error('Direct SQL getStudents failed:', err.message);
    return [];
  }
};

// Function to get unique subjects from question bank
export const getUniqueSubjectsDirectSql = async () => {
  try {
    const query = 'SELECT DISTINCT subject FROM question_bank ORDER BY subject';
    const result = await pool.query(query);
    
    // If we have subjects, return them
    if (result.rows.length > 0) {
      return result.rows.map(row => row.subject);
    }
    
    // If no subjects found, return default subjects
    return [
      "Object-Oriented Programming",
      "Data Structures",
      "Computer Science",
      "Database Management",
      "Web Development",
      "Artificial Intelligence",
      "Machine Learning",
      "Computer Networks",
      "Operating Systems",
      "Software Engineering"
    ];
  } catch (err: any) {
    console.error('Error fetching subjects:', err.message);
    // Return default subjects on error
    return [
      "Object-Oriented Programming",
      "Data Structures",
      "Computer Science"
    ];
  }
};

// Create a function to insert students with direct SQL
export const createStudentsDirectSql = async (students: any[]) => {
  if (students.length === 0) return [];
  
  try {
    const createdStudents = [];
    
    for (const student of students) {
      // Debug the student object we're working with
      console.log('Direct SQL: Processing student object:', JSON.stringify(student));
      
      // Ensure required fields are present
      let name = 'Student';
      // Make sure we're not getting an empty string
      if (student.name && student.name.trim() !== '') {
        name = student.name.trim();
      }
      
      let rollNumber = generateRollNumber();
      // Make sure we're not getting an empty string
      if (student.rollNumber && student.rollNumber.trim() !== '') {
        rollNumber = student.rollNumber.trim();
      }
      
      // Explicitly check for class section 
      let classSection = null;
      if (student.classSection && typeof student.classSection === 'string' && student.classSection.trim() !== '') {
        // Preserve the class section value including the format "2ND-M2"
        classSection = student.classSection.trim();
        console.log(`Using class section value: "${classSection}"`);
      }
      
      const userId = student.userId || 1; // Default to user ID 1
      
      console.log('Creating student with direct SQL:', { name, rollNumber, classSection, userId });
      
      // Insert the student with direct SQL
      const result = await pool.query(
        `INSERT INTO students (name, roll_number, class_section, user_id) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [name, rollNumber, classSection, userId]
      );
      
      if (result.rows.length > 0) {
        const createdStudent = result.rows[0];
        // Convert snake_case to camelCase for consistency with app code
        createdStudents.push({
          id: createdStudent.id,
          name: createdStudent.name,
          rollNumber: createdStudent.roll_number,
          classSection: createdStudent.class_section,
          userId: createdStudent.user_id
        });
      }
    }
    
    console.log(`Successfully created ${createdStudents.length} students with direct SQL`);
    return createdStudents;
  } catch (err: any) {
    console.error('Direct SQL student creation failed:', err.message);
    throw err;
  }
};

// Helper function for roll number generation
function generateRollNumber(): string {
  return `R-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
}
