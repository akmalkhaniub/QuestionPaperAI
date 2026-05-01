/**
 * Helper function to update existing student records with class sections
 * This would be used to update any existing students in the database
 */

import { pool } from './db';

export async function updateStudentClassSections() {
  try {
    console.log('Starting student class section update...');
    // First get all students
    const allStudents = await pool.query('SELECT id, name, roll_number FROM students');
    console.log(`Found ${allStudents.rows.length} students to update`);

    // For each student, set a default class section based on roll number pattern if empty
    let updatedCount = 0;
    for (const student of allStudents.rows) {
      // Skip students that already have a class section
      const checkResult = await pool.query(
        'SELECT class_section FROM students WHERE id = $1',
        [student.id]
      );
      
      if (checkResult.rows[0].class_section) {
        console.log(`Student ${student.id} (${student.name}) already has class section: ${checkResult.rows[0].class_section}`);
        continue;
      }

      // Determine class section from roll number pattern if possible
      let classSection = null;
      if (student.roll_number) {
        // If roll number contains 'BDATS1' assign '2ND-M2' for demonstration purposes
        if (student.roll_number.includes('BDATS1')) {
          classSection = '2ND-M2';
        }
        // If roll number contains 'BSCS' assign '3RD-A1' for demonstration 
        else if (student.roll_number.includes('BSCS')) {
          classSection = '3RD-A1';
        }
        // For other patterns, assign a generic class section
        else {
          classSection = '1ST-B4';
        }
      }

      if (classSection) {
        // Update the student record
        await pool.query(
          'UPDATE students SET class_section = $1 WHERE id = $2',
          [classSection, student.id]
        );
        updatedCount++;
        console.log(`Updated student ${student.id} (${student.name}) with class section: ${classSection}`);
      }
    }

    console.log(`Successfully updated ${updatedCount} students with class sections`);
    return { success: true, updatedCount };
  } catch (error) {
    console.error('Error updating student class sections:', error);
    return { success: false, error: (error as Error).message };
  }
}