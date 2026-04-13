import {
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCcw,
} from "lucide-react";
import { useEffect, useState } from "react";
import CloseButton from "./CloseButton";
import StepPackage from "./StepPackage";
import StepPeople from "./StepPeople";
import StepPersonConfig from "./StepPersonConfig";
import { slugify } from "../utils/slugify";

const STEPS = ["package", "people", "configure"];
const STEP_LABELS = ["Name package", "Select team", "Configure"];
const TITLE_RANK = {
  partner: 0,
  "senior engagement manager": 1,
  "senior consultant": 2,
  "associate consultant": 3,
};

function getTitleRank(title) {
  return TITLE_RANK[(title || "").trim().toLowerCase()] ?? 99;
}

function sortNamesByRank(names, peopleByName) {
  return [...names].sort((a, b) => {
    const aTitle = peopleByName[a]?.title || "";
    const bTitle = peopleByName[b]?.title || "";
    return getTitleRank(aTitle) - getTitleRank(bTitle) || a.localeCompare(b);
  });
}

export default function ResumeModal({ isOpen, onClose }) {
  const [step, setStep] = useState("package");
  const [packageName, setPackageName] = useState("");
  const [includePackagePages, setIncludePackagePages] = useState(true);
  const [allProjects, setAllProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [allPeople, setAllPeople] = useState([]);
  const [selectedNames, setSelectedNames] = useState([]);
  const [personData, setPersonData] = useState({});
  const [selections, setSelections] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationJobId, setGenerationJobId] = useState("");
  const [showGenerationSuccess, setShowGenerationSuccess] = useState(false);
  const [saves, setSaves] = useState([]);
  const [error, setError] = useState("");

  const stepIndex = STEPS.indexOf(step);

  const handleProjectSelection = (projectId, projects = allProjects) => {
    setSelectedProjectId(projectId);
    const project = projects.find((item) => item.project_id === projectId);
    if (project) {
      setPackageName(project.folder_name || project.name);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    fetch("/api/people")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || "Failed to load team members.");
        }
        setAllPeople(data);
      })
      .catch((loadError) => setError(loadError.message));

    fetch("/api/saves")
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        setSaves(data);
      })
      .catch(() => {});

    fetch("/api/projects")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || "Failed to load projects.");
        }
        setAllProjects(data);
      })
      .catch((loadError) => {
        setAllProjects([]);
        setSelectedProjectId("");
        setError(loadError.message);
      });
  }, [isOpen]);

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      setStep("package");
      setPackageName("");
      setIncludePackagePages(true);
      setSelectedNames([]);
      setSelections({});
      setPersonData({});
      setError("");
      setIsGenerating(false);
      setGenerationJobId("");
      setShowGenerationSuccess(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !generationJobId || !isGenerating) return undefined;

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/generate/${generationJobId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Failed to load generation status.");
        }

        if (data.status === "completed") {
          setIsGenerating(false);
          setShowGenerationSuccess(true);
          return;
        }

        if (data.status === "failed") {
          throw new Error(data.error || data.message || "Generation failed.");
        }
      } catch (statusError) {
        setError(statusError.message);
        setIsGenerating(false);
      }
    };

    pollStatus();
    const intervalId = window.setInterval(pollStatus, 800);
    return () => window.clearInterval(intervalId);
  }, [generationJobId, isGenerating, isOpen]);

  const handleLoadSave = async (slug) => {
    setError("");
    try {
      const response = await fetch(`/api/saves/${encodeURIComponent(slug)}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to load saved session.");
      }

      const results = await Promise.allSettled(
        data.selected_names.map((name) =>
          fetch(`/api/people/${encodeURIComponent(name)}/data`).then(
            async (r) => {
              const personJson = await r.json();
              if (!r.ok) throw new Error(name);
              return personJson;
            },
          ),
        ),
      );

      const nextPersonData = {};
      const validNames = [];
      const missing = [];

      results.forEach((result, index) => {
        const name = data.selected_names[index];
        if (result.status === "fulfilled") {
          nextPersonData[name] = result.value;
          validNames.push(name);
        } else {
          missing.push(name);
        }
      });

      setPackageName(data.package_name);
      setSelectedProjectId(data.selected_project_id || "");
      setIncludePackagePages(data.include_package_pages ?? true);
      setSelectedNames(validNames);
      setSelections(data.selections || {});
      setPersonData(nextPersonData);

      if (missing.length > 0) {
        setError(
          `Note: ${missing.join(", ")} no longer found in workbook and ${missing.length === 1 ? "was" : "were"} removed from the team.`,
        );
      }

      setStep("configure");
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  const _doSaveAndGenerate = async (slug) => {
    try {
      await fetch(`/api/saves/${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schema_version: 1,
          saved_at: new Date().toISOString(),
          package_name: packageName,
          selected_project_id: selectedProjectId || null,
          include_package_pages: includePackagePages,
          selected_names: selectedNames,
          selections,
        }),
      });
    } catch {
      // Save failure is non-blocking — proceed to generate anyway
    }

    try {
      const people = selectedNames.map((name) => {
        const p = selections[name];
        return {
          name,
          projects: p?.projects || [],
          education_indices: p?.education_indices || [],
        };
      });

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          package_name: packageName,
          selected_project_id: selectedProjectId || null,
          include_package_pages: includePackagePages,
          people,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to start generation.");
      }

      setGenerationJobId(data.job_id);
    } catch (generateError) {
      setError(generateError.message);
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  const handleNext = async () => {
    setError("");

    if (step === "package") {
      if (!packageName.trim()) {
        setError("Package name is required.");
        return;
      }
      setStep("people");
      return;
    }

    if (step === "people") {
      if (selectedNames.length === 0) {
        setError("Select at least one team member.");
        return;
      }

      const missing = selectedNames.filter((name) => !personData[name]);
      if (missing.length > 0) {
        try {
          const results = await Promise.all(
            missing.map((name) =>
              fetch(`/api/people/${encodeURIComponent(name)}/data`).then(
                async (response) => {
                  const data = await response.json();
                  if (!response.ok) {
                    throw new Error(
                      data.detail || `Failed to load data for ${name}`,
                    );
                  }
                  return data;
                },
              ),
            ),
          );

          const nextPersonData = { ...personData };
          const nextSelections = { ...selections };

          results.forEach((person) => {
            nextPersonData[person.name] = person;
            if (!nextSelections[person.name]) {
              nextSelections[person.name] = {
                projects: person.projects.map((project) => project.key),
                education_indices: person.education.map(
                  (_, index) => index + 1,
                ),
              };
            }
          });

          setPersonData(nextPersonData);
          setSelections(nextSelections);
          setSelectedNames((currentNames) =>
            sortNamesByRank(currentNames, nextPersonData),
          );
        } catch (loadError) {
          setError(loadError.message);
          return;
        }
      }

      if (missing.length === 0) {
        const peopleByName = Object.fromEntries(
          allPeople.map((person) => [person.name, person]),
        );
        setSelectedNames((currentNames) =>
          sortNamesByRank(currentNames, peopleByName),
        );
      }

      setStep("configure");
    }
  };

  const goBack = () => {
    setError("");
    if (step === "people") {
      setStep("package");
      return;
    }
    if (step === "configure") {
      setStep("people");
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError("");
    setGenerationJobId("");
    setShowGenerationSuccess(false);

    const slug = slugify(packageName);

    await _doSaveAndGenerate(slug);
  };

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-md overflow-y-auto"
      role="dialog"
    >
      <div className="flex-1 w-full max-w-6xl mx-auto my-0 justify-stretch sm:my-8 flex flex-col overflow-hidden bg-[var(--bg-panel)] sm:rounded-2xl sm:shadow-2xl sm:max-h-[calc(100vh-4rem)]">
        <div className="modal-header-bg shrink-0 border-b-4 border-[var(--border-accent)] px-6 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--border-header-badge)] bg-[var(--bg-header-badge)] px-3 py-1 text-sm font-mono uppercase tracking-[0.18em] text-[var(--text-header-muted)]">
                <FileText className="h-3.5 w-3.5" />
                Resumes
              </div>
              <h2 className="text-2xl font-medium tracking-tight text-[var(--text-header)] sm:text-3xl">
                Generate Proposal Resumes
              </h2>

              <div className="mt-3 flex items-center gap-2">
                {STEPS.map((currentStep, index) => (
                  <div key={currentStep} className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full transition-colors ${
                        index <= stepIndex
                          ? "bg-[var(--accent-main)]"
                          : "bg-[var(--border-main)]"
                      }`}
                    />
                    {index < STEPS.length - 1 ? (
                      <div
                        className={`h-px w-6 transition-colors ${
                          index < stepIndex
                            ? "bg-[var(--accent-main)] opacity-50"
                            : "bg-[var(--border-main)] opacity-30"
                        }`}
                      />
                    ) : null}
                  </div>
                ))}
                <span className="ml-2 text-sm text-[var(--text-header-muted)] opacity-80">
                  {STEP_LABELS[stepIndex]}
                </span>
              </div>
            </div>

            <CloseButton
              className="text-[var(--text-header-muted)] hover:border-[var(--text-header-muted)] hover:text-[var(--text-header)]"
              disabled={isGenerating}
              onClick={onClose}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto px-6 py-6 sm:px-8 sm:py-8">
            {error && (
              <div className="mb-6 rounded-[var(--radius-sm)] border border-red-200 bg-red-50 p-4 text-red-800">
                {error}
              </div>
            )}

            {isGenerating && !showGenerationSuccess ? (
              <div className="flex h-full flex-col items-center justify-center space-y-6 text-center py-12">
                <div className="relative">
                  <div className="absolute inset-0 animate-ping rounded-full bg-[var(--accent-main)] opacity-20" />
                  <div className="relative rounded-full bg-[var(--bg-card)] p-8 shadow-xl">
                    <RefreshCcw className="h-16 w-16 animate-spin text-[var(--accent-main)]" />
                  </div>
                </div>
                <div className="max-w-md px-4">
                  <h3 className="text-2xl font-semibold text-[var(--text-header)]">
                    Generating Resumes...
                  </h3>
                  <div className="mt-4 flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 text-[var(--text-muted)]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Processing Word templates and data...</span>
                    </div>
                    <p className="mt-2 text-base text-[var(--text-muted)] leading-relaxed">
                      This typically takes 5-10 seconds depending on the team
                      size and number of projects selected.
                    </p>
                  </div>
                </div>
              </div>
            ) : showGenerationSuccess ? (
              <div className="flex h-full flex-col items-center justify-center space-y-6 text-center py-12">
                <div className="rounded-full bg-green-50 p-6">
                  <CheckCircle2 className="h-20 w-20 text-green-500" />
                </div>
                <div className="px-4">
                  <h3 className="text-2xl font-semibold text-[var(--text-main)]">
                    Resumes Generated Successfully
                  </h3>
                  <p className="mt-2 text-lg text-[var(--text-muted)]">
                    Your files are ready in the output directory.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row px-4 w-full justify-center">
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--accent-main)] px-8 py-3 text-lg font-semibold text-[var(--accent-text)] shadow-lg transition hover:bg-[var(--accent-hover)]"
                    onClick={() => {
                      fetch(
                        `/api/saves/${encodeURIComponent(slugify(packageName))}/open_folder`,
                      );
                    }}
                    type="button"
                  >
                    Open Output Folder
                    <ExternalLink className="h-5 w-5" />
                  </button>
                  <button
                    className="inline-flex items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-main)] px-8 py-3 text-lg font-medium text-[var(--text-main)] transition hover:bg-[var(--bg-hover)]"
                    onClick={() => {
                      setShowGenerationSuccess(false);
                      setStep("package");
                    }}
                    type="button"
                  >
                    Generate Another
                  </button>
                </div>
              </div>
            ) : (
              <>
                {step === "package" && (
                  <StepPackage
                    onLoadSave={handleLoadSave}
                    onSelectProject={handleProjectSelection}
                    projects={allProjects}
                    saves={saves}
                    selectedProjectId={selectedProjectId}
                    value={packageName}
                  />
                )}

                {step === "people" && (
                  <StepPeople
                    allPeople={allPeople}
                    onChangeSelected={setSelectedNames}
                    selectedNames={selectedNames}
                  />
                )}

                {step === "configure" && (
                  <StepPersonConfig
                    onChangeSelectedNames={setSelectedNames}
                    onChangeSelections={setSelections}
                    personData={personData}
                    selectedNames={selectedNames}
                    selections={selections}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {!showGenerationSuccess && (
          <div className="shrink-0 border-t border-[var(--border-main)] bg-[var(--bg-card)] px-6 py-5 sm:px-8">
            <div className="flex items-center justify-between gap-4">
              <button
                className={`text-base font-medium transition ${
                  step === "package"
                    ? "invisible"
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                }`}
                onClick={goBack}
                type="button"
              >
                Back
              </button>
              <div className="flex items-center gap-3">
                {step === "configure" ? (
                  <button
                    className="rounded-[var(--radius-sm)] bg-[var(--accent-main)] px-8 py-3 text-base font-semibold text-[var(--accent-text)] shadow-lg transition hover:bg-[var(--accent-hover)] disabled:bg-[var(--border-main)] disabled:text-[var(--text-muted)] disabled:shadow-none"
                    disabled={selectedNames.length === 0 || isGenerating}
                    onClick={handleGenerate}
                    type="button"
                  >
                    {isGenerating ? "Generating..." : "Generate Resumes"}
                  </button>
                ) : (
                  <button
                    className="rounded-[var(--radius-sm)] bg-[var(--accent-main)] px-8 py-3 text-base font-semibold text-[var(--accent-text)] shadow-lg transition hover:bg-[var(--accent-hover)] disabled:bg-[var(--border-main)] disabled:text-[var(--text-muted)] disabled:shadow-none"
                    disabled={
                      (step === "package" && !packageName.trim()) ||
                      (step === "people" && selectedNames.length === 0)
                    }
                    onClick={handleNext}
                    type="button"
                  >
                    Continue
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
