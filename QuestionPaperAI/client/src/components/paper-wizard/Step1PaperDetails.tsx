import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileInput } from "@/components/ui/file-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { uploadTemplate } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

const templateTypes = [
  "Standard Question Paper",
  "Multiple Choice Only (MCQ)",
  "Short and Long Answer",
  "Multi-Section Paper (MCQ + Short + Coding)",
  "Practical Examination",
  "Open Book Examination"
];

const paperTypes = [
  "Midterm",
  "Final Term",
  "Quiz",
  "Assignment",
  "Project",
  "Lab Test"
];

// DD/MM/YYYY date format regex pattern
const datePattern = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;

const formSchema = z.object({
  title: z.string().min(1, "Paper title is required"),
  universityName: z.string().min(1, "University name is required"),
  departmentName: z.string().min(1, "Department name is required"),
  programName: z.string().min(1, "Program name is required"),
  semesterName: z.string().min(1, "Semester name is required"),
  className: z.string().min(1, "Class name is required"),
  classGrade: z.string().default("N/A"),
  subject: z.string().min(1, "Subject is required"),
  instructorName: z.string().min(1, "Instructor name is required"),
  paperType: z.string().min(1, "Paper type is required"),
  examDate: z.string().regex(datePattern, "Date must be in DD/MM/YYYY format").optional().nullable(),
  templateType: z.string().min(1, "Template type is required"),
  customTemplate: z.any().optional(),
  timeAllowed: z.number().min(1, "Time allowed must be at least 1 minute").or(z.string().min(1).transform(val => parseInt(val, 10))),
  totalMarks: z.number().min(1, "Total marks must be at least 1").or(z.string().min(1).transform(val => parseInt(val, 10))),
  totalQuestions: z.number().min(1, "Total questions must be at least 1").or(z.string().min(1).transform(val => parseInt(val, 10)))
});

interface Step1PaperDetailsProps {
  paperData: any;
  onPaperDataChange: (data: any) => void;
  onNext: () => void;
}

