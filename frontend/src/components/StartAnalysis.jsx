import React, { useState } from 'react'
import { motion } from 'motion/react'
import { Upload, FileText, BarChart3, Brain, ArrowRight, CheckCircle } from 'lucide-react'
import LiquidEther from './LiquidEther'

// Small, reusable UI primitives (no text changes)
const GlowCard = ({ className = '', children }) => (
  <div className={`relative rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.35)] ${className}`}>
    {/* subtle animated gradient ring */}
    <div className="pointer-events-none absolute -inset-[1px] rounded-3xl [background:radial-gradient(1200px_400px_at_var(--mx)_var(--my),rgba(99,102,241,.25),transparent_40%)]" />
    {children}
  </div>
)

const Pill = ({ active, done, children }) => (
  <div
    className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-semibold transition-all duration-300 ${
      active || done ? 'bg-indigo-500 text-white shadow-[0_6px_20px_rgba(99,102,241,0.45)]' : 'bg-white/10 text-white/60'
    }`}
  >
    {done ? <CheckCircle size={16} /> : children}
  </div>
)

const HoverFloat = ({ children }) => (
  <motion.div whileHover={{ y: -4, scale: 1.01 }} whileTap={{ scale: 0.99 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }}>
    {children}
  </motion.div>
)

const StartAnalysis = () => {
  const [currentStep, setCurrentStep] = useState(1)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [fileData, setFileData] = useState(null)
  const [selectedTarget, setSelectedTarget] = useState('')
  const [selectedMode, setSelectedMode] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file')
      return
    }

    setIsUploading(true)
    setUploadedFile(file)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setFileData(data)
        setCurrentStep(2)
      } else {
        const error = await response.json()
        alert(`Upload failed: ${error.message}`)
      }
    } catch (error) {
      alert(`Upload failed: ${error.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleTargetSelect = (target) => {
    setSelectedTarget(target)
    setCurrentStep(3)
  }

  const handleModeSelect = async (mode) => {
    setSelectedMode(mode)
    setIsProcessing(true)

    try {
      const response = await fetch('http://localhost:8000/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: selectedTarget,
          mode: mode,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        alert(`Processing failed: ${error.detail}`)
      }
    } catch (error) {
      alert(`Processing failed: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const steps = [
    { number: 1, title: 'Upload', icon: Upload },
    { number: 2, title: 'Target', icon: FileText },
    { number: 3, title: 'Mode', icon: BarChart3 },
  ]

  return (
    <div className="relative flex min-h-screen w-full flex-col pt-24 md:pt-28">
      {/* LiquidEther background */}
      <div className="fixed inset-0 -z-10">
        <LiquidEther
          colors={['#5227FF', '#FF9FFC', '#B19EEF']}
          mouseForce={20}
          cursorSize={100}
          isViscous={false}
          viscous={30}
          iterationsViscous={32}
          iterationsPoisson={32}
          resolution={0.5}
          isBounce={false}
          autoDemo={false}
          autoSpeed={0.5}
          autoIntensity={2.2}
          takeoverDuration={0.25}
          autoResumeDelay={3000}
          autoRampDuration={0.6}
          className="pointer-events-auto"
        />
        {/* soft vignette for depth */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_-10%,rgba(255,255,255,0.12),transparent_60%),linear-gradient(to_bottom,transparent,rgba(0,0,0,0.35))]" />
      </div>

      {/* Top progress rail */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-20 md:top-24 z-20 mx-auto mt-6 w-full max-w-5xl px-4"
      >
        <GlowCard className="px-4 py-3">
          <div className="flex items-center justify-center gap-3">
            {steps.map((step, idx) => (
              <motion.div
                key={step.number}
                className="flex items-center"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.08 }}
              >
                <Pill active={currentStep === step.number} done={currentStep > step.number}>
                  {step.number}
                </Pill>
                <span className="ml-2 text-sm text-white/70">{step.title}</span>
                {idx < steps.length - 1 && <ArrowRight size={16} className="mx-3 text-white/30" />}
              </motion.div>
            ))}
          </div>
          {/* progress bar line */}
          <div className="relative mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              layout
              className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-pink-300"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 18 }}
            />
          </div>
        </GlowCard>
      </motion.div>

      {/* Main content */}
      <section className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full"
        >
          <GlowCard className="p-6 md:p-8">
            {/* Step 1: Upload Dataset */}
            {!isProcessing && currentStep === 1 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="text-center">
                <div className="mb-6">
                  <Upload size={48} className="mx-auto mb-4 text-indigo-300" />
                  <h2 className="mb-2 text-3xl font-bold text-white">Upload Your Dataset</h2>
                  <p className="text-lg text-white/70">Upload a CSV file to get started with your analysis</p>
                </div>

                <label htmlFor="file-upload" className="group block cursor-pointer">
                  <div className="rounded-2xl border-2 border-dashed border-white/20 p-8 transition-colors duration-300 group-hover:border-indigo-400/60">
                    <Upload size={32} className="mx-auto mb-4 text-white/60 transition-colors group-hover:text-white" />
                    <p className="mb-1 text-lg text-white group-hover:text-white">
                      {isUploading ? 'Uploading...' : 'Click to upload CSV file'}
                    </p>
                    <p className="text-sm text-white/50">or drag and drop</p>
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="sr-only"
                    id="file-upload"
                    disabled={isUploading}
                    aria-label="Upload CSV file"
                  />
                </label>

                {uploadedFile && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mt-6 w-full max-w-md rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4">
                    <div className="flex items-center justify-center text-emerald-300">
                      <CheckCircle size={20} className="mr-2" />
                      File uploaded successfully ✅
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Step 2: Choose Target Variable */}
            {!isProcessing && currentStep === 2 && fileData && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
                <div className="mb-6 text-center">
                  <FileText size={48} className="mx-auto mb-4 text-indigo-300" />
                  <h2 className="mb-2 text-3xl font-bold text-white">Choose Target Variable</h2>
                  <p className="text-lg text-white/70">Select the column you want to analyze or predict</p>
                </div>

                <div className="mb-6">
                  <div className="relative">
                    <select
                      value={selectedTarget}
                      onChange={(e) => handleTargetSelect(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-white/20 bg-white/10 p-4 pr-12 text-white placeholder-white/50 outline-none transition focus:border-transparent focus:ring-2 focus:ring-indigo-400"
                    >
                      <option value="">Select target variable to analyze or predict</option>
                      {fileData.columns.map((column, index) => (
                        <option key={index} value={column} className="bg-slate-900">
                          {column}
                        </option>
                      ))}
                    </select>
                    <ArrowRight size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/40" />
                  </div>
                </div>

                {/* Data Preview */}
                <GlowCard className="p-4">
                  <h3 className="mb-3 font-semibold text-white">Data Preview</h3>
                  <div className="max-h-[50vh] overflow-auto rounded-lg border border-white/10 bg-black/20 p-2">
                    <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: fileData.preview }} />
                  </div>
                </GlowCard>
              </motion.div>
            )}

            {/* Step 3: Choose Mode */}
            {!isProcessing && currentStep === 3 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
                <div className="mb-8 text-center">
                  <BarChart3 size={48} className="mx-auto mb-4 text-indigo-300" />
                  <h2 className="mb-2 text-3xl font-bold text-white">Choose Analysis Mode</h2>
                  <p className="text-lg text-white/70">Select how you want to analyze your data</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Business Insights Card */}
                  <HoverFloat>
                    <button
                      type="button"
                      onClick={() => handleModeSelect('business_insights')}
                      className="group w-full rounded-2xl border border-white/10 bg-white/5 p-6 text-left outline-none transition hover:border-indigo-400/60 focus-visible:ring-2 focus-visible:ring-indigo-400"
                    >
                      <div className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/20 transition-colors group-hover:bg-indigo-500/30">
                          <BarChart3 size={32} className="text-indigo-300" />
                        </div>
                        <h3 className="mb-3 text-xl font-bold text-white">📊 Business Insights</h3>
                        <p className="text-sm leading-relaxed text-white/70">AI analyzes your dataset and uncovers trends, correlations, and business patterns.</p>
                      </div>
                    </button>
                  </HoverFloat>

                  {/* Model Trainer Card */}
                  <HoverFloat>
                    <button
                      type="button"
                      onClick={() => handleModeSelect('model_trainer')}
                      className="group w-full rounded-2xl border border-white/10 bg-white/5 p-6 text-left outline-none transition hover:border-indigo-400/60 focus-visible:ring-2 focus-visible:ring-indigo-400"
                    >
                      <div className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/20 transition-colors group-hover:bg-indigo-500/30">
                          <Brain size={32} className="text-indigo-300" />
                        </div>
                        <h3 className="mb-3 text-xl font-bold text-white">🤖 Model Trainer</h3>
                        <p className="text-sm leading-relaxed text-white/70">AI preprocesses and trains multiple ML models to pick the best performer for you.</p>
                      </div>
                    </button>
                  </HoverFloat>
                </div>

                {isProcessing && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-xl border border-indigo-500/25 bg-indigo-500/10 p-4 text-center">
                    <div className="flex items-center justify-center text-indigo-300">
                      <div className="mr-2 h-5 w-5 animate-spin rounded-full border-b-2 border-indigo-300" />
                      Processing your request...
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Processing UI (merged from ProcessingPage) */}
            {isProcessing && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mx-auto w-full max-w-2xl text-center">
                <GlowCard className="p-8">
                  <motion.div className="mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500/20">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                        <Brain size={40} className="text-indigo-300" />
                      </motion.div>
                    </div>
                    <h1 className="mb-2 text-4xl font-bold text-white">Processing Your Data</h1>
                    <p className="text-lg text-white/70">Our AI is analyzing your dataset and preparing insights...</p>
                  </motion.div>

                  <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                    <div className="flex items-center justify-center gap-3 text-white/80">
                      <CheckCircle size={20} className="text-emerald-300" />
                      <span>Data preprocessing completed</span>
                    </div>
                    <div className="flex items-center justify-center gap-3 text-white/80">
                      <motion.div className="h-5 w-5 rounded-full border-2 border-indigo-300 border-t-transparent" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
                      <span>Running analysis algorithms...</span>
                    </div>
                    <div className="flex items-center justify-center gap-3 text-white/60">
                      <div className="h-5 w-5 rounded-full border-2 border-white/20" />
                      <span>Generating insights and recommendations</span>
                    </div>
                  </motion.div>

                  <motion.div className="mt-8 rounded-xl border border-indigo-500/25 bg-indigo-500/10 p-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                    <p className="text-sm text-indigo-300">This may take a few minutes depending on your dataset size. Please don't close this page.</p>
                  </motion.div>
                </GlowCard>
              </motion.div>
            )}
          </GlowCard>
        </motion.div>
      </section>
    </div>
  )
}

export default StartAnalysis
