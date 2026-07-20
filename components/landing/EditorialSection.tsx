import React, { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

const EditorialSection: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 60, damping: 20 });

  // PNG Cutouts Parallax and Movement
  const img1Y = useTransform(smoothProgress, [0, 1], ["20vh", "-60vh"]);
  const img1Rotate = useTransform(smoothProgress, [0, 1], [0, -45]);
  const img1Scale = useTransform(smoothProgress, [0, 0.5, 1], [0.8, 1.2, 1]);

  const img2Y = useTransform(smoothProgress, [0, 1], ["80vh", "-30vh"]);
  const img2Rotate = useTransform(smoothProgress, [0, 1], [0, 60]);
  const img2X = useTransform(smoothProgress, [0, 1], ["0vw", "-20vw"]);

  // Text Animations
  const text1Opacity = useTransform(smoothProgress, [0, 0.25, 0.35], [1, 1, 0]);
  const text1Y = useTransform(smoothProgress, [0, 0.25], ["0%", "-30%"]);

  const text2Opacity = useTransform(smoothProgress, [0.3, 0.5, 0.65], [0, 1, 0]);
  const text2Y = useTransform(smoothProgress, [0.3, 0.5], ["30%", "0%"]);

  const text3Opacity = useTransform(smoothProgress, [0.6, 0.85, 1], [0, 1, 1]);
  const text3Y = useTransform(smoothProgress, [0.6, 0.85], ["30%", "0%"]);

  return (
    <div ref={containerRef} className="relative h-[300vh] bg-transparent">
      
      <section className="sticky top-0 w-full h-screen flex items-center justify-center overflow-hidden bg-black/20 backdrop-blur-md">
        
        {/* Floating Planet Cutouts (Mix-blend to remove black bg) */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          {/* Main Planet (Earth) */}
          <motion.img
            src="https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?auto=format&fit=crop&w=1000&q=80"
            style={{ y: img1Y, rotate: img1Rotate, scale: img1Scale }}
            className="absolute right-[-10%] md:right-[5%] w-[400px] h-[400px] md:w-[600px] md:h-[600px] object-cover rounded-full mix-blend-screen filter contrast-125 saturate-150"
            alt="Planet Earth"
          />
          
          {/* Secondary Planet (Moon) */}
          <motion.img
            src="https://images.unsplash.com/photo-1545156521-77bd85671d30?auto=format&fit=crop&w=800&q=80"
            style={{ y: img2Y, rotate: img2Rotate, x: img2X }}
            className="absolute left-[0%] md:left-[10%] w-[250px] h-[250px] md:w-[350px] md:h-[350px] object-cover rounded-full mix-blend-screen filter contrast-150 opacity-80"
            alt="The Moon"
          />
        </div>

        {/* Text Container */}
        <div className="relative z-10 flex items-center justify-center w-full h-full max-w-4xl px-6 pointer-events-none text-center">
          
          {/* Message 1 */}
          <motion.div style={{ opacity: text1Opacity, y: text1Y }} className="absolute inset-0 flex flex-col items-center justify-center">
            <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
              Fluid Capital.
            </h2>
            <p className="mt-6 text-xl md:text-3xl text-white/90 font-medium drop-shadow-2xl max-w-2xl leading-relaxed">
              Money shouldn't be static. Flow your investments directly into neighborhood infrastructure.
            </p>
          </motion.div>

          {/* Message 2 */}
          <motion.div style={{ opacity: text2Opacity, y: text2Y }} className="absolute inset-0 flex flex-col items-center justify-center">
            <h2 className="text-5xl md:text-7xl font-black text-emerald-400 tracking-tighter drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
              Organic Growth.
            </h2>
            <p className="mt-6 text-xl md:text-3xl text-white/90 font-medium drop-shadow-2xl max-w-2xl leading-relaxed">
              Watch your community thrive as projects are funded and returns stream back to you in real-time.
            </p>
          </motion.div>

          {/* Message 3 */}
          <motion.div style={{ opacity: text3Opacity, y: text3Y }} className="absolute inset-0 flex flex-col items-center justify-center">
            <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
              Boundless Yield.
            </h2>
            <p className="mt-6 text-xl md:text-3xl text-white/90 font-medium drop-shadow-2xl max-w-2xl leading-relaxed">
              No intermediaries. Just pure, algorithmic on-chain yields driven by local success.
            </p>
          </motion.div>

        </div>

      </section>
    </div>
  );
};

export default EditorialSection;
