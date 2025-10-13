import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Upload,
  FileText,
  BarChart3,
  ArrowRight,
  CheckCircle,
  Loader2,
  Info,
  Brain,
  Image as ImageIcon,
  ListTree,
} from "lucide-react";
import LiquidEther from "./LiquidEther";

/**
 * NOTE TO DEV: You asked for zero logic changes. All network calls, state names,
 * and the step flow are unchanged. Only the presentation layer and
 * how the backend results are rendered have been polished.
 */

/* --------------------------- SMALL UI PRIMITIVES --------------------------- */
const GlowCard = ({ children, className = "" }) => (
  <div
    className={`relative rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.35)] ${className}`}
  >
    {children}
  </div>
);

const Pill = ({ active, done, children }) => (
  <div
    className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-semibold transition-all duration-300 ${active || done
        ? "bg-indigo-500 text-white shadow-[0_6px_20px_rgba(99,102,241,0.45)]"
        : "bg-white/10 text-white/60"
      }`}
  >
    {done ? <CheckCircle size={16} /> : children}
  </div>
);

const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <div className="mb-4 flex items-start gap-3">
    <div className="rounded-2xl bg-white/10 p-2 text-indigo-300">
      <Icon size={18} />
    </div>
    <div>
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      {subtitle && (
        <p className="text-xs text-white/60 leading-relaxed">{subtitle}</p>
      )}
    </div>
  </div>
);

const Divider = () => (
  <div className="my-8 h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />
);

const JSONBlock = ({ data }) => (
  <div className="relative">
    <pre className="scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent overflow-x-auto rounded-xl bg-black/30 p-4 text-xs leading-relaxed">{JSON.stringify(data, null, 2)}</pre>
  </div>
);

const StatChip = ({ label, value }) => (
  <div className="rounded-2xl bg-white/10 px-4 py-3 text-center">
    <div className="text-xs uppercase tracking-wider text-white/60">{label}</div>
    <div className="mt-1 text-xl font-semibold">{value}</div>
  </div>
);

const KeyValueTable = ({ obj = {} }) => (
  <div className="overflow-hidden rounded-2xl border border-white/10">
    <table className="w-full text-sm">
      <thead className="bg-white/5 text-white/70">
        <tr>
          <th className="px-4 py-3 text-left font-medium">Key</th>
          <th className="px-4 py-3 text-left font-medium">Value</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(obj).map(([k, v], i) => (
          <tr key={k} className={i % 2 ? "bg-white/[0.04]" : "bg-transparent"}>
            <td className="px-4 py-3 font-medium text-white/90">{k}</td>
            <td className="px-4 py-3 text-white/80">
              {typeof v === "object" ? (
                <code className="rounded bg-black/30 px-2 py-1 text-[11px]">{JSON.stringify(v)}</code>
              ) : (
                String(v)
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Helper to prefix backend host to image URLs
const getImageUrl = (url) => {
  if (!url) return "";
  // If already absolute, return as is
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  // Otherwise, prefix backend host
  return `http://localhost:8000${url}`;
};

const ImageGrid = ({ items = [] }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {items.map((it, idx) => (
      <figure
        key={idx}
        className="group overflow-hidden rounded-2xl border border-white/10 bg-black/20"
      >
        <img
          src={getImageUrl(typeof it === "string" ? it : it.url)}
          alt={typeof it === "string" ? `Plot ${idx + 1}` : it.alt || `Plot ${idx + 1}`}
          className="max-h-[300px] w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
        />
        {it?.label && (
          <figcaption className="border-t border-white/10 p-2 text-center text-xs text-white/70">
            {it.label}
          </figcaption>
        )}
      </figure>
    ))}
  </div>
);

