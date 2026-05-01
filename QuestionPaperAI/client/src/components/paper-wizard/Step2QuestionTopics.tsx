import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TopicData {
  topicName: string;
  questionType: string;
  numberOfQuestions: number;
  marksPerQuestion: number;
  difficultyLevel: string;
}

interface Step2QuestionTopicsProps {
  topics: TopicData[];
  onTopicsChange: (topics: TopicData[]) => void;
  onNext: () => void;
  onPrev: () => void;
  totalMarks: number;
  totalQuestions: number;
  onTimeAllowedChange: (time: number) => void;
  timeAllowed: number;
}

const questionTypes = [
  "Multiple Choice",
  "Short Answer",
  "Long Answer",
  "True/False",
  "Problem Solving",
  "Coding Type Long Question"
];

const difficultyLevels = ["Easy", "Medium", "Hard"];

export default function Step2QuestionTopics({
  topics,
  onTopicsChange,
  onNext,
  onPrev,
  totalMarks,
  totalQuestions,
  onTimeAllowedChange,
  timeAllowed
}: Step2QuestionTopicsProps) {
  const [paperMode, setPaperMode] = useState<"standard" | "mcq-only" | "multi-section">("standard");
  const [totalMCQs, setTotalMCQs] = useState<number>(10);
  const [mcqCount, setMcqCount] = useState<number>(8);
  const [shortCount, setShortCount] = useState<number>(3);
  const [codingCount, setCodingCount] = useState<number>(1);
  
  const handleTopicChange = (index: number, field: keyof TopicData, value: any) => {
    const newTopics = [...topics];
    newTopics[index] = { ...newTopics[index], [field]: value };
    onTopicsChange(newTopics);
  };

  const addTopic = () => {
    onTopicsChange([
      ...topics,
      {
        topicName: "",
        questionType: "Multiple Choice",
        numberOfQuestions: 1,
        marksPerQuestion: 1,
        difficultyLevel: "Medium"
      }
    ]);
  };
  
  const setupMCQOnly = () => {
    // Create a single topic with all MCQs
    onTopicsChange([
      {
        topicName: "Multiple Choice Questions",
        questionType: "Multiple Choice",
        numberOfQuestions: totalMCQs,
        marksPerQuestion: 1,
        difficultyLevel: "Medium"
      }
    ]);
  };
  
  const setupMultiSectionPaper = () => {
    // Create three topics: MCQs, Short Answers, and Coding
    onTopicsChange([
      {
        topicName: "Multiple Choice Questions",
        questionType: "Multiple Choice",
        numberOfQuestions: mcqCount,
        marksPerQuestion: 1,
        difficultyLevel: "Medium"
      },
      {
        topicName: "Short Answer Questions",
        questionType: "Short Answer",
        numberOfQuestions: shortCount,
        marksPerQuestion: 2,
        difficultyLevel: "Medium"
      },
      {
        topicName: "Coding Type Questions",
        questionType: "Coding Type Long Question",
        numberOfQuestions: codingCount,
        marksPerQuestion: 10,
        difficultyLevel: "Medium"
      }
    ]);
  };

  const removeTopic = (index: number) => {
    const newTopics = topics.filter((_, i) => i !== index);
    onTopicsChange(newTopics);
  };

  const { toast } = useToast();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate topic names
    if (!isValid) {
      toast({
        title: "Missing information",
        description: "Please provide a name for each topic before continuing.",
        variant: "destructive"
      });
      return;
    }
    
    // Validate if there are any topics defined
    if (topics.length === 0) {
      toast({
        title: "No topics defined",
        description: "Please add at least one topic to your question paper.",
        variant: "destructive"
      });
      return;
    }
    
    // Validate time allowed
    if (!timeAllowed || timeAllowed < 1) {
      toast({
        title: "Invalid time allocation",
        description: "Please specify a valid time allocation (minimum 1 minute).",
        variant: "destructive"
      });
      return;
    }
    
    onNext();
  };

  const isValid = topics.every(topic => topic.topicName.trim() !== "");

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg leading-6 font-medium text-gray-900">Question Topics</h3>
        <p className="mt-1 text-sm text-gray-500">
          Define the topics and types of questions to include in the paper
        </p>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-md border border-gray-200 mb-6">
        <div className="mb-4">
          <Label className="text-sm font-medium text-gray-700">Paper Mode</Label>
          <div className="flex gap-4 mt-2 flex-wrap">
            <div className="flex items-center">
              <input
                type="radio"
                id="standard-mode"
                name="paper-mode"
                checked={paperMode === "standard"}
                onChange={() => setPaperMode("standard")}
                className="mr-2"
              />
              <Label htmlFor="standard-mode" className="text-sm">Standard (Multiple Topics)</Label>
            </div>
            <div className="flex items-center">
              <input
                type="radio"
                id="mcq-only"
                name="paper-mode"
                checked={paperMode === "mcq-only"}
                onChange={() => setPaperMode("mcq-only")}
                className="mr-2"
              />
              <Label htmlFor="mcq-only" className="text-sm">MCQ Only Template</Label>
            </div>
            <div className="flex items-center">
              <input
                type="radio"
                id="multi-section"
                name="paper-mode"
                checked={paperMode === "multi-section"}
                onChange={() => setPaperMode("multi-section")}
                className="mr-2"
              />
              <Label htmlFor="multi-section" className="text-sm">Multi-Section (MCQ + Short + Coding)</Label>
            </div>
          </div>
        </div>
        
        {paperMode === "multi-section" && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-800 mb-2">Multi-Section Paper Format</h4>
            <p className="text-sm text-blue-700 mb-3">
              This format will create a paper with three distinct sections on separate pages:
            </p>
            <ul className="text-sm text-blue-700 space-y-1 list-disc pl-5">
              <li>Page 1: Multiple Choice Questions</li>
              <li>Page 2: Short Answer Questions with 4-line answer spaces</li>
              <li>Page 3: Coding-Type Long Questions with extended answer space</li>
            </ul>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <Label htmlFor="mcqs-count" className="block text-sm font-medium text-blue-700">Number of MCQs</Label>
                <Input 
                  id="mcqs-count" 
                  type="number" 
                  min="3" 
                  max="15" 
                  value={mcqCount} 
                  onChange={e => setMcqCount(parseInt(e.target.value) || 8)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="short-count" className="block text-sm font-medium text-blue-700">Short Questions</Label>
                <Input 
                  id="short-count" 
                  type="number" 
                  min="2" 
                  max="5" 
                  value={shortCount} 
                  onChange={e => setShortCount(parseInt(e.target.value) || 3)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="coding-count" className="block text-sm font-medium text-blue-700">Coding Questions</Label>
                <Input 
                  id="coding-count" 
                  type="number" 
                  min="1" 
                  max="2" 
                  value={codingCount} 
                  onChange={e => setCodingCount(parseInt(e.target.value) || 1)}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button 
                type="button" 
                variant="secondary" 
                className="bg-blue-500 hover:bg-blue-600 text-white"
                onClick={setupMultiSectionPaper}
              >
                Apply Multi-Section Template
              </Button>
            </div>
          </div>
        )}
        
        {paperMode === "mcq-only" && (
          <div className="mt-4">
            <Label htmlFor="total-mcqs" className="block text-sm font-medium text-gray-700">
              Number of MCQs
            </Label>
            <div className="mt-1 flex items-center">
              <Input
                id="total-mcqs"
                type="number"
                min="5"
                max="50"
                value={totalMCQs}
                onChange={(e) => setTotalMCQs(parseInt(e.target.value) || 10)}
                className="w-24"
              />
              <Button 
                type="button" 
                variant="secondary" 
                className="ml-4"
                onClick={setupMCQOnly}
              >
                Apply MCQ Template
              </Button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              This will create a question paper template based on the format provided
            </p>
          </div>
        )}
      </div>

      <div id="topics-container" className="space-y-4">
        {topics.map((topic, index) => (
          <div
            key={index}
            className="bg-gray-50 p-4 rounded-md border border-gray-200 topic-section"
          >
            <div className="flex justify-between items-start">
              <div className="w-full">
                <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <Label className="block text-sm font-medium text-gray-700">
                      Topic Name
                    </Label>
                    <div className="mt-1">
                      <Input
                        value={topic.topicName}
                        onChange={(e) =>
                          handleTopicChange(index, "topicName", e.target.value)
                        }
                        placeholder="e.g., Newton's Laws of Motion"
                        className={!topic.topicName.trim() ? "border-red-500" : ""}
                      />
                      {!topic.topicName.trim() && (
                        <p className="mt-1 text-sm text-red-500">Topic name is required</p>
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <Label className="block text-sm font-medium text-gray-700">
                      Question Type
                    </Label>
                    <div className="mt-1">
                      <Select
                        value={topic.questionType}
                        onValueChange={(value) =>
                          handleTopicChange(index, "questionType", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select question type" />
                        </SelectTrigger>
                        <SelectContent>
                          {questionTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <Label className="block text-sm font-medium text-gray-700">
                      Number of Questions
                    </Label>
                    <div className="mt-1">
                      <Input
                        type="number"
                        min="1"
                        value={topic.numberOfQuestions}
                        onChange={(e) =>
                          handleTopicChange(
                            index,
                            "numberOfQuestions",
                            parseInt(e.target.value) || 1
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <Label className="block text-sm font-medium text-gray-700">
                      Marks Per Question
                    </Label>
                    <div className="mt-1">
                      <Input
                        type="number"
                        min="1"
                        value={topic.marksPerQuestion}
                        onChange={(e) =>
                          handleTopicChange(
                            index,
                            "marksPerQuestion",
                            parseInt(e.target.value) || 1
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <Label className="block text-sm font-medium text-gray-700">
                      Difficulty Level
                    </Label>
                    <div className="mt-1">
                      <Select
                        value={topic.difficultyLevel}
                        onValueChange={(value) =>
                          handleTopicChange(index, "difficultyLevel", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                          {difficultyLevels.map((level) => (
                            <SelectItem key={level} value={level}>
                              {level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeTopic(index)}
                className="ml-2 text-gray-400 hover:text-red-500"
                disabled={topics.length === 1}
              >
                <Trash className="h-5 w-5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={addTopic}
        className="text-sm"
      >
        + Add Another Topic
      </Button>

      <div className="bg-gray-50 p-4 rounded-md">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-base font-medium text-gray-900">Paper Summary</h4>
            <p className="text-sm text-gray-500">
              Total marks: <span id="total-marks">{totalMarks}</span> | Total
              questions: <span id="total-questions">{totalQuestions}</span>
            </p>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700 block mb-1">
              Time Allowed (minutes)
            </Label>
            <Input
              type="number"
              className="w-24"
              value={timeAllowed}
              onChange={(e) => onTimeAllowedChange(parseInt(e.target.value) || 60)}
              min={1}
              max={240}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onPrev}>
          Previous
        </Button>
        <Button type="submit" disabled={!isValid}>
          Next: Select Students
        </Button>
      </div>
    </form>
  );
}
