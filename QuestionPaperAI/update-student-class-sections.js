// This script adds class section to students using direct connection to Express API

// The base URL of the running Express server
const API_BASE_URL = 'http://localhost:5000';

async function makeApiRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    return await response.json();
  } catch (error) {
    console.error(`Error making API request to ${endpoint}:`, error);
    throw error;
  }
}

async function updateStudentClassSections() {
  try {
    console.log('Fetching students...');
    
    // Get all students 
    const students = await makeApiRequest('/api/students');
    console.log(`Found ${students.length} students`);

    // Filter students with null class_section
    const studentsToUpdate = students.filter(student => !student.classSection);
    console.log(`Found ${studentsToUpdate.length} students without class section`);
    
    if (studentsToUpdate.length === 0) {
      console.log('No students need updating');
      return;
    }

    // Default class section
    const defaultClassSection = '2ND-M2';
    
    // Update students where class_section is null
    console.log(`Updating ${studentsToUpdate.length} students with class section ${defaultClassSection}`);
    
    const updatePromises = studentsToUpdate.map(student => {
      const updatedStudent = { 
        ...student, 
        classSection: defaultClassSection 
      };
      
      return makeApiRequest(`/api/students/${student.id}`, 'PUT', updatedStudent);
    });
    
    // Wait for all updates to complete
    await Promise.all(updatePromises);
    
    console.log(`Updated ${updatePromises.length} student records with class section`);
    
    // Verify the updates
    const updatedStudents = await makeApiRequest('/api/students');
    const studentsWithSection = updatedStudents.filter(student => student.classSection);
    console.log(`Now have ${studentsWithSection.length} students with class sections`);
    
  } catch (error) {
    console.error('Error updating student class sections:', error);
  }
}

// Run the script
updateStudentClassSections().then(() => {
  console.log('Script completed');
});