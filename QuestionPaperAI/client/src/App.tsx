import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import QuestionPapers from "@/pages/QuestionPapers";
import PaperDetail from "@/pages/PaperDetail";
import GeneratedPapers from "@/pages/GeneratedPapers";
import AnswerKey from "@/pages/AnswerKey";
import Students from "@/pages/Students";
import Templates from "@/pages/Templates";
import QuestionBank from "./pages/QuestionBank";
import AppLayout from "@/components/layout/AppLayout";
import ScanSheet from "@/pages/ScanSheet";

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/papers" component={QuestionPapers} />
        <Route path="/papers/:id" component={PaperDetail} />
        <Route path="/papers/:id/generated" component={GeneratedPapers} />
        <Route path="/papers/:id/answer-key" component={AnswerKey} />
        <Route path="/students" component={Students} />
        <Route path="/templates" component={Templates} />
        <Route path="/question-bank" component={QuestionBank} />
        <Route path="/scan-sheet" component={ScanSheet} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <>
      <Router />
      <Toaster />
    </>
  );
}

export default App;