export default function Step1PaperDetails({ paperData, onPaperDataChange, onNext }: Step1PaperDetailsProps) {
  const { toast } = useToast();
  
  // Fetch available subjects from the API
  const { data: availableSubjects = [], isLoading: isLoadingSubjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const response = await fetch("/api/subjects");
      if (!response.ok) {
        throw new Error("Failed to fetch subjects");
      }
      const data = await response.json();
      console.log("Available subjects:", data); // Debug log
      return data;
    }
  });
  
  // Fetch verified questions to get question counts by subject
  const { data: questions = [], isLoading: isLoadingQuestions } = useQuery({
    queryKey: ["questions", "verified"],
    queryFn: async () => {
      const response = await fetch("/api/questions?verified=true");
      if (!response.ok) {
        throw new Error("Failed to fetch verified questions");
      }
      const data = await response.json();
      console.log("Verified questions:", data); // Debug log
      return data;
    }
  });
  
  // Use the subjects from the API endpoint
  const subjects = Array.isArray(availableSubjects) && availableSubjects.length > 0
    ? availableSubjects
    : ["No verified questions available"];
    
  const isLoading = isLoadingSubjects || isLoadingQuestions;
    
  // Count verified questions by subject
  const questionCountBySubject: Record<string, number> = {};
  if (Array.isArray(questions)) {
    questions.forEach((q: any) => {
      const subject = q.subject as string;
      if (!questionCountBySubject[subject]) {
        questionCountBySubject[subject] = 0;
      }
      questionCountBySubject[subject]++;
    });
  }
  
  const { control, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: paperData.title || "",
      universityName: paperData.universityName || "",
      departmentName: paperData.departmentName || "",
      programName: paperData.programName || "",
      semesterName: paperData.semesterName || "",
      className: paperData.className || "",
      classGrade: paperData.classGrade || "N/A",
      subject: paperData.subject || (subjects.length > 0 ? subjects[0] : ""),
      instructorName: paperData.instructorName || "",
      paperType: paperData.paperType || "Midterm",
      examDate: paperData.examDate || "",
      templateType: paperData.templateType || "Standard Question Paper",
      customTemplate: null,
      timeAllowed: paperData.timeAllowed || 60,
      totalMarks: paperData.totalMarks || 100,
      totalQuestions: paperData.totalQuestions || 10
    }
  });
  
  // Update subject when verified questions are loaded
  useEffect(() => {
    if (subjects.length > 0 && !paperData.subject) {
      setValue('subject', subjects[0]);
    }
  }, [subjects, setValue, paperData.subject]);
  
  // Update totalQuestions based on available questions for selected subject
  useEffect(() => {
    const currentSubject = control._formValues.subject;
    if (currentSubject && questionCountBySubject[currentSubject]) {
      const availableQuestions = questionCountBySubject[currentSubject];
      // If current totalQuestions is greater than available, reduce it
      if (control._formValues.totalQuestions > availableQuestions) {
        setValue('totalQuestions', availableQuestions);
        
        toast({
          title: "Question Limit Adjusted",
          description: `Only ${availableQuestions} verified questions available for this subject. Total questions has been adjusted.`,
          variant: "destructive" 
        });
      }
    }
  }, [control._formValues.subject, setValue, questionCountBySubject]);

  const onSubmit = async (data: any) => {
    try {
      // Check if there are enough questions in the bank
      const currentSubject = data.subject;
      const requestedQuestions = data.totalQuestions;
      const availableQuestions = questionCountBySubject[currentSubject] || 0;
      
      if (availableQuestions === 0) {
        toast({
          title: "No Verified Questions",
          description: `There are no verified questions available for ${currentSubject}. Please verify questions in the Question Bank first.`,
          variant: "destructive"
        });
        return;
      }
      
      if (requestedQuestions > availableQuestions) {
        toast({
          title: "Not Enough Questions",
          description: `Only ${availableQuestions} verified questions available for ${currentSubject}, but ${requestedQuestions} were requested.`,
          variant: "destructive" 
        });
        return;
      }
      
      let customTemplatePath = paperData.customTemplatePath;
      
      // If there's a new file to upload
      if (data.customTemplate) {
        const uploadResult = await uploadTemplate(data.customTemplate);
        customTemplatePath = uploadResult.path;
      }
      
      onPaperDataChange({
        ...data,
        customTemplatePath
      });
      
      onNext();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload template. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="text-lg font-semibold mb-4">Institution Details</div>
      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
        <div className="sm:col-span-3">
          <Label htmlFor="universityName" className="block text-sm font-medium text-gray-700">
            University Name *
          </Label>
          <div className="mt-1">
            <Controller
              name="universityName"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="universityName"
                  placeholder="e.g., Islamia University Bahawalpur"
                  className={errors.universityName ? "border-red-500" : ""}
                />
              )}
            />
            {errors.universityName && (
              <p className="mt-1 text-sm text-red-500">{errors.universityName.message as string}</p>
            )}
          </div>
        </div>

        <div className="sm:col-span-3">
          <Label htmlFor="departmentName" className="block text-sm font-medium text-gray-700">
            Department Name *
          </Label>
          <div className="mt-1">
            <Controller
              name="departmentName"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="departmentName"
                  placeholder="e.g., Computer Science"
                  className={errors.departmentName ? "border-red-500" : ""}
                />
              )}
            />
            {errors.departmentName && (
              <p className="mt-1 text-sm text-red-500">{errors.departmentName.message as string}</p>
            )}
          </div>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="programName" className="block text-sm font-medium text-gray-700">
            Program Name *
          </Label>
          <div className="mt-1">
            <Controller
              name="programName"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="programName"
                  placeholder="e.g., BS Computer Science"
                  className={errors.programName ? "border-red-500" : ""}
                />
              )}
            />
            {errors.programName && (
              <p className="mt-1 text-sm text-red-500">{errors.programName.message as string}</p>
            )}
          </div>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="semesterName" className="block text-sm font-medium text-gray-700">
            Semester *
          </Label>
          <div className="mt-1">
            <Controller
              name="semesterName"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="semesterName"
                  placeholder="e.g., Fall 2025"
                  className={errors.semesterName ? "border-red-500" : ""}
                />
              )}
            />
            {errors.semesterName && (
              <p className="mt-1 text-sm text-red-500">{errors.semesterName.message as string}</p>
            )}
          </div>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="className" className="block text-sm font-medium text-gray-700">
            Class *
          </Label>
          <div className="mt-1">
            <Controller
              name="className"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="className"
                  placeholder="e.g., 2nd Semester"
                  className={errors.className ? "border-red-500" : ""}
                />
              )}
            />
            {errors.className && (
              <p className="mt-1 text-sm text-red-500">{errors.className.message as string}</p>
            )}
          </div>
        </div>
        
        {/* Hidden field for classGrade */}
        <div className="hidden">
          <Controller
            name="classGrade"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="classGrade"
                type="hidden"
              />
            )}
          />
        </div>
      </div>

      <div className="text-lg font-semibold mt-8 mb-4">Examination Details</div>
      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
        <div className="sm:col-span-3">
          <Label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Paper Title *
          </Label>
          <div className="mt-1">
            <Controller
              name="title"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="title"
                  placeholder="e.g., Midterm Examination"
                  className={errors.title ? "border-red-500" : ""}
                />
              )}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-500">{errors.title.message as string}</p>
            )}
          </div>
        </div>

        <div className="sm:col-span-3">
          <Label htmlFor="paperType" className="block text-sm font-medium text-gray-700">
            Paper Type *
          </Label>
          <div className="mt-1">
            <Controller
              name="paperType"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger id="paperType">
                    <SelectValue placeholder="Select paper type" />
                  </SelectTrigger>
                  <SelectContent>
                    {paperTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.paperType && (
              <p className="mt-1 text-sm text-red-500">{errors.paperType.message as string}</p>
            )}
          </div>
        </div>
        
        <div className="sm:col-span-3">
          <Label htmlFor="subject" className="block text-sm font-medium text-gray-700">
            Subject *
          </Label>
          <div className="mt-1">
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                <span className="text-sm text-gray-500">Loading available subjects...</span>
              </div>
            ) : (
              <Controller
                name="subject"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger id="subject">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.length > 0 ? (
                        subjects.map((subject: string) => (
                          <SelectItem key={subject} value={subject}>
                            {subject}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-subjects" disabled>
                          No verified questions available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
            {errors.subject && (
              <p className="mt-1 text-sm text-red-500">{errors.subject.message as string}</p>
            )}
            {subjects.length === 0 && !isLoading && (
              <p className="mt-1 text-sm text-amber-500">
                No verified questions found in question bank. Please verify questions in the Question Bank first.
              </p>
            )}
          </div>
        </div>

        <div className="sm:col-span-3">
          <Label htmlFor="instructorName" className="block text-sm font-medium text-gray-700">
            Instructor Name *
          </Label>
          <div className="mt-1">
            <Controller
              name="instructorName"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="instructorName"
                  placeholder="e.g., Dr. Jane Smith"
                  className={errors.instructorName ? "border-red-500" : ""}
                />
              )}
            />
            {errors.instructorName && (
              <p className="mt-1 text-sm text-red-500">{errors.instructorName.message as string}</p>
            )}
          </div>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="examDate" className="block text-sm font-medium text-gray-700">
            Exam Date (DD/MM/YYYY) *
          </Label>
          <div className="mt-1">
            <Controller
              name="examDate"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="examDate"
                  placeholder="e.g., 15/05/2025"
                  className={errors.examDate ? "border-red-500" : ""}
                />
              )}
            />
            {errors.examDate && (
              <p className="mt-1 text-sm text-red-500">{errors.examDate.message as string}</p>
            )}
          </div>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="timeAllowed" className="block text-sm font-medium text-gray-700">
            Time Allowed (minutes) *
          </Label>
          <div className="mt-1">
            <Controller
              name="timeAllowed"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="timeAllowed"
                  type="number"
                  min="1"
                  placeholder="e.g., 60"
                  className={errors.timeAllowed ? "border-red-500" : ""}
                />
              )}
            />
            {errors.timeAllowed && (
              <p className="mt-1 text-sm text-red-500">{errors.timeAllowed.message as string}</p>
            )}
          </div>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="totalMarks" className="block text-sm font-medium text-gray-700">
            Max Marks *
          </Label>
          <div className="mt-1">
            <Controller
              name="totalMarks"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="totalMarks"
                  type="number"
                  min="1"
                  placeholder="e.g., 100"
                  className={errors.totalMarks ? "border-red-500" : ""}
                />
              )}
            />
            {errors.totalMarks && (
              <p className="mt-1 text-sm text-red-500">{errors.totalMarks.message as string}</p>
            )}
          </div>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="templateType" className="block text-sm font-medium text-gray-700">
            Template Style *
          </Label>
          <div className="mt-1">
            <Controller
              name="templateType"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger id="templateType">
                    <SelectValue placeholder="Select template style" />
                  </SelectTrigger>
                  <SelectContent>
                    {templateTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.templateType && (
              <p className="mt-1 text-sm text-red-500">{errors.templateType.message as string}</p>
            )}
            <p className="mt-1 text-sm text-amber-500">
              All papers will be generated using verified questions from the question bank only.
            </p>
          </div>
        </div>

        <div className="sm:col-span-4">
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            Upload Custom Template (Optional)
          </Label>
          <Controller
            name="customTemplate"
            control={control}
            render={({ field: { value, onChange, ...field } }) => (
              <FileInput
                {...field}
                id="customTemplate"
                accept=".doc,.docx,.pdf"
                maxSize={10 * 1024 * 1024} // 10MB
                placeholder="DOC, DOCX, or PDF up to 10MB"
                onValueChange={onChange}
              />
            )}
          />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="totalQuestions" className="block text-sm font-medium text-gray-700">
            Total Questions *
          </Label>
          <div className="mt-1">
            <Controller
              name="totalQuestions"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="totalQuestions"
                  type="number"
                  min="1"
                  placeholder="e.g., 10"
                  className={errors.totalQuestions ? "border-red-500" : ""}
                />
              )}
            />
            {errors.totalQuestions && (
              <p className="mt-1 text-sm text-red-500">{errors.totalQuestions.message as string}</p>
            )}
            {control._formValues.subject && questionCountBySubject[control._formValues.subject as string] && (
              <p className="mt-1 text-sm text-amber-500">
                Available verified questions: {questionCountBySubject[control._formValues.subject as string]}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="pt-5 flex justify-end">
        <Button type="submit">
          Next: Select Students
        </Button>
      </div>
    </form>
  );
}
