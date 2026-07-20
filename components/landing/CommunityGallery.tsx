import React, { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export const COMMUNITY_PRODUCTS = [
  { title: "Riverside Commons",     thumbnail: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80" },
  { title: "Downtown Co-op",        thumbnail: "https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=600&q=80" },
  { title: "Sunset Heights",        thumbnail: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=600&q=80" },
  { title: "Tech District Hub",     thumbnail: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80" },
  { title: "Harbor View",           thumbnail: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=600&q=80" },
  { title: "Green Valley Estate",   thumbnail: "https://images.unsplash.com/photo-1494522855154-9297ac14b55f?auto=format&fit=crop&w=600&q=80" },
  { title: "Arts Quarter",          thumbnail: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=600&q=80" },
  { title: "Lakeside DAO",          thumbnail: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80" },
  { title: "Pine Ridge",            thumbnail: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80" },
  { title: "Ocean Breeze",          thumbnail: "https://images.unsplash.com/photo-1510627489930-0c1b0bfb6785?auto=format&fit=crop&w=600&q=80" },
  { title: "Urban Oasis",           thumbnail: "https://images.unsplash.com/photo-1448630360428-65456885c650?auto=format&fit=crop&w=600&q=80" },
  { title: "Highland Park",         thumbnail: "https://images.unsplash.com/photo-1600607687920-4e2a09be1587?auto=format&fit=crop&w=600&q=80" },
  { title: "Maplewood Village",     thumbnail: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=600&q=80" },
  { title: "Silicon Alley",         thumbnail: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80" },
  { title: "Golden Gate Co-op",     thumbnail: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=600&q=80" }
];

const CommunityGallery: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [scrollRange, setScrollRange] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
  });

  // Calculate the exact distance to scroll horizontally based on the track's width
  useEffect(() => {
    const calculateRange = () => {
      if (trackRef.current) {
        // scrollWidth is total width of all children + gaps.
        // innerWidth is the viewport width. 
        // We add some padding at the end so the last card isn't completely flush with the screen edge.
        const paddingRight = 100;
        setScrollRange(trackRef.current.scrollWidth - window.innerWidth + paddingRight);
      }
    };

    calculateRange();
    window.addEventListener("resize", calculateRange);
    return () => window.removeEventListener("resize", calculateRange);
  }, []);

  // Moves the cards container horizontally by the exact calculated pixels.
  const x = useTransform(scrollYProgress, [0, 1], [0, -scrollRange]);

  return (
    <div ref={containerRef} className="relative h-[1500vh] bg-transparent">
      <div className="sticky top-0 h-screen flex flex-col justify-center overflow-hidden bg-black/40 backdrop-blur-md">
        
        <div className="absolute top-20 left-10 md:left-24 z-10 pointer-events-none">
          <h2 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight">
            Communities <br />
            <span className="text-emerald-400">investing together.</span>
          </h2>
          <p className="mt-4 max-w-lg text-lg text-white/60">
            Every project below is run by a real neighborhood DAO — funded by residents, governed on-chain, and open to anyone.
          </p>
        </div>

        {/* Horizontal Scroll Track */}
        <motion.div 
          ref={trackRef}
          style={{ x }} 
          className="flex gap-8 px-10 md:px-24 mt-32 items-center w-max"
        >
          {COMMUNITY_PRODUCTS.map((product, index) => (
            <div 
              key={index} 
              className="relative w-[300px] h-[400px] md:w-[450px] md:h-[600px] shrink-0 rounded-3xl overflow-hidden group shadow-2xl"
            >
              <img
                src={product.thumbnail}
                alt={product.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-0 p-8 w-full transform transition-transform duration-500 translate-y-4 group-hover:translate-y-0">
                <h3 className="text-2xl font-bold text-white mb-2">{product.title}</h3>
                <p className="text-emerald-400 text-sm font-bold tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  View DAO →
                </p>
              </div>
            </div>
          ))}
        </motion.div>
        
      </div>
    </div>
  );
};

export default CommunityGallery;
