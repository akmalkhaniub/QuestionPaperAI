import React from "react";

interface Mark {
  x: number;
  y: number;
  w: number;
  h: number;
  fill_ratio: number;
}

interface ScanResultVisualizerProps {
  imageUrl: string;
  marks: Mark[];
}

const ScanResultVisualizer: React.FC<ScanResultVisualizerProps> = ({ imageUrl, marks }) => {
  return (
    <div className="relative inline-block">
      <img src={imageUrl} alt="Scanned Sheet" className="max-h-64 rounded shadow" />
      <svg
        className="absolute left-0 top-0 pointer-events-none"
        style={{ width: '100%', height: '100%', zIndex: 2 }}
      >
        {marks.map((mark, idx) => (
          <rect
            key={idx}
            x={mark.x}
            y={mark.y}
            width={mark.w}
            height={mark.h}
            fill="none"
            stroke={mark.fill_ratio > 0.7 ? '#22c55e' : '#f59e42'}
            strokeWidth="2"
          />
        ))}
      </svg>
    </div>
  );
};

export default ScanResultVisualizer;
