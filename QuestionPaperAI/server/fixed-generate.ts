import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { storage } from "./storage";
import { QuestionBank } from "../shared/schema";

// Define interfaces for our data structures
interface QuestionData {
  id: number;
  questionText: string;
  options: Record<string, string>;
  correctAnswer: string;
  marks: number;
  type: string;
  hiddenData: {
    studentId: number;
    paperId: number;
  };
}

interface SectionData {
  id: string;
  title: string;
  questionType: string;
  totalMarks: number;
  marksPerQuestion: number;
  questions: QuestionData[];
}

interface GeneratedContent {
  paperHeader: {
    university: string;
    department: string;
    program: string;
    semester: string;
    class: string;
    class_section: string; // Added student class section
    instructor: string;
    title: string;
    subject: string;
    examType: string;
    studentName: string;
    rollNumber: string;
    examDate: string;
    timeAllowed: string;
    totalMarks: string;
  };
  sections: SectionData[];
}

async function processGeneratedPapers(paper: any, topics: any[], generatedPapers: any[]) {
  console.log("Processing papers:", {
    paperDetails: paper,
    topicsCount: topics.length,
    generatedPapersCount: generatedPapers.length
  });
  
  for (const generatedPaper of generatedPapers) {
    try {
      // Get the student information
      const student = await storage.getStudent(generatedPaper.studentId);
      if (!student) {
        // If student not found, mark as failed
        await storage.updateGeneratedPaper(generatedPaper.id, { 
          status: "Failed",
          content: { error: "Student information not found" }
        });
        continue;
      }

      // Update status to Processing
      await storage.updateGeneratedPaper(generatedPaper.id, { status: "Processing" });

      // Format the topics for the prompt
      const formattedTopics = topics.map((topic: any) => ({
        topicName: topic.topicName,
        questionType: topic.questionType,
        numberOfQuestions: topic.numberOfQuestions,
        marksPerQuestion: topic.marksPerQuestion,
        difficultyLevel: topic.difficultyLevel
      }));

      // Get current date in DD/MM/YYYY format if not provided
      const currentDate = new Date();
      const formattedDate = paper.examDate || 
        `${currentDate.getDate().toString().padStart(2, '0')}/${(currentDate.getMonth() + 1).toString().padStart(2, '0')}/${currentDate.getFullYear()}`;

      // Prepare content for paper generation with university-related fields
      const promptContent = {
        paperTitle: paper.title,
        subject: paper.subject,
        universityName: paper.universityName || "The Islamia University of Bahawalpur",
        departmentName: paper.departmentName || `Department of ${paper.subject}`,
        programName: paper.programName || "BS Computer Science",
        semesterName: paper.semesterName || "Fall 2025",
        className: paper.className || "",
        studentClassSection: student.classSection || "", // Added student class section
        instructorName: paper.instructorName || "Dr. Faculty Member",
        paperType: paper.paperType || "Midterm",
        studentName: student.name,
        studentRollNumber: student.rollNumber,
        examDate: formattedDate,
        timeAllowed: paper.timeAllowed || 60,
        totalMarks: paper.totalMarks || 0,
        topics: formattedTopics,
        templateType: paper.templateType || "Standard Question Paper"
      };

      let generatedContent: GeneratedContent | undefined;
      
      // Using question bank approach instead of OpenAI generation
      try {
        console.log(`Getting verified questions from question bank for subject: ${paper.subject}`);
        
        // Get all verified questions for this subject
        const verifiedQuestions = await storage.getVerifiedQuestions();
        
        // Filter to just questions from this subject
        const subjectQuestions = verifiedQuestions.filter(q => 
          q.subject.toLowerCase() === paper.subject.toLowerCase()
        );
        
        console.log(`Found ${subjectQuestions.length} verified questions for subject: ${paper.subject}`);
        
        // Log question type distribution
        const questionTypes = new Set(subjectQuestions.map(q => q.questionType));
        console.log('Available question types:', Array.from(questionTypes));
        
        // Calculate total questions needed across all topics
        let totalQuestionsNeeded = 0;
        
        // If we have topics, calculate from them; otherwise use paper.totalQuestions
        let originalQuestionsNeeded = 0;
        
        if (topics.length === 1 && topics[0].topicName === "Main Topic") {
          // This is our auto-created topic
          originalQuestionsNeeded = paper.totalQuestions || topics[0].numberOfQuestions;
          console.log(`Using default topic with ${originalQuestionsNeeded} questions`);
        } else {
          originalQuestionsNeeded = topics.reduce((sum: number, topic: any) => 
            sum + topic.numberOfQuestions, 0);
          console.log(`Using ${originalQuestionsNeeded} questions from topics configuration`);
        }
        
        // Check if we have enough questions
        if (subjectQuestions.length < originalQuestionsNeeded) {
          console.log(`Warning: Not enough questions available (${subjectQuestions.length}). Using all available instead of requested ${originalQuestionsNeeded}.`);
          
          // Adjust the topics to use available questions
          if (topics.length === 1 && topics[0].topicName === "Main Topic") {
            // This is our auto-created topic, adjust it
            const mainTopic = topics[0];
            const newQuestionCount = subjectQuestions.length;
            
            // Update topic in database
            await storage.updateQuestionTopic(mainTopic.id, {
              numberOfQuestions: newQuestionCount
            });
            
            // Update in our local variable too
            mainTopic.numberOfQuestions = newQuestionCount;
            
            // Also update totalQuestionsNeeded
            totalQuestionsNeeded = newQuestionCount;
          } else {
            // For multiple topics, we'll adjust later when filtering by topic
            totalQuestionsNeeded = subjectQuestions.length;
          }
        } else {
          totalQuestionsNeeded = originalQuestionsNeeded;
        }
        
        // Use whatever questions we have available
        console.log(`Using ${totalQuestionsNeeded} questions from question bank`);
        
        // Create paper content based on available questions
        const sections = [];
        
        // Process each topic to create sections
        for (const topic of topics) {
          // Shuffle questions for each student and topic
          const shuffledQuestions = [...subjectQuestions].sort(() => 0.5 - Math.random());
          console.log(`Processing topic: ${topic.topicName}, Question Type: ${topic.questionType}`);
          
          // Get verified questions of this type for this subject
          let filteredQuestions: QuestionBank[] = [];
          try {
            const typeQuestions = await storage.getVerifiedQuestionsByType(topic.questionType);
            filteredQuestions = typeQuestions.filter((q: QuestionBank) => 
              q.subject.toLowerCase() === paper.subject.toLowerCase()
            );
            
            console.log(`Found ${filteredQuestions.length} ${topic.questionType} questions for subject ${paper.subject}`);
            
            // If we have no questions of this type, log a warning
            if (filteredQuestions.length === 0) {
              console.warn(`Warning: No questions found for type '${topic.questionType}' in subject '${paper.subject}'`);
              console.warn('Available question types:', Array.from(new Set(typeQuestions.map((q: QuestionBank) => q.questionType))));
            }
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Error retrieving questions for type '${topic.questionType}':`, error);
            throw new Error(`Failed to retrieve questions of type '${topic.questionType}': ${errorMessage}`);
          }
          
          // Adjust number of questions if we don't have enough of this type
          const actualQuestions = Math.min(
            topic.numberOfQuestions, 
            filteredQuestions.length
          );
          
          if (actualQuestions <= 0) {
            // Skip this topic if we have no questions available of this type
            console.log(`Warning: No questions available for topic ${topic.topicName} of type ${topic.questionType}`);
            continue;
          }
          
          // Shuffle and select questions for this topic
          const topicQuestions = [...filteredQuestions]
            .sort(() => 0.5 - Math.random())
            .slice(0, actualQuestions);
          
          // Create a section for this topic
          const section: SectionData = {
            id: `section-${topic.id}`,
            title: topic.topicName,
            questionType: topic.questionType,
            totalMarks: topic.marksPerQuestion * actualQuestions,
            marksPerQuestion: topic.marksPerQuestion,
            questions: [] // Will be properly typed by the interface
          };
          
          // Add questions to this section
          for (const questionData of topicQuestions) {
            // For MCQs, we need to handle options properly
            // QuestionBank schema has: questionText, options, correctAnswer
            let options = questionData.options;
            let questionText = questionData.questionText;
            let correctAnswer = questionData.correctAnswer || 'A';
            
            // Try to parse options if it's a string
            if (typeof options === 'string') {
              try {
                options = JSON.parse(options);
              } catch (e) {
                console.log(`Warning: Could not parse options for question ${questionData.id}`);
                // Default options if parsing fails
                options = { 
                  "A": "Option A", 
                  "B": "Option B", 
                  "C": "Option C", 
                  "D": "Option D" 
                };
              }
            }
            
            // If we don't have proper options, create defaults
            if (!options || typeof options !== 'object') {
              options = { 
                "A": "Option A", 
                "B": "Option B", 
                "C": "Option C", 
                "D": "Option D" 
              };
            }
            
            // Handle different question types
            if (questionData.questionType === topic.questionType) {
              // For MCQs we need to randomize options
              if (questionData.questionType === 'Multiple Choice') {
                try {
                  // Convert options to a safe object format
                  let normalizedOptions: Record<string, string> = {};
                  
                  if (typeof options === 'string') {
                    try {
                      normalizedOptions = JSON.parse(options);
                    } catch (e) {
                      console.log(`Failed to parse options string: ${options}`);
                      normalizedOptions = { A: "Option A", B: "Option B", C: "Option C", D: "Option D" };
                    }
                  } else if (options && typeof options === 'object') {
                    // Copy existing options safely
                    const optionsObj = options as Record<string, string>;
                    for (const key in optionsObj) {
                      if (Object.prototype.hasOwnProperty.call(optionsObj, key)) {
                        normalizedOptions[key] = String(optionsObj[key] || '');
                      }
                    }
                  } else {
                    // Default options
                    normalizedOptions = { A: "Option A", B: "Option B", C: "Option C", D: "Option D" };
                  }
                  
                  // Get the correct option text
                  const correctOptionText = normalizedOptions[correctAnswer] || '';
                  
                  // Convert to arrays for shuffling
                  const optionKeys = Object.keys(normalizedOptions);
                  const optionValues = Object.values(normalizedOptions);
                  
                  // Create arrays of indices and shuffle them
                  const indices = optionKeys.map((_, i) => i);
                  for (let i = indices.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [indices[i], indices[j]] = [indices[j], indices[i]];
                  }
                  
                  // Create new randomized options
                  const newOptions: Record<string, string> = {};
                  let newCorrectOption = 'A'; // Default
                  
                  indices.forEach((oldIndex, newIndex) => {
                    const newKey = String.fromCharCode(65 + newIndex); // A, B, C, D
                    const value = optionValues[oldIndex];
                    newOptions[newKey] = value;
                    
                    // Track the new position of the correct answer
                    if (value === correctOptionText) {
                      newCorrectOption = newKey;
                    }
                  });
                  
                  // Use the randomized options
                  options = newOptions;
                  correctAnswer = newCorrectOption;
                } catch (e) {
                  // Fallback to simple options if randomization fails
                  console.error("Error randomizing options:", e);
                  options = { A: "Option A", B: "Option B", C: "Option C", D: "Option D" };
                  correctAnswer = 'A';
                }
              }
            }
            
            // Ensure options is correctly typed Record<string, string>
            let typedOptions: Record<string, string> = { 'A': 'Option A', 'B': 'Option B', 'C': 'Option C', 'D': 'Option D' };
            
            // Try to safely convert options to Record<string, string>
            if (options && typeof options === 'object') {
              try {
                const entries = Object.keys(options).map(key => {
                  const value = options[key as keyof typeof options];
                  return [key, typeof value === 'string' ? value : String(value || '')];
                });
                typedOptions = Object.fromEntries(entries);
              } catch (e) {
                console.log("Failed to convert options to Record<string, string>, using defaults");
              }
            }
            
            // Add the question to the section with proper types
            const questionToAdd: QuestionData = {
              id: questionData.id,
              questionText: questionText || '',
              options: typedOptions,
              correctAnswer: correctAnswer,
              marks: topic.marksPerQuestion,
              type: topic.questionType,
              // Add a hidden studentId for identification
              hiddenData: {
                studentId: student.id,
                paperId: paper.id
              }
            };
            
            section.questions.push(questionToAdd);
          }
          
          // Add section to paper
          sections.push(section);
        }
        
        // Create the final paper content
        generatedContent = {
          paperHeader: {
            university: promptContent.universityName,
            department: promptContent.departmentName,
            program: promptContent.programName,
            semester: promptContent.semesterName,
            class: promptContent.className,
            class_section: promptContent.studentClassSection, // Add student class section
            instructor: promptContent.instructorName,
            title: promptContent.paperTitle,
            subject: promptContent.subject,
            examType: promptContent.paperType,
            studentName: promptContent.studentName,
            rollNumber: promptContent.studentRollNumber,
            examDate: promptContent.examDate,
            timeAllowed: promptContent.timeAllowed.toString(),
            totalMarks: promptContent.totalMarks.toString()
          },
          sections: sections
        };
      } catch (error) {
        // Error with question bank generation, log but continue
        console.error("Error using question bank:", error);
        // We'll let the !generatedContent check below handle the failure
      }
      
      // If no generatedContent was created, fail the paper generation
      if (!generatedContent) {
        throw new Error("Failed to generate paper content using the question bank");
      }

      // Create a file path reference
      const filePath = `generated_papers/${paper.id}_${student.rollNumber}_${randomUUID()}.pdf`;

      // Update the generated paper record with the final content
      await storage.updateGeneratedPaper(generatedPaper.id, {
        content: generatedContent,
        filePath,
        status: "Completed"
      });
    } catch (error) {
      // Handle any errors in paper generation
      console.error(`Error generating paper for student ${generatedPaper.studentId}:`, error);
      
      // Mark the paper as failed
      await storage.updateGeneratedPaper(generatedPaper.id, {
        status: "Failed",
        content: { error: String(error) || "Unknown error" }
      });
    }
  }
}

// Export the function to be used in routes.ts
export { processGeneratedPapers };