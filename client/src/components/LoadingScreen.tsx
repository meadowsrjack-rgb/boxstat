import { motion } from "framer-motion";

export default function LoadingScreen() {
  const transition = {
    duration: 2,
    repeat: Infinity,
    repeatType: "reverse" as const,
    ease: "easeInOut",
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black">
      <div className="relative w-24 h-32">
        <motion.svg
          viewBox="0 0 100 120"
          className="absolute inset-0 w-full h-full"
          initial={{ x: -30, y: -30, opacity: 0 }}
          animate={{ x: 0, y: 0, opacity: 1 }}
          transition={transition}
        >
          <path 
            d="M50 5 L93 30 L93 55 L50 80 L7 55 L7 30 Z" 
            fill="none" 
            stroke="white" 
            strokeWidth="6" 
            strokeLinejoin="round" 
          />
          <path 
            d="M50 5 L50 55 M50 55 L93 30 M50 55 L7 30" 
            stroke="white" 
            strokeWidth="6" 
            strokeLinecap="round" 
          />
        </motion.svg>

        <motion.svg
          viewBox="0 0 100 120"
          className="absolute inset-0 w-full h-full"
          initial={{ x: 30, y: 30, opacity: 0 }}
          animate={{ x: 0, y: 0, opacity: 1 }}
          transition={transition}
        >
          <path 
            d="M7 65 L50 90 L50 115 L93 90 L93 65 L50 40 Z" 
            fill="none" 
            stroke="white" 
            strokeWidth="6" 
            strokeLinejoin="round" 
          />
          <path 
            d="M50 90 L93 65 M50 90 L7 65 M50 90 L50 40" 
            stroke="white" 
            strokeWidth="6" 
            strokeLinecap="round" 
          />
        </motion.svg>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mt-8 text-gray-500 font-medium tracking-widest text-xs uppercase"
      >
        Loading...
      </motion.p>
    </div>
  );
}
