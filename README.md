# Question Paper Generator

An AI-powered intelligent assessment platform that streamlines test paper generation and student management through advanced technological integration and adaptive learning experiences.

## Features

- **Intelligent Paper Generation**: Create unique test papers for each student
- **Student Management**: Upload and manage student information
- **Question Bank**: Store and verify questions before including them in papers
- **Multiple Question Types**: Support for MCQs, short answers, long answers, and problem-solving questions
- **AI-Assisted Question Generation**: Generate questions based on topics
- **Document Export**: Download papers in DOCX and PDF formats
- **Answer Keys**: Generate answer keys for each student's paper

## Screenshots

Below are screenshots demonstrating the main features and workflow of QuestionPaperAI:

### Dashboard
![Dashboard](screenshots/dashboard.png)
*The main dashboard providing an overview of the platform.*

### Paper Creation Wizard
![Paper Wizard Step 1](screenshots/paper-wizard-step1.png)
*Step 1: Enter paper details (title, subject, etc.).*

![Paper Wizard Step 2](screenshots/paper-wizard-step2.png)
*Step 2: Add topics and configure question distribution.*

### Question Generation
![Question Generation](screenshots/question-generation.png)
*AI-assisted question generation interface.*

### Student Management
![Student Management](screenshots/student-management.png)
*Upload and manage student information.*

### Question Bank
![Question Bank](screenshots/question-bank.png)
*Browse and verify questions before including them in papers.*

### Download Paper
![Download Paper](screenshots/download-paper.png)
*Export generated papers in DOCX or PDF format.*

## Tech Stack

- **Frontend**: React.js with TypeScript
- **Backend**: Express.js
- **Database**: PostgreSQL (Neon)
- **AI Integration**: OpenAI
- **Build System**: Vite
- **Styling**: Tailwind CSS with shadcn/ui components

## Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL database

### Installation

1. Clone the repository
   ```
   git clone https://github.com/your-username/question-paper-generator.git
   cd question-paper-generator
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Set up environment variables
   Create a `.env` file in the root directory and add:
   ```
   DB_URL=your_postgresql_connection_string
   OPENAI_API_KEY=your_openai_api_key
   ```

4. Start the development server
   ```
   npm run dev
   ```

## Usage

1. **Create a New Paper**: Define paper details including title, subject, and question distribution
2. **Add Topics**: Specify topics to cover in the paper
3. **Select Students**: Choose which students will receive the paper
4. **Generate Papers**: Create unique papers for each selected student
5. **Download**: Export papers in DOCX or PDF format

## License

This project is licensed under the MIT License - see the LICENSE file for details.