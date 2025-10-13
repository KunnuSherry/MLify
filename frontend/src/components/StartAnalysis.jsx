import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Upload,
  FileText,
  BarChart3,
  Brain,
  ArrowRight,
  CheckCircle,
  Loader2,
} from "lucide-react";
import LiquidEther from "./LiquidEther";

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

const StartAnalysis = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState("");
  const [selectedMode, setSelectedMode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMessages, setProgressMessages] = useState([]);

  // Simulated frontend updates (after backend process call)
  const progressFlow = [
    "Saving dataset...",
    "Handling missing values...",
    "Separating categorical and numerical columns...",
    "Analyzing correlations between features and target...",
    "Generating easy-to-understand insights and visualizations...",
    "Done! Insights ready 🎯",
  ];

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

    try {
      const response = await fetch("http://localhost:8000/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: fileData.filename, // <-- ADD THIS LINE
          target: selectedTarget,
          mode: mode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Show the backend error properly
        alert(`Processing failed: ${data.detail || JSON.stringify(data)}`);
        console.error("Backend error:", data);
        return;
      }

      console.log("✅ Processed Successfully:", data);
      alert("Processing complete! Check backend console for details.");
    } catch (error) {
      // Catch fetch/network errors
      console.error("❌ Processing failed:", error);
      alert(`Processing failed: ${error.toString()}`);
    } finally {
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
        <GlowCard className="px-4 py-3">
          <div className="flex items-center justify-center gap-3">
            {steps.map((step, i) => (
              <div key={step.number} className="flex items-center">
                <Pill
                  active={currentStep === step.number}
                  done={currentStep > step.number}
                >
                  {step.number}
                </Pill>
                <span className="ml-2 text-sm">{step.title}</span>
                {i < steps.length - 1 && (
                  <ArrowRight size={16} className="mx-3 text-white/30" />
                )}
              </div>
            ))}
          </div>
          <div className="relative mt-3 h-1 w-full rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-pink-300"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
          </div>
        </GlowCard>
      </div>

      <section className="relative mx-auto flex flex-1 w-full max-w-5xl items-center justify-center px-4 py-12">
        <GlowCard className="p-8 w-full">
          {/* Step 1: Upload */}
          {currentStep === 1 && (
            <div className="text-center">
              <Upload size={48} className="mx-auto mb-4 text-indigo-300" />
              <h2 className="text-3xl font-bold mb-2">Upload Your Dataset</h2>
              <label htmlFor="file" className="cursor-pointer">
                <div className="border-2 border-dashed border-white/20 p-8 rounded-xl">
                  Click or drag CSV file to upload
                </div>
                <input
                  type="file"
                  id="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Step 2: Target Selection */}
          {currentStep === 2 && fileData && (
            <div>
              <h2 className="text-2xl font-bold mb-4 text-center">
                Choose Target Variable
              </h2>
              <select
                className="w-full rounded-lg bg-white/10 border border-white/20 p-3"
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
              <div
                className="mt-6 overflow-x-auto rounded-xl border border-white/10 p-3"
                dangerouslySetInnerHTML={{ __html: fileData.preview }}
              />
            </div>
          )}

          {/* Step 3: Choose Mode */}
          {currentStep === 3 && (
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-6">
                Choose What You Want To Do
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                  onClick={() => handleModeSelect("business_insights")}
                  className="bg-indigo-600/30 hover:bg-indigo-600/50 p-6 rounded-xl"
                >
                  📊 Generate Insights
                </button>
                <button
                  onClick={() => handleModeSelect("model_trainer")}
                  className="bg-pink-600/30 hover:bg-pink-600/50 p-6 rounded-xl"
                >
                  🤖 Train ML Models
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Processing */}
          {isProcessing && (
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-6">Analyzing Dataset</h2>
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-indigo-300" size={40} />
                <div className="space-y-2 mt-4 text-left w-full max-w-md mx-auto">
                  {progressMessages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.2 }}
                      className="text-sm text-white/80 flex items-center gap-2"
                    >
                      <CheckCircle size={16} className="text-emerald-400" />{" "}
                      {msg}
                    </motion.div>
                  ))}
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
