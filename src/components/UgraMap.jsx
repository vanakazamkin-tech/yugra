import React from 'react';

export const UgraMap = ({ municipalities, activeRegionId, onSelectRegion, onHoverRegion }) => {
  return (
    <div className="relative w-full h-full min-h-[460px] bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center overflow-hidden p-4">
      {/* Точный SVG-контур карты ХМАО-Югры с интерактивными полигонами */}
      <svg viewBox="0 0 1000 600" className="w-full h-auto max-h-[440px] drop-shadow-2xl">
        <g className="transition-all duration-300">
          {municipalities.map((m) => {
            const isHovered = activeRegionId === m.id;
            
            return (
              <path
                key={m.id}
                d={m.svgPath}
                onMouseEnter={() => onHoverRegion(m.id)}
                onMouseLeave={() => onHoverRegion(null)}
                onClick={() => onSelectRegion(m)}
                className={`cursor-pointer transition-all duration-200 ${
                  isHovered 
                    ? 'fill-blue-600 stroke-white stroke-[2.5] scale-[1.01] z-30' 
                    : m.group2024 === 'A'
                    ? 'fill-emerald-950/80 stroke-emerald-500/80 stroke-[1.5] hover:fill-emerald-800'
                    : 'fill-slate-900 stroke-slate-700 stroke-[1.5] hover:fill-slate-800'
                }`}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
};