import { useState } from "react";
import PaperWizard from "@/components/paper-wizard/PaperWizard";

export default function QuestionPapers() {
  return (
    <>
      <div className="px-4 py-5 sm:px-6">
        <h1 className="text-2xl font-semibold text-gray-900">Question Papers</h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Create and manage question papers for your classes.
        </p>
      </div>

      <PaperWizard />
    </>
  );
}
