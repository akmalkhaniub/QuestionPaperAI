# 📝 QuestionPaperAI — Intelligent Assessment Platform

<p align="center">
  <img src="https://img.shields.io/badge/React-18.0%2B-blue?style=for-the-badge&logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-Strict-blue?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js / Express">
  <img src="https://img.shields.io/badge/OpenAI-GPT--4-412991?style=for-the-badge&logo=openai&logoColor=white" alt="OpenAI">
  <img src="https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Vite-Supported-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License MIT">
</p>

An AI-powered intelligent assessment platform that streamlines unique test paper generation and student management through adaptive templates, structured question banks, and automated grading rubrics.

---

## 🎨 System Architecture

```mermaid
graph TD
    classDef client fill:#f3e8ff,stroke:#7c3aed,stroke-width:2px,color:#5b21b6;
    classDef backend fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#0369a1;
    classDef db fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#166534;
    classDef ai fill:#fee2e2,stroke:#dc2626,stroke-width:2px,color:#991b1b;

    UI["💻 React Dashboard (Vite / TypeScript)"] -->|HTTP API| Server["Backend API (Express.js)"]
    
    Server <-->|SQL Queries| Postgres[("Neon PostgreSQL Database")]
    Server -->|Generate Questions| OpenAI["OpenAI API (GPT-4)"]
    
    Server -->|Export Files| DocBuilder["DOCX & PDF Renderer"]

    class UI client;
    class Server,DocBuilder backend;
    class Postgres db;
    class OpenAI ai;
```

---

## ✨ Key Features

*   **Intelligent Paper Generation**: Generates unique, randomized test papers for individual students, preventing plagiarism while maintaining uniform difficulty settings.
*   **Structured Question Bank**: Search, tag, and verify questions (e.g. MCQs, short answers, long essays, math problems) before importing them into live exams.
*   **AI-Assisted Drafting**: Instantly drafts high-quality questions based on specified topics, grade levels, and difficulty settings.
*   **Student Ingestion & Management**: Batch upload student directories, track exam history, and generate customized answer sheets.
*   **Multi-Format Document Export**: Beautifully renders and downloads exam papers and answer keys directly into DOCX and print-ready PDF formats.

---

## 📸 Platform Walkthrough

Below are screenshots demonstrating the main features and workflow of QuestionPaperAI:

### 1. Dashboard Overview
![Dashboard](screenshots/dashboard.png)
*The centralized control center mapping active classes, students, and generated assessments.*

### 2. Paper Creation Wizard
![Paper Wizard Step 1](screenshots/paper-wizard-step1.png)
*Step 1: Define paper metadata, subject rules, and grade levels.*

![Paper Wizard Step 2](screenshots/paper-wizard-step2.png)
*Step 2: Add specific learning objectives and configure topic-wise question distribution.*

### 3. AI Question Generator
![Question Generation](screenshots/question-generation.png)
*OpenAI assistant drafting custom questions aligned with core syllabus materials.*

### 4. Question Bank
![Question Bank](screenshots/question-bank.png)
*Audit and approve generated questions prior to committing them to final exams.*

---

## 🛠 Tech Stack

*   **Frontend**: React.js with TypeScript · Vite · Tailwind CSS · shadcn/ui components
*   **Backend**: Node.js (Express.js) · Pydantic validation patterns
*   **Database**: Neon Serverless PostgreSQL (SQLAlchemy / pgvector supportable)
*   **Document Generation**: docx-builder · pdfkit
*   **AI Integration**: OpenAI (GPT-4 API)

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18+)
- **PostgreSQL** database instance (Neon / Local)

### 1. Installation
Clone the repository:
```bash
git clone https://github.com/akmalkhaniub/QuestionPaperAI.git
cd QuestionPaperAI
```

Install workspace dependencies:
```bash
npm install
```

### 2. Configure Environment
Create a `.env` file in the root directory:
```env
DB_URL=postgresql://user:password@neon-db-url/question_paper_ai
OPENAI_API_KEY=sk-your-openai-api-key
PORT=5000
```

### 3. Run Development Server
```bash
npm run dev
```
Open `http://localhost:3000` to view the frontend interface.

---

## 🏁 License & Contact

Distributed under the MIT License. See `LICENSE` for more information.

*Project Lead: Akmal Khan*  
*Email: akmal.shahbaz@iub.edu.pk*  
*Repository Link: [https://github.com/akmalkhaniub/QuestionPaperAI](https://github.com/akmalkhaniub/QuestionPaperAI)*