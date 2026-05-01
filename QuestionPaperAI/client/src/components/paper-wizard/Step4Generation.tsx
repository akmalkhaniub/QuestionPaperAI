import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, Eye, FileCheck, FileText, FileDown, Trash, X, FileCode } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Student } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { MCQPaperPreview } from "./MCQPaperPreview";
import { MCQAnswerKeyPreview } from "./MCQAnswerKeyPreview";
import { useToast } from "@/hooks/use-toast";
import { generateDOCX, generatePDF } from "@/lib/document-utils";
import { generateMultiSectionPaper, generateCombinedPapers } from "@/lib/multi-format-paper";
import { generateSingleSectionPaper } from "@/lib/single-section-paper";

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
    queryKey: paperId ? [`/api/papers/${paperId}/generated-papers`] : ["no-paper"],
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
        queryClient.invalidateQueries({ queryKey: [`/api/papers/${paperId}/generated-papers`] });
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
        queryClient.invalidateQueries({ queryKey: [`/api/papers/${paperId}/generated-papers`] });
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

  // Handle downloading DOCX format
  // Handle downloading MCQ papers in DOCX format
  const handleDownloadDOCX = (paper: GeneratedPaper) => {
    console.log("Downloading DOCX paper:", paper);
    
    if (paper && paper.status === 'Completed') {
      // Generate downloaded file content from paper.content
      if (paper.content) {
        const paperContent = typeof paper.content === 'string' ? 
          JSON.parse(paper.content) : paper.content;
          
        // Format file name with clean strings
        const fileName = `${paperContent.paperHeader?.subject || 'question_paper'}_MCQ_${paper.student?.name || 'student'}`.replace(/\s+/g, '_');
        
        // For Multiple Choice papers
        generateMultiSectionPaper(paperContent, 'docx', fileName);
      }
    } else {
      toast({
        title: "Paper not ready",
        description: "The paper is still being generated. Please wait for it to complete.",
        variant: "destructive"
      });
    }
  };
  
  // Handle downloading Short Answer papers in DOCX format
  const handleDownloadShortQuestionsDOCX = (paper: GeneratedPaper) => {    
    if (paper && paper.status === 'Completed') {
      // Generate downloaded file content from paper.content
      if (paper.content) {
        const paperContent = typeof paper.content === 'string' ? 
          JSON.parse(paper.content) : paper.content;
          
        // Format file name with clean strings
        const fileName = `${paperContent.paperHeader?.subject || 'question_paper'}_ShortQ_${paper.student?.name || 'student'}`.replace(/\s+/g, '_');
        
        // Generate a paper with only Short Answer questions
        generateSingleSectionPaper(paperContent, 'docx', fileName, 'Short Answer');
      }
    } else {
      toast({
        title: "Paper not ready",
        description: "The paper is still being generated. Please wait for it to complete.",
        variant: "destructive"
      });
    }
  };
  
  // Handle downloading Coding Type Questions in DOCX format
  const handleDownloadCodingQuestionsDOCX = (paper: GeneratedPaper) => {    
    if (paper && paper.status === 'Completed') {
      // Generate downloaded file content from paper.content
      if (paper.content) {
        const paperContent = typeof paper.content === 'string' ? 
          JSON.parse(paper.content) : paper.content;
          
        // Format file name with clean strings
        const fileName = `${paperContent.paperHeader?.subject || 'question_paper'}_CodingQ_${paper.student?.name || 'student'}`.replace(/\s+/g, '_');
        
        // Generate a paper with only Coding Type questions
        generateSingleSectionPaper(paperContent, 'docx', fileName, 'Coding Type Long Question');
      }
    } else {
      toast({
        title: "Paper not ready",
        description: "The paper is still being generated. Please wait for it to complete.",
        variant: "destructive"
      });
    }
  };
  
  // Handle downloading PDF format
  const handleDownloadPDF = (paper: GeneratedPaper) => {
    if (paper && paper.status === 'Completed') {
      // Generate downloaded file content from paper.content
      if (paper.content) {
        const paperContent = typeof paper.content === 'string' ? 
          JSON.parse(paper.content) : paper.content;
          
        // Format file name with clean strings
        const fileName = `${paperContent.paperHeader?.subject || 'question_paper'}_${paper.student?.name || 'student'}`.replace(/\s+/g, '_');
        
        // For all paper types, use the multi-section generator which handles formatting properly
        generateMultiSectionPaper(paperContent, 'pdf', fileName);
      }
    } else {
      toast({
        title: "Paper not ready",
        description: "The paper is still being generated. Please wait for it to complete.",
        variant: "destructive"
      });
    }
  };
  
  // Unified download handler that shows a dropdown to choose format
  const handleDownload = (paper: GeneratedPaper) => {
    if (confirm('Choose a format:\nClick OK for DOCX format\nClick Cancel for PDF format')) {
      handleDownloadDOCX(paper);
    } else {
      handleDownloadPDF(paper);
    }
  };

  // Show a preview of the paper
  const handlePreview = (paper: GeneratedPaper) => {
    if (paper && paper.status === 'Completed') {
      if (paper.content) {
        setSelectedPaperData(paper.content);
        setPreviewOpen(true);
      }
    } else {
      toast({
        title: "Paper not ready",
        description: "The paper is still being generated. Please wait for it to complete.",
        variant: "destructive"
      });
    }
  };

  // Show a preview of the answer key
  const handleAnswerKeyPreview = (paper: GeneratedPaper) => {
    if (paper && paper.status === 'Completed') {
      if (paper.content) {
        setSelectedPaperData(paper.content);
        setAnswerKeyOpen(true);
      }
    } else {
      toast({
        title: "Paper not ready",
        description: "The paper is still being generated. Please wait for it to complete.",
        variant: "destructive"
      });
    }
  };

  // Handle deleting a paper
  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this paper?")) {
      deletePaperMutation.mutate(id);
    }
  };

  // Handle deleting all papers
  const handleDeleteAll = () => {
    if (confirm("Are you sure you want to delete all generated papers?")) {
      deleteAllPapersMutation.mutate();
    }
  };

  // Handle downloading all papers in a single combined document
  const handleDownloadAllPapers = (format: 'pdf' | 'docx') => {
    if (!generatedPapers || generatedPapers.length === 0) {
      toast({
        title: "No Papers Available",
        description: "There are no papers to download",
        variant: "destructive"
      });
      return;
    }

    const completedPapers = generatedPapers.filter(p => p.status === 'Completed');
    if (completedPapers.length === 0) {
      toast({
        title: "No Completed Papers",
        description: "Wait for papers to finish generating",
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

    toast({
      title: "Generating Combined Document",
      description: `Creating a single ${format.toUpperCase()} with all papers. Please wait...`,
      variant: "default"
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

      <div className="w-full">
        <Progress value={progress} className="w-full" />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Initializing</span>
          <span>Generating Questions</span>
          <span>Completing</span>
        </div>
      </div>

      {showResults && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-2 animate-pulse">
              <Skeleton className="h-10 w-full rounded" />
              <Skeleton className="h-24 w-full rounded" />
              <Skeleton className="h-48 w-full rounded" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-base font-medium text-gray-900">Generated Papers</h4>
                <div className="space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDownloadAllPapers('pdf')}
                    disabled={!generatedPapers || generatedPapers.length === 0 || generatedPapers.every(p => p.status !== 'Completed')}
                    className="flex items-center gap-2"
                  >
                    <FileDown className="h-4 w-4" />
                    Download All (PDF)
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDownloadAllPapers('docx')}
                    disabled={!generatedPapers || generatedPapers.length === 0 || generatedPapers.every(p => p.status !== 'Completed')}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Download All (DOCX)
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleDeleteAll}
                    disabled={!generatedPapers || generatedPapers.length === 0}
                  >
                    <Trash className="mr-1 h-4 w-4" />
                    Delete All
                  </Button>
                </div>
              </div>

              {generatedPapers && generatedPapers.length > 0 ? (
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Roll Number</TableHead>
                        <TableHead>Class Section</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {generatedPapers.map((paper) => (
                        <TableRow key={paper.id}>
                          <TableCell className="font-medium">{paper.student?.name || `Student ${paper.studentId}`}</TableCell>
                          <TableCell>{paper.student?.rollNumber || "N/A"}</TableCell>
                          <TableCell>{paper.student?.classSection || "N/A"}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {paper.status === 'Completed' ? (
                                <>
                                  <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                                  <span>Completed</span>
                                </>
                              ) : paper.status === 'Failed' ? (
                                <>
                                  <div className="h-2 w-2 rounded-full bg-red-500 mr-2"></div>
                                  <span>Failed</span>
                                </>
                              ) : paper.status === 'Processing' ? (
                                <>
                                  <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse mr-2"></div>
                                  <span>Processing...</span>
                                </>
                              ) : (
                                <>
                                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse mr-2"></div>
                                  <span>Pending...</span>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {/* Preview buttons */}
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handlePreview(paper)}
                                disabled={paper.status !== 'Completed'}
                                title="Preview paper"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleAnswerKeyPreview(paper)}
                                disabled={paper.status !== 'Completed'}
                                title="View answer key"
                              >
                                <FileCheck className="h-4 w-4" />
                              </Button>
                              
                              {/* Download buttons for different paper types */}
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDownloadDOCX(paper)}
                                disabled={paper.status !== 'Completed'}
                                title="Download MCQ Paper (DOCX)"
                              >
                                <FileDown className="h-4 w-4" />
                              </Button>
                              
                              {/* Short Questions download button */}
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDownloadShortQuestionsDOCX(paper)}
                                disabled={paper.status !== 'Completed'}
                                title="Download Short Questions Paper (DOCX)"
                              >
                                <FileText className="h-4 w-4 text-green-500" />
                              </Button>
                              
                              {/* Coding Questions download button */}
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDownloadCodingQuestionsDOCX(paper)}
                                disabled={paper.status !== 'Completed'}
                                title="Download Coding Questions Paper (DOCX)"
                              >
                                <FileCode className="h-4 w-4 text-purple-500" />
                              </Button>
                              
                              {/* PDF download button */}
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDownloadPDF(paper)}
                                disabled={paper.status !== 'Completed'}
                                title="Download PDF"
                              >
                                <FileDown className="h-4 w-4 text-blue-500" />
                              </Button>
                              
                              {/* Delete button */}
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-red-500 hover:text-red-700"
                                onClick={() => handleDelete(paper.id)}
                                title="Delete paper"
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
                <div className="text-center p-6 bg-gray-50 rounded-md">
                  <p className="text-gray-500">No papers have been generated yet. Please wait or check if students were selected correctly.</p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button onClick={onBackToDashboard} variant="outline">
              Back to Papers
            </Button>
            <Button onClick={onCreateNewPaper}>
              Create New Paper
            </Button>
          </div>
        </div>
      )}

      {previewOpen && selectedPaperData && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium">Paper Preview</h3>
              <Button variant="ghost" size="icon" onClick={() => setPreviewOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <MCQPaperPreview paperData={selectedPaperData} isOpen={true} />
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {answerKeyOpen && selectedPaperData && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium">Answer Key</h3>
              <Button variant="ghost" size="icon" onClick={() => setAnswerKeyOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <MCQAnswerKeyPreview paperData={selectedPaperData} />
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAnswerKeyOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
