import React, { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { fetchActiveDaos, type OnchainDao } from "../../utils/civicVaultContracts";
import { buildDaoImageDataUri } from "../../utils/daoImage";

interface CommunityGalleryProps {
  onViewChange?: (view: "discover") => void;
}

const CommunityGallery: React.FC<CommunityGalleryProps> = ({ onViewChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [scrollRange, setScrollRange] = useState(0);
  const [daos, setDaos] = useState<OnchainDao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchActiveDaos()
      .then((result) => {
        if (!cancelled) setDaos(result);
      })
      .catch(() => {
        // On-chain read failed (RPC hiccup, etc.) — fall through to the empty state below
        // rather than showing anything fabricated.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
  });

  // Calculate the exact distance to scroll horizontally based on the track's width.
  // Re-runs once the (async, on-chain) DAO list lands, since the track is empty until then.
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
  }, [daos]);

  // Moves the cards container horizontally by the exact calculated pixels.
  const x = useTransform(scrollYProgress, [0, 1], [0, -scrollRange]);

  const hasDaos = daos.length > 0;

  return (
    <div ref={containerRef} className={hasDaos ? "relative h-[1500vh] bg-transparent" : "relative bg-transparent"}>
      <div className="sticky top-0 h-screen flex flex-col justify-center overflow-hidden bg-black/40 backdrop-blur-md">

        <div className="absolute top-20 left-10 md:left-24 z-10 pointer-events-none">
          <h2 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight">
            Communities <br />
            <span className="text-emerald-400">investing together.</span>
          </h2>
          <p className="mt-4 max-w-lg text-lg text-white/60">
            {hasDaos
              ? "Every project below is a real neighborhood DAO — funded by residents, governed on-chain, and open to anyone."
              : loading
                ? "Loading communities from Arc Testnet…"
                : "No communities have launched on-chain yet — be the first."}
          </p>
        </div>

        {/* Horizontal Scroll Track */}
        <motion.div
          ref={trackRef}
          style={{ x }}
          className="flex gap-8 px-10 md:px-24 mt-32 items-center w-max"
        >
          {daos.map((dao) => (
            <button
              key={dao.address}
              type="button"
              onClick={() => onViewChange?.("discover")}
              className="relative w-[300px] h-[400px] md:w-[450px] md:h-[600px] shrink-0 rounded-3xl overflow-hidden group shadow-2xl text-left cursor-pointer"
            >
              <img
                src={buildDaoImageDataUri(dao.name, dao.address)}
                alt={dao.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-0 p-8 w-full transform transition-transform duration-500 translate-y-4 group-hover:translate-y-0">
                <h3 className="text-2xl font-bold text-white mb-2">{dao.name}</h3>
                <p className="text-emerald-400 text-sm font-bold tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  View DAO →
                </p>
              </div>
            </button>
          ))}
        </motion.div>

      </div>
    </div>
  );
};

export default CommunityGallery;
