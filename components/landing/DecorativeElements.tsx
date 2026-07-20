import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const DecorativeElements: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Parallax values for floating elements
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -800]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -1200]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, -500]);
  const y4 = useTransform(scrollYProgress, [0, 1], [0, -1500]);

  // Rotations
  const r1 = useTransform(scrollYProgress, [0, 1], [0, 180]);
  const r2 = useTransform(scrollYProgress, [0, 1], [0, -120]);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      
      {/* ── MASSIVE OUTLINE TEXT PARALLAX ── */}
      <motion.div 
        className="absolute top-[10%] -left-[10%] text-[20rem] font-black uppercase text-transparent opacity-10 whitespace-nowrap"
        style={{ 
          WebkitTextStroke: '2px #10b981',
          y: y1,
        }}
      >
        Govern
      </motion.div>

      <motion.div 
        className="absolute top-[30%] -right-[20%] text-[25rem] font-black uppercase text-transparent opacity-10 whitespace-nowrap"
        style={{ 
          WebkitTextStroke: '2px #f97316',
          y: y2,
        }}
      >
        Treasury
      </motion.div>

      <motion.div 
        className="absolute top-[60%] -left-[15%] text-[18rem] font-black uppercase text-transparent opacity-5 whitespace-nowrap"
        style={{ 
          WebkitTextStroke: '2px white',
          y: y3,
        }}
      >
        Decentralize
      </motion.div>

      <motion.div 
        className="absolute top-[85%] -right-[10%] text-[22rem] font-black uppercase text-transparent opacity-10 whitespace-nowrap"
        style={{ 
          WebkitTextStroke: '2px #10b981',
          y: y4,
        }}
      >
        Yield
      </motion.div>

      {/* ── HIGH-END PLANET IMAGES WITH MIX-BLEND ── */}
      
      {/* Jupiter */}
      <motion.img 
        src="https://images.unsplash.com/photo-1614728263952-84ea256f9679?auto=format&fit=crop&w=800&q=80"
        style={{ y: y2, rotate: r1 }}
        className="absolute top-[20%] right-[5%] w-[400px] h-[400px] object-cover rounded-full mix-blend-screen opacity-40 filter contrast-150"
        alt="Jupiter"
      />

      {/* Mars */}
      <motion.img 
        src="https://images.unsplash.com/photo-1614729939124-032f0b56c9ce?auto=format&fit=crop&w=800&q=80"
        style={{ y: y1, rotate: r2 }}
        className="absolute top-[45%] left-[5%] w-[500px] h-[500px] object-cover rounded-full mix-blend-screen opacity-30 filter contrast-125"
        alt="Mars"
      />

      {/* The Moon */}
      <motion.img 
        src="https://images.unsplash.com/photo-1545156521-77bd85671d30?auto=format&fit=crop&w=800&q=80"
        style={{ y: y4, rotate: r1 }}
        className="absolute top-[75%] left-[20%] w-[350px] h-[350px] object-cover rounded-full mix-blend-screen opacity-40 filter contrast-150 grayscale"
        alt="The Moon"
      />
    </div>
  );
};

export default DecorativeElements;
