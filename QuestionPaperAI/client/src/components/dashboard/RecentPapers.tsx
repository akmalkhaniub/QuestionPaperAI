import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { Calendar, Users, Trash2, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/date-utils";

interface Paper {
  id: number;
  title: string;
  subject: string;
  classGrade: string;
  status: string;
  createdAt: string;
  totalMarks: number;
  totalQuestions: number;
}

export default function RecentPapers() {
  const { data: papers, isLoading } = useQuery<Paper[]>({
    queryKey: ["/api/papers"],
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [paperToDelete, setPaperToDelete] = useState<Paper | null>(null);
  const itemsPerPage = 5;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const deletePaperMutation = useMutation({
    mutationFn: async (paperId: number) => {
      return apiRequest(
        "DELETE",
        `/api/papers/${paperId}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/papers"] });
      toast({
        title: "Paper deleted",
        description: "The question paper has been deleted successfully.",
      });
      setPaperToDelete(null);
    },
    onError: (error) => {
      console.error("Failed to delete paper:", error);
      toast({
        title: "Failed to delete paper",
        description: "There was a problem deleting the question paper.",
        variant: "destructive",
      });
    },
  });

  // Using the centralized formatDate utility from date-utils.ts
  
  const handleDeletePaper = (paper: Paper, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPaperToDelete(paper);
  };
  
  const confirmDelete = () => {
    if (paperToDelete) {
      deletePaperMutation.mutate(paperToDelete.id);
    }
  };

  if (isLoading) {
    return (
      <div className="mt-8 px-4 sm:px-6">
        <h2 className="text-lg font-medium text-gray-900">Recent Question Papers</h2>
        <div className="mt-4 bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {[1, 2, 3].map((i) => (
              <li key={i}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="mt-2 h-4 w-32 sm:mt-0 sm:ml-6" />
                    </div>
                    <Skeleton className="mt-2 h-4 w-24 sm:mt-0" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (!papers || papers.length === 0) {
    return (
      <div className="mt-8 px-4 sm:px-6">
        <h2 className="text-lg font-medium text-gray-900">Recent Question Papers</h2>
        <Card className="mt-4 p-6 text-center text-gray-500">
          No question papers found. Create your first paper to get started.
        </Card>
      </div>
    );
  }
  
  // Pagination logic
  const totalPages = Math.ceil(papers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPapers = papers.slice(indexOfFirstItem, indexOfLastItem);
  
  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };
  
  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  return (
    <>
      <div className="mt-8 px-4 sm:px-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Recent Question Papers</h2>
          {totalPages > 1 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex space-x-1">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
        <div className="mt-4 bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {currentPapers.map((paper) => (
              <li key={paper.id}>
                <Link href={`/papers/${paper.id}`}>
                  <div className="block hover:bg-gray-50 cursor-pointer">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-primary truncate">
                          {paper.title}
                        </p>
                        <div className="ml-2 flex space-x-2 items-center">
                          <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            paper.status === 'Generated' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {paper.status}
                          </p>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.location.href = `/papers/${paper.id}/generated`;
                            }}
                            title="View Generated Papers"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => handleDeletePaper(paper, e)}
                            title="Delete Paper"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            <Users className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                            {paper.classGrade}
                          </p>
                          <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                            <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                            Generated on {formatDate(paper.createdAt)}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <span className="mr-1">{paper.totalQuestions} questions, {paper.totalMarks} marks</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Pagination for mobile - shown at bottom on smaller screens */}
        {totalPages > 1 && (
          <div className="mt-4 flex justify-center sm:hidden">
            <div className="flex space-x-2 items-center">
              <Button 
                variant="outline" 
                size="sm"
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Enhanced Delete Confirmation Dialog */}
      <AlertDialog open={paperToDelete !== null} onOpenChange={() => setPaperToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question Paper</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="font-medium text-red-600">
                Warning: This action cannot be undone.
              </p>
              <p>
                You are about to delete the question paper "<span className="font-medium">{paperToDelete?.title}</span>".
              </p>
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-md mt-2 text-sm">
                <p className="font-medium mb-1">The following related data will also be deleted:</p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li>All generated student papers</li>
                  <li>Topic configurations</li>
                  <li>Question selections and assignments</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deletePaperMutation.isPending}
            >
              {deletePaperMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Deleting...</span>
                </div>
              ) : "Delete Paper"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
