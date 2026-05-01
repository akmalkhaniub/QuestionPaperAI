import ActionCards from "@/components/dashboard/ActionCards";
import RecentPapers from "@/components/dashboard/RecentPapers";

export default function Dashboard() {
  return (
    <>
      <div className="px-4 py-5 sm:px-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Create and manage unique question papers for your students.
        </p>
      </div>

      <ActionCards />
      <RecentPapers />
    </>
  );
}
