import { apiRequest } from "./queryClient";

// Generate papers for a list of students using verified questions from question bank
export async function generatePapers(paperId: number, studentIds: number[]) {
  return apiRequest("POST", `/api/papers/${paperId}/generate`, { 
    studentIds
  });
}

// Generate MCQs for a specific topic to add to question bank
export async function generateQuestionsForTopic(subject: string, topic: string, questionType: string, difficultyLevel: string, count: number) {
  return apiRequest("POST", `/api/questions/generate`, { 
    subject, 
    topic, 
    questionType, 
    difficultyLevel,
    count
  });
}

// Get paper generation status
export async function getPaperGenerationStatus(generatedPaperId: number) {
  return apiRequest("GET", `/api/generated-papers/${generatedPaperId}`);
}

// Get all generated papers for a paper
export async function getGeneratedPapers(paperId: number) {
  return apiRequest("GET", `/api/papers/${paperId}/generated-papers`);
}

// Create a new paper with topics
export async function createPaperWithTopics(paperData: any, topics: any[]) {
  try {
    console.log("Creating paper with data:", paperData);
    // First create the paper - this should create a default topic automatically
    const paperResponse = await apiRequest("POST", "/api/papers", paperData);
    const paper = await paperResponse.json();
    console.log("Paper created successfully:", paper);
    
    // We'll skip creating topics because the server creates a default topic automatically
    // Server is already configured to handle question bank properly without explicit topics
    console.log("Default topic should have been created automatically");
    
    return paper;
  } catch (error) {
    console.error("Error in createPaperWithTopics:", error);
    throw error;
  }
}

// Upload a template file
export async function uploadTemplate(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  
  const response = await fetch("/api/templates/upload", {
    method: "POST",
    body: formData,
    credentials: "include"
  });
  
  if (!response.ok) {
    throw new Error("Failed to upload template");
  }
  
  return response.json();
}

// Upload students from a CSV file
export async function uploadStudents(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  
  const response = await fetch("/api/students/upload", {
    method: "POST",
    body: formData,
    credentials: "include"
  });
  
  if (!response.ok) {
    throw new Error("Failed to upload students");
  }
  
  return response.json();
}
