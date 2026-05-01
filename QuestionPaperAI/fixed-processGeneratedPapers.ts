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

      // Prepare content for paper generation with new university-related fields
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
      
      try {
        console.log(`Getting verified questions from question bank for subject: ${paper.subject}`);
        // Get all verified questions
        const verifiedQuestions = await storage.getVerifiedQuestions();
        
        // Filter to just questions from this subject
        const subjectQuestions = verifiedQuestions.filter(q => 
          q.subject.toLowerCase() === paper.subject.toLowerCase()
        );
        
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
        
        // Continue with the rest of the function...
        // ...
        
        // Set generatedContent
        generatedContent = {
          paperHeader: {
            // Paper header properties
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
          sections: [] // Sections would be populated in the real function
        };
      } catch (error) {
        // Error with question bank generation, just log it
        console.error("Error using question bank:", error);
        // Don't throw the error here
      }

      // If no generatedContent was created, fail the paper generation
      if (!generatedContent) {
        throw new Error("Failed to generate paper content using the question bank");
      }

      // Create a file path reference
      const filePath = `generated_papers/${paper.id}_${student.rollNumber}_${crypto.randomUUID()}.pdf`;

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