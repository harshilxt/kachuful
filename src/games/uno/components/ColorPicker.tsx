import { motion } from "framer-motion";
import { COLOR_HEX, UNO_COLORS, type UnoColor } from "../engine/types";

interface Props {
  onPick: (c: UnoColor) => void;
}

export function ColorPicker({ onPick }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.85, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        className="panel p-5 text-center"
      >
        <div className="text-sm uppercase tracking-[0.25em] text-white/70 mb-3">
          Pick a colour
        </div>
        <div className="grid grid-cols-2 gap-3">
          {UNO_COLORS.map((c) => (
            <motion.button
              key={c}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onPick(c)}
              className="w-20 h-20 rounded-2xl shadow-card border-4 border-white/20"
              style={{ background: COLOR_HEX[c] }}
              aria-label={c}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
