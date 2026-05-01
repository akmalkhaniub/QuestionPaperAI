import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { ArrowLeft, Download, Eye, Loader2, FileCheck } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MCQPaperPreview } from "@/components/paper-wizard/MCQPaperPreview";
import { useState } from "react";
import { MCQAnswerKeyPreview } from "@/components/paper-wizard/MCQAnswerKeyPreview";
import GeneratedPapersList from "@/components/papers/GeneratedPapersList";

interface GeneratedPaper {
  id: number;
  paperId: number;
  studentId: number;
  status: string;
  filePath: string;
  content?: any;
  student?: Student;
}

interface Student {
  id: number;
  name: string;
  rollNumber: string;
  userId: number;
}

interface Topic {
  id: number;
  paperId: number;
  topicName: string;
  questionType: string;
  numberOfQuestions: number;
  marksPerQuestion: number;
  difficultyLevel: string;
}

interface Paper {
  id: number;
  title: string;
  subject: string;
  classGrade: string;
  status: string;
  createdAt: string;
  totalMarks: number;
  totalQuestions: number;
  universityName?: string;
  departmentName?: string;
  programName?: string;
  semesterName?: string;
  instructorName?: string;
  examDate?: string;
  templateType?: string;
  timeAllowed?: number;
  topics: Topic[];
  generatedPapers: GeneratedPaper[];
}

