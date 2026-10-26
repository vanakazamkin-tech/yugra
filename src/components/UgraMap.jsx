import React, { useMemo } from 'react';
import { MAP_VIEWBOX, districts, cities } from '../ugraMapGeo';

const BLUE = '#4285f4';

/**
 * Интерактивная карта ХМАО — Югры.
 * Районы — белые полигоны с синей обводкой и тенью, города — синие точки с подписями.
 * Наведение подсвечивает объект (в том числе синхронно со списком справа), клик — открывает паспорт.
 */
export const UgraMap = ({ municipalities, hoveredId, onHover, onSelect }) => {
  const byId = useMemo(
    () => Object.fromEntries(municipalities.map((m) => [m.id, m])),
    [municipalities]
  );

  const bind = (id) => ({
    onMouseEnter: () => onHover(id),
    onMouseLeave: () => onHover(null),
    onFocus: () => onHover(id),
    onBlur: () => onHover(null),
    onClick: () => byId[id] && onSelect(byId[id]),
    onKeyDown: (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && byId[id]) {
        e.preventDefault();
        onSelect(byId[id]);
      }
    },
    tabIndex: 0,
    role: 'button',
    'aria-label': byId[id]?.name,
    className: 'cursor-pointer outline-none',
  });

  return (
    <svg
      viewBox={MAP_VIEWBOX}
      className="w-full h-auto select-none"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      <defs>
        <filter id="ugra-shadow" x="-10%" y="-10%" width="125%" height="130%">
          <feDropShadow dx="4" dy="5" stdDeviation="4" floodColor="#000" floodOpacity="0.28" />
        </filter>
      </defs>

      {/* Районы (с общей тенью) */}
      <g filter="url(#ugra-shadow)">
        {districts.map((r) => {
          const hovered = hoveredId === r.id;
          return (
            <path
              key={r.id}
              d={r.d}
              strokeWidth="1.4"
              strokeLinejoin="round"
              {...bind(r.id)}
              className={`cursor-pointer outline-none transition-colors duration-150 stroke-[#4285f4] ${
                hovered ? 'fill-[#4285f4]' : 'fill-white dark:fill-slate-800 hover:fill-[#eaf1fe] dark:hover:fill-slate-700'
              }`}
            />
          );
        })}
      </g>

      {/* Подписи районов */}
      <g pointerEvents="none" fontStyle="italic" fontSize="11" textAnchor="middle">
        {districts.map((r) => {
          const hovered = hoveredId === r.id;
          return (
            <text
              key={r.id}
              className={hovered ? 'fill-white' : 'fill-slate-500 dark:fill-slate-400'}
              fontWeight={hovered ? 700 : 400}
            >
              {r.label.lines.map((line, i) => (
                <tspan
                  key={line}
                  x={r.label.x}
                  y={r.label.y + (i === 0 ? -5.5 : 5.5)}
                  dominantBaseline="central"
                >
                  {line}
                </tspan>
              ))}
            </text>
          );
        })}
      </g>

      {/* Города */}
      {cities.map((c) => {
        const hovered = hoveredId === c.id;
        return (
          <g key={c.id} {...bind(c.id)}>
            <circle cx={c.x} cy={c.y} r="11" fill="transparent" />
            <circle cx={c.x} cy={c.y} r={hovered ? 6 : 4} fill={BLUE} stroke="#fff" strokeWidth={hovered ? 1.5 : 0} className="transition-all duration-150" />
            <text
              x={c.lx}
              y={c.ly}
              textAnchor={c.anchor}
              fontSize="12"
              fontWeight={hovered ? 700 : 400}
              pointerEvents="none"
              className={hovered ? 'fill-[#1a5fd8] dark:fill-blue-400' : 'fill-slate-500 dark:fill-slate-400'}
            >
              {c.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

/** Список справа: «Муниципальные районы» и «Городские округа». */
export const UgraMapList = ({ municipalities, hoveredId, onHover, onSelect }) => {
  const byId = useMemo(
    () => Object.fromEntries(municipalities.map((m) => [m.id, m])),
    [municipalities]
  );
  const collator = new Intl.Collator('ru');
  const districtItems = districts.map((d) => byId[d.id]).filter(Boolean).sort((a, b) => collator.compare(a.name, b.name));
  const cityItems = cities.map((c) => byId[c.id]).filter(Boolean).sort((a, b) => collator.compare(a.name, b.name));

  const Section = ({ title, items }) => (
    <div className="mb-6">
      <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">{title}</h3>
      <ul className="space-y-1">
        {items.map((m) => {
          const hovered = hoveredId === m.id;
          return (
            <li
              key={m.id}
              onMouseEnter={() => onHover(m.id)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onSelect(m)}
              className={`flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition ${
                hovered ? 'bg-[#4285f4] text-white' : 'text-slate-800 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <span
                className={`w-7 h-7 shrink-0 rounded flex items-center justify-center text-xs font-bold ${
                  hovered ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                }`}
              >
                {m.name[0]}
              </span>
              <span className="flex-1 text-[15px]">{m.name}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${hovered ? 'bg-white/25' : 'bg-slate-200/70 dark:bg-slate-700 text-slate-500 dark:text-slate-300'}`}>
                {m.group2024}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <>
      <Section title="Муниципальные районы" items={districtItems} />
      <Section title="Городские округа" items={cityItems} />
    </>
  );
};

export default UgraMap;
