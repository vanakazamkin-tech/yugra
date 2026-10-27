import React, { useMemo, useState } from 'react';
import data from '../data/municipalities-detailed.json';
import { UgraMap, UgraMapList } from './components/UgraMap';

const Icon = ({ name, className = '' }) => {
  const paths = {
    home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-7h6v7"/></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/></>,
    table: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16M15 10v10"/></>,
    file: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5"/><path d="M4 17v4h16v-4"/></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    chart: <><path d="M4 20V11h4v9M10 20V5h4v15M16 20v-8h4v8"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    chevron: <path d="m6 9 6 6 6-6"/>,
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    people: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    coins: <><ellipse cx="9" cy="6" rx="6" ry="3"/><path d="M3 6v5c0 1.66 2.69 3 6 3a11 11 0 0 0 2-.18"/><path d="M3 11v5c0 1.66 2.69 3 6 3 1.5 0 2.87-.28 3.92-.74"/><ellipse cx="17" cy="14" rx="4" ry="2.2"/><path d="M13 14v5c0 1.2 1.8 2 4 2s4-.8 4-2v-5"/></>,
    leaf: <><path d="M20 4c-8 0-14 3.5-14 10a6 6 0 0 0 6 6c6.5 0 8-8 8-16Z"/><path d="M4 21c2-5 6-8 12-12"/></>,
    sort: <><path d="m8 7 4-4 4 4M12 3v18M16 17l-4 4-4-4"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" className={`ui-icon ${className}`} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{paths[name] || paths.file}</svg>;
};

const formatNumber = (value, maximumFractionDigits = 0) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits }).format(value);
const formatBillion = (value) => `${formatNumber(value, 1)} млрд ₽`;

