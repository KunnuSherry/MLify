import React from 'react'
import LiquidEther from './LiquidEther';
import TrueFocus from './TrueFocus';
import DecayCard from './DecayCard';
import PixelCard from './PixelCard';
import { useNavigate } from 'react-router-dom';

const Home = () => {
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

      {/* Hero section (fills first viewport) */}
      <section style={{ minHeight: '100vh', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 16px', gap: '16px' }}>
        <TrueFocus
          sentence="MLify Datasets"
          manualMode={true}
          blurAmount={5}
          borderColor="red"
          animationDuration={2}
          pauseBetweenAnimations={1}
        />
        <div className="mt-2 text-neutral-300 text-2xl md:text-3xl max-w-[900px]">
          Turn your data into insights and smart predictions
        </div>
        <div className="mt-6 flex items-center gap-4">
<<<<<<< HEAD
          <button 
            className="px-6 py-3 rounded-full bg-white text-black font-semibold shadow-sm hover:opacity-90 transition"
            onClick={() => window.location.href = '/analysis'}
=======
          <button className="px-6 py-3 rounded-full bg-white text-black font-semibold shadow-sm hover:opacity-90 transition" 
            onClick={() => navigate('/start')}
>>>>>>> 61554bcd022c9e386f1f0777a7e26a5afec6b18d
          >
            Get Started
          </button>
          <button
            className="px-6 py-3 rounded-full border border-neutral-600 text-white font-semibold hover:bg-white/10 transition"
            onClick={() => {
              const el = document.getElementById('learn-more');
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            Learn More
          </button>
        </div>
      </section>

        {/* Learn more section (starts after first 100vh) */}
        <section id="learn-more" style={{ minHeight: '100vh', position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 16px', gap: '12px' }}>

          <PixelCard variant="pink">
              <img className='abs' src="/kunal.png" alt="Kunal Sharma" />
          </PixelCard>

        <div className="mt-2 text-neutral-300 text-2xl md:text-3xl max-w-[900px]">
          Kunal Sharma is a passionate software developer and tech enthusiast, skilled in Python, Java, and full-stack web development. He combines problem-solving abilities with creativity to build innovative projects and practical solutions.
        </div>
      </section>
    </div>
  )
}

export default Home