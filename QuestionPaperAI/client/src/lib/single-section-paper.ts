/**
 * Single-section paper generator with specialized formatting
 * Supports Short Answer Questions and Coding Type Long Questions as dedicated paper types
 */

import { generateDOCX, generatePDF } from '@/lib/document-utils';

/**
 * Generate a single-section paper (Short Answer or Coding) in PDF or DOCX format
 * @param paperContent Paper content from the API
 * @param format 'pdf' or 'docx'
 * @param fileName Base name for the output file (without extension)
 * @param questionType 'Short Answer' or 'Coding Type Long Question'
 */
export function generateSingleSectionPaper(
  paperContent: any, 
  format: 'pdf' | 'docx', 
  fileName: string,
  questionType: 'Short Answer' | 'Coding Type Long Question'
) {
  if (!paperContent) return;
  
  // Get HTML content for the paper
  const html = generateSingleSectionPaperHTML(paperContent, questionType);
  
  // Generate the document in the requested format
  if (format === 'pdf') {
    generatePDF(html, fileName);
  } else {
    generateDOCX(html, fileName);
  }
}

/**
 * Generate HTML content for a single-section paper
 * @param paperContent The paper content object from the API
 * @param questionType The type of questions to include ('Short Answer' or 'Coding Type Long Question')
 * @returns HTML string with proper formatting
 */