/* --------------------------------- PAGE ---------------------------------- */
const StartAnalysis = () => {
  // STATE (unchanged)
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState("");
  const [selectedMode, setSelectedMode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMessages, setProgressMessages] = useState([]);
  const [analysisResult, setAnalysisResult] = useState(null);

  // Backend progress text provided in original code (kept for reference)
  const progressFlow = [
    "Saving dataset...",
    "Handling missing values...",
    "Separating categorical and numerical columns...",
    "Analyzing correlations between features and target...",
    "Generating easy-to-understand insights and visualizations...",
    "Done! Insights ready 🎯",
  ];

  // HANDLERS (logic unchanged)
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      alert("Please upload a CSV file");
      return;
    }

    setUploadedFile(file);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("http://localhost:8000/upload", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      setFileData(data);
      setCurrentStep(2);
    } else {
      alert("Failed to upload file");
    }
  };

  const handleTargetSelect = (target) => {
    setSelectedTarget(target);
    setCurrentStep(3);
  };

  const handleModeSelect = async (mode) => {
    if (!selectedTarget) {
      alert("Please select a target variable first!");
      return;
    }

    setSelectedMode(mode);
    setIsProcessing(true);
    setAnalysisResult(null);

    try {
      const response = await fetch("http://localhost:8000/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: fileData.filename,
          target: selectedTarget,
          mode: mode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(`Processing failed: ${data.detail || JSON.stringify(data)}`);
        setIsProcessing(false);
        return;
      }

      setAnalysisResult(data);
      setCurrentStep(4);
      setIsProcessing(false);
    } catch (error) {
      alert(`Processing failed: ${error.toString()}`);
      setIsProcessing(false);
    }
  };

  const steps = [
    { number: 1, title: "Upload", icon: Upload },
    { number: 2, title: "Target", icon: FileText },
    { number: 3, title: "Mode", icon: BarChart3 },
  ];

  return (
    <div className="relative flex min-h-screen w-full flex-col pt-24 md:pt-28 text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <LiquidEther
          colors={["#5227FF", "#FF9FFC", "#B19EEF"]}
          mouseForce={20}
          cursorSize={100}
          viscous={30}
          iterationsViscous={32}
          iterationsPoisson={32}
          resolution={0.5}
        />
      </div>

      {/* Top Progress Bar */}
      <div className="sticky top-20 mx-auto w-full max-w-5xl px-4">
        <GlowCard className="px-4 py-4">
          <div className="flex items-center justify-center gap-3">
            {steps.map((step, i) => (
              <div key={step.number} className="flex items-center">
                <Pill
                  active={currentStep === step.number}
                  done={currentStep > step.number}
                >
                  {step.number}
                </Pill>
                <span className="ml-2 text-sm opacity-90">{step.title}</span>
                {i < steps.length - 1 && (
                  <ArrowRight size={16} className="mx-3 text-white/30" />
                )}
              </div>
            ))}
          </div>
          <div className="relative mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-pink-300"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
              transition={{ type: "spring", stiffness: 90, damping: 18 }}
            />
          </div>
        </GlowCard>
      </div>

      {/* Main Card */}
      <section className="relative mx-auto flex flex-1 w-full max-w-5xl items-center justify-center px-4 py-12">
        <GlowCard className="w-full p-6 sm:p-8">
          {/* Step 1: Upload */}
          {currentStep === 1 && (
            <div className="text-center">
              <Upload size={48} className="mx-auto mb-4 text-indigo-300" />
              <h2 className="mb-2 text-3xl font-bold tracking-tight">Upload Your Dataset</h2>
              <p className="mb-6 text-sm text-white/70">CSV only. We never store your data.</p>
              <label htmlFor="file" className="group inline-block cursor-pointer">
                <div className="rounded-2xl border-2 border-dashed border-white/20 p-8 transition-colors group-hover:border-indigo-400/60">
                  <div className="text-white/80">Click or drag CSV file to upload</div>
                </div>
                <input
                  type="file"
                  id="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {uploadedFile && (
                <p className="mt-3 text-xs text-white/70">Selected: {uploadedFile.name}</p>
              )}
            </div>
          )}

          {/* Step 2: Target Selection */}
          {currentStep === 2 && fileData && (
            <div>
              <SectionHeader
                icon={ListTree}
                title="Choose Target Variable"
                subtitle="Pick the column you want to analyze or predict against."
              />

              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/70">
                      Target Column
                    </label>
                    <select
                      className="w-full rounded-xl border border-white/20 bg-white/10 p-3 text-sm outline-none backdrop-blur placeholder:text-white/50"
                      value={selectedTarget}
                      onChange={(e) => handleTargetSelect(e.target.value)}
                    >
                      <option value="">Select target variable</option>
                      {fileData.columns.map((col, i) => (
                        <option key={i} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>

                    {/* Quick stats */}
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <StatChip label="Rows" value={fileData?.shape?.[0] ?? "-"} />
                      <StatChip label="Columns" value={fileData?.shape?.[1] ?? fileData?.columns?.length ?? "-"} />
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <Info size={14} className="text-indigo-300" />
                      Preview
                    </div>
                    <div
                      className="overflow-x-auto rounded-xl border border-white/10"
                      dangerouslySetInnerHTML={{ __html: fileData.preview }}
                    />
                  </div>
                </div>
              </div>

              <Divider />

              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  onClick={() => handleModeSelect("business_insights")}
                  className="rounded-2xl bg-indigo-600/30 p-6 text-left transition hover:bg-indigo-600/50"
                >
                  <div className="mb-2 text-2xl">📊</div>
                  <div className="text-lg font-semibold">Generate Insights</div>
                  <p className="mt-1 text-sm text-white/70">Auto charts + human-friendly summaries.</p>
                </button>
                <button
                  onClick={() => handleModeSelect("model_trainer")}
                  className="rounded-2xl bg-pink-600/30 p-6 text-left transition hover:bg-pink-600/50"
                >
                  <div className="mb-2 text-2xl">🤖</div>
                  <div className="text-lg font-semibold">Train ML Models</div>
                  <p className="mt-1 text-sm text-white/70">Benchmark common algorithms out of the box.</p>
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Choose Mode (kept simple, just refined visuals) */}
          {currentStep === 3 && (
            <div className="text-center">
              <h2 className="mb-2 text-3xl font-bold">Choose What You Want To Do</h2>
              <p className="mb-6 text-white/70">Pick one to start the analysis pipeline.</p>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <button
                  onClick={() => handleModeSelect("business_insights")}
                  className="rounded-2xl bg-indigo-600/30 p-6 text-left transition hover:bg-indigo-600/50"
                >
                  <div className="mb-2 text-2xl">📊</div>
                  <div className="text-lg font-semibold">Generate Insights</div>
                  <p className="mt-1 text-sm text-white/70">Auto charts + human-friendly summaries.</p>
                </button>
                <button
                  onClick={() => handleModeSelect("model_trainer")}
                  className="rounded-2xl bg-pink-600/30 p-6 text-left transition hover:bg-pink-600/50"
                >
                  <div className="mb-2 text-2xl">🤖</div>
                  <div className="text-lg font-semibold">Train ML Models</div>
                  <p className="mt-1 text-sm text-white/70">Benchmark common algorithms out of the box.</p>
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Nicely-presented analysis results */}
          {currentStep === 4 && analysisResult && (
            <div className="space-y-10">
              {/* Missing Values */}
              {(() => {
                const missingStep = analysisResult.steps?.find((s) => s.step === "missing_detected");
                if (!missingStep) return null;
                return (
                  <div>
                    <SectionHeader
                      icon={Info}
                      title="Missing Values"
                      subtitle="Detected missing values and basic imputation notes from your pipeline."
                    />

                    {missingStep?.details && typeof missingStep.details === "object" ? (
                      <KeyValueTable obj={missingStep.details} />
                    ) : (
                      <JSONBlock data={missingStep} />
                    )}

                    {missingStep?.message && (
                      <p className="mt-3 text-sm text-white/70">{missingStep.message}</p>
                    )}
                  </div>
                );
              })()}

              <Divider />

              {/* AI Insights (Gemini) */}
              {analysisResult?.ai_insights?.length > 0 && (
                <>
                  <Divider />
                  <div>
                    <SectionHeader
                      icon={Brain}
                      title="AI Insights"
                      subtitle="Gemini distilled the correlations into concise, decision-ready bullets."
                    />
                    <div className="grid gap-3">
                      {analysisResult.ai_insights.map((pt, i) => (
                        <div
                          key={i}
                          className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-white/90 leading-relaxed"
                        >
                          <span className="mr-2 text-white/60">•</span>{pt}
                        </div>
                      ))}
                    </div>

                    {analysisResult.ai_model && (
                      <div className="mt-3 text-xs text-white/60">
                        Generated by <span className="rounded-full bg-white/10 px-2 py-1">{analysisResult.ai_model}</span>
                      </div>
                    )}
                  </div>
                </>
              )}


              {/* Feature Types */}
              {(() => {
                const typeStep = analysisResult.steps?.find((s) => s.step === "separate_types");
                if (!typeStep) return null;
                return (
                  <div>
                    <SectionHeader
                      icon={ListTree}
                      title="Feature Types"
                      subtitle="Counts and lists of numeric vs categorical predictors."
                    />

                    <div className="mb-4 grid grid-cols-2 gap-3 sm:max-w-md">
                      <StatChip label="Numeric features" value={typeStep.numeric_cols?.length ?? 0} />
                      <StatChip label="Categorical features" value={typeStep.categorical_cols?.length ?? 0} />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="mb-2 text-sm font-medium">Numeric</div>
                        <div className="flex flex-wrap gap-2">
                          {(typeStep.numeric_cols || []).map((c) => (
                            <span key={c} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="mb-2 text-sm font-medium">Categorical</div>
                        <div className="flex flex-wrap gap-2">
                          {(typeStep.categorical_cols || []).map((c) => (
                            <span key={c} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <Divider />

              {/* Correlation Graphs */}
              <div>
                <SectionHeader
                  icon={ImageIcon}
                  title="Correlation & Feature Plots"
                  subtitle="Auto-generated visualizations from your backend results."
                />

                <div className="space-y-6">
                  {analysisResult.numeric_analysis?.corr_heatmap && (
                    <GlowCard className="p-4">
                      <div className="mb-2 text-sm font-medium">Numeric Correlation Heatmap</div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-2">
                        <img
                          src={getImageUrl(analysisResult.numeric_analysis.corr_heatmap)}
                          alt="Numeric Correlation Heatmap"
                          className="mx-auto max-h-[420px] w-full max-w-3xl object-contain"
                        />
                      </div>
                    </GlowCard>
                  )}

                  {Array.isArray(analysisResult.numeric_analysis?.top_feature_plots) && (
                    <div>
                      <div className="mb-2 text-sm font-medium">Numeric Feature Plots</div>
                      <ImageGrid
                        items={analysisResult.numeric_analysis.top_feature_plots.map((url, idx) => ({
                          url: getImageUrl(url),
                          label: `Numeric Feature Plot ${idx + 1}`,
                        }))}
                      />
                    </div>
                  )}

                  {Array.isArray(analysisResult.categorical_analysis?.plots) && (
                    <div>
                      <div className="mb-2 text-sm font-medium">Categorical Feature Plots</div>
                      <ImageGrid
                        items={analysisResult.categorical_analysis.plots.map((url, idx) => ({
                          url: getImageUrl(url),
                          label: `Categorical Feature Plot ${idx + 1}`,
                        }))}
                      />
                    </div>
                  )}
                </div>
              </div>

              <Divider />

              {/* Top related features */}
              {analysisResult.insights?.[0]?.top_features && (
                <div>
                  <SectionHeader
                    icon={BarChart3}
                    title="Top 3 Highly Related Features"
                    subtitle="Strongest relationships to your selected target variable."
                  />

                  <div className="space-y-3">
                    {analysisResult.insights[0].top_features.slice(0, 3).map((feat, idx) => {
                      const [name, valueRaw] = Object.entries(feat)[0];
                      const value = typeof valueRaw === "number" ? valueRaw : 0;
                      const pct = Math.min(100, Math.round(Math.abs(value) * 100));
                      return (
                        <div key={name} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="font-medium">{idx + 1}. {name}</div>
                            <div className="text-sm text-white/70">{typeof valueRaw === "number" ? valueRaw.toFixed(3) : String(valueRaw)}</div>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-pink-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Processing state (visuals only improved) */}
          {isProcessing && currentStep !== 4 && (
            <div className="text-center">
              <h2 className="mb-2 text-3xl font-bold">Analyzing Dataset</h2>
              <p className="mb-6 text-white/70">This may take a moment depending on file size.</p>
              <div className="mx-auto flex max-w-md flex-col items-center gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <Loader2 className="mx-auto animate-spin text-indigo-300" size={40} />
                </div>

                <div className="w-full space-y-2 text-left">
                  {(progressMessages?.length ? progressMessages : []).map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-2 text-sm text-white/80"
                    >
                      <CheckCircle size={16} className="text-emerald-400" /> {msg}
                    </motion.div>
                  ))}

                  {/* Fallback hint list (UI only, no state mutation) */}
                  {!progressMessages?.length && (
                    <div className="text-xs text-white/60">
                      <div className="mb-1">We'll keep you posted on progress…</div>
                      <ul className="list-inside list-disc space-y-1">
                        {progressFlow.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </GlowCard>
      </section>
    </div>
  );
};

export default StartAnalysis;
