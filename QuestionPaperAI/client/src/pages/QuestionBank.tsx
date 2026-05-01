import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { generateQuestionsForTopic } from "@/lib/openai";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Database, Eye, Edit, Filter, MoreHorizontal, Plus, Search, Trash2, Sparkles, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Question types from schema
type Question = {
  id: number;
  userId: number;
  subject: string;
  topic: string;
  subtopic: string | null;
  questionType: string;
  difficultyLevel: string;
  questionText: string;
  options: any;
  correctAnswer: string;
  explanation: string | null;
  marksValue: number;
  isVerified: boolean;
  createdAt: string;
};

export default function QuestionBank() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBulkGenerateDialog, setShowBulkGenerateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [bulkGenerateOptions, setBulkGenerateOptions] = useState({
    subject: "",
    topic: "",
    questionType: "Multiple Choice",
    difficultyLevel: "Medium",
    count: 5
  });
  
  // Subject topics management
  const [showTopicsDialog, setShowTopicsDialog] = useState(false);
  const [subjectTopics, setSubjectTopics] = useState<{[key: string]: string[]}>({});
  const [currentSubject, setCurrentSubject] = useState("");
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    subject: "",
    topic: "",
    subtopic: "",
    questionType: "Multiple Choice",
    difficultyLevel: "Medium",
    questionText: "",
    options: {
      A: "",
      B: "",
      C: "",
      D: "",
    },
    correctAnswer: "A",
    explanation: "",
    marksValue: 1,
    userId: 1, // Default teacher ID
    isVerified: false,
    tags: [], // New: tags field
  });

  // Load subject topics from localStorage on component mount
  useEffect(() => {
    const savedTopics = localStorage.getItem('subjectTopics');
    if (savedTopics) {
      try {
        setSubjectTopics(JSON.parse(savedTopics));
      } catch (e) {
        console.error("Error parsing saved topics:", e);
      }
    }
  }, []);

  // Fetch available subjects from API
  const { data: availableSubjects = [], isLoading: isLoadingSubjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/subjects");
        if (!response.ok) {
          throw new Error("Failed to fetch subjects");
        }
        return response.json();
      } catch (error) {
        console.error("Error fetching subjects:", error);
        return [];
      }
    }
  });

  // Fetch questions based on active tab
  const { data: questions = [], isLoading } = useQuery({
    queryKey: ["questions", activeTab, subjectFilter],
    queryFn: async () => {
      let endpoint = "/api/questions";
      
      if (activeTab === "verified") {
        endpoint += "?verified=true";
      } else if (activeTab === "pending") {
        endpoint += "?verified=false";
      }
      
      if (subjectFilter) {
        endpoint += (endpoint.includes("?") ? "&" : "?") + `subject=${subjectFilter}`;
      }
      
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error("Failed to fetch questions");
      }
      return response.json();
    }
  });

  // Create a new question
  const createQuestion = useMutation({
    mutationFn: async (question: any) => {
      const response = await fetch("/api/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(question),
      });
      if (!response.ok) {
        throw new Error("Failed to create question");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Question Added",
        description: "The question has been added to the question bank.",
        variant: "default",
      });
      setShowAddDialog(false);
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      resetNewQuestionForm();
    },
    onError: (error) => {
      toast({
        title: "Failed to Add Question",
        description: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  // Verify a question
  const verifyQuestion = useMutation({
    mutationFn: async (questionId: number) => {
      const response = await fetch(`/api/questions/${questionId}/verify`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        }
      });
      if (!response.ok) {
        throw new Error("Failed to verify question");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Question Verified",
        description: "The question has been verified and will be used in future papers.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["questions"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Verify Question",
        description: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  // Delete a question
  const deleteQuestion = useMutation({
    mutationFn: async (questionId: number) => {
      const response = await fetch(`/api/questions/${questionId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        }
      });
      if (!response.ok) {
        throw new Error("Failed to delete question");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Question Deleted",
        description: "The question has been removed from the question bank.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["questions"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Delete Question",
        description: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  const resetNewQuestionForm = () => {
    setNewQuestion({
      subject: "",
      topic: "",
      subtopic: "",
      questionType: "Multiple Choice",
      difficultyLevel: "Medium",
      questionText: "",
      options: {
        A: "",
        B: "",
        C: "",
        D: "",
      },
      correctAnswer: "A",
      explanation: "",
      marksValue: 1,
      userId: 1,
      isVerified: false,
      tags: [],
    });
  };

  const handleGenerateQuestions = async () => {
    if (!bulkGenerateOptions.subject || !bulkGenerateOptions.topic) {
      toast({
        title: "Missing Information",
        description: "Please provide both subject and topic to generate questions.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingQuestions(true);
    try {
      const result = await generateQuestionsForTopic(
        bulkGenerateOptions.subject,
        bulkGenerateOptions.topic,
        bulkGenerateOptions.questionType,
        bulkGenerateOptions.difficultyLevel,
        bulkGenerateOptions.count
      );

      toast({
        title: "Questions Generated",
        description: `${bulkGenerateOptions.count} questions have been generated and added to your question bank for review.`,
        variant: "default",
      });
      
      // Refresh the question list
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      setShowBulkGenerateDialog(false);
      
      // Set active tab to "pending" to show the newly generated questions
      setActiveTab("pending");
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: `Error: ${error instanceof Error ? error.message : "Failed to generate questions"}`,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    createQuestion.mutate(newQuestion);
  };
  
  // Update a question
  const updateQuestion = useMutation({
    mutationFn: async (question: any) => {
      const response = await fetch(`/api/questions/${question.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(question),
      });
      if (!response.ok) {
        throw new Error("Failed to update question");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Question Updated",
        description: "The question has been updated successfully.",
        variant: "default",
      });
      setShowViewDialog(false);
      setEditMode(false);
      queryClient.invalidateQueries({ queryKey: ["questions"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Update Question",
        description: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    },
  });
  
  const handleViewQuestion = (question: Question) => {
    setSelectedQuestion(question);
    setEditMode(false);
    setShowViewDialog(true);
  };
  
  const handleEditQuestion = () => {
    setEditMode(true);
  };
  
  const handleSaveQuestion = () => {
    if (selectedQuestion) {
      updateQuestion.mutate(selectedQuestion);
    }
  };

  // Extract unique tags for tag filter
  const allTags = Array.from(new Set((Array.isArray(questions) ? questions.flatMap((q: any) => q.tags || []) : []).filter(Boolean)));
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Filter questions based on search term and tags
  const filteredQuestions = Array.isArray(questions) ? questions.filter((question: Question) => {
    if (!searchTerm && !selectedTags.length) return true;
    const lowerSearchTerm = searchTerm.toLowerCase();
    // Tag match
    const tagMatch = selectedTags.length === 0 || (question.tags && selectedTags.every(tag => question.tags.includes(tag)));
    // Text match
    const textMatch =
      !searchTerm ||
      question.questionText.toLowerCase().includes(lowerSearchTerm) ||
      question.subject.toLowerCase().includes(lowerSearchTerm) ||
      question.topic.toLowerCase().includes(lowerSearchTerm) ||
      (question.subtopic && question.subtopic.toLowerCase().includes(lowerSearchTerm)) ||
      (question.tags && question.tags.some((tag: string) => tag.toLowerCase().includes(lowerSearchTerm)));
    return tagMatch && textMatch;
  }) : [];

  // Extract unique subjects for the filter dropdown
  const subjects = Array.isArray(questions) ? Array.from(new Set(questions.map((q: Question) => q.subject))) : [];

  return (
    <div className="container mx-auto py-8">
      <Card className="mb-8">
        <CardHeader className="flex flex-col md:flex-row justify-between md:items-center">
          <CardTitle className="text-2xl font-bold">Question Bank</CardTitle>
          <div className="flex space-x-2 mt-4 md:mt-0">
            <Dialog open={showBulkGenerateDialog} onOpenChange={setShowBulkGenerateDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="ml-auto">
                  <Sparkles className="mr-2 h-4 w-4" /> Generate Questions
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate Questions by Topic</DialogTitle>
                  <DialogDescription>
                    Generate questions for a specific subject and topic using AI. Questions will be added to your question bank for verification.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2 flex flex-col">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="gen-subject">Subject</Label>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowTopicsDialog(true)}
                      >
                        Manage Topics
                      </Button>
                    </div>
                    <Select 
                      value={bulkGenerateOptions.subject}
                      onValueChange={(value) => {
                        setBulkGenerateOptions({...bulkGenerateOptions, subject: value, topic: ""});
                        setCurrentSubject(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingSubjects ? (
                          <SelectItem value="loading" disabled>Loading subjects...</SelectItem>
                        ) : availableSubjects.length > 0 ? (
                          availableSubjects.map((subject: string) => (
                            <SelectItem key={subject} value={subject}>
                              {subject}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-subjects" disabled>No subjects available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gen-topic">Topic</Label>
                    {subjectTopics[bulkGenerateOptions.subject]?.length ? (
                      <Select 
                        value={bulkGenerateOptions.topic}
                        onValueChange={(value) => setBulkGenerateOptions({...bulkGenerateOptions, topic: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a topic" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjectTopics[bulkGenerateOptions.subject]?.map((topic: string) => (
                            <SelectItem key={topic} value={topic}>
                              {topic}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input 
                        id="gen-topic"
                        value={bulkGenerateOptions.topic}
                        onChange={(e) => setBulkGenerateOptions({...bulkGenerateOptions, topic: e.target.value})}
                        placeholder="e.g. Algebra, Thermodynamics, Genetics"
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gen-type">Question Type</Label>
                    <Select 
                      value={bulkGenerateOptions.questionType}
                      onValueChange={(value) => setBulkGenerateOptions({...bulkGenerateOptions, questionType: value})}
                    >
                      <SelectTrigger id="gen-type">
                        <SelectValue placeholder="Select question type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Multiple Choice">Multiple Choice</SelectItem>
                        <SelectItem value="True/False">True/False</SelectItem>
                        <SelectItem value="Short Answer">Short Answer</SelectItem>
                        <SelectItem value="Long Answer">Long Answer</SelectItem>
                        <SelectItem value="Problem Solving">Problem Solving</SelectItem>
                        <SelectItem value="Coding Type Long Question">Coding Type Long Question</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gen-difficulty">Difficulty Level</Label>
                    <Select 
                      value={bulkGenerateOptions.difficultyLevel}
                      onValueChange={(value) => setBulkGenerateOptions({...bulkGenerateOptions, difficultyLevel: value})}
                    >
                      <SelectTrigger id="gen-difficulty">
                        <SelectValue placeholder="Select difficulty level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Easy">Easy</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gen-count">Number of Questions</Label>
                    <Input 
                      id="gen-count"
                      type="number"
                      min={1}
                      max={20}
                      value={bulkGenerateOptions.count}
                      onChange={(e) => setBulkGenerateOptions({...bulkGenerateOptions, count: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowBulkGenerateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleGenerateQuestions} 
                    disabled={isGeneratingQuestions || !bulkGenerateOptions.subject || !bulkGenerateOptions.topic}
                  >
                    {isGeneratingQuestions ? "Generating..." : "Generate Questions"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="ml-auto">
                  <Plus className="mr-2 h-4 w-4" /> Add New Question
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Question</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddQuestion} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Select 
                        value={newQuestion.subject}
                        onValueChange={(value) => setNewQuestion({...newQuestion, subject: value})}
                      >
                        <SelectTrigger id="subject">
                          <SelectValue placeholder="Select a subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingSubjects ? (
                            <SelectItem value="loading" disabled>Loading subjects...</SelectItem>
                          ) : availableSubjects.length > 0 ? (
                            availableSubjects.map((subject: string) => (
                              <SelectItem key={subject} value={subject}>
                                {subject}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-subjects" disabled>No subjects available</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="topic">Topic</Label>
                      <Input
                        id="topic"
                        required
                        value={newQuestion.topic}
                        onChange={(e) => setNewQuestion({...newQuestion, topic: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subtopic">Subtopic (Optional)</Label>
                      <Input
                        id="subtopic"
                        value={newQuestion.subtopic}
                        onChange={(e) => setNewQuestion({...newQuestion, subtopic: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="questionType">Question Type</Label>
                      <Select 
                        value={newQuestion.questionType}
                        onValueChange={(value) => setNewQuestion({...newQuestion, questionType: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a question type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Multiple Choice">Multiple Choice</SelectItem>
                          <SelectItem value="Short Answer">Short Answer</SelectItem>
                          <SelectItem value="Long Answer">Long Answer</SelectItem>
                          <SelectItem value="True/False">True/False</SelectItem>
                          <SelectItem value="Problem Solving">Problem Solving</SelectItem>
                          <SelectItem value="Coding Type Long Question">Coding Type Long Question</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="difficultyLevel">Difficulty Level</Label>
                      <Select 
                        value={newQuestion.difficultyLevel}
                        onValueChange={(value) => setNewQuestion({...newQuestion, difficultyLevel: value as "Easy" | "Medium" | "Hard"})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Easy">Easy</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="marksValue">Marks</Label>
                      <Input
                        id="marksValue"
                        type="number"
                        required
                        min={1}
                        value={newQuestion.marksValue}
                        onChange={(e) => setNewQuestion({...newQuestion, marksValue: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="questionText">Question Text</Label>
                    <Textarea
                      id="questionText"
                      required
                      rows={3}
                      value={newQuestion.questionText}
                      onChange={(e) => setNewQuestion({...newQuestion, questionText: e.target.value})}
                    />
                  </div>
                  
                  {newQuestion.questionType === "Multiple Choice" && (
                    <div className="space-y-3">
                      <Label>Options</Label>
                      {["A", "B", "C", "D"].map((option) => (
                        <div key={option} className="flex items-center gap-2">
                          <div className="w-8 h-8 flex items-center justify-center bg-primary/10 rounded-md font-medium">
                            {option}
                          </div>
                          <Input
                            required
                            value={newQuestion.options[option as keyof typeof newQuestion.options]}
                            onChange={(e) => {
                              const updatedOptions = {...newQuestion.options};
                              updatedOptions[option as keyof typeof newQuestion.options] = e.target.value;
                              setNewQuestion({...newQuestion, options: updatedOptions});
                            }}
                          />
                        </div>
                      ))}
                      <div className="space-y-2">
                        <Label htmlFor="correctAnswer">Correct Answer</Label>
                        <Select 
                          value={newQuestion.correctAnswer}
                          onValueChange={(value) => setNewQuestion({...newQuestion, correctAnswer: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select correct answer" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A">A</SelectItem>
                            <SelectItem value="B">B</SelectItem>
                            <SelectItem value="C">C</SelectItem>
                            <SelectItem value="D">D</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="explanation">Explanation (Optional)</Label>
                    <Textarea
                      id="explanation"
                      rows={2}
                      value={newQuestion.explanation}
                      onChange={(e) => setNewQuestion({...newQuestion, explanation: e.target.value})}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createQuestion.isPending}>
                      {createQuestion.isPending ? "Adding..." : "Add Question"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search questions..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <Select
                value={subjectFilter || "all"}
                onValueChange={(value) => setSubjectFilter(value === "all" ? null : value)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {isLoadingSubjects ? (
                    <SelectItem value="loading" disabled>Loading subjects...</SelectItem>
                  ) : availableSubjects.length > 0 ? (
                    availableSubjects.map((subject: string) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-subjects" disabled>No subjects available</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {/* Tag filter multi-select */}
              <Select
                value={selectedTags[0] || "__all__"}
                onValueChange={tag => setSelectedTags(tag === "__all__" ? [] : [tag])}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filter by Tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Tags</SelectItem>
                  {allTags.map(tag => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                All Questions
              </TabsTrigger>
              <TabsTrigger value="verified" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Verified
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <span className="h-4 w-4 flex items-center justify-center text-xs border rounded-full">?</span>
                Pending Verification
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-4">
              <QuestionList 
                questions={filteredQuestions}
                isLoading={isLoading}
                onVerify={(id) => verifyQuestion.mutate(id)}
                onDelete={(id) => deleteQuestion.mutate(id)}
                onView={handleViewQuestion}
                showTags // Pass prop to show tags
              />
            </TabsContent>
            
            <TabsContent value="verified" className="space-y-4">
              <QuestionList 
                questions={filteredQuestions.filter((q: Question) => q.isVerified)}
                isLoading={isLoading}
                onVerify={(id) => verifyQuestion.mutate(id)}
                onDelete={(id) => deleteQuestion.mutate(id)}
                onView={handleViewQuestion}
              />
            </TabsContent>
            
            <TabsContent value="pending" className="space-y-4">
              <QuestionList 
                questions={filteredQuestions.filter((q: Question) => !q.isVerified)}
                isLoading={isLoading}
                onVerify={(id) => verifyQuestion.mutate(id)}
                onDelete={(id) => deleteQuestion.mutate(id)}
                onView={handleViewQuestion}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* View/Edit Question Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editMode ? "Edit Question" : "View Question"}
              {!editMode && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-2" 
                  onClick={handleEditQuestion}
                >
                  <Edit className="h-4 w-4 mr-1" /> Edit
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedQuestion && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="view-subject">Subject</Label>
                  {editMode ? (
                    <Select 
                      value={selectedQuestion.subject}
                      onValueChange={(value) => setSelectedQuestion({...selectedQuestion, subject: value})}
                      disabled={!editMode}
                    >
                      <SelectTrigger id="view-subject">
                        <SelectValue placeholder="Select a subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingSubjects ? (
                          <SelectItem value="loading" disabled>Loading subjects...</SelectItem>
                        ) : availableSubjects.length > 0 ? (
                          availableSubjects.map((subject: string) => (
                            <SelectItem key={subject} value={subject}>
                              {subject}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-subjects" disabled>No subjects available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="view-subject"
                      value={selectedQuestion.subject}
                      disabled={true}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="view-topic">Topic</Label>
                  <Input
                    id="view-topic"
                    value={selectedQuestion.topic}
                    onChange={(e) => setSelectedQuestion({...selectedQuestion, topic: e.target.value})}
                    disabled={!editMode}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="view-questionText">Question Text</Label>
                <Textarea
                  id="view-questionText"
                  rows={3}
                  value={selectedQuestion.questionText}
                  onChange={(e) => setSelectedQuestion({...selectedQuestion, questionText: e.target.value})}
                  disabled={!editMode}
                />
              </div>

              {selectedQuestion.questionType === "Multiple Choice" && (
                <div className="space-y-3">
                  <Label>Options</Label>
                  {Object.entries(selectedQuestion.options || {}).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <div className={`w-8 h-8 flex items-center justify-center rounded-md font-medium ${selectedQuestion.correctAnswer === key ? 'bg-green-100 text-green-800' : 'bg-primary/10'}`}>
                        {key}
                      </div>
                      <Input
                        value={value as string}
                        onChange={(e) => {
                          const updatedOptions = {...selectedQuestion.options};
                          updatedOptions[key] = e.target.value;
                          setSelectedQuestion({...selectedQuestion, options: updatedOptions});
                        }}
                        disabled={!editMode}
                      />
                    </div>
                  ))}
                  <div className="space-y-2">
                    <Label htmlFor="view-correctAnswer">Correct Answer</Label>
                    <Select 
                      value={selectedQuestion.correctAnswer}
                      onValueChange={(value) => setSelectedQuestion({...selectedQuestion, correctAnswer: value})}
                      disabled={!editMode}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select correct answer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="C">C</SelectItem>
                        <SelectItem value="D">D</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="view-explanation">Explanation</Label>
                <Textarea
                  id="view-explanation"
                  rows={2}
                  value={selectedQuestion.explanation || ""}
                  onChange={(e) => setSelectedQuestion({...selectedQuestion, explanation: e.target.value})}
                  disabled={!editMode}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowViewDialog(false);
                    setEditMode(false);
                  }}
                >
                  {editMode ? "Cancel" : "Close"}
                </Button>
                {editMode && (
                  <Button 
                    type="button" 
                    onClick={handleSaveQuestion}
                    disabled={updateQuestion.isPending}
                  >
                    {updateQuestion.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                )}
                {!editMode && !selectedQuestion.isVerified && (
                  <Button
                    type="button"
                    onClick={() => {
                      verifyQuestion.mutate(selectedQuestion.id);
                      setShowViewDialog(false);
                    }}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" /> Verify Question
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Subject Topics Management Dialog */}
      <Dialog open={showTopicsDialog} onOpenChange={setShowTopicsDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Manage Subjects and Topics</DialogTitle>
            <DialogDescription>
              Create and organize topics for each subject to maintain a structured question bank.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="flex items-end gap-2">
              <div className="space-y-2 flex-1">
                <Label htmlFor="manage-subject">Subject</Label>
                <Input
                  id="manage-subject"
                  value={currentSubject}
                  onChange={(e) => setCurrentSubject(e.target.value)}
                  placeholder="Enter subject name"
                />
              </div>
              <Button 
                type="button"
                variant="outline"
                disabled={!currentSubject.trim()}
                onClick={() => {
                  if (currentSubject.trim() && !availableSubjects.includes(currentSubject)) {
                    setSubjectTopics({
                      ...subjectTopics,
                      [currentSubject]: []
                    });
                  }
                }}
              >
                Add Subject
              </Button>
            </div>
            
            <Tabs defaultValue={availableSubjects.length > 0 ? availableSubjects[0] : ""}>
              <TabsList className="flex flex-wrap">
                {Object.keys(subjectTopics).map((subject) => (
                  <TabsTrigger key={subject} value={subject}>
                    {subject}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {Object.entries(subjectTopics).map(([subject, topics]) => (
                <TabsContent key={subject} value={subject} className="space-y-4">
                  <div className="flex items-end gap-2">
                    <div className="space-y-2 flex-1">
                      <Label htmlFor={`topic-${subject}`}>Add New Topic</Label>
                      <Input
                        id={`topic-${subject}`}
                        placeholder="Enter topic name"
                        value={currentSubject === subject ? "" : ""}
                        onChange={(e) => setCurrentSubject(subject)}
                      />
                    </div>
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const newTopic = (document.getElementById(`topic-${subject}`) as HTMLInputElement)?.value;
                        if (newTopic && !topics.includes(newTopic)) {
                          setSubjectTopics({
                            ...subjectTopics,
                            [subject]: [...topics, newTopic]
                          });
                          (document.getElementById(`topic-${subject}`) as HTMLInputElement).value = "";
                        }
                      }}
                    >
                      Add Topic
                    </Button>
                  </div>
                  
                  <div className="border rounded-md p-4">
                    <div className="text-sm font-medium mb-2">Topics for {subject}</div>
                    {topics.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No topics added yet.</div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {topics.map((topic) => (
                          <div 
                            key={topic} 
                            className="flex items-center bg-primary/10 rounded-full px-3 py-1 text-sm"
                          >
                            {topic}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-5 w-5 ml-1"
                              onClick={() => {
                                setSubjectTopics({
                                  ...subjectTopics,
                                  [subject]: topics.filter((t) => t !== topic)
                                });
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowTopicsDialog(false)}>
              Close
            </Button>
            <Button 
              type="button" 
              onClick={() => {
                // Save subject topics to local storage for persistence
                localStorage.setItem('subjectTopics', JSON.stringify(subjectTopics));
                setShowTopicsDialog(false);
                toast({
                  title: "Subjects and Topics Saved",
                  description: "Your subjects and topics have been saved successfully.",
                  variant: "default",
                });
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface QuestionListProps {
  questions: Question[];
  isLoading: boolean;
  onVerify: (id: number) => void;
  onDelete: (id: number) => void;
  onView: (question: Question) => void;
}

function QuestionList({ questions, isLoading, onVerify, onDelete, onView, showTags = false }: QuestionListProps & { showTags?: boolean }) {
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;
  
  // Pagination logic
  const totalPages = Math.ceil(questions.length / itemsPerPage);
  const paginatedQuestions = questions.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );
  
  const nextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };
  
  const prevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30%]">Question</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Options</TableHead>
            <TableHead>Difficulty</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                Loading questions...
              </TableCell>
            </TableRow>
          ) : questions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No questions found. Add some questions to build your question bank.
              </TableCell>
            </TableRow>
          ) : (
            paginatedQuestions.map((question) => (
              <TableRow key={question.id}>
                <TableCell className="font-medium">
                  <div className="line-clamp-2">{question.questionText}</div>
                  {showTags && question.tags && question.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {question.tags.map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="text-xs px-2 py-0.5">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{question.subject}</div>
                </TableCell>
                <TableCell>{question.questionType}</TableCell>
                <TableCell>
                  {question.questionType === "Multiple Choice" && question.options && (
                    <div className="text-xs space-y-1">
                      {Object.entries(question.options).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-1 truncate max-w-[180px]">
                          <span className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-medium 
                            ${question.correctAnswer === key ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                            {key}
                          </span>
                          <span className="truncate">{value as string}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={
                    question.difficultyLevel === "Easy" ? "outline" :
                    question.difficultyLevel === "Medium" ? "secondary" : "destructive"
                  }>
                    {question.difficultyLevel}
                  </Badge>
                </TableCell>
                <TableCell>
                  {question.isVerified ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline">Pending</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView(question)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Question
                      </DropdownMenuItem>
                      {!question.isVerified && (
                        <DropdownMenuItem onClick={() => onVerify(question.id)}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Verify Question
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => onDelete(question.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Question
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      
      {/* Pagination controls */}
      {questions.length > 0 && (
        <div className="flex items-center justify-between px-4 py-4 border-t">
          <div className="text-sm text-gray-500">
            Showing {Math.min(1 + (page - 1) * itemsPerPage, questions.length)} to {Math.min(page * itemsPerPage, questions.length)} of {questions.length} questions
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={prevPage} 
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={nextPage} 
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}