export const InvestmentDetails = () => {
  const [activeTab, setActiveTab] = useState('catalog');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [activeModalItem, setActiveModalItem] = useState(null);
  const [hoveredRegionId, setHoveredRegionId] = useState(null);
  const [isMapListOpen, setIsMapListOpen] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'score', direction: 'desc' });

  const municipalities = data.municipalities;
  const totals = useMemo(() => ({
    count: municipalities.length,
    averageScore: municipalities.reduce((sum, m) => sum + Number(m.score || 0), 0) / Math.max(municipalities.length, 1),
    investments: municipalities.reduce((sum, m) => sum + Number(m.investments?.volumeBillion || 0), 0),
    sme: municipalities.reduce((sum, m) => sum + Number(m.smeCount || 0), 0),
  }), [municipalities]);

  const filteredMunicipalities = useMemo(() => municipalities.filter((m) => {
    const matchesGroup = selectedGroup === 'ALL' || m.group2024 === selectedGroup;
    const matchesSearch = m.name.toLocaleLowerCase('ru-RU').includes(searchTerm.trim().toLocaleLowerCase('ru-RU'));
    return matchesGroup && matchesSearch;
  }), [municipalities, selectedGroup, searchTerm]);

  const sortedMunicipalities = useMemo(() => [...filteredMunicipalities].sort((a, b) => {
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];
    if (sortConfig.key === 'investments') {
      aValue = a.investments.volumeBillion;
      bValue = b.investments.volumeBillion;
    }
    if (typeof aValue === 'string') {
      const result = aValue.localeCompare(bValue, 'ru-RU');
      return sortConfig.direction === 'asc' ? result : -result;
    }
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  }), [filteredMunicipalities, sortConfig]);

  const requestSort = (key) => setSortConfig((current) => ({
    key,
    direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
  }));
  const handleExportPDF = () => window.print();

  const renderTableRows = (items) => items.map((m, index) => (
    <tr key={m.id} onMouseEnter={() => setHoveredRegionId(m.id)} onMouseLeave={() => setHoveredRegionId(null)}>
      <td className="row-number">{String(index + 1).padStart(2, '0')}</td>
      <td className="municipality-cell"><button className="municipality-link" onClick={() => setActiveModalItem(m)}>{m.name}</button></td>
      <td><span className={`group-badge ${m.group2024 === 'A' ? 'group-a' : 'group-b'}`}><i />Группа {m.group2024}</span></td>
      <td className="score-cell">{formatNumber(m.score, 1)}</td>
      <td className="number-cell">{formatNumber(m.investments.volumeBillion, 1)} <small>млрд ₽</small></td>
      <td className="number-cell">{formatNumber(m.smeCount)}</td>
      <td><button className="icon-button" aria-label={`Открыть паспорт: ${m.name}`} onClick={() => setActiveModalItem(m)}><Icon name="arrow"/></button></td>
    </tr>
  ));

  const SortButton = ({ label, column }) => (
    <button className="sort-button" onClick={() => requestSort(column)}>
      {label}<span className={`sort-state ${sortConfig.key === column ? 'sort-state-active' : ''}`}>{sortConfig.key === column ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</span>
    </button>
  );

  return (
    <div className="yugra-app">
      <div className="print-report">
        <h1>Аналитический отчёт — ХМАО — Югра</h1>
        <p>Каталог муниципальных образований · рейтинг и инвестиционные показатели</p>
        <table><thead><tr><th>№</th><th>Муниципальное образование</th><th>Группа</th><th>Балл</th><th>Инвестиции, млрд ₽</th><th>МСП, ед.</th><th>Оценка бизнеса</th></tr></thead><tbody>
          {sortedMunicipalities.map((m, i) => <tr key={m.id}><td>{i + 1}</td><td>{m.name}</td><td>{m.group2024}</td><td>{m.score}</td><td>{m.investments.volumeBillion}</td><td>{formatNumber(m.smeCount)}</td><td>{m.assessmentScore} / 5.0</td></tr>)}
        </tbody></table>
      </div>

      <div className="site-shell print:hidden">
        <header className="site-header">
          <button className="brand-lockup" onClick={() => setActiveTab('catalog')} aria-label="Югра — на главную">
            <span className="brand-emblem"><img src="/images/khanty-prosperity-seal.svg" alt="" /></span>
            <span className="brand-copy"><span className="brand-title">ЮГРА</span><span className="brand-subtitle">Земля традиций</span></span>
          </button>
          <nav className="main-nav" aria-label="Основная навигация">
            <button className={activeTab === 'catalog' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('catalog')}><Icon name="home"/>Главная</button>
            <button className={activeTab === 'map' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('map')}><Icon name="map"/>Карта Югры</button>
            <button className={activeTab === 'compare' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('compare')}><Icon name="table"/>Рейтинг</button>
            <button className="nav-item" onClick={handleExportPDF}><Icon name="file"/>Отчёты</button>
          </nav>
          <div className="header-motto"><span className="motto-mark"/>ЛЮДИ · ЗЕМЛЯ · ПРИРОДА</div>
        </header>
        <div className="ornament-divider" aria-hidden="true" />

        <main>
          {activeTab === 'catalog' && <>
            <section className="intro-panel panel">
              <div className="intro-top">
                <div className="intro-copy">
                  <div className="eyebrow"><span className="eyebrow-diamond"/> ХАНТЫ · МАНСИ · ЮГРА</div>
                  <h1>Каталог муниципальных <em>образований</em></h1>
                  <p>Знакомьтесь с территориями Югры, сравнивайте показатели и изучайте инвестиционный потенциал региона.</p>
                </div>
                <div className="intro-art" aria-label="Гравюра с традиционными жителями Севера и оленями">
                  <div className="intro-art-image"><img src="/images/khanty-mansi-engraving.jpg" alt="Гравюра: жители Севера в традиционной одежде и северные олени" /></div>
                  <div className="intro-art-caption"><span>Культура Севера</span><img src="/images/khanty-prosperity-seal.svg" alt="" /></div>
                  <div className="intro-art-edge" aria-hidden="true" />
                </div>
              </div>
              <div className="catalog-toolbar">
                <label className="search-box"><Icon name="search"/><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Поиск по названию муниципалитета…" aria-label="Поиск по названию муниципалитета"/><span className="search-shortcut">⌕</span></label>
                <div className="filter-block">
                  <span className="filter-caption">Группа рейтинга</span>
                  <div className="filter-row" aria-label="Фильтр по группе">
                    {[['ALL', 'Все группы'], ['A', 'Группа A'], ['B', 'Группа B']].map(([value, label]) => <button key={value} className={`filter-pill ${selectedGroup === value ? 'selected' : ''}`} onClick={() => setSelectedGroup(value)}>{label}{selectedGroup === value && <span className="filter-check">✓</span>}</button>)}
                  </div>
                </div>
              </div>
            </section>

            <section className="stats-grid" aria-label="Сводные показатели">
              <article className="metric-card"><span className="metric-icon"><Icon name="map"/></span><div className="metric-copy"><span className="metric-label">Муниципалитеты</span><strong>{totals.count}</strong><small>в каталоге региона</small></div><span className="metric-index">01</span></article>
              <article className="metric-card"><span className="metric-icon"><Icon name="chart"/></span><div className="metric-copy"><span className="metric-label">Средний балл</span><strong>{formatNumber(totals.averageScore, 1)}</strong><small>по рейтингу территорий</small></div><span className="metric-index">02</span></article>
              <article className="metric-card"><span className="metric-icon"><Icon name="coins"/></span><div className="metric-copy"><span className="metric-label">Инвестиции</span><strong>{formatNumber(totals.investments, 1)} <i>млрд ₽</i></strong><small>без добывающего сектора</small></div><span className="metric-index">03</span></article>
              <article className="metric-card"><span className="metric-icon"><Icon name="people"/></span><div className="metric-copy"><span className="metric-label">Субъекты МСП</span><strong>{formatNumber(totals.sme)}</strong><small>суммарно по муниципалитетам</small></div><span className="metric-index">04</span></article>
            </section>

            <div className="dashboard-grid">
              <section className="map-panel panel">
                <div className="section-heading"><div className="heading-label"><span className="heading-icon"><Icon name="pin"/></span><div><h2>Карта Югры</h2><p>Нажмите на территорию для подробностей</p></div></div><span className="section-tag">ИНТЕРАКТИВНАЯ</span></div>
                <div className="map-stage"><UgraMap municipalities={municipalities} hoveredId={hoveredRegionId} onHover={setHoveredRegionId} onSelect={setActiveModalItem}/><div className="map-watermark" aria-hidden="true"><img src="/images/khanty-prosperity-seal.svg" alt=""/></div></div>
                <div className="map-legend"><span><i className="legend-dot high"/>Группа A</span><span><i className="legend-dot mid"/>Группа B</span><span className="legend-hint">Выберите район на карте</span></div>
                <div className="map-card-footer"><span><Icon name="leaf"/> Территория тайги и рек</span><button onClick={() => setActiveTab('map')}>Открыть карту <Icon name="arrow"/></button></div>
              </section>

              <section className="ranking-panel panel">
                <div className="section-heading ranking-heading"><div className="heading-label"><span className="heading-icon"><Icon name="chart"/></span><div><h2>Рейтинг муниципалитетов</h2><p>Сравнение по ключевым показателям</p></div></div><button className="primary-button" onClick={handleExportPDF}><Icon name="download"/>Сохранить PDF</button></div>
                <div className="table-meta"><span>НАЙДЕНО <strong>{sortedMunicipalities.length}</strong> ИЗ {municipalities.length}</span><span className="table-sort-hint"><Icon name="sort"/> Сортировка по заголовкам</span></div>
                <div className="table-scroll"><table className="ranking-table"><thead><tr>
                  <th className="num-col">№</th><th><SortButton label="Муниципальное образование" column="name"/></th><th><SortButton label="Группа" column="group2024"/></th><th><SortButton label="Балл" column="score"/></th><th><SortButton label="Инвестиции" column="investments"/></th><th><SortButton label="МСП" column="smeCount"/></th><th><span className="action-heading">Паспорт</span></th>
                </tr></thead><tbody>{renderTableRows(sortedMunicipalities)}</tbody></table>
                  {sortedMunicipalities.length === 0 && <div className="empty-state"><span>Ничего не найдено</span><p>Попробуйте изменить запрос или выбрать другую группу.</p><button className="outline-button" onClick={() => { setSearchTerm(''); setSelectedGroup('ALL'); }}>Сбросить фильтры</button></div>}
                </div>
                <div className="table-footer"><span>Данные муниципальных образований</span><span className="table-footer-note">РЕЙТИНГ · 2024</span></div>
              </section>
            </div>
          </>}

          {activeTab === 'map' && <section className="panel full-panel">
            <div className="section-heading"><div className="heading-label"><span className="heading-icon"><Icon name="map"/></span><div><h2>Муниципальная карта Югры</h2><p>Выберите территорию на карте или в списке</p></div></div><button className="outline-button" onClick={() => setIsMapListOpen(!isMapListOpen)}>{isMapListOpen ? 'Скрыть список' : 'Показать список'}</button></div>
            <div className={`map-layout ${isMapListOpen ? '' : 'map-only'}`}><div className="map-stage large-map"><UgraMap municipalities={municipalities} hoveredId={hoveredRegionId} onHover={setHoveredRegionId} onSelect={setActiveModalItem}/></div>{isMapListOpen && <div className="map-list"><UgraMapList municipalities={municipalities} hoveredId={hoveredRegionId} onHover={setHoveredRegionId} onSelect={setActiveModalItem}/></div>}</div>
          </section>}

          {activeTab === 'compare' && <section className="panel full-panel ranking-page">
            <div className="section-heading"><div className="heading-label"><span className="heading-icon"><Icon name="table"/></span><div><h2>Сводная аналитическая таблица</h2><p>Нажмите на заголовок столбца для сортировки</p></div></div><button className="primary-button" onClick={handleExportPDF}><Icon name="download"/>Сохранить PDF</button></div>
            <div className="table-scroll compare-scroll"><table className="ranking-table compare-table"><thead><tr><th className="num-col">№</th><th><SortButton label="Муниципальное образование" column="name"/></th><th><SortButton label="Группа" column="group2024"/></th><th><SortButton label="Балл" column="score"/></th><th><SortButton label="Инвестиции, млрд ₽" column="investments"/></th><th><SortButton label="МСП, ед." column="smeCount"/></th><th>Оценка бизнеса</th></tr></thead><tbody>{sortedMunicipalities.map((m, i) => <tr key={m.id} onMouseEnter={() => setHoveredRegionId(m.id)} onMouseLeave={() => setHoveredRegionId(null)} onClick={() => setActiveModalItem(m)}><td className="row-number">{String(i + 1).padStart(2, '0')}</td><td><button className="municipality-link" onClick={(e) => { e.stopPropagation(); setActiveModalItem(m); }}>{m.name}</button></td><td><span className={`group-badge ${m.group2024 === 'A' ? 'group-a' : 'group-b'}`}><i/>Группа {m.group2024}</span></td><td className="score-cell">{formatNumber(m.score, 1)}</td><td className="number-cell">{formatNumber(m.investments.volumeBillion, 1)}</td><td className="number-cell">{formatNumber(m.smeCount)}</td><td>{m.assessmentScore} / 5.0</td></tr>)}</tbody></table></div>
          </section>}
        </main>

        <footer className="site-footer">
          <div className="footer-brand"><span className="footer-emblem"><img src="/images/khanty-prosperity-seal.svg" alt=""/></span><span><strong>ЮГРА</strong><small>Земля традиций</small></span></div>
          <p>Ханты · Манси · Северная культура</p>
          <div className="footer-right"><span>ЛЮДИ · ЗЕМЛЯ · ПРИРОДА</span><span className="footer-ornament" aria-hidden="true"/></div>
        </footer>
      </div>

      {activeModalItem && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setActiveModalItem(null); }}><section className="municipality-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-ornament" aria-hidden="true"/><div className="modal-topline"><span className="eyebrow"><span className="eyebrow-diamond"/> ПАСПОРТ ТЕРРИТОРИИ</span><button className="close-button" onClick={() => setActiveModalItem(null)} aria-label="Закрыть"><Icon name="close"/></button></div>
        <h2 id="modal-title">{activeModalItem.name}</h2><p className="modal-intro">Ключевые показатели муниципального образования</p>
        <div className="modal-group-line"><span className={`group-badge ${activeModalItem.group2024 === 'A' ? 'group-a' : 'group-b'}`}><i/>Группа {activeModalItem.group2024}</span><span>Рейтинг {activeModalItem.rank2024 ? `№ ${activeModalItem.rank2024}` : ''}</span></div>
        <div className="modal-stats"><div><span>Итоговый балл</span><strong>{formatNumber(activeModalItem.score, 1)}</strong></div><div><span>Инвестиции без добычи</span><strong>{formatBillion(activeModalItem.investments.volumeBillion)}</strong></div><div><span>Динамика инвестиций</span><strong className="growth-value">{activeModalItem.investments.growthPercent}%</strong></div><div><span>Субъекты МСП</span><strong>{formatNumber(activeModalItem.smeCount)}</strong></div><div><span>Оценка предпринимателей</span><strong>{activeModalItem.assessmentScore} / 5.0</strong></div></div>
        <button className="primary-button modal-print" onClick={handleExportPDF}><Icon name="file"/>Распечатать / сохранить PDF</button>
      </section></div>}
    </div>
  );
};

export default InvestmentDetails;
