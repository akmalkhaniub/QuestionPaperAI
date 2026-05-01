import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Eye, FileCheck, Download, Loader2, Trash2, FileText } from "lucide-react";
import { MCQPaperPreview } from "@/components/paper-wizard/MCQPaperPreview";
import { MCQAnswerKeyPreview } from "@/components/paper-wizard/MCQAnswerKeyPreview";
import { formatDate } from "@/lib/date-utils";
import { generateDOCX, generatePDF } from "@/lib/document-utils";

type Props = {
  paperId: number;
  paperTitle?: string;
  onDelete?: () => void;
};

export default function GeneratedPapersList({ paperId, paperTitle, onDelete }: Props) {
  const [previewPaper, setPreviewPaper] = useState<any | null>(null);
  const [previewAnswerKey, setPreviewAnswerKey] = useState<any | null>(null);
  const [selectedPaperId, setSelectedPaperId] = useState<number | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isConfirmDeleteAllOpen, setIsConfirmDeleteAllOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to get all generated papers for this paper ID
  const { data: generatedPapers, isLoading } = useQuery({
    queryKey: ['/api/papers', paperId, 'generated-papers'],
    queryFn: () => apiRequest(`/api/papers/${paperId}/generated-papers`),
  });
  
  // Mutation to delete a single generated paper
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/generated-papers/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/papers', paperId, 'generated-papers'] });
      toast({
        title: "Paper deleted",
        description: "The generated paper has been deleted successfully.",
      });
      setIsConfirmDeleteOpen(false);
    },
    onError: (error) => {
      console.error('Error deleting paper:', error);
      toast({
        title: "Error",
        description: "Failed to delete the generated paper. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation to delete all generated papers
  const deleteAllMutation = useMutation({
    mutationFn: () => apiRequest(`/api/papers/${paperId}/generated-papers`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/papers', paperId, 'generated-papers'] });
      toast({
        title: "All papers deleted",
        description: "All generated papers have been deleted successfully.",
      });
      setIsConfirmDeleteAllOpen(false);
      if (onDelete) onDelete();
    },
    onError: (error) => {
      console.error('Error deleting all papers:', error);
      toast({
        title: "Error",
        description: "Failed to delete all generated papers. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle opening the preview for a generated paper
  const handlePreview = (paper: any) => {
    setPreviewPaper(paper);
  };
  
  // Handle opening the answer key preview
  const handleAnswerKeyPreview = (paper: any) => {
    setPreviewAnswerKey(paper);
  };
  
  // Handle closing the preview
  const handleClosePreview = () => {
    setPreviewPaper(null);
  };
  
  // Handle closing the answer key preview
  const handleCloseAnswerKeyPreview = () => {
    setPreviewAnswerKey(null);
  };
  
  // Handle confirmation for deleting a paper
  const handleConfirmDelete = (id: number) => {
    setSelectedPaperId(id);
    setIsConfirmDeleteOpen(true);
  };
  
  // Handle confirmation for deleting all papers
  const handleConfirmDeleteAll = () => {
    setIsConfirmDeleteAllOpen(true);
  };
  
  // Handle deleting a paper
  const handleDelete = () => {
    if (selectedPaperId) {
      deleteMutation.mutate(selectedPaperId);
    }
  };
  
  // Handle deleting all papers
  const handleDeleteAll = () => {
    deleteAllMutation.mutate();
  };
  
  // Handle downloading a paper as DOCX
  const handleDownloadDOCX = (paper: any) => {
    if (!paper.content) {
      toast({
        title: "Error",
        description: "Paper content not available for download.",
        variant: "destructive",
      });
      return;
    }
    
    // Create HTML content for the document
    const htmlContent = getPaperHTMLContent(paper.content);
    
    // Format file name with clean strings
    const studentName = (paper.content.paperHeader?.studentName || 'student').replace(/\s+/g, '_');
    const subject = (paper.content.paperHeader?.subject || 'question_paper').replace(/\s+/g, '_');
    const fileName = `${subject}_${studentName}`;
    
    // Use our utility function to generate and download the DOCX
    generateDOCX(htmlContent, fileName);
  };
  
  // Handle downloading a paper as PDF
  const handleDownloadPDF = (paper: any) => {
    if (!paper.content) {
      toast({
        title: "Error",
        description: "Paper content not available for download.",
        variant: "destructive",
      });
      return;
    }
    
    // Create HTML content for the document
    const htmlContent = getPaperHTMLContent(paper.content);
    
    // Format file name with clean strings
    const studentName = (paper.content.paperHeader?.studentName || 'student').replace(/\s+/g, '_');
    const subject = (paper.content.paperHeader?.subject || 'question_paper').replace(/\s+/g, '_');
    const fileName = `${subject}_${studentName}`;
    
    // Use our utility function to generate and download the PDF
    generatePDF(htmlContent, fileName);
  };
  
  // Utility function to create HTML content for generating documents
  const getPaperHTMLContent = (content: any): string => {
    if (!content) return '';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Generated Paper</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.5;
            margin: 0;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
          }
          .header h1, .header h2, .header h3 {
            margin: 5px 0;
          }
          .student-info {
            border: 1px solid #000;
            padding: 10px;
            margin-bottom: 20px;
            background-color: #f9f9f9;
          }
          .student-info p {
            margin: 5px 0;
          }
          .question {
            margin-bottom: 20px;
          }
          .question-text {
            font-weight: bold;
            margin-bottom: 10px;
          }
          .options {
            margin-left: 20px;
          }
          .option {
            margin-bottom: 5px;
          }
          .bubble-row {
            display: flex;
            align-items: center;
            margin-top: 10px;
          }
          .bubble {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 1px solid #000;
            border-radius: 50%;
            margin: 0 8px;
            text-align: center;
            vertical-align: middle;
          }
          .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
          }
          pre, code {
            font-family: monospace;
            background-color: #f5f5f5;
            padding: 2px 4px;
            border-radius: 3px;
          }
          @media print {
            body { padding: 0; }
            .page-break { page-break-before: always; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${content.paperHeader?.university || 'University'}</h1>
          <h2>${content.paperHeader?.department || 'Department'}</h2>
          <h3>${content.paperHeader?.program || 'Program'} - ${content.paperHeader?.semester || 'Semester'}</h3>
          <h3>${content.paperHeader?.subject || 'Subject'} - ${content.paperHeader?.examType || 'Exam'}</h3>
        </div>
        
        <div class="student-info">
          <p><strong>Student:</strong> ${content.paperHeader?.studentName || 'N/A'}</p>
          <p><strong>Roll No:</strong> ${content.paperHeader?.rollNumber || 'N/A'}</p>
          <p><strong>Class/Section:</strong> ${content.paperHeader?.class_section || content.paperHeader?.class || 'N/A'}</p>
          <p><strong>Date:</strong> ${content.paperHeader?.examDate || new Date().toLocaleDateString('en-GB')}</p>
          <p><strong>Time Allowed:</strong> ${content.paperHeader?.timeAllowed || 'N/A'}</p>
          <p><strong>Total Marks:</strong> ${content.paperHeader?.totalMarks || 'N/A'}</p>
        </div>
        
        <div class="instructions">
          <p><strong>Instructions:</strong></p>
          <ul>
            <li>Attempt all questions.</li>
            <li>Each question carries equal marks.</li>
            <li>No additional material is allowed.</li>
          </ul>
        </div>
        
        ${content.sections?.map((section: any, sectionIndex: number) => `
          <div class="section">
            ${section.questions.map((q: any, i: number) => `
              <div class="question">
                <div class="question-text">Q${sectionIndex * section.questions.length + i + 1}. ${q.questionText}</div>
                <div class="options">
                  ${Object.entries(q.options).map(([key, value]) => `
                    <div class="option">
                      <span>${key}. ${value}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        `).join('')}
        
        <div class="signature-section">
          <div>
            <p><strong>Instructor's Signature:</strong></p>
            <div class="signature-box">&nbsp;</div>
          </div>
          <div>
            <p><strong>Student's Signature:</strong></p>
            <div class="signature-box">&nbsp;</div>
          </div>
        </div>
        
        <!-- Paper ID -->
        <div style="text-align: center; margin-top: 10px; font-size: 8px; color: #999;">
          <p>Paper ID: ${content?.id || 'N/A'} | Generated: ${new Date().toLocaleDateString('en-GB')}</p>
        </div>
      </body>
      </html>
    `;
  };
  
  // Utility function to generate the answer key HTML content
  const getAnswerKeyHTMLContent = (content: any): string => {
    if (!content) return '';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Answer Key</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.5;
            margin: 0;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
          }
          .header h1, .header h2, .header h3 {
            margin: 5px 0;
          }
          .answer-key-title {
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            margin: 20px 0;
            text-decoration: underline;
          }
          .student-info {
            border: 1px solid #000;
            padding: 10px;
            margin-bottom: 20px;
            background-color: #f9f9f9;
          }
          .student-info p {
            margin: 5px 0;
          }
          .question {
            margin-bottom: 20px;
          }
          .question-text {
            font-weight: bold;
            margin-bottom: 5px;
          }
          .answer {
            margin-top: 5px;
            padding: 5px;
            background-color: #efffef;
            border-left: 3px solid #4caf50;
          }
          .correct-option {
            font-weight: bold;
            color: #2e7d32;
          }
          .instructions {
            margin-bottom: 20px;
          }
          .instructions p {
            margin: 5px 0;
            font-weight: bold;
          }
          .instructions ul {
            margin: 5px 0;
            padding-left: 20px;
          }
          .instructions li {
            margin-bottom: 2px;
          }
          pre, code {
            font-family: monospace;
            background-color: #f5f5f5;
            padding: 2px 4px;
            border-radius: 3px;
          }
          @media print {
            body { padding: 0; }
            .page-break { page-break-before: always; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${content.paperHeader?.university || 'University'}</h1>
          <h2>${content.paperHeader?.department || 'Department'}</h2>
          <h3>${content.paperHeader?.program || 'Program'} - ${content.paperHeader?.semester || 'Semester'}</h3>
          <h3>${content.paperHeader?.subject || 'Subject'} - ${content.paperHeader?.examType || 'Exam'}</h3>
        </div>
        
        <div class="answer-key-title">ANSWER KEY</div>
        
        <div class="student-info">
          <p><strong>Student:</strong> ${content.paperHeader?.studentName || 'N/A'}</p>
          <p><strong>Roll No:</strong> ${content.paperHeader?.rollNumber || 'N/A'}</p>
          <p><strong>Class/Section:</strong> ${content.paperHeader?.class_section || content.paperHeader?.class || 'N/A'}</p>
          <p><strong>Date:</strong> ${content.paperHeader?.examDate || new Date().toLocaleDateString('en-GB')}</p>
        </div>
        
        <div class="instructions">
          <p><strong>Answer Key:</strong></p>
          <ul>
            <li>Attempt all questions.</li>
            <li>Each question carries equal marks.</li>
            <li>No additional material is allowed.</li>
          </ul>
        </div>
        
        ${content.sections?.map((section: any, sectionIndex: number) => `
          <div class="section">
            ${section.questions.map((q: any, i: number) => `
              <div class="question">
                <div class="question-text">Q${sectionIndex * section.questions.length + i + 1}. ${q.questionText}</div>
                <div class="answer">
                  <span class="correct-option">Correct Answer: ${q.correctAnswer}</span>
                </div>
              </div>
            `).join('')}
          </div>
        `).join('')}
        
        <!-- Paper ID -->
        <div style="text-align: center; margin-top: 10px; font-size: 8px; color: #999;">
          <p>Paper ID: ${content?.id || 'N/A'} | Answer Key Generated: ${new Date().toLocaleDateString('en-GB')}</p>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <Card className="p-4">
      <h2 className="text-xl font-bold mb-4">Generated Papers {paperTitle ? `for "${paperTitle}"` : ''}</h2>
      
      {isLoading ? (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      ) : !generatedPapers || generatedPapers.length === 0 ? (
        <div className="text-center p-4 text-gray-500">
          No papers have been generated yet.
        </div>
      ) : (
        <>
          <div className="mb-4 flex justify-end">
            <Button 
              variant="destructive" 
              onClick={handleConfirmDeleteAll}
              disabled={deleteAllMutation.isPending}
            >
              {deleteAllMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete All Papers
            </Button>
          </div>
          
          <div className="relative overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Roll Number</TableHead>
                  <TableHead>Class Section</TableHead>
                  <TableHead>Generated At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generatedPapers.map((paper: any) => (
                  <TableRow key={paper.id}>
                    <TableCell>{paper.student?.name || 'N/A'}</TableCell>
                    <TableCell>{paper.student?.roll_number || 'N/A'}</TableCell>
                    <TableCell>{paper.student?.class_section || 'N/A'}</TableCell>
                    <TableCell>{formatDate(paper.generated_at) || 'N/A'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        paper.status === 'Completed' ? 'bg-green-100 text-green-700' : 
                        paper.status === 'Processing' ? 'bg-orange-100 text-orange-700' : 
                        'bg-red-100 text-red-700'
                      }`}>
                        {paper.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(paper)}
                        disabled={!paper.content}
                        title="Preview Paper"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAnswerKeyPreview(paper)}
                        disabled={!paper.content}
                        title="View Answer Key"
                      >
                        <FileCheck className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadDOCX(paper)}
                        disabled={!paper.content}
                        title="Download DOCX"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadPDF(paper)}
                        disabled={!paper.content}
                        title="Download PDF"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleConfirmDelete(paper.id)}
                        disabled={deleteMutation.isPending && selectedPaperId === paper.id}
                        title="Delete Paper"
                      >
                        {deleteMutation.isPending && selectedPaperId === paper.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
      
      {/* Paper Preview */}
      {previewPaper && (
        <MCQPaperPreview
          isOpen={!!previewPaper}
          paperData={previewPaper.content}
          onClose={handleClosePreview}
        />
      )}
      
      {/* Answer Key Preview */}
      {previewAnswerKey && (
        <MCQAnswerKeyPreview
          isOpen={!!previewAnswerKey}
          paperData={previewAnswerKey.content}
          onClose={handleCloseAnswerKeyPreview}
        />
      )}
      
      {/* Confirm Delete Dialog */}
      <AlertDialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this generated paper. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Confirm Delete All Dialog */}
      <AlertDialog open={isConfirmDeleteAllOpen} onOpenChange={setIsConfirmDeleteAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all generated papers?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete ALL generated papers for this question paper. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll}>
              {deleteAllMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting All...
                </>
              ) : (
                'Delete All'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}