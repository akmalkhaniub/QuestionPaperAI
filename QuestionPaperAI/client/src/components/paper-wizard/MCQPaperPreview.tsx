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
import { Download, FileDown, Printer, FileText } from 'lucide-react';
import { generateDOCX, generatePDF } from '@/lib/document-utils';

interface Question {
  questionNumber: number;
  questionText: string;
  options: Record<string, string>;
  correctAnswer?: string;
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
  instructor?: string;
  teacherName?: string;
  totalMarks?: string;
  timeAllowed?: string;
  examDate?: string;
  class?: string;
  class_section?: string; // Added for student class/section information
}

interface PaperSection {
  id: string;
  title: string;
  questions: any[];
}

interface PaperData {
  id?: number;
  paperHeader?: PaperHeader;
  questions?: Question[];
  sections?: PaperSection[];
}

interface MCQPaperPreviewProps {
  isOpen?: boolean;
  onClose?: () => void;
  paperData: PaperData;
}

export function MCQPaperPreview({ isOpen, onClose, paperData }: MCQPaperPreviewProps) {
  // Convert string to object if needed
  const processedData = typeof paperData === 'string' ? JSON.parse(paperData) : paperData;
  
  if (!processedData) return null;

  const handlePrint = () => {
    window.print();
  };

  // Helper function to get the HTML content for a paper
  const getPaperHTMLContent = () => {
    if (!paperData) return '';
    
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
        console.error("Error formatting code in HTML:", e);
        // Fallback to simple formatting
        return text
          .replace(/```([\s\S]*?)```/g, '<pre>$1</pre>')
          .replace(/`([^`]+)`/g, '<code>$1</code>')
          .replace(/\n/g, '<br>');
      }
    };
    
    // Helper to get Roman numerals for question numbers
    const getRomanNumeral = (num: number): string => {
      const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 
                             'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
      return num <= romanNumerals.length ? romanNumerals[num-1] : num.toString();
    };
    
    // Generate HTML content for the paper with the requested template style
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Question Paper</title>
        <style>
          @page { size: legal; margin: 0.5in; }
          body {
            font-family: "Times New Roman", Times, serif;
            line-height: 1.5;
            margin: 0;
            padding: 0.5in;
            font-size: 12pt;
          }
          .header {
            text-align: center;
            margin-bottom: 15px;
          }
          .header h1 {
            font-size: 16pt;
            margin: 0;
            font-weight: bold;
          }
          .header h2 {
            font-size: 14pt;
            margin: 5px 0;
            font-weight: bold;
          }
          .paper-info {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            font-size: 12pt;
          }
          .paper-info div {
            width: 48%;
          }
          .student-info {
            display: flex;
            justify-content: space-between;
            margin: 15px 0;
            font-size: 12pt;
          }
          .section {
            margin: 15px 0;
          }
          .question {
            margin-bottom: 15px;
            font-size: 12pt;
          }
          .options {
            margin-top: 5px;
            margin-left: 20px;
          }
          .option {
            margin-bottom: 5px;
          }
          pre, code {
            font-family: monospace;
            background-color: #f5f5f5;
            border-radius: 3px;
          }
          pre {
            padding: 10px;
            white-space: pre-wrap;
          }
          code {
            padding: 2px 4px;
          }
          .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 40px;
            margin-bottom: 20px;
          }
          .signature-line {
            border-bottom: 1px solid #000;
            width: 180px;
            height: 20px;
            margin-top: 15px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${paperData.paperHeader?.university || 'The Islamia University of Bahawalpur'}</h1>
          <h2>${paperData.paperHeader?.department || 'Department of Data Science'}</h2>
        </div>
        
        <div class="paper-info">
          <div>
            <p><strong>Program/Semester:</strong> ${paperData.paperHeader?.program || 'BS Data Science'}</p>
            <p><strong>Subject:</strong> ${paperData.paperHeader?.subject || 'Object-Oriented Programming'}</p>
            <p><strong>Instructor:</strong> ${paperData.paperHeader?.instructor || paperData.paperHeader?.teacherName || 'Dr. Akmal Khan'}</p>
          </div>
          <div style="text-align: right;">
            <p><strong>Maximum Marks:</strong> ${paperData.paperHeader?.marks || paperData.paperHeader?.totalMarks || '10'}</p>
            <p><strong>Time:</strong> ${
              paperData.paperHeader?.time ? 
                (paperData.paperHeader.time.includes("minutes minutes") ? 
                  paperData.paperHeader.time.replace("minutes minutes", "minutes") : 
                  paperData.paperHeader.time) : 
                `${paperData.paperHeader?.timeAllowed || '10'} minutes`
            }</p>
            <p><strong>Date:</strong> ${paperData.paperHeader?.date || paperData.paperHeader?.examDate || '04/12/2025'}</p>
          </div>
        </div>
        
        <div class="student-info">
          <p><strong>Name:</strong> ${paperData.paperHeader?.studentName || '___________________'}</p>
          <p><strong>Class:</strong> ${paperData.paperHeader?.class_section || paperData.paperHeader?.class || '_______________'}</p>
          <p><strong>Roll No:</strong> ${paperData.paperHeader?.rollNumber || '_______________'}</p>
        </div>
        
        <div class="questions">
          ${(() => {
            // Handle papers with direct questions array
            if (paperData.questions && paperData.questions.length > 0) {
              return paperData.questions.map((q, idx) => `
                <div class="question">
                  <div><strong>${getRomanNumeral(idx + 1)}.</strong> ${formatCodeForHTML(q.questionText)} <strong>(1 marks)</strong></div>
                  <div class="options">
                    ${Object.entries(q.options || {}).map(([key, value]) => `
                      <div class="option">
                        <strong>${key}.</strong> ${formatCodeForHTML(value as string)}
                      </div>
                    `).join('')}
                  </div>
                </div>
              `).join('');
            }
            
            // Handle papers with sections (nested questions)
            else if (paperData.sections && paperData.sections.length > 0) {
              return paperData.sections.map((section) => `
                <div class="section">
                  ${(section.questions || []).map((q, idx) => `
                    <div class="question">
                      <div><strong>${getRomanNumeral(idx + 1)}.</strong> ${formatCodeForHTML(q.questionText)} <strong>(${q.marks || '1'} marks)</strong></div>
                      <div class="options">
                        ${Object.entries(q.options || {}).map(([key, value]) => `
                          <div class="option">
                            <strong>${key}.</strong> ${formatCodeForHTML(value as string)}
                          </div>
                        `).join('')}
                      </div>
                    </div>
                  `).join('')}
                </div>
              `).join('');
            }
            
            return '<p>No questions available</p>';
          })()}
        </div>
        
        <div class="signature-section">
          <div>
            <p><strong>Examiner's Signature:</strong></p>
            <div class="signature-line"></div>
          </div>
          
          <div style="text-align: right;">
            <p><strong>Student's Signature:</strong></p>
            <div class="signature-line"></div>
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
  
  // Handle download as DOCX
  const handleDownloadDOCX = () => {
    if (!paperData) return;
    
    // Capture the exact HTML content from the preview
    const previewElement = document.querySelector('.paper-preview');
    if (!previewElement) {
      console.error('Could not find paper preview element');
      return;
    }
    
    // Create a deep clone of the preview element to manipulate without affecting the UI
    const clonedElement = previewElement.cloneNode(true) as HTMLElement;
    
    // Remove any unnecessary UI elements that shouldn't be in the document
    clonedElement.querySelectorAll('button, .ocr-marker').forEach(el => el.remove());
    
    // Format file name with clean strings
    const studentName = (paperData.paperHeader?.studentName || 'student').replace(/\s+/g, '_');
    const subject = (paperData.paperHeader?.subject || 'question_paper').replace(/\s+/g, '_');
    const fileName = `${subject}_${studentName}`;
    
    // Create a properly formatted HTML document for export
    const exportHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${fileName}</title>
      <style>
        /* Define page size as LEGAL (8.5" x 14") with margins */
        @page {
          size: legal;
          margin: 0.5in;
        }
        
        /* Base document styling */
        body {
          font-family: Arial, sans-serif;
          font-size: 14pt;
          line-height: 1.5;
          margin: 0;
          padding: 0;
        }
        
        /* Header styling */
        .text-center {
          text-align: center;
        }
        h1, h2, h3 {
          margin: 0.2in 0 0.1in 0;
        }
        h1 {
          font-size: 18pt;
        }
        h2 {
          font-size: 16pt;
        }
        
        /* Grid layout */
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.2in;
          margin: 0.1in 0;
        }
        
        /* Student info box */
        .border-t {
          border-top: 1pt solid #000;
        }
        .border-b {
          border-bottom: 1pt solid #000;
        }
        .py-1 {
          padding-top: 0.1in;
          padding-bottom: 0.1in;
        }
        
        /* Options layout - two per row */
        .options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.1in;
          margin-left: 0.2in;
        }
        .option {
          display: flex;
          align-items: flex-start;
        }
        
        /* Question styling */
        .font-medium {
          font-weight: 600;
        }
        .my-1 {
          margin-top: 0.1in;
          margin-bottom: 0.1in;
        }
        .mb-3 {
          margin-bottom: 0.3in;
        }
        
        /* Bubble styling */
        .answer-bubbles {
          display: flex;
          align-items: center;
          gap: 0.3in;
          border-top: 1pt solid #ddd;
          padding-top: 0.1in;
          margin-top: 0.1in;
        }
        .bubble-container {
          display: flex;
          align-items: center;
        }
        .bubble {
          width: 0.2in;
          height: 0.2in;
          border: 1.5pt solid #000;
          border-radius: 50%;
          margin-left: 0.1in;
        }
        
        /* Signature section */
        .signature-section {
          display: flex;
          justify-content: space-between;
          margin-top: 0.5in;
        }
        .signature-box {
          border: 1pt solid #000;
          padding: 0.1in;
          width: 2in;
        }
        .signature-line {
          border-bottom: 1pt solid #000;
          height: 0.5in;
        }
        
        /* Space utilities */
        .space-y-3 > *:not(:first-child) {
          margin-top: 0.3in;
        }
      </style>
    </head>
    <body>
      ${clonedElement.innerHTML}
    </body>
    </html>
    `;
    
    // Use our utility function to generate and download the DOCX
    generateDOCX(exportHtml, fileName);
  };
  
  // Handle download as PDF
  const handleDownloadPDF = () => {
    if (!paperData) return;
    
    // Capture the exact HTML content from the preview
    const previewElement = document.querySelector('.paper-preview');
    if (!previewElement) {
      console.error('Could not find paper preview element');
      return;
    }
    
    // Create a deep clone of the preview element to manipulate without affecting the UI
    const clonedElement = previewElement.cloneNode(true) as HTMLElement;
    
    // Remove any unnecessary UI elements that shouldn't be in the document
    clonedElement.querySelectorAll('button, .ocr-marker').forEach(el => el.remove());
    
    // Format file name with clean strings
    const studentName = (paperData.paperHeader?.studentName || 'student').replace(/\s+/g, '_');
    const subject = (paperData.paperHeader?.subject || 'question_paper').replace(/\s+/g, '_');
    const fileName = `${subject}_${studentName}`;
    
    // Create a properly formatted HTML document for export
    const exportHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${fileName}</title>
      <style>
        /* Define page size as LEGAL (8.5" x 14") with margins */
        @page {
          size: legal;
          margin: 0.5in;
        }
        
        /* Base document styling */
        body {
          font-family: Arial, sans-serif;
          font-size: 14pt;
          line-height: 1.5;
          margin: 0;
          padding: 0;
        }
        
        /* Header styling */
        .text-center {
          text-align: center;
        }
        h1, h2, h3 {
          margin: 0.2in 0 0.1in 0;
        }
        h1 {
          font-size: 18pt;
        }
        h2 {
          font-size: 16pt;
        }
        
        /* Grid layout */
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.2in;
          margin: 0.1in 0;
        }
        
        /* Student info box */
        .border-t {
          border-top: 1pt solid #000;
        }
        .border-b {
          border-bottom: 1pt solid #000;
        }
        .py-1 {
          padding-top: 0.1in;
          padding-bottom: 0.1in;
        }
        
        /* Options layout - two per row */
        .options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.1in;
          margin-left: 0.2in;
        }
        .option {
          display: flex;
          align-items: flex-start;
        }
        
        /* Question styling */
        .font-medium {
          font-weight: 600;
        }
        .my-1 {
          margin-top: 0.1in;
          margin-bottom: 0.1in;
        }
        .mb-3 {
          margin-bottom: 0.3in;
        }
        
        /* Bubble styling */
        .answer-bubbles {
          display: flex;
          align-items: center;
          gap: 0.3in;
          border-top: 1pt solid #ddd;
          padding-top: 0.1in;
          margin-top: 0.1in;
        }
        .bubble-container {
          display: flex;
          align-items: center;
        }
        .bubble {
          width: 0.2in;
          height: 0.2in;
          border: 1.5pt solid #000;
          border-radius: 50%;
          margin-left: 0.1in;
        }
        
        /* Signature section */
        .signature-section {
          display: flex;
          justify-content: space-between;
          margin-top: 0.5in;
        }
        .signature-box {
          border: 1pt solid #000;
          padding: 0.1in;
          width: 2in;
        }
        .signature-line {
          border-bottom: 1pt solid #000;
          height: 0.5in;
        }
        
        /* Space utilities */
        .space-y-3 > *:not(:first-child) {
          margin-top: 0.3in;
        }
      </style>
    </head>
    <body>
      ${clonedElement.innerHTML}
    </body>
    </html>
    `;
    
    // Use our utility function to generate and download the PDF
    generatePDF(exportHtml, fileName);
  };

  // Helper function to render roman numerals for question numbers
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
  
  // Format code blocks for HTML export
  const formatCodeForHTML = (text: string): string => {
    if (!text) return '';
    
    // Handle code blocks with triple backticks
    if (text.includes('```')) {
      return text.replace(/```([\s\S]*?)```/g, (match, codeContent) => {
        return `<pre>${codeContent.trim()}</pre>`;
      });
    }
    
    // Handle inline code with backticks
    if (text.includes('`')) {
      return text.replace(/`(.*?)`/g, (match, codeContent) => {
        return `<code>${codeContent}</code>`;
      });
    }
    
    return text;
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Paper Preview</DialogTitle>
          <DialogDescription>
            Preview the generated MCQ paper
          </DialogDescription>
        </DialogHeader>

        <div className="paper-preview p-4 border rounded-md">
          {/* Header Section */}
          <div className="text-center mb-3">
            <h1 className="text-lg font-bold mb-0.5">{paperData.paperHeader?.university || 'The Islamia University of Bahawalpur'}</h1>
            <h2 className="text-base mt-0">{paperData.paperHeader?.department || 'Department of Data Science'}</h2>
            
            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
              <div className="text-left">
                <p className="my-0.5"><strong>Program/Semester:</strong> {paperData.paperHeader?.program}</p>
                <p className="my-0.5"><strong>Subject:</strong> {paperData.paperHeader?.subject}</p>
                <p className="my-0.5"><strong>Instructor:</strong> {paperData.paperHeader?.instructor || paperData.paperHeader?.teacherName || 'Dr. Faculty Member'}</p>
              </div>
              <div className="text-right">
                <p className="my-0.5"><strong>Maximum Marks:</strong> {paperData.paperHeader?.marks || paperData.paperHeader?.totalMarks || '100'}</p>
                <p className="my-0.5"><strong>Time:</strong> {
                  paperData.paperHeader?.time ? 
                    (paperData.paperHeader.time.includes("minutes minutes") ? 
                      paperData.paperHeader.time.replace("minutes minutes", "minutes") : 
                      paperData.paperHeader.time) : 
                    `${paperData.paperHeader?.timeAllowed || '60'} minutes`
                }</p>
                <p className="my-0.5"><strong>Date:</strong> {paperData.paperHeader?.date || paperData.paperHeader?.examDate || new Date().toLocaleDateString('en-GB')}</p>
              </div>
            </div>
            
            {/* Paper type removed as requested */}
            
            <div className="mt-2 border-t border-b py-1">
              <p className="text-left">
                <strong>Name:</strong> {paperData.paperHeader?.studentName || '_______________________'} 
                <strong style={{marginLeft: "30px"}}>Class:</strong> {paperData.paperHeader?.class_section || paperData.paperHeader?.class || '_______________'}
                <span className="float-right"><strong>Roll No:</strong> {paperData.paperHeader?.rollNumber || '______________'}</span>
              </p>
            </div>
          </div>
          
          {/* Questions Section */}
          <div className="questions-section space-y-3">
            {/* Handle paper data with questions array */}
            {paperData.questions?.map((question: any, index: number) => (
              <div key={index} className="question mb-3">
                <div className="font-medium my-1 text-sm">
                  {toRoman(index + 1)}. {formatCodeInText(question.questionText)}
                </div>
                
                <div className="options grid grid-cols-2 gap-1 mt-1">
                  {Object.entries(question.options || {}).map(([key, value]) => (
                    <div key={key} className="option flex items-start text-xs">
                      <div className="mr-1 font-medium">{key}.</div>
                      <div>{formatCodeInText(value as string)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {/* Handle paper data with sections (nested questions) */}
            {paperData.sections?.map((section: any, sectionIndex: number) => (
              <div key={sectionIndex} className="section mb-4">
                {/* Section title removed as requested */}
                
                {(section.questions || []).map((question: any, index: number) => (
                  <div key={index} className="question mb-3">
                    <div className="font-medium my-1 text-sm">
                      {toRoman(index + 1)}. {formatCodeInText(question.questionText)} 
                      {question.marks && <span className="text-xs ml-1 text-gray-500">({question.marks} marks)</span>}
                    </div>
                    
                    <div className="options grid grid-cols-2 gap-1 mt-1">
                      {Object.entries(question.options || {}).map(([key, value]) => (
                        <div key={key} className="option flex items-start text-xs">
                          <div className="mr-1 font-medium">{key}.</div>
                          <div>{formatCodeInText(value as string)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          
          {/* Signature Section */}
          <div className="mt-4 pt-2 border-t flex justify-between">
            <div className="border border-gray-200 p-2 rounded-md w-40">
              <p className="text-xs font-semibold text-gray-700 mb-1">Examiner's Signature:</p>
              <div className="border-b border-gray-800 w-32 h-6">&nbsp;</div>
            </div>
            <div className="border border-gray-200 p-2 rounded-md w-40">
              <p className="text-xs font-semibold text-gray-700 mb-1">Student's Signature:</p>
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