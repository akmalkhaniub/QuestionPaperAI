const fs = require('fs');
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.DB_URL
});

/**
 * This script fixes the student data upload, particularly the class/section field
 * It reads the student data from a file and corrects the class/section field
 */
async function updateStudentClassSections() {
  try {
    // Read the file
    const filePath = './attached_assets/BS DS 2nd-M2.txt';
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Parse CSV data with the right format for your file
    const studentData = fileContent.split('\n').map(line => {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 3) {
        return {
          roll_number: parts[0],
          name: parts[1],
          class_section: parts[2]
        };
      }
      return null;
    }).filter(Boolean); // Remove null values
    
    console.log(`Found ${studentData.length} students in the file.`);
    console.log("Sample:", studentData[0]);
    
    let updatedCount = 0;
    
    // Update each student in the database using direct SQL
    for (const student of studentData) {
      try {
        if (!student.roll_number || !student.class_section) continue;
        
        const result = await pool.query(
          `UPDATE students 
           SET class_section = $1 
           WHERE roll_number = $2 
           RETURNING *`,
          [student.class_section, student.roll_number]
        );
        
        if (result.rowCount > 0) {
          console.log(`Updated student: ${student.name} with class section: ${student.class_section}`);
          updatedCount++;
        } else {
          console.log(`No student found with roll number: ${student.roll_number}`);
        }
      } catch (error) {
        console.error(`Error updating student ${student.roll_number}:`, error);
      }
    }
    
    console.log(`Successfully updated ${updatedCount} students with class section information.`);
    
    // Get count of students with class section
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM students WHERE class_section = $1`,
      ["2ND-M2"]
    );
    
    console.log(`Total students with class section "2ND-M2": ${countResult.rows[0].count}`);
    
    // Close the pool
    await pool.end();
    
  } catch (error) {
    console.error("Error updating student class sections:", error);
  }
}

// Run the function
updateStudentClassSections();