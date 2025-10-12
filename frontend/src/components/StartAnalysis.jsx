import React, { useState } from 'react'
import { motion } from 'motion/react'
import { Upload, FileText, BarChart3, Brain, ArrowRight, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const StartAnalysis = () => {
  const navigate = useNavigate()
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
        alert(`Upload failed: ${error.detail}`)
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

      if (response.ok) {
        // Redirect to processing page
        navigate('/processing')
      } else {
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
    <div className="min-h-screen bg-gradient-to-br from-[#060010] via-[#0a001a] to-[#060010] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-4xl"
      >
        {/* Progress Bar */}
        <motion.div className="mb-8">
          <div className="flex items-center justify-center space-x-4 mb-4">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                className="flex items-center"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                    currentStep >= step.number
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/10 text-white/50'
                  }`}
                >
                  {currentStep > step.number ? <CheckCircle size={16} /> : step.number}
                </div>
                <span className="ml-2 text-white/70 text-sm">{step.title}</span>
                {index < steps.length - 1 && (
                  <ArrowRight size={16} className="mx-4 text-white/30" />
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Main Content */}
        <motion.div
          className="bg-white/5 backdrop-blur-lg rounded-3xl border border-white/10 p-8 shadow-2xl"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Step 1: Upload Dataset */}
          {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <div className="mb-6">
                <Upload size={48} className="mx-auto text-blue-400 mb-4" />
                <h2 className="text-3xl font-bold text-white mb-2">Upload Your Dataset</h2>
                <p className="text-white/70 text-lg">
                  Upload a CSV file to get started with your analysis
                </p>
              </div>

              <div className="border-2 border-dashed border-white/20 rounded-2xl p-8 hover:border-blue-400/50 transition-colors duration-300">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  disabled={isUploading}
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer block"
                >
                  <div className="text-center">
                    <Upload size={32} className="mx-auto text-white/50 mb-4" />
                    <p className="text-white text-lg mb-2">
                      {isUploading ? 'Uploading...' : 'Click to upload CSV file'}
                    </p>
                    <p className="text-white/50 text-sm">or drag and drop</p>
                  </div>
                </label>
              </div>

              {uploadedFile && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl"
                >
                  <div className="flex items-center justify-center text-green-400">
                    <CheckCircle size={20} className="mr-2" />
                    File uploaded successfully ✅
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Step 2: Choose Target Variable */}
          {currentStep === 2 && fileData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-6 text-center">
                <FileText size={48} className="mx-auto text-blue-400 mb-4" />
                <h2 className="text-3xl font-bold text-white mb-2">Choose Target Variable</h2>
                <p className="text-white/70 text-lg">
                  Select the column you want to analyze or predict
                </p>
              </div>

              <div className="mb-6">
                <select
                  value={selectedTarget}
                  onChange={(e) => handleTargetSelect(e.target.value)}
                  className="w-full p-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                >
                  <option value="">Select target variable to analyze or predict</option>
                  {fileData.columns.map((column, index) => (
                    <option key={index} value={column} className="bg-gray-800">
                      {column}
                    </option>
                  ))}
                </select>
              </div>

              {/* Data Preview */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h3 className="text-white font-semibold mb-3">Data Preview</h3>
                <div 
                  className="overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: fileData.preview }}
                />
              </div>
            </motion.div>
          )}

          {/* Step 3: Choose Mode */}
          {currentStep === 3 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-8 text-center">
                <BarChart3 size={48} className="mx-auto text-blue-400 mb-4" />
                <h2 className="text-3xl font-bold text-white mb-2">Choose Analysis Mode</h2>
                <p className="text-white/70 text-lg">
                  Select how you want to analyze your data
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Business Insights Card */}
                <motion.div
                  whileHover={{ scale: 1.02, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleModeSelect('business_insights')}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 cursor-pointer hover:border-blue-400/50 transition-all duration-300 group"
                >
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-500/30 transition-colors">
                      <BarChart3 size={32} className="text-blue-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">📊 Business Insights</h3>
                    <p className="text-white/70 text-sm leading-relaxed">
                      AI analyzes your dataset and uncovers trends, correlations, and business patterns.
                    </p>
                  </div>
                </motion.div>

                {/* Model Trainer Card */}
                <motion.div
                  whileHover={{ scale: 1.02, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleModeSelect('model_trainer')}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 cursor-pointer hover:border-blue-400/50 transition-all duration-300 group"
                >
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-500/30 transition-colors">
                      <Brain size={32} className="text-blue-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">🤖 Model Trainer</h3>
                    <p className="text-white/70 text-sm leading-relaxed">
                      AI preprocesses and trains multiple ML models to pick the best performer for you.
                    </p>
                  </div>
                </motion.div>
              </div>

              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-center"
                >
                  <div className="flex items-center justify-center text-blue-400">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400 mr-2"></div>
                    Processing your request...
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}

export default StartAnalysis
