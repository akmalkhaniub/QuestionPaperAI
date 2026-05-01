import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Upload, 
  Plus, 
  Trash, 
  FileText, 
  Download, 
  Copy,
  Filter
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { FileInput } from "@/components/ui/file-input";
import { uploadTemplate } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Template {
  id: number;
  name: string;
  type: string;
  subject: string;
  filePath: string;
  createdAt: string;
}

// Mock templates data until API is connected
const mockTemplates: Template[] = [
  {
    id: 1,
    name: "Standard Question Paper",
    type: "Default",
    subject: "All",
    filePath: "/templates/standard.docx",
    createdAt: "2023-08-15"
  },
  {
    id: 2,
    name: "Multiple Choice Format",
    type: "Multiple Choice Only",
    subject: "Physics",
    filePath: "/templates/physics_mcq.docx",
    createdAt: "2023-09-22"
  },
  {
    id: 3,
    name: "Short and Long Answer Format",
    type: "Short and Long Answer",
    subject: "Mathematics",
    filePath: "/templates/math_mixed.docx",
    createdAt: "2023-10-01"
  }
];

export default function Templates() {
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState("existing");
  const [templateName, setTemplateName] = useState("");
  const [templateType, setTemplateType] = useState("Standard Question Paper");
  const [templateSubject, setTemplateSubject] = useState("All");
  const { toast } = useToast();

  // This would be replaced with an actual API query
  const { data: templates, isLoading } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
    initialData: mockTemplates,
  });

  const filteredTemplates = templates?.filter(
    template =>
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUploadTemplate = async () => {
    if (!uploadFile) {
      toast({
        title: "No file selected",
        description: "Please select a document file to upload",
        variant: "destructive",
      });
      return;
    }

    if (!templateName.trim()) {
      toast({
        title: "Template name required",
        description: "Please provide a name for your template",
        variant: "destructive",
      });
      return;
    }

    try {
      await uploadTemplate(uploadFile);
      toast({
        title: "Template uploaded",
        description: "Your template has been successfully uploaded",
      });
      
      // Reset form
      setUploadFile(null);
      setTemplateName("");
      setTemplateType("Standard Question Paper");
      setTemplateSubject("All");
      
      // Switch to existing templates tab
      setActiveTab("existing");
      
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload template. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (id: number) => {
    toast({
      title: "Template deleted",
      description: "The template has been successfully removed",
    });
  };

  const handleDuplicate = (id: number) => {
    toast({
      title: "Template duplicated",
      description: "A copy of the template has been created",
    });
  };

  const handleDownload = (filePath: string) => {
    toast({
      title: "Downloading template",
      description: "Your template is being downloaded",
    });
  };

  const templateTypes = [
    "Standard Question Paper",
    "Multiple Choice Only",
    "Short and Long Answer",
    "Practical Examination",
    "Open Book Examination"
  ];

  const subjects = [
    "All",
    "Physics",
    "Chemistry",
    "Mathematics",
    "Biology",
    "History",
    "Geography",
    "Literature",
    "Computer Science"
  ];

  return (
    <>
      <div className="px-4 py-5 sm:px-6">
        <h1 className="text-2xl font-semibold text-gray-900">Paper Templates</h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Manage templates for different types of question papers.
        </p>
      </div>

      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">Existing Templates</TabsTrigger>
            <TabsTrigger value="upload">Upload Template</TabsTrigger>
          </TabsList>
          
          <TabsContent value="existing" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Template Library</CardTitle>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Search templates..."
                        className="pl-8 w-[250px]"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <Button onClick={() => setActiveTab("upload")}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Template
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Template Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      // Loading skeletons
                      Array(3)
                        .fill(0)
                        .map((_, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <Skeleton className="h-4 w-40" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-32" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-24" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-24" />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Skeleton className="h-8 w-8" />
                                <Skeleton className="h-8 w-8" />
                                <Skeleton className="h-8 w-8" />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                    ) : filteredTemplates && filteredTemplates.length > 0 ? (
                      filteredTemplates.map((template) => (
                        <TableRow key={template.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 mr-2 text-primary" />
                              {template.name}
                            </div>
                          </TableCell>
                          <TableCell>{template.type}</TableCell>
                          <TableCell>{template.subject}</TableCell>
                          <TableCell>{new Date(template.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDownload(template.filePath)}
                                title="Download template"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDuplicate(template.id)}
                                title="Duplicate template"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(template.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                title="Delete template"
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6">
                          {searchTerm
                            ? "No templates found matching your search"
                            : "No templates available. Upload a template to get started."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="upload" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload New Template</CardTitle>
                <CardDescription>
                  Upload a document file (DOC, DOCX, or PDF) to use as a template for your question papers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="template-name">Template Name</Label>
                      <Input 
                        id="template-name" 
                        placeholder="e.g., Physics Multiple Choice Template" 
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="template-type">Template Type</Label>
                        <Select
                          value={templateType}
                          onValueChange={setTemplateType}
                        >
                          <SelectTrigger id="template-type" className="mt-1">
                            <SelectValue placeholder="Select template type" />
                          </SelectTrigger>
                          <SelectContent>
                            {templateTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="template-subject">Subject</Label>
                        <Select
                          value={templateSubject}
                          onValueChange={setTemplateSubject}
                        >
                          <SelectTrigger id="template-subject" className="mt-1">
                            <SelectValue placeholder="Select subject" />
                          </SelectTrigger>
                          <SelectContent>
                            {subjects.map((subject) => (
                              <SelectItem key={subject} value={subject}>
                                {subject}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="template-description">Description (Optional)</Label>
                      <Textarea 
                        id="template-description" 
                        placeholder="Enter a brief description of this template..." 
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="mt-4">
                      <Label>Template File</Label>
                      <FileInput
                        id="template-file"
                        accept=".doc,.docx,.pdf"
                        maxSize={10 * 1024 * 1024} // 10MB
                        placeholder="DOC, DOCX, or PDF up to 10MB"
                        onValueChange={setUploadFile}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setActiveTab("existing")}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleUploadTemplate}
                      disabled={!uploadFile || !templateName.trim()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Template
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Template Guidelines</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-medium text-gray-900 mb-2">Supported Placeholders</h3>
                    <p className="text-sm text-gray-500 mb-2">
                      Include these placeholders in your template for automatic replacement:
                    </p>
                    <div className="bg-gray-50 p-3 rounded-md text-sm">
                      <ul className="space-y-2">
                        <li><code className="bg-gray-200 px-1 py-0.5 rounded">{"{{PAPER_TITLE}}"}</code> - The title of the question paper</li>
                        <li><code className="bg-gray-200 px-1 py-0.5 rounded">{"{{STUDENT_NAME}}"}</code> - Student's full name</li>
                        <li><code className="bg-gray-200 px-1 py-0.5 rounded">{"{{ROLL_NUMBER}}"}</code> - Student's roll number</li>
                        <li><code className="bg-gray-200 px-1 py-0.5 rounded">{"{{EXAM_DATE}}"}</code> - Date of examination</li>
                        <li><code className="bg-gray-200 px-1 py-0.5 rounded">{"{{TOTAL_MARKS}}"}</code> - Total marks for the paper</li>
                        <li><code className="bg-gray-200 px-1 py-0.5 rounded">{"{{TIME_ALLOWED}}"}</code> - Time allowed for the exam</li>
                        <li><code className="bg-gray-200 px-1 py-0.5 rounded">{"{{QUESTIONS}}"}</code> - The generated questions will replace this</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-base font-medium text-gray-900 mb-2">Template Format Tips</h3>
                    <ul className="list-disc pl-5 text-sm text-gray-500 space-y-1">
                      <li>Use consistent formatting for headings and sections</li>
                      <li>Include clear instructions for students at the beginning</li>
                      <li>Add page numbers for multi-page question papers</li>
                      <li>Leave appropriate spacing for answers in printed papers</li>
                      <li>Organize questions by sections if using different topics</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
