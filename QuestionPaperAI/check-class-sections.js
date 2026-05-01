import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
const { Pool } = pg;

async function checkClassSections() {
  const connectionString = process.env.DATABASE_URL;
  console.log('Database connection string available:', !!connectionString);
  
  const pool = new Pool({ connectionString });
  
  try {
    console.log('Executing query for class_section values...');
    const result = await pool.query('SELECT DISTINCT class_section FROM students WHERE class_section IS NOT NULL LIMIT 10;');
    console.log('Distinct class_section values:');
    for (const row of result.rows) {
      console.log(`- "${row.class_section}"`);
    }
    
    // Get a sample student with complete info
    console.log('\nSample student with class section:');
    const student = await pool.query('SELECT id, name, roll_number, class_section FROM students WHERE class_section IS NOT NULL LIMIT 1;');
    if (student.rows.length > 0) {
      console.log(student.rows[0]);
    } else {
      console.log('No students with class section found');
    }
  } catch (error) {
    console.error('Error executing query:', error);
  } finally {
    await pool.end();
  }
}

// Run the function
checkClassSections();