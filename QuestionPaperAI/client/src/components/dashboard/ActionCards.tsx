import { Link } from "wouter";
import { 
  FileText, 
  Users, 
  FileSpreadsheet
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ActionCards() {
  return (
    <div className="mt-6 grid gap-5 max-w-lg mx-auto lg:grid-cols-3 lg:max-w-none">
      {/* Create Paper Card */}
      <Card className="flex flex-col overflow-hidden">
        <div className="flex-shrink-0 bg-primary h-2"></div>
        <CardContent className="p-6 flex-1 flex flex-col justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary-100 text-primary mb-4">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Create Question Paper</h3>
            <p className="mt-3 text-base text-gray-500">
              Start generating unique question papers for your students using AI.
            </p>
          </div>
          <div className="mt-6">
            <Link href="/papers">
              <Button>
                Create New Paper
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Manage Students Card */}
      <Card className="flex flex-col overflow-hidden">
        <div className="flex-shrink-0 bg-green-500 h-2"></div>
        <CardContent className="p-6 flex-1 flex flex-col justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-green-100 text-green-500 mb-4">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Manage Students</h3>
            <p className="mt-3 text-base text-gray-500">
              Upload your student lists and organize them by class or subject.
            </p>
          </div>
          <div className="mt-6">
            <Link href="/students">
              <Button variant="secondary" className="bg-green-500 hover:bg-green-600 text-white">
                Upload Students
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Paper Templates Card */}
      <Card className="flex flex-col overflow-hidden">
        <div className="flex-shrink-0 bg-indigo-500 h-2"></div>
        <CardContent className="p-6 flex-1 flex flex-col justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-100 text-indigo-500 mb-4">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Paper Templates</h3>
            <p className="mt-3 text-base text-gray-500">
              Create and manage templates for different types of question papers.
            </p>
          </div>
          <div className="mt-6">
            <Link href="/templates">
              <Button variant="secondary" className="bg-indigo-500 hover:bg-indigo-600 text-white">
                Manage Templates
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