function generateSingleSectionPaperHTML(paperContent: any, questionType: 'Short Answer' | 'Coding Type Long Question'): string {
  if (!paperContent) return '';
  
  // Format date correctly
  const formattedDate = formatDate(paperContent.paperHeader?.date || paperContent.paperHeader?.examDate);
  
  // Find the specific section
  const sections = paperContent.sections || [];
  const targetSection = sections.find((s: any) => 
    s.questionType === questionType || 
    (questionType === 'Short Answer' && s.questionType?.includes('Short')) ||
    (questionType === 'Coding Type Long Question' && s.questionType?.includes('Coding'))
  );
  
  if (!targetSection || !targetSection.questions || targetSection.questions.length === 0) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>No Questions Available</title>
      </head>
      <body>
        <h1>No ${questionType} Questions Available</h1>
      </body>
      </html>
    `;
  }
  
  // Create base HTML structure
  let documentHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${paperContent.paperHeader?.subject || 'Question Paper'} - ${paperContent.paperHeader?.studentName || 'Student'}</title>
  <style>
    @page { size: legal; margin: 0.5in; }
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; font-size: 11pt; line-height: 1.3; }
    
    /* Header styling */
    .header { text-align: center; margin-bottom: 10pt; }
    .header h1 { font-size: 16pt; font-weight: bold; margin: 0 0 4pt 0; }
    .header h2 { font-size: 14pt; font-weight: normal; margin: 0 0 4pt 0; }
    
    /* Details grid layout */
    .details { display: grid; grid-template-columns: 1fr 1fr; margin: 8pt 0; }
    .details p { margin: 3pt 0; font-size: 11pt; }
    
    /* Student info styling */
    .student-info { 
      border-top: 1pt solid #000; 
      border-bottom: 1pt solid #000; 
      padding: 5pt 0; 
      margin: 8pt 0; 
    }
    
    /* Section styling */
    .section { margin-bottom: 15pt; }
    .section-title { 
      font-size: 13pt; 
      font-weight: bold; 
      margin: 8pt 0; 
      padding: 5pt; 
      background-color: #f0f0f0; 
      border-bottom: 1pt solid #999;
    }
    
    /* Question styling */
    .question { margin-bottom: 12pt; page-break-inside: avoid; }
    .question-text { font-weight: bold; margin-bottom: 5pt; }
    .question-marks { font-weight: normal; font-style: italic; }
    
    /* Short answer space styling */
    .answer-space {
      border: 1pt solid #ddd;
      border-left: 3pt solid #999;
      min-height: 4em;
      margin: 5pt 0 10pt 15pt;
      padding: 2pt;
      background-color: #fafafa;
    }
    
    /* Long question (coding) answer space styling */
    .coding-answer-space {
      border: 1pt solid #ccc;
      border-left: 4pt solid #666;
      min-height: 30em;
      margin: 10pt 0 20pt 0;
      padding: 5pt;
      background-color: #f8f8f8;
      font-family: "Courier New", monospace;
    }
    
    /* Signature section styling */
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 25pt;
      padding-top: 10pt;
      border-top: 1pt solid #ddd;
    }
    .signature-box {
      border-bottom: 1pt solid #000;
      width: 180pt;
      height: 30pt;
      margin-top: 8pt;
    }
    
    /* Code styling for programming questions */
    pre {
      background-color: #f5f5f5;
      padding: 8pt;
      border-radius: 4pt;
      font-family: "Courier New", monospace;
      white-space: pre-wrap;
      font-size: 10pt;
      margin: 5pt 0;
      overflow-x: auto;
    }
    code {
      background-color: #f5f5f5;
      padding: 2pt 4pt;
      border-radius: 3pt;
      font-family: "Courier New", monospace;
      font-size: 10pt;
    }
    
    /* Print-specific behavior */
    @media print {
      body { padding: 0; }
      .question { page-break-inside: avoid; }
    }
  </style>
</head>
<body>`;

  // Add paper header
  documentHTML += `
  <div class="header">
    <h1>${paperContent.paperHeader?.university || 'The Islamia University of Bahawalpur'}</h1>
    <h2>${paperContent.paperHeader?.department || 'Department of Data Science'}</h2>
  </div>
  
  <div class="details">
    <div>
      <p><strong>Program/Semester:</strong> ${paperContent.paperHeader?.program || ''} ${paperContent.paperHeader?.semester || ''}</p>
      <p><strong>Subject:</strong> ${paperContent.paperHeader?.subject || ''}</p>
      <p><strong>Instructor:</strong> ${paperContent.paperHeader?.instructor || ''}</p>
    </div>
    <div>
      <p><strong>Maximum Marks:</strong> ${targetSection.totalMarks || ''}</p>
      <p><strong>Time:</strong> ${paperContent.paperHeader?.timeAllowed || ''} Hours</p>
      <p><strong>Date:</strong> ${formattedDate}</p>
    </div>
  </div>
  
  <div class="student-info">
    <p>
      <strong>Name:</strong> ${paperContent.paperHeader?.studentName || '_______________________'}
      <span style="float: right"><strong>Roll No:</strong> ${paperContent.paperHeader?.rollNumber || '______________'}</span>
    </p>
  </div>`;

  // Generate the appropriate section based on the question type
  if (questionType === 'Short Answer') {
    documentHTML += `
    <div class="section">
      <h3 class="section-title">Short Answer Questions</h3>
      <p>Instructions: Answer the following questions briefly (maximum 4 lines). Each question carries ${targetSection.marksPerQuestion || 2} mark(s).</p>`;
      
    let shortQNumber = 1;
    (targetSection.questions || []).forEach((q: any) => {
      documentHTML += `
      <div class="question">
        <p class="question-text">${shortQNumber}. ${formatCodeForHTML(q.questionText)} <span class="question-marks">(${q.marks || 2} marks)</span></p>
        <div class="answer-space">
          <!-- 4-line answer space -->
        </div>
      </div>`;
      
      shortQNumber++;
    });
    
    documentHTML += `
    </div>`;
  } else if (questionType === 'Coding Type Long Question') {
    documentHTML += `
    <div class="section">
      <h3 class="section-title">Coding-Type Long Questions</h3>
      <p>Instructions: Write complete Object-Oriented Programming solutions for the following problems. Include proper class definitions, inheritance, and encapsulation as required. Each question carries ${targetSection.marksPerQuestion || 5} mark(s).</p>`;
      
    let codingQNumber = 1;
    (targetSection.questions || []).forEach((q: any) => {
      documentHTML += `
      <div class="question">
        <p class="question-text">${codingQNumber}. ${formatCodeForHTML(q.questionText)} <span class="question-marks">(${q.marks || 5} marks)</span></p>
        <div class="coding-answer-space">
          <!-- Code solution space -->
        </div>
      </div>`;
      
      codingQNumber++;
    });
    
    documentHTML += `
    </div>`;
  }

  // Add signature section
  documentHTML += `
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
  
  <!-- Paper ID for tracking -->
  <div style="text-align: center; margin-top: 10pt; font-size: 7pt; color: #999;">
    <p>Paper ID: ${paperContent.id || '-'} | Generated: ${new Date().toLocaleDateString('en-GB')}</p>
  </div>
</body>
</html>`;

  return documentHTML;
}

/**
 * Format HTML content for display, handling code blocks properly
 */
function formatCodeForHTML(text: string): string {
  if (!text) return '';
  
  // Convert code blocks
  let formattedText = text
    .replace(/```([a-z]*)([\s\S]*?)```/g, (match, language, code) => {
      return `<pre><code class="language-${language}">${escapeHTML(code.trim())}</code></pre>`;
    })
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\\n/g, '<br>');
    
  return formattedText;
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format date for consistent display
 */
function formatDate(dateString?: string): string {
  if (!dateString) return new Date().toLocaleDateString('en-GB');
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
}