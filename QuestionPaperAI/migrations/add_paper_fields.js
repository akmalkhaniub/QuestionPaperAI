import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Add new columns to the papers table
    const alterTableQuery = `
      ALTER TABLE papers
      ADD COLUMN IF NOT EXISTS university_name TEXT,
      ADD COLUMN IF NOT EXISTS department_name TEXT,
      ADD COLUMN IF NOT EXISTS program_name TEXT,
      ADD COLUMN IF NOT EXISTS semester_name TEXT,
      ADD COLUMN IF NOT EXISTS class_name TEXT,
      ADD COLUMN IF NOT EXISTS instructor_name TEXT,
      ADD COLUMN IF NOT EXISTS paper_type TEXT;
    `;
    
    await client.query(alterTableQuery);
    
    // Commit the transaction
    await client.query('COMMIT');
    
    console.log('Migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

run().catch(err => {
  console.error('Error running migration:', err);
  process.exit(1);
});