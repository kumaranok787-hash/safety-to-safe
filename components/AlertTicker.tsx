import { AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AlertTicker() {
  return (
    <div className="bg-red-600 text-white flex items-center overflow-hidden py-2 px-3 relative z-10">
      <AlertTriangle className="w-5 h-5 mr-2 shrink-0 animate-pulse" />
      <div className="flex-1 overflow-hidden whitespace-nowrap relative">
        <motion.div
          animate={{ x: ['100%', '-100%'] }}
          transition={{ repeat: Infinity, duration: 15, ease: 'linear' }}
          className="inline-block font-medium text-sm"
        >
          🚨 RED ALERT: Heavy rainfall expected in coastal regions. Stay indoors. 🚨 COVID-19 booster camps open in all district hospitals. 🚨 Heatwave warning for northern states.
        </motion.div>
      </div>
    </div>
  );
}