export default function PaperDetail() {
  const { id } = useParams<{ id: string }>();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [answerKeyOpen, setAnswerKeyOpen] = useState(false);
  const [selectedPaperData, setSelectedPaperData] = useState<any>(null);
  const paperId = id ? parseInt(id) : 0;

  const { data: paper, isLoading } = useQuery<Paper>({
    queryKey: [`/api/papers/${paperId}`],
    enabled: !!paperId,
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handlePreview = (generatedPaper: GeneratedPaper) => {
    if (generatedPaper && generatedPaper.status === 'Completed') {
      // Get the content for preview
      if (generatedPaper.content) {
        const paperContent = typeof generatedPaper.content === 'string' ? 
          JSON.parse(generatedPaper.content) : generatedPaper.content;
        
        setSelectedPaperData(paperContent);
        setPreviewOpen(true);
      } else {
        alert("Paper content not available for preview");
      }
    } else {
      alert("Paper is not ready for preview yet. Wait for status to be 'Completed'");
    }
  };

  const handleViewAnswerKey = (generatedPaper: GeneratedPaper) => {
    if (generatedPaper && generatedPaper.status === 'Completed') {
      // Get the content for preview
      if (generatedPaper.content) {
        const paperContent = typeof generatedPaper.content === 'string' ? 
          JSON.parse(generatedPaper.content) : generatedPaper.content;
        
        setSelectedPaperData(paperContent);
        setAnswerKeyOpen(true);
      } else {
        alert("Paper content not available for viewing answer key");
      }
    } else {
      alert("Paper is not ready yet. Wait for status to be 'Completed'");
    }
  };

  const handleDownload = (generatedPaper: GeneratedPaper) => {
    if (generatedPaper && generatedPaper.status === 'Completed') {
      // Simulate download by generating HTML content
      if (generatedPaper.content) {
        const paperContent = typeof generatedPaper.content === 'string' ? 
          JSON.parse(generatedPaper.content) : generatedPaper.content;
        
        // Format code in HTML content
        const formatCodeForHTML = (text: string) => {
          if (!text) return '';
          
          // Format code blocks with ``` markers
          let formattedText = text;
          if (text.includes('```')) {
            formattedText = text.replace(/```([\s\S]*?)```/g, 
              '<pre style="background-color: #f5f5f5; padding: 10px; border-radius: 4px; font-family: monospace; white-space: pre-wrap;">$1</pre>'
            );
          }
          
          // Format inline code with ` markers
          if (formattedText.includes('`')) {
            formattedText = formattedText.replace(/`([^`]+)`/g, 
              '<code style="background-color: #f5f5f5; padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>'
            );
          }
          
          return formattedText;
        };
        
        // Generate HTML for MCQ paper
        let htmlContent = '';
        
        if (paperContent.questions) {
          // This is an MCQ paper
          htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
              <title>${paperContent.paperHeader?.subject || 'Question Paper'} - ${paperContent.paperHeader?.studentName || 'Student'}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .details { display: flex; justify-content: space-between; margin: 20px 0; }
                .student-info { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 10px 0; margin: 20px 0; }
                .question { margin-bottom: 20px; }
                .options { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
                .option { display: flex; }
                .signature-section { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 20px; }
                .signature-box { border-bottom: 1px solid #000; width: 150px; margin-top: 10px; }
                pre { background-color: #f5f5f5; padding: 10px; border-radius: 4px; font-family: monospace; white-space: pre-wrap; overflow-x: auto; }
                code { background-color: #f5f5f5; padding: 2px 4px; border-radius: 3px; font-family: monospace; }
                .ocr-markers { display: flex; justify-content: space-around; margin-top: 30px; }
                .ocr-marker { border: 1px solid #000; width: 15px; height: 15px; display: inline-block; margin: 0 2px; }
                .ocr-marker-text { font-family: 'Courier New', monospace; font-size: 10px; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>${paperContent.paperHeader?.university || 'The Islamia University of Bahawalpur'}</h1>
                <h2>${paperContent.paperHeader?.department || 'Department of Data Science'}</h2>
              </div>
              
              <div class="details">
                <div>
                  <p><strong>Program/Semester:</strong> ${paperContent.paperHeader?.program || ''}</p>
                  <p><strong>Subject:</strong> ${paperContent.paperHeader?.subject || ''}</p>
                  <p><strong>Instructor:</strong> ${paperContent.paperHeader?.instructor || 'Dr. Faculty Member'}</p>
                </div>
                <div>
                  <p><strong>Maximum Marks:</strong> ${paperContent.paperHeader?.marks || ''}</p>
                  <p><strong>Time:</strong> ${paperContent.paperHeader?.time || ''}</p>
                  <p><strong>Date:</strong> ${paperContent.paperHeader?.date || ''}</p>
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
                ${paperContent.questions?.map((q: any, i: number) => {
                  // Create roman numeral for the question number
                  const romanNumerals = [
                    { value: 10, numeral: 'X' },
                    { value: 9, numeral: 'IX' },
                    { value: 5, numeral: 'V' },
                    { value: 4, numeral: 'IV' },
                    { value: 1, numeral: 'I' }
                  ];
                  
                  let num = i + 1;
                  let roman = '';
                  for (const pair of romanNumerals) {
                    while (num >= pair.value) {
                      roman += pair.numeral;
                      num -= pair.value;
                    }
                  }
                  
                  return `
                    <div class="question">
                      <p><strong>${roman}.</strong> ${formatCodeForHTML(q.questionText)}</p>
                      <div class="options">
                        ${Object.entries(q.options).map(([key, value]) => `
                          <div class="option">
                            <span style="margin-right: 8px">${key}.</span>
                            <span>${formatCodeForHTML(value as string)}</span>
                          </div>
                        `).join('')}
                      </div>
                      
                      <!-- OCR friendly answer bubble sheet -->
                      <div class="ocr-markers" style="font-size: 8px; margin-top: 5px;">
                        <div>Q${i+1}:</div>
                        <div>A ○</div>
                        <div>B ○</div>
                        <div>C ○</div>
                        <div>D ○</div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
              
              <div class="signature-section">
                <div>
                  <p><strong>Examiner's Signature:</strong></p>
                  <div class="signature-box">&nbsp;</div>
                </div>
                <div>
                  <p><strong>Student's Signature:</strong></p>
                  <div class="signature-box">&nbsp;</div>
                </div>
              </div>
              
              <!-- Hidden paper ID for scanning reference -->
              <div style="text-align: center; margin-top: 20px; font-size: 8px; color: #999;">
                <p>Paper ID: ${generatedPaper.id} | Student ID: ${generatedPaper.studentId} | Generated: ${new Date().toISOString()}</p>
              </div>
            </body>
            </html>
          `;
        } else if (paperContent.sections) {
          // This is a multi-section paper
          // Implementation for other paper types would go here
          htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
              <title>${paperContent.paperHeader?.subject || 'Question Paper'} - ${paperContent.paperHeader?.studentName || 'Student'}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .details { display: flex; justify-content: space-between; margin: 20px 0; }
                .student-info { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 10px 0; margin: 20px 0; }
                .section { margin-bottom: 30px; }
                .question { margin-bottom: 20px; }
                .options { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
                .option { display: flex; }
                .signature-section { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 20px; }
                .signature-box { border-bottom: 1px solid #000; width: 150px; margin-top: 10px; }
                pre { background-color: #f5f5f5; padding: 10px; border-radius: 4px; font-family: monospace; white-space: pre-wrap; overflow-x: auto; }
                code { background-color: #f5f5f5; padding: 2px 4px; border-radius: 3px; font-family: monospace; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>${paperContent.paperHeader?.university || 'The Islamia University of Bahawalpur'}</h1>
                <h2>${paperContent.paperHeader?.department || 'Department of Data Science'}</h2>
              </div>
              
              <div class="details">
                <div>
                  <p><strong>Program/Semester:</strong> ${paperContent.paperHeader?.program || paperContent.paperHeader?.semester || ''}</p>
                  <p><strong>Subject:</strong> ${paperContent.paperHeader?.subject || ''}</p>
                  <p><strong>Instructor:</strong> ${paperContent.paperHeader?.instructor || 'Dr. Faculty Member'}</p>
                </div>
                <div>
                  <p><strong>Maximum Marks:</strong> ${paperContent.paperHeader?.totalMarks || ''}</p>
                  <p><strong>Time:</strong> ${paperContent.paperHeader?.timeAllowed || ''}</p>
                  <p><strong>Date:</strong> ${paperContent.paperHeader?.examDate || ''}</p>
                </div>
              </div>
              
              <div class="student-info">
                <p>
                  <strong>Name:</strong> ${paperContent.paperHeader?.studentName || '_________________'}
                  <span style="float: right"><strong>Roll No:</strong> ${paperContent.paperHeader?.rollNumber || '_________________'}</span>
                </p>
              </div>
              
              ${paperContent.sections.map((section: any, sectionIndex: number) => `
                <div class="section">
                  <h3>Section ${sectionIndex + 1}: ${section.topicName} (${section.questionType})</h3>
                  
                  ${section.questions.map((q: any, i: number) => {
                    // Generate roman numerals for question numbers
                    const romanNumerals = [
                      { value: 10, numeral: 'X' },
                      { value: 9, numeral: 'IX' },
                      { value: 5, numeral: 'V' },
                      { value: 4, numeral: 'IV' },
                      { value: 1, numeral: 'I' }
                    ];
                    
                    let num = i + 1;
                    let roman = '';
                    for (const pair of romanNumerals) {
                      while (num >= pair.value) {
                        roman += pair.numeral;
                        num -= pair.value;
                      }
                    }
                    
                    // Only render options for MCQ type questions
                    const optionsHTML = q.options ? `
                      <div class="options">
                        ${Object.entries(q.options).map(([key, value]) => `
                          <div class="option">
                            <span style="margin-right: 8px">${key}.</span>
                            <span>${formatCodeForHTML(value as string)}</span>
                          </div>
                        `).join('')}
                      </div>
                      
                      <!-- OCR friendly answer bubble sheet -->
                      ${section.questionType === 'Multiple Choice' ? `
                        <div class="ocr-markers" style="font-size: 8px; margin-top: 5px;">
                          <div>Q${sectionIndex+1}.${i+1}:</div>
                          <div>A ○</div>
                          <div>B ○</div>
                          <div>C ○</div>
                          <div>D ○</div>
                        </div>
                      ` : ''}
                    ` : `<div style="border-bottom: 1px dashed #ccc; margin: 10px 0; padding-bottom: 10px;">(Answer here)</div>`;
                    
                    return `
                      <div class="question">
                        <p><strong>${roman}.</strong> ${formatCodeForHTML(q.questionText)} (${q.marks} marks)</p>
                        ${optionsHTML}
                      </div>
                    `;
                  }).join('')}
                </div>
              `).join('')}
              
              <div class="signature-section">
                <div>
                  <p><strong>Examiner's Signature:</strong></p>
                  <div class="signature-box">&nbsp;</div>
                </div>
                <div>
                  <p><strong>Student's Signature:</strong></p>
                  <div class="signature-box">&nbsp;</div>
                </div>
              </div>
              
              <!-- Hidden paper ID for scanning reference -->
              <div style="text-align: center; margin-top: 20px; font-size: 8px; color: #999;">
                <p>Paper ID: ${generatedPaper.id} | Student ID: ${generatedPaper.studentId} | Generated: ${new Date().toISOString()}</p>
              </div>
            </body>
            </html>
          `;
        }
        
        // Create a blob from the HTML content
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        // Create a temporary link to download the file
        const a = document.createElement('a');
        a.href = url;
        a.download = `${paperContent.paperHeader?.subject || 'QuestionPaper'}_${paperContent.paperHeader?.studentName || 'Student'}.html`;
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

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="mt-2 mb-6">
          <Skeleton className="h-7 w-72" />
        </div>
        <div className="mb-6 flex items-center">
          <Skeleton className="h-10 w-24 mr-4" />
          <Skeleton className="h-6 w-40" />
        </div>
        <Card className="p-6">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-12 w-full mb-6" />
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-24 w-full mb-6" />
          <Skeleton className="h-48 w-full" />
        </Card>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Paper Not Found</h1>
        <p className="text-gray-600 mb-4">The paper you're looking for doesn't exist or has been removed.</p>
        <Link href="/papers">
          <Button variant="outline" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Papers
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">{paper.title}</h1>
      <p className="text-gray-600 mb-6">
        Created on {formatDate(paper.createdAt)} • {paper.subject} • {paper.totalQuestions} questions • {paper.totalMarks} marks
      </p>
      
      <div className="mb-6 flex items-center">
        <Link href="/papers">
          <Button variant="outline" className="flex items-center mr-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Papers
          </Button>
        </Link>
        <div className="bg-gray-100 rounded-full px-3 py-1 text-sm font-medium text-gray-800">
          Status: {paper.status}
        </div>
      </div>

      <Card className="mb-6 p-6">
        <h2 className="text-lg font-medium mb-4">Paper Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Basic Information</h3>
            <div className="space-y-2">
              <p><span className="text-gray-500">Subject:</span> {paper.subject}</p>
              <p><span className="text-gray-500">Class/Grade:</span> {paper.classGrade}</p>
              <p><span className="text-gray-500">Total Marks:</span> {paper.totalMarks}</p>
              <p><span className="text-gray-500">Questions:</span> {paper.totalQuestions}</p>
              <p><span className="text-gray-500">Template Type:</span> {paper.templateType || "Standard Question Paper"}</p>
            </div>
          </div>
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Institution Information</h3>
            <div className="space-y-2">
              <p><span className="text-gray-500">University:</span> {paper.universityName || "The Islamia University of Bahawalpur"}</p>
              <p><span className="text-gray-500">Department:</span> {paper.departmentName || `Department of ${paper.subject}`}</p>
              <p><span className="text-gray-500">Program:</span> {paper.programName || "BS Computer Science"}</p>
              <p><span className="text-gray-500">Instructor:</span> {paper.instructorName || "Dr. Faculty Member"}</p>
              <p><span className="text-gray-500">Exam Date:</span> {paper.examDate || "Not specified"}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="mb-6 p-6">
        <h2 className="text-lg font-medium mb-4">Topics and Questions</h2>
        {paper.topics && paper.topics.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Topic Name</TableHead>
                <TableHead>Question Type</TableHead>
                <TableHead>Number of Questions</TableHead>
                <TableHead>Marks per Question</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Total Marks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paper.topics.map((topic) => (
                <TableRow key={topic.id}>
                  <TableCell>{topic.topicName}</TableCell>
                  <TableCell>{topic.questionType}</TableCell>
                  <TableCell>{topic.numberOfQuestions}</TableCell>
                  <TableCell>{topic.marksPerQuestion}</TableCell>
                  <TableCell>{topic.difficultyLevel}</TableCell>
                  <TableCell>{topic.numberOfQuestions * topic.marksPerQuestion}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-gray-500">No topics have been defined for this paper.</p>
        )}
      </Card>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">Generated Papers</h2>
          <Link href={`/papers/${paper.id}/generated`}>
            <Button variant="outline" size="sm">
              View All Generated Papers
            </Button>
          </Link>
        </div>
        {paper.generatedPapers && paper.generatedPapers.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Roll Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paper.generatedPapers.slice(0, 5).map((generatedPaper) => (
                <TableRow key={generatedPaper.id}>
                  <TableCell>{generatedPaper.student?.name || `Student ID: ${generatedPaper.studentId}`}</TableCell>
                  <TableCell>{generatedPaper.student?.rollNumber || "N/A"}</TableCell>
                  <TableCell>
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      generatedPaper.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                      generatedPaper.status === 'Failed' ? 'bg-red-100 text-red-800' : 
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {generatedPaper.status === 'Processing' && <Loader2 className="animate-spin h-3 w-3 mr-1" />}
                      {generatedPaper.status}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-x-2">
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(generatedPaper)}
                        disabled={generatedPaper.status !== 'Completed'}
                      >
                        <Eye className="h-3 w-3 mr-1" /> View
                      </Button>
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewAnswerKey(generatedPaper)}
                        disabled={generatedPaper.status !== 'Completed'}
                      >
                        <FileCheck className="h-3 w-3 mr-1" /> Answer Key
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleDownload(generatedPaper)}
                        disabled={generatedPaper.status !== 'Completed'}
                      >
                        <Download className="h-3 w-3 mr-1" /> Download
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-gray-500">No papers have been generated yet.</p>
        )}
      </Card>

      {/* MCQ Paper Preview Dialog */}
      <MCQPaperPreview 
        isOpen={previewOpen} 
        onClose={() => setPreviewOpen(false)} 
        paperData={selectedPaperData}
      />

      {/* MCQ Answer Key Preview Dialog */}
      {answerKeyOpen && selectedPaperData && (
        <MCQAnswerKeyPreview
          isOpen={answerKeyOpen} 
          onClose={() => setAnswerKeyOpen(false)} 
          paperData={selectedPaperData}
        />
      )}
    </div>
  );
}