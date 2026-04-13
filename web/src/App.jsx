import ResumeModal from "./components/ResumeModal";

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--bg-main)]">
      <ResumeModal isOpen={true} onClose={() => {}} />
    </div>
  );
}
