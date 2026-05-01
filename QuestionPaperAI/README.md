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

## Planned Features & Roadmap

### Analytics & Insights
- [ ] Student performance analytics (track scores, progress over time)
- [ ] Question/item analysis (difficulty, discrimination)
- [ ] Exportable reports for teachers/admins

### Collaboration & Workflow
- [ ] Multi-teacher collaboration (shared question banks, co-authoring papers)
- [ ] Peer review/approval workflow for generated papers/questions

### User Experience
- [ ] Role-based dashboards (admin, teacher, student)
- [ ] Student self-serve portal (practice, view results, feedback)
- [ ] Notification system (email/SMS/app notifications)

### Question Bank Improvements
- [ ] Tagging, categorization, and advanced search for questions
- [ ] Versioning and history for questions
- [ ] Import/export question bank (CSV/Excel)

### Exam Management
- [ ] Exam scheduling and calendar integration
- [ ] Timed online assessments with auto-submit
- [ ] Randomization of questions/options for integrity

### Security & Compliance
- [ ] Role-based access control (RBAC)
- [ ] Audit logs for sensitive actions
- [ ] Data privacy and compliance (GDPR, FERPA)

### Integrations
- [ ] LMS integration (Google Classroom, Moodle, etc.)
- [ ] Public API for external access

### Accessibility & Customization
- [ ] Accessibility improvements (screen reader, keyboard navigation)
- [ ] Custom branding/themes for institutions

### Automation & AI
- [ ] Automated grading for subjective answers (AI-powered)
- [ ] Adaptive question generation based on student performance
- [ ] Plagiarism detection for answer scripts

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