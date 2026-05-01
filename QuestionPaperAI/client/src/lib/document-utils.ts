/**
 * Utility functions for document generation (DOCX and PDF)
 */
import { generateMultiSectionPaperHTML } from './multi-format-paper';

/**
 * Generate a properly formatted Word document using HTML+CSS approach
 * Using the exact same format as the preview
 * @param htmlContent HTML string to convert to DOCX
 * @param fileName Base filename (without extension)
 */
export function generateDOCX(htmlContent: string, fileName: string): void {
  // Clean and normalize the HTML content
  let filteredHtmlContent = htmlContent
    .replace(/<li>Circle the correct option clearly.<\/li>/g, '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/\u2013/g, '-')
    .replace(/\u2014/g, '--');
    
  // Enhance code formatting for better display in DOCX
  filteredHtmlContent = filteredHtmlContent
    // Make sure pre tags use monospace font and proper styling
    .replace(/<pre/g, '<pre style="font-family: Consolas, Monaco, \'Courier New\', monospace; font-size: 10pt; background-color: #f8f8f8; padding: 8px; border: 1px solid #e1e1e8; border-radius: 3px; white-space: pre-wrap; margin: 10px 0; overflow-x: auto;"')
    // Make sure code tags use monospace font
    .replace(/<code/g, '<code style="font-family: Consolas, Monaco, \'Courier New\', monospace; font-size: 10pt; background-color: #f8f8f8; padding: 2px 4px; border-radius: 3px;"');
  
  // Build the HTML for Word with the specific MS Office namespaces
  const wordHtml = `
<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' 
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns:m='http://schemas.microsoft.com/office/2004/12/omml'
      xmlns:v='urn:schemas-microsoft-com:vml'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset="utf-8">
<meta name="ProgId" content="Word.Document">
<meta name="Generator" content="Microsoft Word 15">
<meta name="Originator" content="Microsoft Word 15">
<title>${fileName}</title>
<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
    <w:DoNotOptimizeForBrowser/>
  </w:WordDocument>
  <o:OfficeDocumentSettings>
    <o:AllowPNG/>
    <o:PixelsPerInch>96</o:PixelsPerInch>
  </o:OfficeDocumentSettings>
</xml>
<![endif]-->
<!--[if gte mso 9]>
<xml>
  <w:LatentStyles DefLockedState="false" DefUnhideWhenUsed="false"
   DefSemiHidden="false" DefQFormat="false" DefPriority="99"
   LatentStyleCount="376">
    <w:LsdException Locked="false" Priority="0" QFormat="true" Name="Normal"/>
  </w:LatentStyles>
</xml>
<![endif]-->
<!--[if gte mso 10]>
<style>
 /* Style Definitions */
 table.MsoNormalTable
        {mso-style-name:"Table Normal";
        mso-tstyle-rowband-size:0;
        mso-tstyle-colband-size:0;
        mso-style-noshow:yes;
        mso-style-priority:99;
        mso-style-parent:"";
        mso-padding-alt:0in 5.4pt 0in 5.4pt;
        mso-para-margin:0in;
        mso-para-margin-bottom:.0001pt;
        mso-pagination:widow-orphan;
        font-size:12.0pt;
        font-family:"Times New Roman",serif;}
</style>
<![endif]-->
<style>
  /* Set page size and margins for consistent printing */
  @page {
    size: legal;  /* Legal size: 8.5" x 14" */
    margin: 0.5in;
  }
  @page WordSection1 {
    size: 8.5in 14in;
    margin: 0.5in;
    mso-header-margin: 0.5in;
    mso-footer-margin: 0.5in;
    mso-paper-source: 0;
  }
  div.WordSection1 { page: WordSection1; }
  
  /* Basic document styling */
  body {
    font-family: Arial, sans-serif;
    font-size: 12pt;
    line-height: 1.2;
    margin: 0;
    padding: 0;
  }
  
  /* Header styling */
  .header {
    text-align: center;
    margin-bottom: 10pt;
  }
  .header h1 {
    font-size: 14pt;
    font-weight: bold;
    margin: 0 0 2pt 0;
  }
  .header h2 {
    font-size: 12pt;
    font-weight: bold;
    margin: 0 0 2pt 0;
  }
  .header h3 {
    font-size: 12pt;
    font-weight: bold;
    margin: 0 0 2pt 0;
  }
  
  /* Student info box */
  .student-info {
    border: 1pt solid #000;
    padding: 5pt;
    margin-bottom: 10pt;
    background-color: #f9f9f9;
  }
  .student-info p {
    margin: 2pt 0;
  }
  .student-info strong {
    font-weight: bold;
  }
  
  /* Instructions box */
  .instructions {
    margin-bottom: 10pt;
  }
  .instructions p {
    margin: 2pt 0;
    font-weight: bold;
  }
  .instructions ul {
    margin: 2pt 0;
    padding-left: 15pt;
  }
  .instructions li {
    margin-bottom: 1pt;
  }
  
  /* Question styling */
  .section {
    margin-bottom: 8pt;
  }
  .question {
    margin-bottom: 8pt;
    page-break-inside: avoid;
  }
  .question-text {
    font-weight: bold;
    margin-bottom: 3pt;
  }
  .options {
    margin-left: 10pt;
  }
  .option {
    margin-bottom: 2pt;
  }
  
  /* Code formatting */
  pre {
    background-color: #f5f5f5;
    padding: 8pt;
    border-radius: 4pt;
    font-family: "Courier New", monospace;
    white-space: pre-wrap;
    font-size: 12pt;
    margin: 5pt 0;
  }
  code {
    background-color: #f5f5f5;
    padding: 2pt 4pt;
    border-radius: 3pt;
    font-family: "Courier New", monospace;
    font-size: 12pt;
  }
  
  /* Tables */
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 10pt 0;
  }
  th, td {
    border: 1pt solid #000;
    padding: 5pt;
  }
  
  /* OCR bubbles */
  .bubble {
    display: inline-block;
    width: 15pt;
    height: 15pt;
    border: 1.5pt solid #000;
    border-radius: 50%;
    margin-right: 5pt;
    vertical-align: middle;
  }
  
  /* Signature section */
  .signature-section {
    display: flex;
    justify-content: space-between;
    margin-top: 30pt;
    page-break-inside: avoid;
  }
  .signature-box {
    border-bottom: 1pt solid #000;
    width: 200pt;
    height: 40pt;
    margin-top: 10pt;
  }
  
  /* OCR marker */
  .ocr-marker {
    font-family: monospace;
    font-size: 8pt;
    color: #999;
    text-align: right;
    margin-top: 10pt;
  }
  
  /* Print-specific behavior */
  @media print {
    body {
      padding: 0;
    }
    .page-break {
      page-break-before: always;
    }
    .question {
      page-break-inside: avoid;
    }
  }
  
  /* Fix for MS Word's display issues */
  p {
    margin: 6pt 0;
    mso-margin-top-alt: 6pt;
    mso-margin-bottom-alt: 6pt;
  }
  h1, h2, h3, h4, h5, h6 {
    mso-style-priority: 9;
    mso-style-unhide: no;
    mso-style-qformat: yes;
    margin-top: 12pt;
    margin-bottom: 6pt;
  }
  
  /* Two-column layout using Word-friendly tables */
  .mcq-options-table {
    width: 100%;
    border: none;
    border-collapse: collapse;
    margin: 6pt 0;
  }
  .mcq-options-table td {
    width: 50%;
    vertical-align: top;
    padding: 4pt;
    border: none;
  }
  
  /* Utility styles */
  .text-center { text-align: center; }
  .font-bold { font-weight: bold; }
  
  /* Spacers */
  .spacer-sm { height: 6pt; }
  .spacer-md { height: 12pt; }
  .spacer-lg { height: 24pt; }
</style>
</head>

<body>
<div class="WordSection1">
  ${filteredHtmlContent}
</div>
</body>
</html>
  `;
  
  // Create a Blob with the Word-compatible HTML content
  const blob = new Blob([wordHtml], { 
    type: 'application/msword' 
  });
  const url = URL.createObjectURL(blob);
  
  // Create a temp download link and trigger it
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.doc`;  // Use .doc extension for better compatibility
  document.body.appendChild(a);
  a.click();
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Generate a PDF directly using browser's print functionality
 * 
 * @param htmlContent HTML string to convert to PDF
 * @param fileName Base filename (without extension) 
 */
export function generatePDF(htmlContent: string, fileName: string): void {
  try {
    // Filter out any unwanted text and enhance code formatting
    let filteredHtmlContent = htmlContent.replace(/<li>Circle the correct option clearly.<\/li>/g, '');
    
    // Enhance code formatting for better display in PDF
    filteredHtmlContent = filteredHtmlContent
      // Make sure pre tags use monospace font and proper styling
      .replace(/<pre/g, '<pre style="font-family: Consolas, Monaco, \'Courier New\', monospace; font-size: 10pt; background-color: #f8f8f8; padding: 8px; border: 1px solid #e1e1e8; border-radius: 3px; white-space: pre-wrap; margin: 10px 0; overflow-x: auto;"')
      // Make sure code tags use monospace font
      .replace(/<code/g, '<code style="font-family: Consolas, Monaco, \'Courier New\', monospace; font-size: 10pt; background-color: #f8f8f8; padding: 2px 4px; border-radius: 3px;"');
    
    // Create PDF-ready HTML with proper styling
    const pdfReadyHtml = `
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
    
    /* Space utilities */
    .space-y-3 > *:not(:first-child) {
      margin-top: 0.3in;
    }
    
    /* Print-specific behavior */
    @media print {
      body {
        padding: 0;
      }
      .page-break {
        page-break-before: always;
      }
    }
  </style>
</head>
<body>
  <!-- Content for printing will appear here -->
  <div id="printContent">
    ${filteredHtmlContent}
  </div>
</body>
</html>
    `;
    
    // Create a blob with the HTML content that will be converted to PDF
    const blob = new Blob([pdfReadyHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Create a new window to show the content
    const pdfWindow = window.open(url, '_blank');
    
    // Wait for the window to load, then trigger print
    if (pdfWindow) {
      pdfWindow.onload = () => {
        setTimeout(() => {
          pdfWindow.print();
        }, 500);
      };
    } else {
      // Fallback if popup is blocked - download and provide instructions
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = `${fileName}.html`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      
      // Cleanup the download link
      setTimeout(() => {
        document.body.removeChild(downloadLink);
      }, 100);
      
      // Show alert with instructions
      alert('Your PDF file is ready to be saved. Please open the downloaded HTML file in a browser and use Print > Save as PDF to convert it.');
    }
    
    // Clean up the URL when done
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  } catch (error) {
    console.error('Error in PDF generation:', error);
    alert('There was an error generating the PDF. Please try again or contact support.');
  }
}

/**
 * Helper function to download HTML that can be saved as PDF
 */
function downloadAsPDFHtml(htmlContent: string, fileName: string): void {
  // Filter out the "Circle the correct option clearly" text and enhance code formatting
  let filteredHtmlContent = htmlContent.replace(/<li>Circle the correct option clearly.<\/li>/g, '');
  
  // Enhance code formatting for better display
  filteredHtmlContent = filteredHtmlContent
    // Make sure pre tags use monospace font and proper styling
    .replace(/<pre/g, '<pre style="font-family: Consolas, Monaco, \'Courier New\', monospace; font-size: 10pt; background-color: #f8f8f8; padding: 8px; border: 1px solid #e1e1e8; border-radius: 3px; white-space: pre-wrap; margin: 10px 0; overflow-x: auto;"')
    // Make sure code tags use monospace font
    .replace(/<code/g, '<code style="font-family: Consolas, Monaco, \'Courier New\', monospace; font-size: 10pt; background-color: #f8f8f8; padding: 2px 4px; border-radius: 3px;"');
  
  const pdfHtml = `
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
      width: 8.5in;
      box-sizing: border-box;
    }
    
    /* Header styling */
    .header {
      text-align: center;
      margin-bottom: 20pt;
    }
    .header h1 {
      font-size: 18pt;
      font-weight: bold;
      margin: 0 0 4pt 0;
    }
    .header h2 {
      font-size: 16pt;
      font-weight: bold;
      margin: 0 0 4pt 0;
    }
    .header h3 {
      font-size: 14pt;
      font-weight: bold;
      margin: 0 0 4pt 0;
    }
    
    /* Student info box */
    .student-info {
      border: 1pt solid #000;
      padding: 10pt;
      margin-bottom: 20pt;
      background-color: #f9f9f9;
    }
    .student-info p {
      margin: 5pt 0;
    }
    .student-info strong {
      font-weight: bold;
    }
    
    /* Instructions box */
    .instructions {
      margin-bottom: 20pt;
    }
    .instructions p {
      margin: 5pt 0;
      font-weight: bold;
    }
    .instructions ul {
      margin: 5pt 0;
      padding-left: 20pt;
    }
    .instructions li {
      margin-bottom: 2pt;
    }
    
    /* Question styling */
    .section {
      margin-bottom: 15pt;
    }
    .question {
      margin-bottom: 15pt;
      page-break-inside: avoid;
    }
    .question-text {
      font-weight: bold;
      margin-bottom: 5pt;
    }
    .options {
      margin-left: 15pt;
    }
    .option {
      margin-bottom: 5pt;
    }
    
    /* Code formatting */
    pre {
      background-color: #f5f5f5;
      padding: 8pt;
      border-radius: 4pt;
      font-family: "Courier New", monospace;
      white-space: pre-wrap;
      font-size: 12pt;
      margin: 5pt 0;
    }
    code {
      background-color: #f5f5f5;
      padding: 2pt 4pt;
      border-radius: 3pt;
      font-family: "Courier New", monospace;
      font-size: 12pt;
    }
    
    /* Tables */
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 10pt 0;
    }
    th, td {
      border: 1pt solid #000;
      padding: 5pt;
    }
    
    /* OCR bubbles */
    .bubble {
      display: inline-block;
      width: 15pt;
      height: 15pt;
      border: 1.5pt solid #000;
      border-radius: 50%;
      margin-right: 5pt;
      vertical-align: middle;
    }
    
    /* Signature section */
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 30pt;
      page-break-inside: avoid;
    }
    .signature-box {
      border-bottom: 1pt solid #000;
      width: 200pt;
      height: 40pt;
      margin-top: 10pt;
    }
    
    /* OCR marker */
    .ocr-marker {
      font-family: monospace;
      font-size: 8pt;
      color: #999;
      text-align: right;
      margin-top: 10pt;
    }
    
    /* Print-specific behavior */
    @media print {
      body {
        padding: 0;
      }
      .page-break {
        page-break-before: always;
      }
      .question {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  ${filteredHtmlContent}
</body>
</html>
  `;

  // Create a blob with the HTML content
  const blob = new Blob([pdfHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  // Create a temp download link and trigger it
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}_to_pdf.html`;
  document.body.appendChild(a);
  a.click();
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Generate an answer key DOCX file
 * @param htmlContent HTML string to convert to DOCX
 * @param fileName Base filename (without extension)
 */
export function generateAnswerKeyDOCX(htmlContent: string, fileName: string): void {
  // Filter out the "Circle the correct option clearly" text and enhance code formatting
  let filteredHtmlContent = htmlContent.replace(/<li>Circle the correct option clearly.<\/li>/g, '');
  
  // Enhance code formatting for better display
  filteredHtmlContent = filteredHtmlContent
    // Make sure pre tags use monospace font and proper styling
    .replace(/<pre/g, '<pre style="font-family: Consolas, Monaco, \'Courier New\', monospace; font-size: 10pt; background-color: #f8f8f8; padding: 8px; border: 1px solid #e1e1e8; border-radius: 3px; white-space: pre-wrap; margin: 10px 0; overflow-x: auto;"')
    // Make sure code tags use monospace font
    .replace(/<code/g, '<code style="font-family: Consolas, Monaco, \'Courier New\', monospace; font-size: 10pt; background-color: #f8f8f8; padding: 2px 4px; border-radius: 3px;"');
  
  const answerKeyFileName = `${fileName}_Answer_Key`;
  generateDOCX(filteredHtmlContent, answerKeyFileName);
}

/**
 * Generate an answer key PDF file
 * @param htmlContent HTML string to convert to PDF
 * @param fileName Base filename (without extension)
 */
export function generateAnswerKeyPDF(htmlContent: string, fileName: string): void {
  // Filter out the "Circle the correct option clearly" text and enhance code formatting
  let filteredHtmlContent = htmlContent.replace(/<li>Circle the correct option clearly.<\/li>/g, '');
  
  // Enhance code formatting for better display
  filteredHtmlContent = filteredHtmlContent
    // Make sure pre tags use monospace font and proper styling
    .replace(/<pre/g, '<pre style="font-family: Consolas, Monaco, \'Courier New\', monospace; font-size: 10pt; background-color: #f8f8f8; padding: 8px; border: 1px solid #e1e1e8; border-radius: 3px; white-space: pre-wrap; margin: 10px 0; overflow-x: auto;"')
    // Make sure code tags use monospace font
    .replace(/<code/g, '<code style="font-family: Consolas, Monaco, \'Courier New\', monospace; font-size: 10pt; background-color: #f8f8f8; padding: 2px 4px; border-radius: 3px;"');
  
  const answerKeyFileName = `${fileName}_Answer_Key`;
  generatePDF(filteredHtmlContent, answerKeyFileName);
}

/**
 * Generate a custom multi-section paper document with proper page breaks
 * Handles MCQs, Short Questions, and Coding-Type Long Questions on separate pages
 * 
 * @param paperContent The paper content object 
 * @param format The output format ('docx' or 'pdf')
 * @param fileName The base filename without extension
 */
export function generateMultiSectionPaper(paperContent: any, format: 'docx' | 'pdf', fileName: string): void {
  // Generate the specialized HTML template for the multi-section paper
  let htmlContent = generateMultiSectionPaperHTML(paperContent);
  
  // Enhance code formatting for better display
  htmlContent = htmlContent
    // Make sure pre tags use monospace font and proper styling
    .replace(/<pre/g, '<pre style="font-family: Consolas, Monaco, \'Courier New\', monospace; font-size: 10pt; background-color: #f8f8f8; padding: 8px; border: 1px solid #e1e1e8; border-radius: 3px; white-space: pre-wrap; margin: 10px 0; overflow-x: auto;"')
    // Make sure code tags use monospace font
    .replace(/<code/g, '<code style="font-family: Consolas, Monaco, \'Courier New\', monospace; font-size: 10pt; background-color: #f8f8f8; padding: 2px 4px; border-radius: 3px;"');
  
  // Export in the requested format
  if (format === 'docx') {
    generateDOCX(htmlContent, fileName);
  } else {
    generatePDF(htmlContent, fileName);
  }
}