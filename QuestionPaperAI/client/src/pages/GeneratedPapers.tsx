import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import GeneratedPapersList from "@/components/papers/GeneratedPapersList";

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

export default function GeneratedPapers() {
  const { id } = useParams<{ id: string }>();
  const paperId = id ? parseInt(id) : 0;

  const { data: paper, isLoading } = useQuery<Paper>({
    queryKey: [`/api/papers/${paperId}`],
    enabled: !!paperId,
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

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

  if (!paper) {
    return (
      <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center mb-8">
          <Link href="/" className="flex items-center text-primary hover:text-primary-dark">
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
        <div className="text-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-6" />
          <h2 className="text-xl font-semibold text-gray-900">Paper not found</h2>
          <p className="mt-2 text-gray-500">The requested paper could not be found or you don't have permission to view it.</p>
          <Button asChild className="mt-6">
            <Link href="/">Return to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center mb-4">
        <Link href="/" className="flex items-center text-primary hover:text-primary-dark">
          <ArrowLeft className="h-5 w-5 mr-2" />
          <span>Back to Dashboard</span>
        </Link>
      </div>
      
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{paper.title}</h1>
          <p className="text-gray-600 mt-1">
            {paper.subject} • {paper.totalQuestions} questions • {paper.totalMarks} marks
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <Link href={`/papers/${paper.id}`}>
            <Button variant="outline" className="mr-2">View Paper Details</Button>
          </Link>
        </div>
      </div>

      <Card className="p-6 mb-6">
        <h2 className="text-lg font-medium mb-4">Paper Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Subject</h3>
            <p className="mt-1 text-base font-medium text-gray-900">{paper.subject}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Exam Type</h3>
            <p className="mt-1 text-base font-medium text-gray-900">{paper.templateType || "Standard"}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Instructor</h3>
            <p className="mt-1 text-base font-medium text-gray-900">{paper.instructorName || "Not specified"}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Exam Date</h3>
            <p className="mt-1 text-base font-medium text-gray-900">{formatDate(paper.examDate)}</p>
          </div>
        </div>
      </Card>

      {/* Generated Papers List */}
      <GeneratedPapersList paperId={paper.id} />
    </div>
  );
}