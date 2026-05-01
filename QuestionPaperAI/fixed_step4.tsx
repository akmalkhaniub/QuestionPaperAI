import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, Eye, FileCheck, FileText, FileDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Student } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { MCQPaperPreview } from "./MCQPaperPreview";
import { MCQAnswerKeyPreview } from "./MCQAnswerKeyPreview";
import { useToast } from "@/hooks/use-toast";
import { generateDOCX, generatePDF } from "@/lib/document-utils";

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

  const { data: generatedPapers, isLoading, refetch } = useQuery<GeneratedPaper[]>({
    queryKey: paperId ? [`/api/papers/${paperId}/generated-papers`] : ["no-paper"],
    enabled: !!paperId && progress === 100,
    refetchInterval: 3000, // Poll every 3 seconds to check for status updates
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

  // Handle downloading DOCX format
  const handleDownloadDOCX = (paper: GeneratedPaper) => {
    console.log("Downloading DOCX paper:", paper);
    
    if (paper && paper.status === 'Completed') {
      // Generate downloaded file content from paper.content
      if (paper.content) {
        const paperContent = typeof paper.content === 'string' ? 
          JSON.parse(paper.content) : paper.content;
          
        // Get the HTML content for the paper
        const htmlContent = generatePaperHTML(paperContent);
        
        // Format file name with clean strings
        const studentName = (paperContent.paperHeader?.studentName || paper.student?.name || 'student').replace(/\s+/g, '_');
        const subject = (paperContent.paperHeader?.subject || 'question_paper').replace(/\s+/g, '_');
        const fileName = `${subject}_${studentName}`;
        
        // Use the document-utils function to generate DOCX
        generateDOCX(htmlContent, fileName);
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
        
        // Get the HTML content for the paper
        const htmlContent = generatePaperHTML(paperContent);
        
        // Format file name with clean strings
        const studentName = (paperContent.paperHeader?.studentName || paper.student?.name || 'student').replace(/\s+/g, '_');
        const subject = (paperContent.paperHeader?.subject || 'question_paper').replace(/\s+/g, '_');
        const fileName = `${subject}_${studentName}`;
        
        // Use the document-utils function to generate PDF
        generatePDF(htmlContent, fileName);
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
        
        // Create HTML document content
        let documentContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${paperContent.paperHeader?.subject || 'Question Paper'} - ${paperContent.paperHeader?.studentName || paper.student?.name || 'Student'}</title>
  <style>
    @page { size: legal; margin: 0.5in; }
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
      <p><strong>Date:</strong> ${paperContent.paperHeader?.date || paperContent.paperHeader?.examDate || new Date().toLocaleDateString('en-GB')}</p>
    </div>
  </div>
  
  <div>
    <p><strong>Paper Type:</strong> ${paperContent.paperHeader?.paperType || 'MCQS (circle the right choice. Cutting and overwriting is not allowed)'}</p>
  </div>
  
  <div class="student-info">
    <p>
      <strong>Name:</strong> ${paperContent.paperHeader?.studentName || paper.student?.name || '_______________________'}
      <span style="float: right"><strong>Roll No:</strong> ${paperContent.paperHeader?.rollNumber || paper.student?.rollNumber || '______________'}</span>
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
        <h3>Section ${sectionIndex + 1}: ${section.topicName || 'Topic'}</h3>`;
            
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
        const studentName = (paperContent.paperHeader?.studentName || 'student').replace(/\s+/g, '_');
        const subject = (paperContent.paperHeader?.subject || 'question_paper').replace(/\s+/g, '_');
        // Use .html extension instead of .doc for better compatibility
        a.download = `${subject}_${studentName}.html`;
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
  
  // Helper function to generate complete HTML content for a paper
  const generatePaperHTML = (paperContent: any): string => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${paperContent.paperHeader?.subject || 'Question Paper'} - ${paperContent.paperHeader?.studentName || 'Student'}</title>
  <style>
    @page { size: legal; margin: 0.5in; }
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
      <p><strong>Date:</strong> ${paperContent.paperHeader?.date || paperContent.paperHeader?.examDate || new Date().toLocaleDateString('en-GB')}</p>
    </div>
  </div>
  
  <div>
    <p><strong>Paper Type:</strong> ${paperContent.paperHeader?.paperType || 'MCQS (circle the right choice. Cutting and overwriting is not allowed)'}</p>
  </div>
  
  <div class="student-info">
    <p>
      <strong>Name:</strong> ${paperContent.paperHeader?.studentName || '_______________________'}
      <span style="float: right"><strong>Roll No:</strong> ${paperContent.paperHeader?.rollNumber || '______________'}</span>
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
            studentName: paperContent.paperHeader?.studentName,
            rollNumber: paperContent.paperHeader?.rollNumber
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
            studentName: paperContent.paperHeader?.studentName,
            rollNumber: paperContent.paperHeader?.rollNumber
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

      <div className="max-w-md mx-auto">
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-primary bg-primary-100">
                Progress
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold inline-block text-primary">
                {progress}%
              </span>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-center text-sm text-gray-500 mt-2">
            {showResults 
              ? "All papers generated successfully" 
              : `Generating papers... ${Math.floor(progress / 25) + 1} of ${Math.ceil(100 / 25)}`}
          </p>
        </div>
      </div>

      {showResults && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:p-6">
            <div className="sm:flex sm:items-center">
              <div className="sm:flex-auto">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Generated Papers</h3>
                <p className="mt-1 text-sm text-gray-500">
                  All papers have been successfully generated for {generatedPapers?.length || 0} students
                </p>
              </div>
              <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                <Button 
                  onClick={handleDownloadAll}
                  disabled={isLoading || !generatedPapers || generatedPapers.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" /> Download All
                </Button>
              </div>
            </div>
            <div className="mt-6 overflow-hidden border-t border-gray-200">
              <div className="bg-white shadow-md sm:rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student Name
                      </TableHead>
                      <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Roll No
                      </TableHead>
                      <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Class/Section
                      </TableHead>
                      <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </TableHead>
                      <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="bg-white divide-y divide-gray-200">
                    {isLoading ? (
                      // Loading skeletons
                      Array(3).fill(0).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell className="px-6 py-4 whitespace-nowrap">
                            <Skeleton className="h-4 w-32" />
                          </TableCell>
                          <TableCell className="px-6 py-4 whitespace-nowrap">
                            <Skeleton className="h-4 w-16" />
                          </TableCell>
                          <TableCell className="px-6 py-4 whitespace-nowrap">
                            <Skeleton className="h-5 w-20" />
                          </TableCell>
                          <TableCell className="px-6 py-4 whitespace-nowrap">
                            <Skeleton className="h-4 w-24" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : generatedPapers && generatedPapers.length > 0 ? (
                      generatedPapers.map((paper) => (
                        <TableRow key={paper.id}>
                          <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {paper.student?.name || "Unknown Student"}
                          </TableCell>
                          <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {paper.student?.rollNumber || "N/A"}
                          </TableCell>
                          <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {paper.student?.classSection || "N/A"}
                          </TableCell>
                          <TableCell className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              paper.status === 'Completed' 
                                ? 'bg-green-100 text-green-800' 
                                : paper.status === 'Failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {paper.status}
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <button 
                              className="text-primary hover:text-primary-700 mr-2"
                              onClick={() => handleDownloadDOCX(paper)}
                              disabled={paper.status !== 'Completed'}
                              title="Download as DOCX"
                            >
                              <FileText className="inline h-4 w-4 mr-1" /> DOCX
                            </button>
                            <button 
                              className="text-primary hover:text-primary-700 mr-2"
                              onClick={() => handleDownloadPDF(paper)}
                              disabled={paper.status !== 'Completed'}
                              title="Download as PDF"
                            >
                              <FileDown className="inline h-4 w-4 mr-1" /> PDF
                            </button>
                            <button 
                              className="text-gray-500 hover:text-gray-700 mr-2"
                              onClick={() => {
                                console.log("Preview paper:", paper);
                                handlePreview(paper);
                              }}
                              disabled={paper.status !== 'Completed'}
                            >
                              <Eye className="inline h-4 w-4 mr-1" /> Preview
                            </button>
                            <button 
                              className="text-green-600 hover:text-green-800"
                              onClick={() => {
                                console.log("Showing answer key:", paper);
                                handleAnswerKeyPreview(paper);
                              }}
                              disabled={paper.status !== 'Completed'}
                            >
                              <FileCheck className="inline h-4 w-4 mr-1" /> Answer Key
                            </button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                          No papers generated yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBackToDashboard}>
          Back to Dashboard
        </Button>
        <Button type="button" onClick={onCreateNewPaper}>
          Create Another Paper
        </Button>
      </div>

      {/* MCQ Paper Preview Dialog */}
      <MCQPaperPreview 
        isOpen={previewOpen} 
        onClose={() => setPreviewOpen(false)} 
        paperData={selectedPaperData}
      />
      
      {/* MCQ Answer Key Preview Dialog */}
      <MCQAnswerKeyPreview 
        isOpen={answerKeyOpen} 
        onClose={() => setAnswerKeyOpen(false)} 
        paperData={selectedPaperData}
      />
    </div>
  );
}