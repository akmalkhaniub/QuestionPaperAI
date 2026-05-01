import { randomUUID } from "crypto";
import { storage } from "./storage";

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

      let generatedContent;
      
      // Using question bank approach instead of OpenAI generation
      try {
        console.log(`Getting verified questions from question bank for subject: ${paper.subject}`);
        
        // Get all verified questions
        const verifiedQuestions = await storage.getVerifiedQuestions();
        
        // Filter to just questions from this subject
        const subjectQuestions = verifiedQuestions.filter(q => 
          q.subject.toLowerCase() === paper.subject.toLowerCase()
        );
        
        console.log(`Found ${subjectQuestions.length} verified questions for subject: ${paper.subject}`);
        
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
        
        // Shuffle the array to pick random questions
        const shuffledQuestions = [...subjectQuestions].sort(() => 0.5 - Math.random());
        
        // Create paper content based on available questions
        const sections = [];
        let questionIndex = 0;
        
        // Process each topic to create sections
        for (const topic of topics) {
          // Adjust number of questions if we don't have enough
          const actualQuestions = Math.min(
            topic.numberOfQuestions, 
            shuffledQuestions.length - questionIndex
          );
          
          if (actualQuestions <= 0) {
            // Skip this topic if we have no questions available
            console.log(`Warning: No questions available for topic ${topic.topicName}`);
            continue;
          }
          
          // Get questions for this topic
          const topicQuestions = shuffledQuestions.slice(
            questionIndex, 
            questionIndex + actualQuestions
          );
          questionIndex += actualQuestions;
          
          // Create a section for this topic
          const section = {
            id: `section-${topic.id}`,
            title: topic.topicName,
            questionType: topic.questionType,
            totalMarks: topic.marksPerQuestion * actualQuestions,
            marksPerQuestion: topic.marksPerQuestion,
            questions: []
          };
          
          // Add questions to this section
          for (const questionData of topicQuestions) {
            // For MCQs, we need to randomize the options
            let questionContent = questionData.content;
            
            // Handle different question types
            if (topic.questionType === 'Multiple Choice') {
              if (questionData.questionType === 'Multiple Choice') {
                // This is already an MCQ, just need to randomize options
                if (questionContent.options) {
                  // Randomize the options
                  const originalOptions = {...questionContent.options};
                  const newOptions = {};
                  const correctOptionText = originalOptions[questionContent.correctOption];
                  
                  // Create shuffled entries
                  const optionEntries = Object.entries(originalOptions);
                  const shuffledEntries = [...optionEntries].sort(() => 0.5 - Math.random());
                  
                  // Create new options with shuffled order
                  let newCorrectOption = '';
                  shuffledEntries.forEach((entry, idx) => {
                    const newKey = String.fromCharCode(65 + idx); // A, B, C, D, etc.
                    newOptions[newKey] = entry[1];
                    
                    if (entry[1] === correctOptionText) {
                      newCorrectOption = newKey;
                    }
                  });
                  
                  // Update the question content
                  questionContent = {
                    ...questionContent,
                    options: newOptions,
                    correctOption: newCorrectOption
                  };
                }
              } else {
                // Convert other question type to MCQ if needed
                // This should be a rare case, but handle it gracefully
                console.log(`Warning: Converting non-MCQ question to MCQ format for question ${questionData.id}`);
                
                // Create placeholder options
                const options = {
                  "A": "Option A",
                  "B": "Option B",
                  "C": "Option C",
                  "D": "Option D"
                };
                
                // Set the correct option to A by default
                questionContent = {
                  question: questionData.content.question || questionData.content,
                  options: options,
                  correctOption: "A"
                };
              }
            }
            
            // Add the question to the section
            section.questions.push({
              id: questionData.id,
              content: questionContent,
              marks: topic.marksPerQuestion,
              type: topic.questionType,
              // Add a hidden studentId for identification
              hiddenData: {
                studentId: student.id,
                paperId: paper.id
              }
            });
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
            instructor: promptContent.instructorName,
            title: promptContent.paperTitle,
            subject: promptContent.subject,
            examType: promptContent.paperType,
            studentName: promptContent.studentName,
            rollNumber: promptContent.studentRollNumber,
            examDate: promptContent.examDate,
            timeAllowed: `${promptContent.timeAllowed} minutes`,
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