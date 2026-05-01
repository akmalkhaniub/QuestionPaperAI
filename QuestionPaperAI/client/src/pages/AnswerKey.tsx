import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MCQAnswerKeyPreview } from "@/components/paper-wizard/MCQAnswerKeyPreview";

interface Paper {
  id: number;
  title: string;
  subject: string;
  classGrade: string;
  status: string;
  createdAt: string;
  totalMarks: number;
  totalQuestions: number;
  universityName?: string;
  departmentName?: string;
  programName?: string;
  semesterName?: string;
  instructorName?: string;
  examDate?: string;
  templateType?: string;
  timeAllowed?: number;
}

export default function AnswerKey() {
  const { id } = useParams<{ id: string }>();
  const paperId = id ? parseInt(id) : 0;

  const { data: paper, isLoading } = useQuery<Paper>({
    queryKey: [`/api/papers/${paperId}`],
    enabled: !!paperId,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center mb-8">
          <Link href="/" className="flex items-center text-primary hover:text-primary-dark">
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
        <Skeleton className="h-8 w-1/2 mb-4" />
        <Skeleton className="h-4 w-1/3 mb-6" />
        <Card className="p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-[400px] w-full" />
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center mb-8">
        <Link href={`/papers/${paperId}/generated`} className="flex items-center text-primary hover:text-primary-dark">
          <ArrowLeft className="h-5 w-5 mr-2" />
          <span>Back to Generated Papers</span>
        </Link>
      </div>
      <h2 className="text-2xl font-semibold mb-4">Paper Answer Key</h2>
      <Card className="p-6">
        {/* MCQAnswerKeyPreview expects paperData, so pass the paper object or its questions/sections as needed */}
        <MCQAnswerKeyPreview isOpen={true} paperData={paper} />
      </Card>
    </div>
  );
}
