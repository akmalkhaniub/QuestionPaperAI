/**
 * Multi-format paper generator with customizable sections
 * Supports MCQs, Short Questions, and Long Coding Questions
 */

import { generateDOCX, generatePDF } from '@/lib/document-utils';

/**
 * Generate a paper in PDF or DOCX format
 * @param paperContent Paper content from the API
 * @param format 'pdf' or 'docx'
 * @param fileName Base name for the output file (without extension)
 */
export function generateMultiSectionPaper(paperContent: any, format: 'pdf' | 'docx', fileName: string) {
  if (!paperContent) return;
  
  // Get HTML content for the paper
  const html = generateMultiSectionPaperHTML(paperContent);
  
  // Generate the document in the requested format
  if (format === 'pdf') {
    generatePDF(html, fileName);
  } else {
    generateDOCX(html, fileName);
  }
}

/**
 * Generate a combined document containing multiple papers
 * @param papers Array of paper contents
 * @param format 'pdf' or 'docx'
 * @param fileName Base name for the output file
 */
export function generateCombinedPapers(papers: any[], format: 'pdf' | 'docx', fileName: string) {
  if (!papers || papers.length === 0) return;

  // Create combined HTML with page breaks between papers
  let combinedHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Combined Question Papers</title>
  <style>
    @page { size: legal; margin: 0.5in; }
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; font-size: 11pt; line-height: 1.3; }
    
    /* Force each paper to start on a new page */
    .paper-container { page-break-before: always; }
    .paper-container:first-child { page-break-before: avoid; }
    
    /* Section page breaks */
    .section { page-break-inside: avoid; }
    .section-break { page-break-before: always; }
    
    /* MCQ options in two columns */
    .mcq-options {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8pt 16pt;
      margin: 5pt 0 10pt 20pt;
    }
    .mcq-option {
      display: flex;
      align-items: center;
      gap: 4pt;
    }
    .mcq-option-label {
      font-weight: bold;
      min-width: 20pt;
    }
  </style>
