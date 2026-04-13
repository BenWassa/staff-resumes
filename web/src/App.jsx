import { useEffect, useState } from "react";
import OnboardingScreen from "./components/OnboardingScreen";
import ResumeModal from "./components/ResumeModal";

export default function App() {
  // null = loading, false = needs onboarding, true = ready
  const [configured, setConfigured] = useState(null);

  useEffect(() => {
    fetch("/api/onboarding/status")
      .then((r) => r.json())
      .then((data) => setConfigured(data.configured))
      .catch(() => setConfigured(false));
  }, []);

  if (configured === null) {
    // Waiting for backend — blank screen matches app background
    return <div className="min-h-screen bg-[var(--bg-main)]" />;
  }

  if (!configured) {
    return (
      <OnboardingScreen
        onComplete={() => setConfigured(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)]">
      <ResumeModal isOpen={true} onClose={() => {}} />
    </div>
  );
}
