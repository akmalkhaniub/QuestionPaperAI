import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, Eye, FileCheck, FileText, FileDown, Trash, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Student } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { MCQPaperPreview } from "./MCQPaperPreview";
import { MCQAnswerKeyPreview } from "./MCQAnswerKeyPreview";
import { useToast } from "@/hooks/use-toast";
import { generateDOCX, generatePDF, generateMultiSectionPaper } from "@/lib/document-utils";

interface GeneratedPaper {
  id: number;
  paperId: number;
  studentId: number;
  status: string;
  filePath: string;
  content?: any;  // This can contain the paper content as JSON
  student?: Student;
}

interface Step4GenerationProps {
  progress: number;
  paperId: number | null;
  onBackToDashboard: () => void;
  onCreateNewPaper: () => void;
}

export default function Step4Generation({
  progress,
  paperId,
  onBackToDashboard,
  onCreateNewPaper
}: Step4GenerationProps) {
  const [showResults, setShowResults] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [answerKeyOpen, setAnswerKeyOpen] = useState(false);
  const [selectedPaperData, setSelectedPaperData] = useState<any>(null);
  const { toast } = useToast();

  const queryClient = useQueryClient();
  
  const { data: generatedPapers, isLoading, refetch } = useQuery<GeneratedPaper[]>({
    queryKey: paperId ? ['/api/papers', paperId, 'generated-papers'] : ["no-paper"],
    enabled: !!paperId && progress === 100,
    refetchInterval: 3000, // Poll every 3 seconds to check for status updates
  });
  
  // Mutation to delete a single generated paper
  const deletePaperMutation = useMutation({
    mutationFn: async (paperId: number) => {
      return apiRequest('DELETE', `/api/generated-papers/${paperId}`);
    },
    onSuccess: () => {
      // Invalidate the query to refetch generated papers after deletion
      if (paperId) {
        queryClient.invalidateQueries({ queryKey: ['/api/papers', paperId, 'generated-papers'] });
      }
      toast({
        title: "Paper deleted",
        description: "The paper has been deleted successfully",
        variant: "default"
      });
    },
    onError: (error) => {
      console.error("Error deleting paper:", error);
      toast({
        title: "Error",
        description: "Failed to delete the paper. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Mutation to delete all generated papers for this paper
  const deleteAllPapersMutation = useMutation({
    mutationFn: async () => {
      if (!paperId) return Promise.reject(new Error("Paper ID not available"));
      return apiRequest('DELETE', `/api/papers/${paperId}/generated-papers`);
    },
    onSuccess: () => {
      // Invalidate the query to refetch generated papers after deletion
      if (paperId) {
        queryClient.invalidateQueries({ queryKey: ['/api/papers', paperId, 'generated-papers'] });
      }
      toast({
        title: "All papers deleted",
        description: "All generated papers have been deleted successfully",
        variant: "default"
      });
    },
    onError: (error) => {
      console.error("Error deleting all papers:", error);
      toast({
        title: "Error",
        description: "Failed to delete all papers. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Track if we need to force complete any papers that are stuck
  const [hasForcedCompletion, setHasForcedCompletion] = useState(false);

  useEffect(() => {
    // Show results when progress is complete
    if (progress === 100) {
      // Small delay to simulate processing
      const timer = setTimeout(() => {
        setShowResults(true);
        if (paperId) {
          refetch();
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [progress, paperId, refetch]);
  
  // Handle stuck papers - if papers stay in pending/processing for too long, force them to complete
  useEffect(() => {
    if (!generatedPapers || generatedPapers.length === 0 || hasForcedCompletion) return;
    
    // Check if there are any stuck papers after a reasonable timeout
    const pendingOrProcessing = generatedPapers.some(
      paper => paper.status === 'Pending' || paper.status === 'Processing'
    );
    
    if (pendingOrProcessing) {
      // Set a timeout to check again after 30 seconds
      const stuckPapersTimeout = setTimeout(() => {
        // Check if we still have pending papers
        const stillStuck = generatedPapers.some(
          paper => paper.status === 'Pending' || paper.status === 'Processing'
        );
        
        if (stillStuck) {
          // Force refresh to get the latest status
          refetch();
          setHasForcedCompletion(true);
          
          toast({
            title: "Papers status updated",
            description: "Some papers were taking too long. Please try downloading those that are completed.",
            variant: "default",
          });
        }
      }, 30000); // 30 seconds timeout
      
      return () => clearTimeout(stuckPapersTimeout);
    }
  }, [generatedPapers, hasForcedCompletion, refetch]);

  // Helper function for Roman numerals
  const toRoman = (num: number): string => {
    const romanNumerals = [
      { value: 10, numeral: 'X' },
      { value: 9, numeral: 'IX' },
      { value: 5, numeral: 'V' },
      { value: 4, numeral: 'IV' },
      { value: 1, numeral: 'I' }
    ];
    
    let result = '';
    for (const pair of romanNumerals) {
      while (num >= pair.value) {
        result += pair.numeral;
        num -= pair.value;
      }
    }
    
    return result;
  };
  
  // Helper function to format time allowed properly without duplicate "minutes"
  const formatTimeAllowed = (timeValue: any): string => {
    if (!timeValue) return "60 minutes";
    
    const timeStr = String(timeValue);
    if (timeStr.includes("minutes")) {
      // Avoid duplicating "minutes" by cleaning up any existing mentions
      return timeStr.replace(/minutes\s+minutes/g, "minutes");
    }
    
    // Add "minutes" if it's not already there
    return `${timeStr} minutes`;
  };
  
  // Helper function to consistently format dates in DD/MM/YYYY format
  const formatDate = (dateValue: any): string => {
    if (!dateValue) return new Date().toLocaleDateString('en-GB');
    
    if (typeof dateValue === 'string') {
      // Check if it's an ISO date string
      if (dateValue.includes('T')) {
        try {
          // Try to parse the ISO date and format it
          const date = new Date(dateValue);
          return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
        } catch (e) {
          // If parsing fails, return the string as is
          return dateValue;
        }
      }
      return dateValue; // Already a formatted date string
    }
    
    // If it's a Date object
    if (dateValue instanceof Date) {
      return dateValue.toLocaleDateString('en-GB');
    }
    
    // Fallback to current date
    return new Date().toLocaleDateString('en-GB');
  };
  
  // Helper function to format code blocks with proper HTML for downloaded papers
  const formatCodeForHTML = (text: string) => {
    if (!text) return '';
    
    // Format code blocks with ``` markers
    let formattedText = text;
    if (text.includes('```')) {
      formattedText = text.replace(/```([\s\S]*?)```/g, 
        '<pre style="background-color: #f5f5f5; padding: 2px; border-radius: 2px; font-family: monospace; white-space: pre-wrap; overflow-x: auto; font-size: 9px; margin: 1px 0;">$1</pre>'
      );
    }
    
    // Format inline code with ` markers
    if (formattedText.includes('`')) {
      formattedText = formattedText.replace(/`([^`]+)`/g, 
        '<code style="background-color: #f5f5f5; padding: 1px; border-radius: 2px; font-family: monospace; font-size: 9px;">$1</code>'
      );
    }
    
    return formattedText;
  };
  
  // Helper function to generate HTML for questions
  const generateQuestionsHTML = (paperContent: any): string => {
    let questionsHTML = '';
    
    if (paperContent.questions) {
      // MCQ format
      paperContent.questions.forEach((q: any, i: number) => {
        const romanNum = toRoman(i + 1);
        questionsHTML += `
  <div class="question">
    <p class="question-text"><strong>${romanNum}.</strong> ${formatCodeForHTML(q.questionText)}</p>
    <div class="options">`;
        
        Object.entries(q.options || {}).forEach(([key, value]) => {
          questionsHTML += `
      <div class="option">
        <span style="margin-right: 4px; font-weight: 500;">${key}.</span>
        <span>${formatCodeForHTML(value as string)}</span>
      </div>`;
        });
        
        questionsHTML += `
    </div>
    <div class="bubbles">
      <span>Q${i+1}:</span>
      <div class="bubble-option"><span>A</span><span class="bubble"></span></div>
      <div class="bubble-option"><span>B</span><span class="bubble"></span></div>
      <div class="bubble-option"><span>C</span><span class="bubble"></span></div>
      <div class="bubble-option"><span>D</span><span class="bubble"></span></div>
    </div>
  </div>`;
      });
    } else if (paperContent.sections) {
      // Standard format with sections
      paperContent.sections.forEach((section: any, sectionIndex: number) => {
        questionsHTML += `
  <div class="section">
    <h3>Section ${sectionIndex + 1}: ${section.title || section.topicName || 'Topic'}</h3>`;
        
        (section.questions || []).forEach((q: any, i: number) => {
          questionsHTML += `
    <div class="question">
      <p class="question-text"><strong>${i + 1}.</strong> ${formatCodeForHTML(q.questionText)} <span class="marks">(${q.marks || 1} marks)</span></p>`;
          
          if (q.options) {
            questionsHTML += `<div class="options">`;
            Object.entries(q.options).forEach(([key, value]) => {
              questionsHTML += `
        <div class="option">
          <span style="margin-right: 4px; font-weight: 500;">${key}.</span>
          <span>${formatCodeForHTML(value as string)}</span>
        </div>`;
            });
            questionsHTML += `</div>
            <div class="bubbles">
              <span>Q${i+1}:</span>
              <div class="bubble-option"><span>A</span><span class="bubble"></span></div>
              <div class="bubble-option"><span>B</span><span class="bubble"></span></div>
              <div class="bubble-option"><span>C</span><span class="bubble"></span></div>
              <div class="bubble-option"><span>D</span><span class="bubble"></span></div>
            </div>`;
          }
          
          questionsHTML += `</div>`;
        });
        
        questionsHTML += `</div>`;
      });
    }
    
    return questionsHTML;
  };
  
  // Helper function to generate complete HTML content for a paper with proper formatting
  const generatePaperHTML = (paperContent: any, paper?: GeneratedPaper): string => {
    // Safely access student data even if paper is undefined
    const paperStudentName = paper?.student?.name;
    const paperStudentRollNumber = paper?.student?.rollNumber;
    const paperStudentClassSection = paper?.student?.classSection;
    // Update date format in the content to ensure consistency
    const formattedDate = formatDate(paperContent.paperHeader?.date || paperContent.paperHeader?.examDate);
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${paperContent.paperHeader?.subject || 'Question Paper'} - ${paperContent.paperHeader?.studentName || 'Student'}</title>
  <style>
    @page { size: legal; margin: 0.25in; }
    body { font-family: Arial, sans-serif; margin: 0; padding: 5px; font-size: 10px; line-height: 1.2; }
    .header { text-align: center; margin-bottom: 5px; }
    .header h1 { font-size: 14px; font-weight: bold; margin: 2px 0; }
    .header h2 { font-size: 12px; font-weight: normal; margin: 2px 0; }
    .details { display: grid; grid-template-columns: 1fr 1fr; margin: 5px 0; }
    .details p { margin: 2px 0; font-size: 10px; }
    .student-info { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 0; margin: 3px 0; }
    .question { margin-bottom: 4px; page-break-inside: avoid; }
    .question-text { font-weight: bold; margin: 0; font-size: 10px; }
    .options { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; margin-top: 1px; }
    .option { display: flex; font-size: 9px; margin-bottom: 0; }
    .signature-section { display: flex; justify-content: space-between; margin-top: 6px; padding-top: 3px; border-top: 1px solid #ddd; }
    .signature-box { border-bottom: 1px solid #000; width: 120px; height: 16px; margin-top: 2px; }
    pre { background-color: #f5f5f5; padding: 2px; border-radius: 2px; font-family: monospace; white-space: pre-wrap; overflow-x: auto; font-size: 9px; margin: 1px 0; }
    code { background-color: #f5f5f5; padding: 1px; border-radius: 2px; font-family: monospace; font-size: 9px; }
    .bubbles { display: flex; align-items: center; margin-top: 4px; padding-top: 2px; border-top: 1px dotted #ddd; font-size: 9px; }
    .bubble-option { display: flex; align-items: center; margin-right: 8px; }
    .bubble { width: 10px; height: 10px; border: 1.5px solid #000; border-radius: 50%; display: inline-block; margin-left: 2px; }
    .signatures { font-size: 9px; font-weight: normal; }
    @media print {
      body { padding: 0; }
      .options { page-break-inside: avoid; }
      .question { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${paperContent.paperHeader?.university || 'The Islamia University of Bahawalpur'}</h1>
    <h2>${paperContent.paperHeader?.department || 'Department of Data Science'}</h2>
  </div>
  
  <div class="details">
    <div>
      <p><strong>Program/Semester:</strong> ${paperContent.paperHeader?.program || paperContent.paperHeader?.class || ''}</p>
      <p><strong>Subject:</strong> ${paperContent.paperHeader?.subject || ''}</p>
      <p><strong>Instructor:</strong> ${paperContent.paperHeader?.instructor || paperContent.paperHeader?.teacherName || 'Dr. Faculty Member'}</p>
    </div>
    <div>
      <p><strong>Maximum Marks:</strong> ${paperContent.paperHeader?.marks || paperContent.paperHeader?.totalMarks || ''}</p>
      <p><strong>Time:</strong> ${paperContent.paperHeader?.time || formatTimeAllowed(paperContent.paperHeader?.timeAllowed)}</p>
      <p><strong>Date:</strong> ${formattedDate}</p>
    </div>
  </div>
  
  <div>
    <p><strong>Paper Type:</strong> ${paperContent.paperHeader?.paperType || 'MCQS (circle the right choice. Cutting and overwriting is not allowed)'}</p>
  </div>
  
  <div class="student-info">
    <p>
      <strong>Name:</strong> ${paperContent.paperHeader?.studentName || paperStudentName || '_______________________'}
      <span style="float: right"><strong>Roll No:</strong> ${paperContent.paperHeader?.rollNumber || paperStudentRollNumber || '______________'}</span>
    </p>
    <p>
      <strong>Class/Section:</strong> ${paperContent.paperHeader?.class_section || paperStudentClassSection || '______________'}
      <span style="float: right"><strong>Date:</strong> ${paperContent.paperHeader?.examDate || new Date().toLocaleDateString('en-GB')}</span>
    </p>
  </div>
  
  <div class="questions">
    ${generateQuestionsHTML(paperContent)}
  </div>
  
  <div class="signature-section">
    <div style="border: 1px solid #ddd; padding: 5px; border-radius: 4px; width: 160px;">
      <p style="margin: 0; font-size: 9px;"><strong>Examiner's Signature:</strong></p>
      <div class="signature-box" style="height: 18px;">&nbsp;</div>
    </div>
    <div style="border: 1px solid #ddd; padding: 5px; border-radius: 4px; width: 160px;">
      <p style="margin: 0; font-size: 9px;"><strong>Student's Signature:</strong></p>
      <div class="signature-box" style="height: 18px;">&nbsp;</div>
    </div>
  </div>
  
  <!-- Hidden paper ID for scanning reference -->
  <div style="text-align: center; margin-top: 10px; font-size: 7px; color: #999;">
    <p>Paper ID: ${paperContent?.id || '-'} | Student ID: ${paperContent.paperHeader?.rollNumber || '-'} | Generated: ${new Date().toLocaleDateString('en-GB')}</p>
  </div>
</body>
</html>`;
  };

  // Handle downloading all papers in a single document
  const handleDownloadAllPapers = (format: 'pdf' | 'docx') => {
    const completedPapers = generatedPapers.filter(p => p.status === 'Completed');
    
    if (completedPapers.length === 0) {
      toast({
        title: "No Papers Available",
        description: "There are no completed papers to download",
        variant: "destructive"
      });
      return;
    }

    // Parse all paper contents
    const paperContents = completedPapers.map(paper => {
      if (!paper.content) return null;
      return typeof paper.content === 'string' ? JSON.parse(paper.content) : paper.content;
    }).filter(content => content !== null);

    // Format combined file name
    const subject = paperContents[0]?.paperHeader?.subject || 'question_papers';
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `${subject}_combined_${timestamp}`.replace(/\s+/g, '_');

    // Generate combined document
    generateCombinedPapers(paperContents, format, fileName);
  };

  // Handle downloading individual DOCX format
  const handleDownloadDOCX = (paper: GeneratedPaper) => {
    console.log("Downloading DOCX paper:", paper);
    
    if (paper && paper.status === 'Completed') {
      // Generate downloaded file content from paper.content
      if (paper.content) {
        const paperContent = typeof paper.content === 'string' ? 
          JSON.parse(paper.content) : paper.content;
          
        // Format file name with clean strings
        const fileName = `${paperContent.paperHeader?.subject || 'question_paper'}_${paper.student?.name || 'student'}`.replace(/\s+/g, '_');
        
        // Generate paper using multi-section format
        generateMultiSectionPaper(paperContent, 'docx', fileName);
      } else {
        toast({
          title: "Download Error",
          description: "Paper content not available for download",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "Download Error",
        description: "Paper is not ready for download. Please wait for status to be 'Completed'",
        variant: "destructive"
      });
    }
  };
  
  // Handle downloading PDF format
  const handleDownloadPDF = (paper: GeneratedPaper) => {
    console.log("Downloading PDF paper:", paper);
    
    if (paper && paper.status === 'Completed') {
      // Generate downloaded file content from paper.content
      if (paper.content) {
        const paperContent = typeof paper.content === 'string' ? 
          JSON.parse(paper.content) : paper.content;
        
        // Format file name with clean strings
        const fileName = `${paperContent.paperHeader?.subject || 'question_paper'}_${paper.student?.name || 'student'}`.replace(/\s+/g, '_');
        
        // Check if we have multiple question types (MCQs, Short, and Coding)
        const hasMCQs = paperContent.sections?.some((s: any) => 
          s.questionType === 'Multiple Choice' || s.questionType?.includes('MCQ'));
        
        const hasShortQuestions = paperContent.sections?.some((s: any) => 
          s.questionType === 'Short Answer' || s.questionType?.includes('Short'));
        
        const hasCodingQuestions = paperContent.sections?.some((s: any) => 
          s.questionType === 'Coding Type Long Question' || s.questionType?.includes('Coding'));
        
        // Use multi-section format if we have all three question types
        if (hasMCQs && hasShortQuestions && hasCodingQuestions) {
          // Use the specialized multi-section paper format with proper page breaks
          generateMultiSectionPaper(paperContent, 'pdf', fileName);
          
          toast({
            title: "Multi-section Paper",
            description: "Downloading paper with MCQs, Short Questions, and Coding sections on separate pages",
          });
        } else {
          // Use the standard paper format
          const htmlContent = generatePaperHTML(paperContent, paper);
          generatePDF(htmlContent, fileName);
        }
      } else {
        toast({
          title: "Download Error",
          description: "Paper content not available for download",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "Download Error",
        description: "Paper is not ready for download. Please wait for status to be 'Completed'",
        variant: "destructive"
      });
    }
  };
  
  // Original handleDownload function (legacy) - kept for backward compatibility
  const handleDownload = (paper: GeneratedPaper) => {
    console.log("Downloading paper (legacy HTML format):", paper);
    
    if (paper && paper.status === 'Completed') {
      // Generate downloaded file content from paper.content
      if (paper.content) {
        const paperContent = typeof paper.content === 'string' ? 
          JSON.parse(paper.content) : paper.content;
        
        // Safely access student data
        const paperStudentName = paper.student?.name;
        const paperStudentRollNumber = paper.student?.rollNumber;
        const paperStudentClassSection = paper.student?.classSection;
        
        // Create HTML document content
        let documentContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${paperContent.paperHeader?.subject || 'Question Paper'} - ${paperContent.paperHeader?.studentName || paperStudentName || 'Student'}</title>
  <style>
    @page { size: legal; margin: 0.25in; }
    body { font-family: Arial, sans-serif; margin: 0; padding: 5px; font-size: 10px; line-height: 1.2; }
    .header { text-align: center; margin-bottom: 5px; }
    .header h1 { font-size: 14px; font-weight: bold; margin: 2px 0; }
    .header h2 { font-size: 12px; font-weight: normal; margin: 2px 0; }
    .details { display: grid; grid-template-columns: 1fr 1fr; margin: 5px 0; }
    .details p { margin: 2px 0; font-size: 10px; }
    .student-info { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 0; margin: 3px 0; }
    .question { margin-bottom: 4px; page-break-inside: avoid; }
    .question-text { font-weight: bold; margin: 0; font-size: 10px; }
    .options { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; margin-top: 1px; }
    .option { display: flex; font-size: 9px; margin-bottom: 0; }
    .signature-section { display: flex; justify-content: space-between; margin-top: 6px; padding-top: 3px; border-top: 1px solid #ddd; }
    .signature-box { border-bottom: 1px solid #000; width: 120px; height: 16px; margin-top: 2px; }
    pre { background-color: #f5f5f5; padding: 2px; border-radius: 2px; font-family: monospace; white-space: pre-wrap; overflow-x: auto; font-size: 9px; margin: 1px 0; }
    code { background-color: #f5f5f5; padding: 1px; border-radius: 2px; font-family: monospace; font-size: 9px; }
    .bubbles { display: flex; align-items: center; margin-top: 4px; padding-top: 2px; border-top: 1px dotted #ddd; font-size: 9px; }
    .bubble-option { display: flex; align-items: center; margin-right: 8px; }
    .bubble { width: 10px; height: 10px; border: 1.5px solid #000; border-radius: 50%; display: inline-block; margin-left: 2px; }
    .signatures { font-size: 9px; font-weight: normal; }
    @media print {
      body { padding: 0; }
      .options { page-break-inside: avoid; }
      .question { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${paperContent.paperHeader?.university || 'The Islamia University of Bahawalpur'}</h1>
    <h2>${paperContent.paperHeader?.department || 'Department of Data Science'}</h2>
  </div>
  
  <div class="details">
    <div>
      <p><strong>Program/Semester:</strong> ${paperContent.paperHeader?.program || paperContent.paperHeader?.class || ''}</p>
      <p><strong>Subject:</strong> ${paperContent.paperHeader?.subject || ''}</p>
      <p><strong>Instructor:</strong> ${paperContent.paperHeader?.instructor || paperContent.paperHeader?.teacherName || 'Dr. Faculty Member'}</p>
    </div>
    <div>
      <p><strong>Maximum Marks:</strong> ${paperContent.paperHeader?.marks || paperContent.paperHeader?.totalMarks || ''}</p>
      <p><strong>Time:</strong> ${paperContent.paperHeader?.time || formatTimeAllowed(paperContent.paperHeader?.timeAllowed)}</p>
      <p><strong>Date:</strong> ${formatDate(paperContent.paperHeader?.date || paperContent.paperHeader?.examDate)}</p>
    </div>
  </div>
  
  <div>
    <p><strong>Paper Type:</strong> ${paperContent.paperHeader?.paperType || 'MCQS (circle the right choice. Cutting and overwriting is not allowed)'}</p>
  </div>
  
  <div class="student-info">
    <p>
      <strong>Name:</strong> ${paperContent.paperHeader?.studentName || paperStudentName || '_______________________'}
      <span style="float: right"><strong>Roll No:</strong> ${paperContent.paperHeader?.rollNumber || paperStudentRollNumber || '______________'}</span>
    </p>
    <p>
      <strong>Class/Section:</strong> ${paperContent.paperHeader?.class_section || paperStudentClassSection || '______________'}
      <span style="float: right"><strong>Date:</strong> ${paperContent.paperHeader?.examDate || new Date().toLocaleDateString('en-GB')}</span>
    </p>
  </div>
  
  <div class="questions">`;
        
        // Add questions based on format (MCQ or standard)
        if (paperContent.questions) {
          // MCQ format
          paperContent.questions.forEach((q: any, i: number) => {
            const romanNum = toRoman(i + 1);
            documentContent += `
      <div class="question">
        <p class="question-text"><strong>${romanNum}.</strong> ${formatCodeForHTML(q.questionText)}</p>
        <div class="options">`;
            
            Object.entries(q.options || {}).forEach(([key, value]) => {
              documentContent += `
          <div class="option">
            <span style="margin-right: 4px; font-weight: 500;">${key}.</span>
            <span>${formatCodeForHTML(value as string)}</span>
          </div>`;
            });
            
            documentContent += `
        </div>
        <div class="bubbles">
          <span>Q${i+1}:</span>
          <div class="bubble-option"><span>A</span><span class="bubble"></span></div>
          <div class="bubble-option"><span>B</span><span class="bubble"></span></div>
          <div class="bubble-option"><span>C</span><span class="bubble"></span></div>
          <div class="bubble-option"><span>D</span><span class="bubble"></span></div>
        </div>
      </div>`;
          });
        } else if (paperContent.sections) {
          // Standard format with sections
          paperContent.sections.forEach((section: any, sectionIndex: number) => {
            documentContent += `
      <div class="section">
        <h3>Section ${sectionIndex + 1}: ${section.topicName || section.title || 'Topic'}</h3>`;
            
            (section.questions || []).forEach((q: any, i: number) => {
              documentContent += `
        <div class="question">
          <p class="question-text"><strong>${i + 1}.</strong> ${formatCodeForHTML(q.questionText)} <span class="marks">(${q.marks || 1} marks)</span></p>`;
              
              if (q.options) {
                documentContent += `<div class="options">`;
                Object.entries(q.options).forEach(([key, value]) => {
                  documentContent += `
            <div class="option">
              <span style="margin-right: 4px; font-weight: 500;">${key}.</span>
              <span>${formatCodeForHTML(value as string)}</span>
            </div>`;
                });
                documentContent += `</div>
                <div class="bubbles">
                  <span>Q${i+1}:</span>
                  <div class="bubble-option"><span>A</span><span class="bubble"></span></div>
                  <div class="bubble-option"><span>B</span><span class="bubble"></span></div>
                  <div class="bubble-option"><span>C</span><span class="bubble"></span></div>
                  <div class="bubble-option"><span>D</span><span class="bubble"></span></div>
                </div>`;
              }
              
              documentContent += `</div>`;
            });
            
            documentContent += `</div>`;
          });
        }
        
        // Add signature section
        documentContent += `
        <div class="signature-section">
          <div style="border: 1px solid #ddd; padding: 5px; border-radius: 4px; width: 160px;">
            <p style="margin: 0; font-size: 9px;"><strong>Examiner's Signature:</strong></p>
            <div class="signature-box" style="height: 18px;">&nbsp;</div>
          </div>
          <div style="border: 1px solid #ddd; padding: 5px; border-radius: 4px; width: 160px;">
            <p style="margin: 0; font-size: 9px;"><strong>Student's Signature:</strong></p>
            <div class="signature-box" style="height: 18px;">&nbsp;</div>
          </div>
        </div>
        
        <!-- Hidden paper ID for scanning reference -->
        <div style="text-align: center; margin-top: 10px; font-size: 7px; color: #999;">
          <p>Paper ID: ${paperContent?.id || '-'} | Student ID: ${paperContent.paperHeader?.rollNumber || '-'} | Generated: ${new Date().toLocaleDateString('en-GB')}</p>
        </div>
    </div>
  </div>
</body>
</html>`;
        
        // Create a downloadable blob from the HTML content
        // Use application/msword instead of application/vnd.ms-word for better compatibility
        const blob = new Blob([documentContent], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        
        // Create a temp download link and trigger it
        const a = document.createElement('a');
        a.href = url;
        const fileName = `${(paperContent.paperHeader?.subject || 'question_paper')}_${(paper.student?.name || 'student')}`.replace(/\s+/g, '_');
        // Use .html extension instead of .doc for better compatibility
        a.download = `${fileName}.html`;
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
      } else {
        alert("Paper content not available for download");
      }
    } else {
      alert("Paper is not ready for download yet. Wait for status to be 'Completed'");
    }
  };

  const handlePreview = (paper: GeneratedPaper) => {
    console.log("Previewing paper:", paper);
    
    if (paper && paper.status === 'Completed') {
      // Get the content for preview
      if (paper.content) {
        const paperContent = typeof paper.content === 'string' ? 
          JSON.parse(paper.content) : paper.content;
        
        console.log("Preview paper:", paperContent);
        
        // Format the date properly
        let formattedDate = new Date().toLocaleDateString('en-GB'); // Default date format: DD/MM/YYYY
        if (paperContent.paperHeader?.examDate) {
          // Check if it's an ISO string or other format
          try {
            const date = new Date(paperContent.paperHeader.examDate);
            formattedDate = date.toLocaleDateString('en-GB'); // DD/MM/YYYY
          } catch (e) {
            console.log("Error formatting date:", e);
          }
        }
        
        // Create a properly structured paper data object for the preview
        const previewData = {
          id: paper.id,
          paperHeader: {
            university: paperContent.paperHeader?.university,
            department: paperContent.paperHeader?.department,
            program: paperContent.paperHeader?.program || paperContent.paperHeader?.class,
            subject: paperContent.paperHeader?.subject,
            instructor: paperContent.paperHeader?.instructor || paperContent.paperHeader?.teacherName,
            marks: paperContent.paperHeader?.totalMarks,
            time: formatTimeAllowed(paperContent.paperHeader?.timeAllowed),
            date: formattedDate, // Use our formatted date
            examDate: formattedDate, // Also include as examDate for compatibility
            paperType: paperContent.paperHeader?.examType,
            studentName: paperContent.paperHeader?.studentName || paper.student?.name,
            rollNumber: paperContent.paperHeader?.rollNumber || paper.student?.rollNumber,
            class_section: paperContent.paperHeader?.class_section || paper.student?.classSection
          },
          // Handle both direct questions array and sections with questions
          questions: paperContent.questions,
          sections: paperContent.sections
        };
        
        console.log("Formatted preview data:", previewData);
        setSelectedPaperData(previewData);
        setPreviewOpen(true);
      } else {
        alert("Paper content not available for preview");
      }
    } else {
      alert("Paper is not ready for preview yet. Wait for status to be 'Completed'");
    }
  };

  const handleAnswerKeyPreview = (paper: GeneratedPaper) => {
    console.log("Showing answer key:", paper);
    
    if (paper && paper.status === 'Completed') {
      // Get the content for answer key
      if (paper.content) {
        const paperContent = typeof paper.content === 'string' ? 
          JSON.parse(paper.content) : paper.content;
        
        console.log("Answer key paper:", paperContent);
        
        // Format the date properly
        let formattedDate = new Date().toLocaleDateString('en-GB'); // Default date format: DD/MM/YYYY
        if (paperContent.paperHeader?.examDate) {
          // Check if it's an ISO string or other format
          try {
            const date = new Date(paperContent.paperHeader.examDate);
            formattedDate = date.toLocaleDateString('en-GB'); // DD/MM/YYYY
          } catch (e) {
            console.log("Error formatting date:", e);
          }
        }
        
        // Create a properly structured paper data object for the answer key
        const answerKeyData = {
          id: paper.id,
          paperHeader: {
            university: paperContent.paperHeader?.university,
            department: paperContent.paperHeader?.department,
            program: paperContent.paperHeader?.program || paperContent.paperHeader?.class,
            subject: paperContent.paperHeader?.subject,
            instructor: paperContent.paperHeader?.instructor || paperContent.paperHeader?.teacherName,
            marks: paperContent.paperHeader?.totalMarks,
            time: formatTimeAllowed(paperContent.paperHeader?.timeAllowed),
            date: formattedDate, // Use our formatted date
            examDate: formattedDate, // Also include as examDate for compatibility
            paperType: paperContent.paperHeader?.examType,
            studentName: paperContent.paperHeader?.studentName || paper.student?.name,
            rollNumber: paperContent.paperHeader?.rollNumber || paper.student?.rollNumber,
            class_section: paperContent.paperHeader?.class_section || paper.student?.classSection
          },
          // Handle both direct questions array and sections with questions
          questions: paperContent.questions,
          sections: paperContent.sections
        };
        
        console.log("Formatted answer key data:", answerKeyData);
        setSelectedPaperData(answerKeyData);
        setAnswerKeyOpen(true);
      } else {
        alert("Paper content not available for answer key");
      }
    } else {
      alert("Paper is not ready for answer key yet. Wait for status to be 'Completed'");
    }
  };

  const handleDownloadAll = () => {
    if (!generatedPapers || generatedPapers.length === 0) {
      alert("No papers available to download");
      return;
    }
    
    // Count completed papers
    const completedPapers = generatedPapers.filter(paper => paper.status === 'Completed');
    if (completedPapers.length === 0) {
      alert("No completed papers available to download. Wait for papers to finish generating.");
      return;
    }
    
    // Process each completed paper
    completedPapers.forEach(paper => {
      // Add a small delay between downloads to prevent browser from blocking multiple downloads
      setTimeout(() => {
        handleDownload(paper);
      }, 300 * completedPapers.indexOf(paper)); // 300ms delay between each download
    });
    
    toast({
      title: "Download started",
      description: `Downloading ${completedPapers.length} papers. Please wait...`,
      variant: "default",
    });
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900">Generating Question Papers</h3>
        <p className="mt-1 text-sm text-gray-500">
          Our AI is generating unique papers for each selected student
        </p>
      </div>
      
      <div>
        <Progress value={progress} className="h-2" />
        {!showResults && (
          <p className="text-center mt-2">
            {progress < 100 ? `Please wait... (${progress}%)` : 'Finalizing papers...'}
          </p>
        )}
      </div>
      
      {showResults && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-md font-semibold">Generated Papers</h4>
            <div className="space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownloadAll}
                disabled={!generatedPapers || generatedPapers.length === 0}
              >
                <Download className="h-4 w-4 mr-1" /> Download All
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  if (confirm('Are you sure you want to delete all generated papers?')) {
                    deleteAllPapersMutation.mutate();
                  }
                }}
                disabled={!generatedPapers || generatedPapers.length === 0 || deleteAllPapersMutation.isPending}
              >
                <Trash className="h-4 w-4 mr-1" /> Delete All
              </Button>
            </div>
          </div>
          
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : generatedPapers && generatedPapers.length > 0 ? (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Roll Number</TableHead>
                    <TableHead>Class/Section</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {generatedPapers.map((paper) => (
                    <TableRow key={paper.id}>
                      <TableCell className="font-medium">{paper.student?.name || "Unknown"}</TableCell>
                      <TableCell>{paper.student?.rollNumber || "N/A"}</TableCell>
                      <TableCell>{paper.content?.paperHeader?.class_section || paper.student?.classSection || "N/A"}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          paper.status === 'Completed' 
                            ? 'bg-green-100 text-green-800' 
                            : paper.status === 'Failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {paper.status === 'Completed' && <FileCheck className="h-3 w-3 mr-1" />}
                          {paper.status === 'Failed' && <X className="h-3 w-3 mr-1" />}
                          {paper.status === 'Pending' && <span className="h-2 w-2 bg-yellow-400 rounded-full mr-1.5"></span>}
                          {paper.status === 'Processing' && <span className="h-2 w-2 bg-blue-400 rounded-full mr-1.5"></span>}
                          {paper.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handlePreview(paper)}
                            disabled={paper.status !== 'Completed'}
                            title="Preview Paper"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleAnswerKeyPreview(paper)}
                            disabled={paper.status !== 'Completed'}
                            title="Answer Key"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDownloadPDF(paper)}
                            disabled={paper.status !== 'Completed'}
                            title="Download PDF"
                          >
                            <FileDown className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDownloadDOCX(paper)}
                            disabled={paper.status !== 'Completed'}
                            title="Download DOCX"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this paper?')) {
                                deletePaperMutation.mutate(paper.id);
                              }
                            }}
                            disabled={deletePaperMutation.isPending}
                            title="Delete Paper"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center p-8 border rounded-md bg-gray-50">
              <p className="text-gray-500">No papers have been generated yet.</p>
            </div>
          )}
          
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={onBackToDashboard}>
              Back to Dashboard
            </Button>
            <Button onClick={onCreateNewPaper}>
              Create New Paper
            </Button>
          </div>
        </div>
      )}
      
      {/* Paper Preview Modal */}
      {previewOpen && selectedPaperData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-auto p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Paper Preview</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setPreviewOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6">
              <MCQPaperPreview data={selectedPaperData} />
            </div>
          </div>
        </div>
      )}
      
      {/* Answer Key Preview Modal */}
      {answerKeyOpen && selectedPaperData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-auto p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Answer Key</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setAnswerKeyOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6">
              <MCQAnswerKeyPreview data={selectedPaperData} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}