</head>
<body>`;

  // Add each paper's content with a page break between them
  papers.forEach((paper, index) => {
    // Add page break separator (except for the first paper)
    if (index > 0) {
      combinedHTML += '<hr class="paper-separator">';
    }
    
    // Get the HTML content for this paper (without the DOCTYPE and surrounding HTML tags)
    const paperHTML = generateMultiSectionPaperHTML(paper, format)
      .replace(/<!DOCTYPE[^>]*>/i, '')
      .replace(/<\/?html>/gi, '')
      .replace(/<head>[\s\S]*?<\/head>/i, '')
      .replace(/<\/?body>/gi, '');
    
    combinedHTML += paperHTML;
  });

  combinedHTML += '</body></html>';

  // Generate the combined document in the requested format
  if (format === 'pdf') {
    generatePDF(combinedHTML, fileName);
  } else {
    generateDOCX(combinedHTML, fileName);
  }
}

/**
 * Generate HTML content for a multi-section paper with specific question types
 * Page 1: MCQs
 * Page 2: Short Questions with answer spaces
 * Page 3: Coding-type Long Questions with larger answer space
 * 
 * @param paperContent The paper content object from the API
 * @returns HTML string with proper page breaks and formatting
 */
export function generateMultiSectionPaperHTML(paperContent: any, format: 'pdf' | 'docx' = 'pdf'): string {
  if (!paperContent) return '';
  
  // Format date correctly
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    
    // If it's already in DD/MM/YYYY format, return as is
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
      const [day, month, year] = dateString.split('/').map(Number);
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
        return dateString;
      }
    }
    
    try {
      // Handle ISO date format (e.g., 2025-12-03T19:00:00.000Z)
      if (dateString.includes('T')) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB').replace(/\//g, '/');
      }
      
      // Handle other date formats
      const parts = dateString.split('/');
      if (parts.length === 3) {
        // Try to parse the date
        const [first, second, third] = parts.map(Number);
        
        // Validate the parts
        if (first && second && third) {
          if (first > 31) return dateString; // Invalid day
          if (second > 12) return dateString; // Invalid month
          
          // If we get here, assume DD/MM/YYYY format
          return dateString;
        }
      }
      
      return dateString; // Return original if format is unknown
    } catch (e) {
      return dateString; // Return original if parsing fails
    }
  };
  
  const formattedDate = formatDate(paperContent.paperHeader?.date || paperContent.paperHeader?.examDate);
  
  // Determine which sections to include based on template type
  const templateType = paperContent.paperHeader?.templateType || 'Standard Question Paper';
  
  let includeMCQ = false;
  let includeShort = false;
  let includeCoding = false;
  
  switch (templateType) {
    case 'Multiple Choice Only (MCQ)':
      includeMCQ = true;
      break;
    case 'Short and Long Answer':
      includeShort = true;
      includeCoding = true;
      break;
    case 'Multi-Section Paper (MCQ + Short + Coding)':
      includeMCQ = true;
      includeShort = true;
      includeCoding = true;
      break;
    case 'Practical Examination':
      includeCoding = true;
      break;
    case 'Open Book Examination':
    case 'Standard Question Paper':
    default:
      // For standard papers, include all sections that have questions
      includeMCQ = paperContent.sections?.some((s: any) => s.questionType === 'Multiple Choice' || s.questionType?.includes('MCQ'));
      includeShort = paperContent.sections?.some((s: any) => s.questionType === 'Short Answer' || s.questionType?.includes('Short'));
      includeCoding = paperContent.sections?.some((s: any) => s.questionType === 'Coding Type Long Question' || s.questionType?.includes('Coding'));
      break;
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
    .question { margin-bottom: 6pt; page-break-inside: avoid; }
    .question-text { font-weight: bold; margin-bottom: 2pt; }
    .question-marks { font-weight: normal; font-style: italic; }
    
    /* MCQ options styling */
    .mcq-options {
      margin: 2pt 0 4pt 12pt;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2pt 16pt;
      max-width: 600pt;
    }
    .mcq-option {
      display: flex;
      align-items: center;
      gap: 3pt;
    }
    .mcq-option-label {
      font-weight: bold;
      min-width: 8pt;
    }
    .mcq-options-inline {
      display: flex;
      align-items: center;
      margin: 2pt 0 4pt 12pt;
      flex-wrap: wrap;
      gap: 2pt 16pt;
    }
    .mcq-option-inline {
      display: inline-flex;
      align-items: center;
      gap: 3pt;
    }

    /* Signature section styling */
    .signature-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 12pt 40pt;
      page-break-inside: avoid;
    }
    
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
    
    /* Page break styling */
    .page-break { page-break-before: always; }
    
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
      .page-break { page-break-before: always; }
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
  
  <div class="details" style="margin: 8pt 0;">
    <p style="margin: 4pt 0;"><strong>Program/Semester:</strong> ${paperContent.paperHeader?.program || ''} ${paperContent.paperHeader?.semester || ''}</p>
    <p style="margin: 4pt 0;"><strong>Subject:</strong> ${paperContent.paperHeader?.subject || ''} <strong style="margin-left: 20pt;">Paper Type:</strong> ${paperContent.paperHeader?.paperType || 'Mid Term'} <strong style="margin-left: 20pt;">Instructor:</strong> ${paperContent.paperHeader?.instructor || ''}</p>
    <p style="margin: 4pt 0;"><strong>Maximum Marks:</strong> ${paperContent.paperHeader?.totalMarks || ''} <strong style="margin-left: 20pt;">Time:</strong> ${paperContent.paperHeader?.timeAllowed || ''} Minutes <strong style="margin-left: 20pt;">Date:</strong> ${formattedDate}</p>
  </div>
  
  <div class="student-info">
    <p>
      <strong>Name:</strong> ${paperContent.paperHeader?.studentName || '_______________________'}
      <span style="float: right"><strong>Roll No:</strong> ${paperContent.paperHeader?.rollNumber || '______________'}</span>
    </p>
  </div>`;

  // Filter sections by question type and template settings
  const mcqSections = includeMCQ ? paperContent.sections?.filter((s: any) => 
    s.questionType === 'Multiple Choice' || s.questionType?.includes('MCQ')) : [];
  
  const shortQuestionSections = includeShort ? paperContent.sections?.filter((s: any) => 
    s.questionType === 'Short Answer' || s.questionType?.includes('Short')) : [];
  
  const longCodingSections = includeCoding ? paperContent.sections?.filter((s: any) => 
    s.questionType === 'Coding Type Long Question' || s.questionType?.includes('Coding')) : [];

  // PAGE 1: MCQs
  if (mcqSections && mcqSections.length > 0) {
    documentHTML += `
    <div class="section">
      <h3 class="section-title">Section A: Multiple Choice Questions</h3>
      <p>Instructions: Circle the correct option for each question. Each MCQ carries ${mcqSections[0].marksPerQuestion || 1} mark(s).</p>`;
      
    let mcqNumber = 1;
    mcqSections.forEach((section: any) => {
      (section.questions || []).forEach((q: any) => {
        documentHTML += `
        <div class="question">
          <p class="question-text">${mcqNumber}. ${formatCodeForHTML(q.questionText)} <span class="question-marks">(${q.marks || 1} mark)</span></p>
          ${(() => {
            const options = Object.entries(q.options || {});
            const isShortOptions = options.every(([_, value]) => (value as string).length < 15);
            
            if (isShortOptions) {
              // Display all options in a single line
              return `<div class="mcq-options-inline" style="margin-left: 12pt;">
                ${options.map(([key, value], index) => `
                  <span class="mcq-option-inline">
                    <span style="font-weight: bold;">${key}.</span>
                    <span>${formatCodeForHTML(value as string)}</span>
                    ${index < options.length - 1 ? '<span style="margin: 0 12pt;"></span>' : ''}
                  </span>
                `).join('')}
              </div>`;
            } else if (format === 'pdf') {
              // Use grid layout for longer options in PDF
              return `<div class="mcq-options">
                ${options.map(([key, value]) => `
                  <div class="mcq-option">
                    <span class="mcq-option-label">${key}.</span>
                    <span>${formatCodeForHTML(value as string)}</span>
                  </div>
                `).join('')}
              </div>`;
            } else {
              // Use table layout for longer options in DOCX
              return `<table class="mcq-table" style="width: 100%; margin-left: 12pt; border-collapse: collapse; border: none;">
                ${(() => {
                  const rows = [];
                  for (let i = 0; i < options.length; i += 2) {
                    const row = options.slice(i, i + 2);
                    rows.push(`
                      <tr style="border: none;">
                        ${row.map(([key, value]) => `
                          <td style="border: none; padding: 2pt 16pt 2pt 0; width: 50%;">
                            <span style="font-weight: bold;">${key}.</span>
                            <span style="margin-left: 4pt;">${formatCodeForHTML(value as string)}</span>
                          </td>
                        `).join('')}
                      </tr>
                    `);
                  }
                  return rows.join('');
                })()}
              </table>`;
            }
          })()}
        </div>`;
        
        mcqNumber++;
      });
    });
    
    documentHTML += `
    </div>`;
  }

  // PAGE 2: Short Questions (with page break)
  if (shortQuestionSections && shortQuestionSections.length > 0) {
    documentHTML += `
    <div class="page-break"></div>
    <div class="section">
      <h3 class="section-title">Section B: Short Answer Questions</h3>
      <p>Instructions: Answer the following questions briefly (maximum 4 lines). Each question carries ${shortQuestionSections[0].marksPerQuestion || 2} mark(s).</p>`;
      
    let shortQNumber = 1;
    shortQuestionSections.forEach((section: any) => {
      (section.questions || []).forEach((q: any) => {
        documentHTML += `
        <div class="question">
          <p class="question-text">${shortQNumber}. ${formatCodeForHTML(q.questionText)} <span class="question-marks">(${q.marks || 2} marks)</span></p>
          <div class="answer-space">
            <!-- 4-line answer space -->
          </div>
        </div>`;
        
        shortQNumber++;
      });
    });
    
    documentHTML += `
    </div>`;
  }

  // PAGE 3: Coding-type Long Questions (with page break)
  if (longCodingSections && longCodingSections.length > 0) {
    documentHTML += `
    <div class="page-break"></div>
    <div class="section">
      <h3 class="section-title">Section C: Coding-Type Long Questions</h3>
      <p>Instructions: Write complete Object-Oriented Programming solutions for the following problems. Include proper class definitions, inheritance, and encapsulation as required. Each question carries ${longCodingSections[0].marksPerQuestion || 5} mark(s).</p>`;
      
    let codingQNumber = 1;
    longCodingSections.forEach((section: any) => {
      (section.questions || []).forEach((q: any) => {
        documentHTML += `
        <div class="question">
          <p class="question-text">${codingQNumber}. ${formatCodeForHTML(q.questionText)} <span class="question-marks">(${q.marks || 5} marks)</span></p>
          <div class="coding-answer-space">
            <!-- Code solution space -->
          </div>
        </div>`;
        
        codingQNumber++;
      });
    });
    
    documentHTML += `
    </div>`;
  }

  // Add signature section
  documentHTML += `
  <div style="margin-top: 8pt; display: flex; justify-content: space-between; align-items: center; padding: 0 20pt;">
    <div style="display: flex; gap: 4pt; align-items: baseline;">
      <span>Student's Signature:</span>
      <div style="border-bottom: 1px solid #000; width: 100pt;">&nbsp;</div>
    </div>
    <div style="display: flex; gap: 4pt; align-items: baseline; margin-left: 20pt;">
      <span>Instructor's Signature:</span>
      <div style="border-bottom: 1px solid #000; width: 100pt;">&nbsp;</div>
    </div>
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
  // If no date provided, use current date in DD/MM/YYYY format
  if (!dateString) {
    const now = new Date();
    return `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
  }
  
  // If the date is already in DD/MM/YYYY format, return as is
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    return dateString;
  }
  
  try {
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  } catch (e) {
    return dateString; // Return original string if parsing fails
  }
}