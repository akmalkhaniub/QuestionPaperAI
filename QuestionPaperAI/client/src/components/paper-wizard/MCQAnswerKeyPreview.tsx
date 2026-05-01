import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Printer, FileText, FileDown } from 'lucide-react';
import { generateDOCX, generatePDF } from '@/lib/document-utils';

interface Question {
  questionNumber?: number;
  questionText: string;
  options: Record<string, string>;
  correctAnswer: string;
  marks?: number;
  type?: string;
}

interface PaperHeader {
  university?: string;
  department?: string;
  program?: string;
  marks?: string;
  subject?: string;
  time?: string;
  examType?: string;
  date?: string;
  paperType?: string;
  studentName?: string;
  rollNumber?: string;
  title?: string;
  class?: string;
  class_section?: string; // Added for student class/section information
  semester?: string;
  instructor?: string;
  teacherName?: string;  // Added teacher name field
  timeAllowed?: string;
  totalMarks?: string;
  examDate?: string;
}

interface PaperData {
  id?: number | string;
  paperHeader?: PaperHeader;
  questions?: Question[];
  sections?: {
    id: string;
    title: string;
    questionType: string;
    totalMarks: number;
    marksPerQuestion: number;
    questions: Question[];
  }[];
}

interface MCQAnswerKeyPreviewProps {
  isOpen?: boolean;
  onClose?: () => void;
  paperData: PaperData;
}

