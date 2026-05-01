import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import Step1PaperDetails from "./Step1PaperDetails";
import Step2QuestionTopics from "./Step2QuestionTopics";
import Step3StudentSelection from "./Step3StudentSelection";
import Step4Generation from "./Step4Generation";
import { File, ListTodo, Users, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createPaperWithTopics, generatePapers } from "@/lib/openai";
import { useLocation } from "wouter";

interface PaperData {
  title: string;
  universityName: string;
  departmentName: string;
  programName: string;
  semesterName: string;
  className: string;
  classGrade: string;
  subject: string;
  instructorName: string;
  paperType: string;
  examDate: string | null;
  templateType: string;
  customTemplatePath?: string;
  timeAllowed: number;
  totalMarks: number;
  totalQuestions: number;
  userId: number;
}

// Default topic for each paper (now using question bank only)
const defaultTopic = {
  topicName: "Main Topic", // Required field - must not be null
  questionType: "Multiple Choice", // Required field
  numberOfQuestions: 10, // Required field
  marksPerQuestion: 1, // Required field
  difficultyLevel: "Medium" // Required field
};

export default function PaperWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [paperData, setPaperData] = useState<PaperData>({
    title: "Object Oriented Programming Final Exam",
    universityName: "The Islamia University of Bahawalpur",
    departmentName: "Department of Data Science",
    programName: "BS Data Science",
    semesterName: "Spring 2025",
    className: "2nd Semester",
    classGrade: "N/A",
    subject: "Object Oriented Programming using Python",
    instructorName: "Dr. Akmal Khan",
    paperType: "Midterm",
    examDate: "12/04/2025",
    templateType: "Multiple Choice Only (MCQ)",
    timeAllowed: 60,
    totalMarks: 100,
    totalQuestions: 10,
    userId: 1
  });
  
  // Topic structure for paper question sections
  interface TopicData {
    topicName: string;
    questionType: string;
    numberOfQuestions: number;
    marksPerQuestion: number;
    difficultyLevel: string;
  }
  
  // Topics for the paper (initialized with default)
  const [topics, setTopics] = useState<TopicData[]>([
    {
      topicName: "Main Topic",
      questionType: "Multiple Choice",
      numberOfQuestions: 10,
      marksPerQuestion: 1,
      difficultyLevel: "Medium"
    }
  ]);
  
  // Calculated total marks and questions
  const totalMarks = topics.reduce((sum, topic) => sum + (topic.numberOfQuestions * topic.marksPerQuestion), 0);
  const totalQuestions = topics.reduce((sum, topic) => sum + topic.numberOfQuestions, 0);
  
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [generatedPaperId, setGeneratedPaperId] = useState<number | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Update paperData when template type changes
  useEffect(() => {
    // If multi-section paper is selected, update the flow to show the topics configuration
    if (paperData.templateType === "Multi-Section Paper (MCQ + Short + Coding)") {
      // We'll handle topics in Step 2
    }
    
    // Update total marks and questions in paperData
    setPaperData(prev => ({
      ...prev,
      totalMarks,
      totalQuestions
    }));
  }, [paperData.templateType, topics, totalMarks, totalQuestions]);

  const nextStep = () => {
    if (currentStep === 1) {
      // If using multi-section paper, go to step 2 for topics configuration
      if (paperData.templateType === "Multi-Section Paper (MCQ + Short + Coding)") {
        setCurrentStep(2);
      } else {
        // Otherwise skip to step 3 (student selection)
        setCurrentStep(3);
      }
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep === 3) {
      // When going back from step 3, go to step 2 if using multi-section format
      if (paperData.templateType === "Multi-Section Paper (MCQ + Short + Coding)") {
        setCurrentStep(2);
      } else {
        // Otherwise go back to step 1
        setCurrentStep(1);
      }
    } else {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handlePaperDataChange = (data: Partial<PaperData>) => {
    setPaperData(prev => ({ ...prev, ...data }));
  };

  const handleStudentSelection = (studentIds: number[]) => {
    setSelectedStudentIds(studentIds);
  };

  const handleGeneratePapers = async () => {
    try {
      console.log("Submitting paper data:", paperData);
      console.log("Selected student IDs:", selectedStudentIds);
      
      // Make sure we always have a userId
      const paperDataToSubmit = {
        ...paperData,
        userId: 1  // Default user ID if missing
      };
      
      let topicsToSubmit;
      
      // Use the configured topics for multi-section papers
      if (paperData.templateType === "Multi-Section Paper (MCQ + Short + Coding)") {
        // Use the topics from our state 
        topicsToSubmit = topics;
        console.log("Using multi-section paper topics:", topicsToSubmit);
      } else {
        // Otherwise use the default MCQ topic
        topicsToSubmit = [defaultTopic];
        console.log("Using default topic:", topicsToSubmit);
      }
      
      // Create the paper with the appropriate topics
      const paper = await createPaperWithTopics(paperDataToSubmit, topicsToSubmit);
      console.log("Paper created successfully:", paper);
      
      // Then generate papers for selected students
      await generatePapers(paper.id, selectedStudentIds);
      
      setGeneratedPaperId(paper.id);
      
      // Simulate progress updates (in a real app, this would be from API polling)
      let progress = 0;
      const interval = setInterval(() => {
        progress += 25;
        setGenerationProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
        }
      }, 1500);
      
      toast({
        title: "Paper generation started",
        description: "Your papers are being generated. This may take a few minutes.",
      });
    } catch (error: any) {
      console.error("Error generating papers:", error);
      toast({
        title: "Error generating papers",
        description: String(error) || "An error occurred while generating papers. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBackToDashboard = () => {
    navigate("/");
  };

  const handleCreateNewPaper = () => {
    setPaperData({
      title: "Object Oriented Programming Final Exam",
      universityName: "The Islamia University of Bahawalpur",
      departmentName: "Department of Data Science",
      programName: "BS Data Science",
      semesterName: "Spring 2025",
      className: "2nd Semester",
      classGrade: "N/A",
      subject: "Object Oriented Programming using Python",
      instructorName: "Dr. Akmal Khan",
      paperType: "Midterm",
      examDate: "12/04/2025",
      templateType: "Multiple Choice Only (MCQ)",
      timeAllowed: 60,
      totalMarks: 100,
      totalQuestions: 10,
      userId: 1
    });
    setSelectedStudentIds([]);
    setCurrentStep(1);
    setGeneratedPaperId(null);
    setGenerationProgress(0);
  };

  return (
    <Card className="mt-10 shadow overflow-hidden">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Create New Question Paper</h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Follow these steps to generate unique papers for your students
        </p>
      </div>

      {/* Step Indicator with optional Question Topics step */}
      <div className="px-4 py-5 sm:px-6">
        <div className="flex items-center w-full mb-6">
          {/* Step 1: Paper Details */}
          <div className="w-1/4 text-center">
            <div className="relative flex flex-col items-center">
              <div className={`rounded-full w-10 h-10 ${
                currentStep >= 1 ? "bg-primary text-white" : "bg-gray-200 text-gray-500"
              } flex items-center justify-center z-10`}>
                <File className="h-5 w-5" />
              </div>
              <div className={`absolute top-0 w-24 mt-16 text-xs font-medium ${
                currentStep >= 1 ? "text-primary" : "text-gray-500"
              }`}>
                Paper Details
              </div>
            </div>
          </div>
          
          <div className="w-full bg-gray-200 rounded items-center align-middle h-1">
            <div 
              className="bg-primary h-1 rounded" 
              style={{ width: currentStep > 1 ? "100%" : "0%" }}
            ></div>
          </div>
          
          {/* Step 2: Question Topics (displayed only for multi-section papers) */}
          {paperData.templateType === "Multi-Section Paper (MCQ + Short + Coding)" && (
            <>
              <div className="w-1/4 text-center">
                <div className="relative flex flex-col items-center">
                  <div className={`rounded-full w-10 h-10 ${
                    currentStep >= 2 ? "bg-primary text-white" : "bg-gray-200 text-gray-500"
                  } flex items-center justify-center z-10`}>
                    <ListTodo className="h-5 w-5" />
                  </div>
                  <div className={`absolute top-0 w-24 mt-16 text-xs font-medium ${
                    currentStep >= 2 ? "text-primary" : "text-gray-500"
                  }`}>
                    Question Topics
                  </div>
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded items-center align-middle h-1">
                <div 
                  className="bg-primary h-1 rounded" 
                  style={{ width: currentStep > 2 ? "100%" : "0%" }}
                ></div>
              </div>
            </>
          )}
          
          {/* Step 3: Select Students */}
          <div className="w-1/4 text-center">
            <div className="relative flex flex-col items-center">
              <div className={`rounded-full w-10 h-10 ${
                currentStep >= 3 ? "bg-primary text-white" : "bg-gray-200 text-gray-500"
              } flex items-center justify-center z-10`}>
                <Users className="h-5 w-5" />
              </div>
              <div className={`absolute top-0 w-24 mt-16 text-xs font-medium ${
                currentStep >= 3 ? "text-primary" : "text-gray-500"
              }`}>
                Select Students
              </div>
            </div>
          </div>
          
          <div className="w-full bg-gray-200 rounded items-center align-middle h-1">
            <div 
              className="bg-primary h-1 rounded" 
              style={{ width: currentStep > 3 ? "100%" : "0%" }}
            ></div>
          </div>
          
          {/* Step 4: Generate */}
          <div className="w-1/4 text-center">
            <div className="relative flex flex-col items-center">
              <div className={`rounded-full w-10 h-10 ${
                currentStep >= 4 ? "bg-primary text-white" : "bg-gray-200 text-gray-500"
              } flex items-center justify-center z-10`}>
                <Wand2 className="h-5 w-5" />
              </div>
              <div className={`absolute top-0 w-24 mt-16 text-xs font-medium ${
                currentStep >= 4 ? "text-primary" : "text-gray-500"
              }`}>
                Generate
              </div>
            </div>
          </div>
        </div>
      </div>

      <CardContent className="px-4 py-5 sm:px-6">
        {currentStep === 1 && (
          <Step1PaperDetails 
            paperData={paperData} 
            onPaperDataChange={handlePaperDataChange} 
            onNext={nextStep}
          />
        )}
        
        {currentStep === 2 && (
          <Step2QuestionTopics 
            topics={topics}
            onTopicsChange={setTopics}
            onNext={nextStep}
            onPrev={prevStep}
            totalMarks={totalMarks}
            totalQuestions={totalQuestions}
            onTimeAllowedChange={(time) => handlePaperDataChange({timeAllowed: time})}
            timeAllowed={paperData.timeAllowed}
          />
        )}
        
        {currentStep === 3 && (
          <Step3StudentSelection 
            selectedStudentIds={selectedStudentIds}
            onStudentSelection={handleStudentSelection}
            onNext={() => {
              nextStep();
              handleGeneratePapers();
            }}
            onPrev={prevStep}
          />
        )}
        
        {currentStep === 4 && (
          <Step4Generation 
            progress={generationProgress}
            paperId={generatedPaperId}
            onBackToDashboard={handleBackToDashboard}
            onCreateNewPaper={handleCreateNewPaper}
          />
        )}
      </CardContent>
    </Card>
  );
}
