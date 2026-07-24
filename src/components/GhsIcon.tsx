/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  Flame,
  Skull,
  Zap,
  Bomb,
  AlertTriangle,
  ShieldAlert,
  Wind,
  Droplet,
  Trees,
} from "lucide-react";
import { GHS_PICTOGRAMS } from "../types";

interface GhsIconProps {
  type: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export const GhsIcon: React.FC<GhsIconProps> = ({
  type,
  size = "md",
  showLabel = false,
}) => {
  const meta = GHS_PICTOGRAMS[type];
  if (!meta) return null;

  // Render appropriate icon based on type
  const renderIcon = () => {
    const iconSize = size === "sm" ? 14 : size === "md" ? 20 : 28;
    const classes = "text-neutral-900";

    switch (type) {
      case "explosive":
        return <Bomb className={classes} size={iconSize} />;
      case "flammable":
        return <Flame className={classes} size={iconSize} />;
      case "oxidizing":
        return <Zap className={classes} size={iconSize} />;
      case "gases_under_pressure":
        return <Wind className={classes} size={iconSize} />;
      case "corrosive":
        return <Droplet className={classes} size={iconSize} />;
      case "toxic":
        return <Skull className={classes} size={iconSize} />;
      case "irritant":
        return <AlertTriangle className={classes} size={iconSize} />;
      case "health_hazard":
        return <ShieldAlert className={classes} size={iconSize} />;
      case "environmental":
        return <Trees className={classes} size={iconSize} />;
      default:
        return <AlertTriangle className={classes} size={iconSize} />;
    }
  };

  const containerSizes = {
    sm: "w-8 h-8",
    md: "w-12 h-12 border-[2px]",
    lg: "w-18 h-18 border-[3px]",
  };

  return (
    <div className="flex flex-col items-center group relative cursor-help">
      {/* Rotated red diamond container representing official GHS standard */}
      <div
        className={`flex items-center justify-center bg-white border-red-600 rotate-45 transform transition-transform hover:scale-110 ${containerSizes[size]} shadow-sm`}
        style={{ borderRadius: "2px" }}
      >
        {/* Anti-rotated icon to keep it upright */}
        <div className="-rotate-45 flex items-center justify-center">
          {renderIcon()}
        </div>
      </div>

      {showLabel && (
        <span className="mt-3 text-xs font-semibold text-neutral-700 text-center">
          {meta.nameKo}
        </span>
      )}

      {/* Elegant informative tooltip */}
      <div className="absolute bottom-full mb-3 hidden group-hover:flex flex-col w-56 p-2 bg-neutral-900 text-white text-xs rounded shadow-lg z-50 pointer-events-none transition-opacity duration-200">
        <p className="font-bold border-b border-neutral-700 pb-1 mb-1 text-red-400">
          {meta.nameKo} ({meta.nameEn})
        </p>
        <p className="text-neutral-300 leading-relaxed">{meta.description}</p>
      </div>
    </div>
  );
};
