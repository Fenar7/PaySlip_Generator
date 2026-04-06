"use client";

import React from "react";

interface UsageIndicatorProps {
  current: number;
  limit: number; // -1 = unlimited
  label: string;
  showBar?: boolean;
}

function getBarColor(percentage: number): string {
  if (percentage >= 90) return "bg-red-500";
  if (percentage >= 75) return "bg-yellow-500";
  return "bg-green-500";
}

export function UsageIndicator({
  current,
  limit,
  label,
  showBar = true,
}: UsageIndicatorProps) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : limit > 0 ? (current / limit) * 100 : 0;
  const isAtLimit = !isUnlimited && limit > 0 && current >= limit;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className={isAtLimit ? "font-medium text-red-600" : "text-gray-900"}>
          {current.toLocaleString()} / {isUnlimited ? "∞" : limit.toLocaleString()}
        </span>
      </div>

      {showBar && !isUnlimited && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full rounded-full transition-all ${getBarColor(percentage)}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}

      {isAtLimit && (
        <p className="text-xs font-medium text-red-600">Limit reached</p>
      )}
    </div>
  );
}
