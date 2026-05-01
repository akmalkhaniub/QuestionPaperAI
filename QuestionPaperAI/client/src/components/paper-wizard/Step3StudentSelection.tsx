import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Upload } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Student } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { FileInput } from "@/components/ui/file-input";
import { uploadStudents } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface Step3StudentSelectionProps {
  selectedStudentIds: number[];
  onStudentSelection: (studentIds: number[]) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function Step3StudentSelection({
  selectedStudentIds,
  onStudentSelection,
  onNext,
  onPrev
}: Step3StudentSelectionProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const { toast } = useToast();

  const { data: students, isLoading, error } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });
  
  // Debug
  useEffect(() => {
    if (error) {
      console.error("Error fetching students:", error);
    }
    if (students) {
      console.log("Fetched students:", students);
    }
  }, [students, error]);

  const filteredStudents = students?.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleStudent = (studentId: number) => {
    if (selectedStudentIds.includes(studentId)) {
      onStudentSelection(selectedStudentIds.filter(id => id !== studentId));
    } else {
      onStudentSelection([...selectedStudentIds, studentId]);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && students) {
      onStudentSelection(students.map(student => student.id));
    } else {
      onStudentSelection([]);
    }
  };
  
  const handleUploadStudents = async () => {
    if (!uploadFile) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to upload",
        variant: "destructive"
      });
      return;
    }
    
    try {
      await uploadStudents(uploadFile);
      toast({
        title: "Students uploaded",
        description: "Student list has been successfully uploaded",
      });
      
      // Refetch students
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      setShowUploadForm(false);
      setUploadFile(null);
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload student list. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedStudentIds.length === 0) {
      toast({
        title: "No students selected",
        description: "Please select at least one student.",
        variant: "destructive"
      });
      return;
    }
    
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg leading-6 font-medium text-gray-900">Select Students</h3>
        <p className="mt-1 text-sm text-gray-500">
          Choose students who will receive unique question papers
        </p>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-4 sm:px-6 border-b border-gray-200">
          <div className="flex justify-between items-center flex-wrap sm:flex-nowrap">
            <div>
              <h4 className="text-base font-medium text-gray-900">Student List</h4>
            </div>
            <div className="flex-shrink-0 flex items-center space-x-2">
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  type="text"
                  name="search-students"
                  id="search-students"
                  className="pl-10"
                  placeholder="Search students"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {!showUploadForm ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUploadForm(true)}
                >
                  <Upload className="h-4 w-4 mr-2" /> Upload List
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUploadForm(false)}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {showUploadForm && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h5 className="text-sm font-medium text-gray-900 mb-2">Upload Student List (CSV)</h5>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <FileInput
                  id="student-csv"
                  accept=".csv"
                  placeholder="Upload a CSV file with student data"
                  onValueChange={setUploadFile}
                />
              </div>
              <Button 
                type="button" 
                onClick={handleUploadStudents}
                disabled={!uploadFile}
              >
                Upload
              </Button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              CSV format: Name, Roll Number, Class/Section
            </p>
          </div>
        )}
        
        <ul className="divide-y divide-gray-200 max-h-80 overflow-y-auto">
          {isLoading ? (
            // Loading skeletons
            Array(5).fill(0).map((_, i) => (
              <li key={i}>
                <div className="px-4 py-4 flex items-center sm:px-6">
                  <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                    <div className="flex items-center">
                      <Skeleton className="h-4 w-4 mr-3" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                    <div className="mt-0 flex-shrink-0 sm:mt-0 sm:ml-5">
                      <Skeleton className="h-5 w-20" />
                    </div>
                  </div>
                </div>
              </li>
            ))
          ) : filteredStudents && filteredStudents.length > 0 ? (
            filteredStudents.map((student) => (
              <li key={student.id}>
                <div className="px-4 py-4 flex items-center sm:px-6">
                  <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                    <div className="flex items-center">
                      <Checkbox
                        id={`student-${student.id}`}
                        checked={selectedStudentIds.includes(student.id)}
                        onCheckedChange={() => handleToggleStudent(student.id)}
                      />
                      <Label
                        htmlFor={`student-${student.id}`}
                        className="ml-3 block text-sm font-medium text-gray-700"
                      >
                        {student.name}
                      </Label>
                    </div>
                    <div className="mt-0 flex-shrink-0 sm:mt-0 sm:ml-5">
                      <div className="flex overflow-hidden">
                        <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          Roll No: {student.rollNumber}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))
          ) : (
            <li className="px-4 py-6 text-center text-gray-500">
              {searchTerm ? "No students found matching search criteria" : "No students available"}
            </li>
          )}
        </ul>
        <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Checkbox
                id="select-all"
                checked={
                  students && 
                  students.length > 0 && 
                  selectedStudentIds.length === students.length
                }
                onCheckedChange={handleSelectAll}
                disabled={!students || students.length === 0}
              />
              <Label htmlFor="select-all" className="ml-2 text-sm text-gray-700">
                Select All
              </Label>
            </div>
            <span className="text-sm text-gray-500">
              {selectedStudentIds.length} students selected
            </span>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-md">
        <h4 className="text-base font-medium text-gray-900 mb-2">Question Bank Information</h4>
        <p className="text-sm text-gray-500">
          Papers will be generated using only verified questions from the question bank.
          Each student will receive a unique paper with randomized questions and answer options.
        </p>
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onPrev}>
          Previous
        </Button>
        <Button type="submit">
          Generate Papers
        </Button>
      </div>
    </form>
  );
}
