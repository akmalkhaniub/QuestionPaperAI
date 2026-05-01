CREATE TABLE "generated_papers" (
	"id" serial PRIMARY KEY NOT NULL,
	"paper_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"content" jsonb,
	"file_path" text,
	"generated_at" timestamp DEFAULT now(),
	"status" text DEFAULT 'Pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paper_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"paper_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"student_id" integer,
	"question_number" integer NOT NULL,
	"marks" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "papers" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"university_name" text,
	"department_name" text,
	"program_name" text,
	"semester_name" text,
	"class_name" text,
	"class_grade" text DEFAULT 'N/A' NOT NULL,
	"subject" text NOT NULL,
	"instructor_name" text,
	"paper_type" text,
	"exam_date" timestamp,
	"template_type" text,
	"custom_template_path" text,
	"time_allowed" integer,
	"total_marks" integer,
	"total_questions" integer,
	"user_id" integer,
	"created_at" timestamp DEFAULT now(),
	"status" text DEFAULT 'Draft' NOT NULL,
	"variation_level" text DEFAULT 'Medium' NOT NULL,
	"ai_model" text DEFAULT 'GPT-4' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_bank" (
	"id" serial PRIMARY KEY NOT NULL,
	"subject" text NOT NULL,
	"topic" text NOT NULL,
	"subtopic" text,
	"question_type" text NOT NULL,
	"difficulty_level" text NOT NULL,
	"question_text" text NOT NULL,
	"options" jsonb,
	"correct_answer" text,
	"explanation" text,
	"marks_value" integer DEFAULT 1 NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"tags" text[]
);
--> statement-breakpoint
CREATE TABLE "question_topics" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic_name" text NOT NULL,
	"question_type" text NOT NULL,
	"number_of_questions" integer NOT NULL,
	"marks_per_question" integer NOT NULL,
	"difficulty_level" text NOT NULL,
	"paper_id" integer
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"roll_number" text NOT NULL,
	"class_section" text,
	"user_id" integer
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "generated_papers" ADD CONSTRAINT "generated_papers_paper_id_papers_id_fk" FOREIGN KEY ("paper_id") REFERENCES "public"."papers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_papers" ADD CONSTRAINT "generated_papers_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_questions" ADD CONSTRAINT "paper_questions_paper_id_papers_id_fk" FOREIGN KEY ("paper_id") REFERENCES "public"."papers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_questions" ADD CONSTRAINT "paper_questions_question_id_question_bank_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question_bank"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_questions" ADD CONSTRAINT "paper_questions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "papers" ADD CONSTRAINT "papers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_bank" ADD CONSTRAINT "question_bank_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_topics" ADD CONSTRAINT "question_topics_paper_id_papers_id_fk" FOREIGN KEY ("paper_id") REFERENCES "public"."papers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;