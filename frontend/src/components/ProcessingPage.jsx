import React from 'react'
import { motion } from 'motion/react'
import { Brain, BarChart3, CheckCircle } from 'lucide-react'

const ProcessingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#060010] via-[#0a001a] to-[#060010] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-2xl text-center"
      >
        <motion.div
          className="bg-white/5 backdrop-blur-lg rounded-3xl border border-white/10 p-8 shadow-2xl"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Brain size={40} className="text-blue-400" />
              </motion.div>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Processing Your Data</h1>
            <p className="text-white/70 text-lg">
              Our AI is analyzing your dataset and preparing insights...
            </p>
          </motion.div>

          <motion.div
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-center space-x-4 text-white/70">
              <CheckCircle size={20} className="text-green-400" />
              <span>Data preprocessing completed</span>
            </div>
            <div className="flex items-center justify-center space-x-4 text-white/70">
              <motion.div
                className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <span>Running analysis algorithms...</span>
            </div>
            <div className="flex items-center justify-center space-x-4 text-white/50">
              <div className="w-5 h-5 border-2 border-white/20 rounded-full" />
              <span>Generating insights and recommendations</span>
            </div>
          </motion.div>

          <motion.div
            className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <p className="text-blue-400 text-sm">
              This may take a few minutes depending on your dataset size. Please don't close this page.
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default ProcessingPage
