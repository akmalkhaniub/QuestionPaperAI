// Direct SQL fix for database using Express API

const { execSync } = require('child_process');

console.log("===== Direct SQL Database Fix =====");

// Command to update students with no class section
const updateStudentsCmd = `curl -X POST 'http://localhost:5000/api/fix-database' \
  -H 'Content-Type: application/json' \
  -d '{"action": "updateStudentClassSections"}'`;

// Command to create sample paper if none exist
const createSamplePaperCmd = `curl -X POST 'http://localhost:5000/api/fix-database' \
  -H 'Content-Type: application/json' \
  -d '{"action": "createSamplePaper"}'`;

try {
  console.log("Updating student class sections...");
  const updateOutput = execSync(updateStudentsCmd, { encoding: 'utf8' });
  console.log(updateOutput);
  
  console.log("Creating sample paper if needed...");
  const createOutput = execSync(createSamplePaperCmd, { encoding: 'utf8' });
  console.log(createOutput);
  
  console.log("===== Database fix completed =====");
} catch (error) {
  console.error("Error running database fix:", error.message);
  if (error.stdout) console.log("Stdout:", error.stdout);
  if (error.stderr) console.log("Stderr:", error.stderr);
}
