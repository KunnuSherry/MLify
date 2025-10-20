import React from 'react'
import LiquidEther from './LiquidEther';
import BlurText from "./BlurText";
import ElectricBorder from './ElectricBorder'
import { useNavigate } from 'react-router-dom';



const Start = () => {
    const navigate = useNavigate();

    return (
        <div style={{ width: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
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
            </div>
            <section
                style={{
                    minHeight: '100vh',
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: '0 16px',
                    gap: '16px',
                    paddingTop: '100px' // Added top padding for mobile
                }}
                className="pt-32 md:pt-0"
            >
                <div className="w-full flex justify-center">
                    <BlurText
                        text="How it Works"
                        delay={150}
                        animateBy="words"
                        direction="top"
                        className="text-8xl mb-8 font-bold text-white"
                    />
                </div>
                <div className="mt-2 text-neutral-300 text-2xl md:text-3xl max-w-[900px]">
                    Upload your dataset, explore business insights, train models automatically, and get predictions — all in a few clicks.
                </div>
                <div className="mt-6 flex items-center gap-4">
                    <button className="px-6 py-3 rounded-full bg-white text-black font-semibold shadow-sm hover:opacity-90 transition"
                        onClick={() => navigate('/analysis')}
                    >
                        Upload Data
                    </button>
                    <button
                        className="px-6 py-3 rounded-full border border-neutral-600 text-white font-semibold hover:bg-white/10 transition"
                        onClick={() => {
                            const el = document.getElementById('learn-more');
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                    >
                        Read Steps
                    </button>
                </div>
                <div className='flex justify-center items-center mt-10'>
                    <img className="w-[50%] h-[50%]" src="/artificial-intelligence.gif" alt="AI animation" />
                </div>
            </section>

            <section id="learn-more" style={{ minHeight: '100vh', position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 16px', gap: '32px' }}>
                <div className="w-full max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8 justify-items-center">
                    <ElectricBorder color="#7df9ff" speed={1} chaos={0.5} thickness={2} style={{ borderRadius: 16 }}>
                        <div className="flex flex-col items-center p-6">
                            <span style={{ fontSize: 40 }}>📤</span>
                            <h3 className="mt-4 text-xl font-bold text-white">1. Upload Your Dataset</h3>
                            <p className="mt-2 text-neutral-300">Users upload CSV/Excel files and select the target variable.</p>
                        </div>
                    </ElectricBorder>
                    <ElectricBorder color="#7df9ff" speed={1} chaos={0.5} thickness={2} style={{ borderRadius: 16 }}>
                        <div className="flex flex-col items-center p-6">
                            <span style={{ fontSize: 40 }}>📊</span>
                            <h3 className="mt-4 text-xl font-bold text-white">2. Explore Your Data</h3>
                            <p className="mt-2 text-neutral-300">Auto-generate charts, correlation heatmaps, missing value reports, and textual business insights.</p>
                        </div>
                    </ElectricBorder>
                    <ElectricBorder color="#7df9ff" speed={1} chaos={0.5} thickness={2} style={{ borderRadius: 16 }}>
                        <div className="flex flex-col items-center p-6">
                            <span style={{ fontSize: 40 }}>🧠</span>
                            <h3 className="mt-4 text-xl font-bold text-white">3. Train Machine Learning Models</h3>
                            <p className="mt-2 text-neutral-300">Preprocessing + training 5 models, automatically selecting the best one.</p>
                        </div>
                    </ElectricBorder>
                    <ElectricBorder color="#7df9ff" speed={1} chaos={0.5} thickness={2} style={{ borderRadius: 16 }}>
                        <div className="flex flex-col items-center p-6">
                            <span style={{ fontSize: 40 }}>☁️⬇️</span>
                            <h3 className="mt-4 text-xl font-bold text-white">4. Get Predictions & Access Your Model</h3>
                            <p className="mt-2 text-neutral-300">Download the model or use API key for real-time predictions.</p>
                        </div>
                    </ElectricBorder>
                    <ElectricBorder color="#7df9ff" speed={1} chaos={0.5} thickness={2} style={{ borderRadius: 16 }}>
                        <div className="flex flex-col items-center p-6">
                            <span style={{ fontSize: 40 }}>📄</span>
                            <h3 className="mt-4 text-xl font-bold text-white">5. Export Reports & Insights</h3>
                            <p className="mt-2 text-neutral-300">Download full PDF/HTML report of EDA, model metrics, and visualizations.</p>
                        </div>
                    </ElectricBorder>
                    <ElectricBorder color="#7df9ff" speed={1} chaos={0.5} thickness={2} style={{ borderRadius: 16 }}>
                        <div className="flex flex-col items-center p-6">
                            <span style={{ fontSize: 40 }}>🫂</span>
                            <h3 className="mt-4 text-xl font-bold text-white">6. Enjoy</h3>
                            <p className="mt-2 text-neutral-300">Use your model to make predictions and gain insights.</p>
                        </div>
                    </ElectricBorder>
                </div>
            </section>

        </div>
    );
};

export default Start;