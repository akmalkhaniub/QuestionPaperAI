import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Upload, Plus, Trash } from "lucide-react";
import { Student, insertStudentSchema } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { FileInput } from "@/components/ui/file-input";
import { uploadStudents } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Label } from "@/components/ui/label";

export default function Students() {
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { toast } = useToast();

  const { data: students, isLoading, refetch } = useQuery<Student[]>({
    queryKey: ["/api/students"],
    staleTime: 0, // Don't cache this data
    refetchOnWindowFocus: true, // Refresh when window gets focus
  });

  const filteredStudents = students?.filter(
    (student) =>
      (student.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.rollNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.classSection || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Form schema for adding new student
  const formSchema = z.object({
    rollNumber: z.string().min(1, "Roll number is required"),
    name: z.string().min(1, "Name is required"),
    classSection: z.string().min(1, "Class/Section is required"),
  });

  // Form for adding new student
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rollNumber: "",
      name: "",
      classSection: "",
    },
  });

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      // Add userId=1 to the form data
      const studentData = { ...values, userId: 1 };
      
      await apiRequest(
        "POST",
        "/api/students",
        studentData
      );
      
      toast({
        title: "Student added",
        description: "New student has been successfully added",
      });
      
      // Refetch students
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      refetch(); // Explicitly refetch data
      setShowAddDialog(false);
      form.reset();
    } catch (error) {
      toast({
        title: "Failed to add student",
        description: "An error occurred while adding the student",
        variant: "destructive",
      });
    }
  };

  // Handle student deletion
  const handleDeleteStudent = async (studentId: number) => {
    try {
      await apiRequest(
        "DELETE",
        `/api/students/${studentId}`
      );
      
      toast({
        title: "Student deleted",
        description: "Student has been successfully removed",
      });
      
      // Refetch students
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      refetch(); // Explicitly refetch data
    } catch (error) {
      toast({
        title: "Failed to delete student",
        description: "An error occurred while deleting the student",
        variant: "destructive",
      });
    }
  };

  const handleUploadStudents = async () => {
    if (!uploadFile) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to upload",
        variant: "destructive",
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
      refetch(); // Explicitly refetch data
      setUploadFile(null);
    } catch (error) {
      toast({
        title: "Upload failed",
        description:
          "Failed to upload student list. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="px-4 py-5 sm:px-6">
        <h1 className="text-2xl font-semibold text-gray-900">Students</h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Manage your student lists for generating question papers.
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Upload Students</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <FileInput
                  id="student-csv"
                  accept=".csv"
                  placeholder="Upload a CSV file with student data"
                  onValueChange={setUploadFile}
                />
                <p className="mt-2 text-xs text-gray-500">
                  CSV format: Roll Number, Name, Class/Section
                </p>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleUploadStudents}
                  disabled={!uploadFile}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Student List
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Student List</CardTitle>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search students..."
                    className="pl-8 w-[250px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Student
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Roll Number</TableHead>
                  <TableHead>Class/Section</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  // Loading skeletons
                  Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Skeleton className="h-8 w-16 ml-auto" />
                        </TableCell>
                      </TableRow>
                    ))
                ) : filteredStudents && filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        {student.name}
                      </TableCell>
                      <TableCell>{student.rollNumber}</TableCell>
                      <TableCell>{student.classSection || "N/A"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteStudent(student.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6">
                      {searchTerm
                        ? "No students found matching your search"
                        : "No students available. Upload a student list to get started."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      
      {/* Add Student Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
            <DialogDescription>
              Enter the student details below. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="rollNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Roll Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. F24BDATS1M02024" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="classSection"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class/Section</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 10-A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Student</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
