import React, { useMemo } from 'react';
import { MAP_VIEWBOX, districts, cities } from '../ugraMapGeo';

const CITY_DOT = '#c29556';

/** Интерактивная векторная карта муниципальных образований Югры. */
export const UgraMap = ({ municipalities, hoveredId, onHover, onSelect }) => {
  const byId = useMemo(() => Object.fromEntries(municipalities.map((m) => [m.id, m])), [municipalities]);

  const bind = (id) => ({
    onMouseEnter: () => onHover?.(id),
    onMouseLeave: () => onHover?.(null),
    onFocus: () => onHover?.(id),
    onBlur: () => onHover?.(null),
    onClick: () => byId[id] && onSelect?.(byId[id]),
    onKeyDown: (event) => {
      if ((event.key === 'Enter' || event.key === ' ') && byId[id]) {
        event.preventDefault();
        onSelect?.(byId[id]);
      }
    },
    tabIndex: 0,
    role: 'button',
    'aria-label': byId[id]?.name || id,
  });

  return (
    <svg viewBox={MAP_VIEWBOX} className="ugra-map-svg" role="img" aria-label="Интерактивная карта муниципальных образований Ханты-Мансийского автономного округа — Югры">
      <defs>
        <filter id="ugra-map-shadow" x="-8%" y="-8%" width="116%" height="120%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#213d2e" floodOpacity=".12" />
        </filter>
      </defs>
      <g filter="url(#ugra-map-shadow)">
        {districts.map((region) => {
          const group = byId[region.id]?.group2024 === 'A' ? 'group-a' : 'group-b';
          const hovered = hoveredId === region.id;
          return <path
            key={region.id}
            d={region.d}
            {...bind(region.id)}
            className={`map-region ${group}${hovered ? ' map-region-hover' : ''}`}
            strokeLinejoin="round"
          />;
        })}
      </g>
      <g pointerEvents="none" fontSize="11" textAnchor="middle">
        {districts.map((region) => {
          const hovered = hoveredId === region.id;
          return <text key={region.id} className={hovered ? 'map-label-hover' : 'map-label'} fontWeight={hovered ? 700 : 500}>
            {region.label.lines.map((line, index) => <tspan key={`${region.id}-${line}`} x={region.label.x} y={region.label.y + (index === 0 ? -5.5 : 5.5)} dominantBaseline="central">{line}</tspan>)}
          </text>;
        })}
      </g>
      <g>
        {cities.map((city) => {
          const hovered = hoveredId === city.id;
          return <g key={city.id} {...bind(city.id)} className="map-city-target">
            <circle cx={city.x} cy={city.y} r="13" fill="transparent" />
            <circle cx={city.x} cy={city.y} r={hovered ? 6 : 4.2} fill={CITY_DOT} stroke="#fffaf1" strokeWidth={hovered ? 2 : 1.3} className="map-city-dot" />
            <text x={city.lx} y={city.ly} textAnchor={city.anchor} pointerEvents="none" className={hovered ? 'map-label-hover' : 'map-label'} fontWeight={hovered ? 700 : 600} fontSize="12">{city.name}</text>
          </g>;
        })}
      </g>
    </svg>
  );
};

/** Список районов и городских округов, синхронизированный с наведением на карту. */
export const UgraMapList = ({ municipalities, hoveredId, onHover, onSelect }) => {
  const byId = useMemo(() => Object.fromEntries(municipalities.map((m) => [m.id, m])), [municipalities]);
  const collator = new Intl.Collator('ru-RU');
  const districtItems = districts.map((item) => byId[item.id]).filter(Boolean).sort((a, b) => collator.compare(a.name, b.name));
  const cityItems = cities.map((item) => byId[item.id]).filter(Boolean).sort((a, b) => collator.compare(a.name, b.name));

  const Section = ({ title, items }) => (
    <section className="map-list-section">
      <h3>{title}</h3>
      <ul>
        {items.map((municipality) => {
          const hovered = hoveredId === municipality.id;
          return <li key={municipality.id}>
            <button
              type="button"
              className={`map-list-item${hovered ? ' is-hovered' : ''}`}
              onMouseEnter={() => onHover?.(municipality.id)}
              onMouseLeave={() => onHover?.(null)}
              onFocus={() => onHover?.(municipality.id)}
              onBlur={() => onHover?.(null)}
              onClick={() => onSelect?.(municipality)}
            >
              <span className="map-list-initial">{municipality.name.charAt(0)}</span>
              <span className="map-list-name">{municipality.name}</span>
              <span className="map-list-group">{municipality.group2024}</span>
            </button>
          </li>;
        })}
      </ul>
    </section>
  );

  return <>
    <Section title="Муниципальные районы" items={districtItems} />
    <Section title="Городские округа" items={cityItems} />
  </>;
};

export default UgraMap;