export function MCQAnswerKeyPreview({ isOpen, onClose, paperData }: MCQAnswerKeyPreviewProps) {
  // Convert string to object if needed
  const processedData = typeof paperData === 'string' ? JSON.parse(paperData) : paperData;
  
  if (!processedData) return null;

  const handlePrint = () => {
    window.print();
  };

  // Helper function to get the HTML content for the answer key
  const getAnswerKeyHTMLContent = () => {
    if (!paperData) return '';
    
    // Helper to get Roman numerals for question numbers
    const getRomanNumeral = (num: number): string => {
      const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 
                             'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
      return num <= romanNumerals.length ? romanNumerals[num-1] : num.toString();
    };
    
    // Helper function to format code in HTML
    const formatCodeForHTML = (text: string) => {
      if (!text) return '';
      
      try {
        let formattedText = text;
        
        // Detect and format Python class and function definitions using regex patterns
        const pythonPatterns = [
          // Python class definition pattern
          {
            pattern: /(class\s+[A-Za-z0-9_]+\s*(?:\([^)]*\))?\s*:(?:\s*(?:def\s+[^:]+:[^}]+))*)/g,
            process: (match: string) => {
              // Escape HTML special characters 
              const escapedCode = match
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
                
              return `<pre style="background-color: #f5f5f5; padding: 8px; border-radius: 4px; font-family: Consolas, Monaco, 'Courier New', monospace; font-size: 11pt; white-space: pre-wrap; overflow-x: auto; margin: 10px 0; line-height: 1.5;">${escapedCode}</pre>`;
            }
          },
          // Python function definition pattern
          {
            pattern: /(def\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*:(?:\s*[^\n]+)*)/g,
            process: (match: string) => {
              // Escape HTML special characters
              const escapedCode = match
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
                
              return `<pre style="background-color: #f5f5f5; padding: 8px; border-radius: 4px; font-family: Consolas, Monaco, 'Courier New', monospace; font-size: 11pt; white-space: pre-wrap; overflow-x: auto; margin: 10px 0; line-height: 1.5;">${escapedCode}</pre>`;
            }
          },
          // Multiple line code blocks without markers (like the example you provided)
          {
            pattern: /(class\s+[A-Za-z0-9_]+.*(?:\n.*){1,10}(?:\(\d+\s+marks\)|\(\d+\s+points\)))/g,
            process: (match: string) => {
              // Extract the marks part
              const marksMatch = match.match(/\((\d+)\s+marks\)|\((\d+)\s+points\)/);
              let marksText = '';
              if (marksMatch) {
                marksText = marksMatch[0];
                // Remove the marks from the code block
                match = match.replace(marksText, '');
              }
              
              // Escape HTML special characters
              const escapedCode = match
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
                
              return `<pre style="background-color: #f5f5f5; padding: 8px; border-radius: 4px; font-family: Consolas, Monaco, 'Courier New', monospace; font-size: 11pt; white-space: pre-wrap; overflow-x: auto; margin: 10px 0; line-height: 1.5;">${escapedCode}</pre> ${marksText}`;
            }
          }
        ];
        
        // Apply all Python patterns
        pythonPatterns.forEach(({pattern, process}) => {
          formattedText = formattedText.replace(pattern, process);
        });
        
        // Format code blocks with ``` markers
        if (formattedText.includes('```')) {
          // Find and process code blocks
          formattedText = formattedText.replace(/```(?:[\w]*\n)?([\s\S]*?)```/g, (match, codeContent) => {
            // Clean up the code block (remove empty lines at start/end)
            const codeLines = codeContent.split('\n');
            while (codeLines.length > 0 && !codeLines[0].trim()) {
              codeLines.shift();
            }
            while (codeLines.length > 0 && !codeLines[codeLines.length - 1].trim()) {
              codeLines.pop();
            }
            
            // Join the lines back with preserved indentation
            const cleanedCode = codeLines.join('\n')
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
            
            return `<pre style="background-color: #f5f5f5; padding: 8px; border-radius: 4px; font-family: Consolas, Monaco, 'Courier New', monospace; font-size: 11pt; white-space: pre-wrap; overflow-x: auto; margin: 10px 0; line-height: 1.5;">${cleanedCode}</pre>`;
          });
        }
        
        // Format inline code with ` markers (but don't process inside code blocks)
        if (formattedText.includes('`')) {
          // We need to handle inline code blocks that aren't inside a pre block
          const parts = formattedText.split(/<pre.*?<\/pre>/g);
          const preBlocks = formattedText.match(/<pre.*?<\/pre>/g) || [];
          
          let result = '';
          for (let i = 0; i < parts.length; i++) {
            // Process inline code in regular text
            const processed = parts[i].replace(/`([^`]+)`/g, (match, code) => {
              const escapedCode = code
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
              
              return `<code style="background-color: #f5f5f5; padding: 2px 4px; border-radius: 3px; font-family: Consolas, Monaco, 'Courier New', monospace; font-size: 11pt;">${escapedCode}</code>`;
            });
            
            result += processed;
            // Add back the code block if there is one
            if (i < preBlocks.length) {
              result += preBlocks[i];
            }
          }
          
          formattedText = result;
        }
        
        // Special-case handling for specific Python code patterns without code block markers
        const codeWithoutMarkersPattern = /(\bclass\s+[A-Za-z0-9_]+:\s+def\s+__call__\s*\(\s*self\s*\):\s+return\s+'Called!'\s+a\s+=\s+A\(\)\s+print\s*\(\s*a\(\)\s*\))/g;
        formattedText = formattedText.replace(codeWithoutMarkersPattern, (match) => {
          // Format the code, adding line breaks
          const formattedCode = match
            .replace(/class\s+([A-Za-z0-9_]+):/g, 'class $1:')
            .replace(/def\s+__call__\s*\(\s*self\s*\):/g, '\n    def __call__(self):')
            .replace(/return\s+'Called!'/g, '\n        return \'Called!\'')
            .replace(/a\s+=\s+A\(\)/g, '\n\na = A()')
            .replace(/print\s*\(\s*a\(\)\s*\)/g, 'print(a())')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          
          return `<pre style="background-color: #f5f5f5; padding: 8px; border-radius: 4px; font-family: Consolas, Monaco, 'Courier New', monospace; font-size: 11pt; white-space: pre-wrap; overflow-x: auto; margin: 10px 0; line-height: 1.5;">${formattedCode}</pre>`;
        });
        
        // Replace newlines with <br> tags in regular text (not in code)
        if (!formattedText.includes('<pre') && !formattedText.includes('<code')) {
          formattedText = formattedText.replace(/\n/g, '<br>');
        }
        
        return formattedText;
      } catch (e) {
        console.error("Error formatting code for HTML:", e);
        // Fallback to simple formatting
        return text
          .replace(/```([\s\S]*?)```/g, '<pre>$1</pre>')
          .replace(/`([^`]+)`/g, '<code>$1</code>')
          .replace(/\n/g, '<br>');
      }
    };
    
    // Get all questions from either questions array or sections
    const allQuestions: Question[] = [];
    
    if (paperData.questions) {
      allQuestions.push(...paperData.questions);
    } else if (paperData.sections) {
      paperData.sections.forEach(section => {
        if (section.questions) {
          allQuestions.push(...section.questions);
        }
      });
    }
    
    // Generate HTML content for the answer key
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Answer Key - ${paperData.paperHeader?.subject || 'Question Paper'} - ${paperData.paperHeader?.studentName || 'Student'}</title>
        <style>
          @page { size: legal; margin: 0.5in; }
          body { font-family: Arial, sans-serif; padding: 6px; max-width: 800px; margin: 0 auto; font-size: 10px; line-height: 1.2; }
          .header { text-align: center; margin-bottom: 4px; }
          .header h1 { margin: 0; font-size: 13px; line-height: 1.2; }
          .header h2 { margin: 0; font-size: 11px; line-height: 1.2; }
          .answer-key-title { background-color: #f5f5f5; padding: 3px; text-align: center; margin: 4px 0; border: 1px dashed #ccc; border-radius: 3px; }
          .answer-key-title h3 { margin: 0; font-size: 11px; color: #333; }
          .answer-key-title p { margin: 0; font-size: 9px; color: #666; }
          .answer-key-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1px; margin: 4px 0; border: 1px solid #eee; padding: 2px; border-radius: 3px; }
          .answer-key-item { padding: 1px; text-align: center; border: 1px solid #ddd; border-radius: 2px; font-size: 9px; }
          .answer-key-item.header { background-color: #f5f5f5; font-weight: bold; color: #444; }
          .answer-key-item.correct { background-color: #d4edda; color: #155724; font-weight: bold; }
          .questions { margin: 6px 0; }
          .questions h3 { border-bottom: 1px solid #007bff; padding-bottom: 1px; color: #007bff; font-size: 11px; margin: 2px 0 4px 0; }
          .question { margin-bottom: 4px; padding: 3px; border: 1px solid #eee; border-radius: 3px; }
          .question p { margin: 1px 0 2px 0; font-weight: bold; font-size: 9px; }
          .options { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; }
          .option { font-size: 9px; margin-bottom: 0; }
          .correct-answer { font-weight: bold; color: #28a745; }
          pre { background-color: #f5f5f5; padding: 2px; border-radius: 2px; font-family: monospace; white-space: pre-wrap; overflow-x: auto; font-size: 9px; margin: 1px 0; }
          code { background-color: #f5f5f5; padding: 1px; border-radius: 2px; font-family: monospace; font-size: 9px; }
          .signature-section { display: flex; justify-content: flex-end; margin-top: 6px; padding-top: 3px; border-top: 1px solid #ddd; }
          .signature-box { border-bottom: 1px solid #000; width: 120px; height: 16px; margin-top: 2px; }
          @media print {
            body { padding: 0; }
            .question { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${paperData.paperHeader?.university || 'The Islamia University of Bahawalpur'}</h1>
          <h2>${paperData.paperHeader?.department || 'Department of Data Science'}</h2>
        </div>
        
        <div class="answer-key-title">
          <h3>ANSWER KEY - FOR TEACHER USE ONLY</h3>
          <p>
            Student: ${paperData.paperHeader?.studentName || 'N/A'} | 
            Roll No: ${paperData.paperHeader?.rollNumber || 'N/A'} |
            Class: ${paperData.paperHeader?.class_section || paperData.paperHeader?.class || 'N/A'} |
            Instructor: ${paperData.paperHeader?.instructor || paperData.paperHeader?.teacherName || 'N/A'} |
            Date: ${paperData.paperHeader?.date || paperData.paperHeader?.examDate || new Date().toLocaleDateString('en-GB')}
          </p>
        </div>
        
        <div class="answer-key-grid">
          <div class="answer-key-item header">Question</div>
          <div class="answer-key-item header">A</div>
          <div class="answer-key-item header">B</div>
          <div class="answer-key-item header">C</div>
          <div class="answer-key-item header">D</div>
          
          ${allQuestions.map((q, i) => `
            <div class="answer-key-item">Q${i+1}</div>
            <div class="answer-key-item ${q.correctAnswer === 'A' ? 'correct' : ''}">
              ${q.correctAnswer === 'A' ? '✓' : ''}
            </div>
            <div class="answer-key-item ${q.correctAnswer === 'B' ? 'correct' : ''}">
              ${q.correctAnswer === 'B' ? '✓' : ''}
            </div>
            <div class="answer-key-item ${q.correctAnswer === 'C' ? 'correct' : ''}">
              ${q.correctAnswer === 'C' ? '✓' : ''}
            </div>
            <div class="answer-key-item ${q.correctAnswer === 'D' ? 'correct' : ''}">
              ${q.correctAnswer === 'D' ? '✓' : ''}
            </div>
          `).join('')}
        </div>
        
        <div class="questions">
          <h3>Detailed Answer Key</h3>
          ${allQuestions.map((q, i) => `
            <div class="question">
              <p><strong>${getRomanNumeral(i+1)}.</strong> ${formatCodeForHTML(q.questionText)} <strong>(1 marks)</strong></p>
              <div class="options">
                ${Object.entries(q.options).map(([key, value]) => `
                  <div class="option ${key === q.correctAnswer ? 'correct-answer' : ''}">
                    <span>${key}. ${formatCodeForHTML(value as string)} ${key === q.correctAnswer ? '✓' : ''}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
        
        <!-- Signature Section -->
        <div class="signature-section">
          <div style="border: 1px solid #ddd; padding: 5px; border-radius: 4px; width: 160px;">
            <p style="margin: 0; font-size: 9px;"><strong>Examiner's Signature:</strong></p>
            <div class="signature-box" style="height: 18px;">&nbsp;</div>
          </div>
        </div>
        
        <!-- Hidden paper ID for scanning reference -->
        <div style="text-align: center; margin-top: 10px; font-size: 7px; color: #999;">
          <p>Paper ID: ${paperData?.id || '-'} | Student ID: ${paperData.paperHeader?.rollNumber || '-'} | Generated: ${new Date().toLocaleDateString('en-GB')}</p>
        </div>
      </body>
      </html>
    `;
  };
  
  // Handle download as HTML
  const handleDownload = () => {
    if (!paperData) return;
    
    // Get the HTML content
    const htmlContent = getAnswerKeyHTMLContent();
    
    // Create a blob with appropriate MIME type
    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link to download the file
    const a = document.createElement('a');
    a.href = url;
    
    // Format file name with clean strings
    const studentName = (paperData.paperHeader?.studentName || 'student').replace(/\s+/g, '_');
    const subject = (paperData.paperHeader?.subject || 'question_paper').replace(/\s+/g, '_');
    
    // Use .html extension for better compatibility
    a.download = `AnswerKey_${subject}_${studentName}.html`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };
  
  // Handle download as DOCX
  const handleDownloadDOCX = () => {
    if (!paperData) return;
    
    // Get the content
    const htmlContent = getAnswerKeyHTMLContent();
    
    // Format file name with clean strings
    const studentName = (paperData.paperHeader?.studentName || 'student').replace(/\s+/g, '_');
    const subject = (paperData.paperHeader?.subject || 'question_paper').replace(/\s+/g, '_');
    const fileName = `AnswerKey_${subject}_${studentName}`;
    
    // Use our utility to generate DOCX
    generateDOCX(htmlContent, fileName);
  };
  
  // Handle download as PDF
  const handleDownloadPDF = () => {
    if (!paperData) return;
    
    // Get the content
    const htmlContent = getAnswerKeyHTMLContent();
    
    // Format file name with clean strings
    const studentName = (paperData.paperHeader?.studentName || 'student').replace(/\s+/g, '_');
    const subject = (paperData.paperHeader?.subject || 'question_paper').replace(/\s+/g, '_');
    const fileName = `AnswerKey_${subject}_${studentName}`;
    
    // Use our utility to generate PDF
    generatePDF(htmlContent, fileName);
  };

  // Helper function to format code blocks in text
  const formatCodeInText = (text: string): React.ReactNode => {
    if (!text) return '';
    
    // Check if the text contains code blocks formatted with ```
    if (text.includes('```')) {
      try {
        // Split by code block markers
        const segments = text.split(/```(?:[\w]*\n)?/);
        const result: React.ReactNode[] = [];
        
        for (let i = 0; i < segments.length; i++) {
          if (i % 2 === 0) {
            // Regular text - still need to handle inline code
            if (segments[i].includes('`')) {
              // Process inline code within the regular text segment
              const inlineSegments = segments[i].split(/`/);
              for (let j = 0; j < inlineSegments.length; j++) {
                if (j % 2 === 0) {
                  if (inlineSegments[j]) {
                    result.push(<span key={`text-${i}-${j}`}>{inlineSegments[j]}</span>);
                  }
                } else {
                  result.push(
                    <code key={`inline-${i}-${j}`} className="px-1 py-0.5 bg-gray-100 rounded font-mono text-xs">
                      {inlineSegments[j]}
                    </code>
                  );
                }
              }
            } else if (segments[i]) {
              // Just regular text
              result.push(<span key={`text-${i}`}>{segments[i]}</span>);
            }
          } else {
            // Format code block with indentation and spacing preserved
            const codeLines = segments[i].split('\n');
            // Trim any empty lines at start and end
            while (codeLines.length > 0 && !codeLines[0].trim()) {
              codeLines.shift();
            }
            while (codeLines.length > 0 && !codeLines[codeLines.length - 1].trim()) {
              codeLines.pop();
            }
            
            result.push(
              <div key={`code-${i}`} className="my-2 bg-gray-100 rounded overflow-x-auto">
                <pre className="p-2 font-mono text-xs whitespace-pre-wrap">
                  {codeLines.join('\n')}
                </pre>
              </div>
            );
          }
        }
        
        return <>{result}</>;
      } catch (e) {
        // Fallback in case of error
        console.error("Error formatting code blocks:", e);
        return text;
      }
    }
    
    // Handle inline code with `backticks`
    if (text.includes('`')) {
      try {
        const segments = text.split(/`/);
        const result: React.ReactNode[] = [];
        
        for (let i = 0; i < segments.length; i++) {
          if (i % 2 === 0) {
            // Regular text
            if (segments[i]) {
              result.push(<span key={`text-${i}`}>{segments[i]}</span>);
            }
          } else {
            // Inline code
            result.push(
              <code key={`code-${i}`} className="px-1 py-0.5 bg-gray-100 rounded font-mono text-xs">
                {segments[i]}
              </code>
            );
          }
        }
        
        return <>{result}</>;
      } catch (e) {
        // Fallback in case of error
        console.error("Error formatting inline code:", e);
        return text;
      }
    }
    
    // No code formatting needed
    return text;
  };

  // Get all questions from either questions array or sections
  const allQuestions: Question[] = [];
  
  if (paperData.questions) {
    allQuestions.push(...paperData.questions);
  } else if (paperData.sections) {
    paperData.sections.forEach(section => {
      if (section.questions) {
        allQuestions.push(...section.questions);
      }
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Answer Key</DialogTitle>
          <DialogDescription>
            Answer key for the generated MCQ paper
          </DialogDescription>
        </DialogHeader>

        <div className="paper-preview p-4 border rounded-md">
          {/* Header Section */}
          <div className="text-center mb-3">
            <h1 className="text-lg font-bold mb-0.5">{paperData.paperHeader?.university || 'The Islamia University of Bahawalpur'}</h1>
            <h2 className="text-base mt-0">{paperData.paperHeader?.department || 'Department of Data Science'}</h2>
            
            <div className="bg-gray-100 p-2 my-2 rounded-md border border-dashed border-gray-300">
              <h3 className="font-bold text-gray-800 text-sm">ANSWER KEY - FOR TEACHER USE ONLY</h3>
              <p className="text-xs text-gray-600">
                Student: {paperData.paperHeader?.studentName || 'N/A'} | 
                Roll No: {paperData.paperHeader?.rollNumber || 'N/A'} |
                Class: {paperData.paperHeader?.class_section || paperData.paperHeader?.class || 'N/A'} |
                Instructor: {paperData.paperHeader?.instructor || paperData.paperHeader?.teacherName || 'N/A'} |
                Date: {paperData.paperHeader?.date || paperData.paperHeader?.examDate || new Date().toLocaleDateString('en-GB')}
              </p>
            </div>
          </div>
          
          {/* Quick Answer Grid */}
          <div className="mb-4 overflow-x-auto">
            <div className="min-w-full grid grid-cols-5 gap-1 text-center font-medium text-xs">
              <div className="bg-gray-100 p-1 rounded">Question</div>
              <div className="bg-gray-100 p-1 rounded">A</div>
              <div className="bg-gray-100 p-1 rounded">B</div>
              <div className="bg-gray-100 p-1 rounded">C</div>
              <div className="bg-gray-100 p-1 rounded">D</div>
              
              {allQuestions.flatMap((question, index) => {
                const romanNum = (() => {
                  const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 
                                         'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
                  return index < romanNumerals.length ? romanNumerals[index] : (index+1).toString();
                })();
                
                return [
                  <div key={`q-${index}`} className="p-1 border rounded">{romanNum}</div>,
                  <div key={`a-${index}`} className={`p-1 border rounded ${question.correctAnswer === 'A' ? 'bg-green-100 font-bold' : ''}`}>
                    {question.correctAnswer === 'A' ? '✓' : ''}
                  </div>,
                  <div key={`b-${index}`} className={`p-1 border rounded ${question.correctAnswer === 'B' ? 'bg-green-100 font-bold' : ''}`}>
                    {question.correctAnswer === 'B' ? '✓' : ''}
                  </div>,
                  <div key={`c-${index}`} className={`p-1 border rounded ${question.correctAnswer === 'C' ? 'bg-green-100 font-bold' : ''}`}>
                    {question.correctAnswer === 'C' ? '✓' : ''}
                  </div>,
                  <div key={`d-${index}`} className={`p-1 border rounded ${question.correctAnswer === 'D' ? 'bg-green-100 font-bold' : ''}`}>
                    {question.correctAnswer === 'D' ? '✓' : ''}
                  </div>
                ];
              })}
            </div>
          </div>
          
          {/* Detailed Answer Key */}
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2 pb-1 border-b text-primary">Detailed Answer Key</h3>
            
            <div className="space-y-3">
              {allQuestions.map((question, index) => (
                <div key={`question-${index}`} className="p-2 border rounded-md">
                  <div className="font-medium mb-1 text-xs">
                    <span className="text-primary">{(() => {
                      const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 
                                            'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
                      return index < romanNumerals.length ? romanNumerals[index] : (index+1).toString();
                    })()}.</span> {formatCodeInText(question.questionText)} <span className="text-gray-500">(1 marks)</span>
                  </div>
                  
                  <div className="mt-1 ml-4 space-y-0.5 text-xs">
                    {Object.entries(question.options).map(([key, value]) => (
                      <div key={`${index}-${key}`} className={`${key === question.correctAnswer ? 'text-green-600 font-medium' : ''}`}>
                        <span className="inline-block w-4">{key}.</span>
                        {formatCodeInText(value as string)}
                        {key === question.correctAnswer && (
                          <span className="ml-1 text-green-600">✓</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Signature Section */}
          <div className="mt-4 pt-2 border-t flex justify-end">
            <div className="border border-gray-200 p-2 rounded-md w-40">
              <p className="text-xs font-semibold text-gray-700 mb-1">Examiner's Signature:</p>
              <div className="border-b border-gray-800 w-32 h-6">&nbsp;</div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-end space-x-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button variant="outline" onClick={handleDownloadDOCX}>
            <FileText className="mr-2 h-4 w-4" /> Download DOCX
          </Button>
          <Button variant="outline" onClick={handleDownloadPDF}>
            <FileDown className="mr-2 h-4 w-4" /> Download PDF
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}