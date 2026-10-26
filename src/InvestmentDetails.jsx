import React, { useMemo, useState } from 'react';
import data from '../data/municipalities-detailed.json';
import { UgraMap, UgraMapList } from './components/UgraMap';

const Icon = ({ name }) => {
  const paths = {
    home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-7h6v7"/></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/></>,
    table: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16M15 10v10"/></>,
    file: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5"/><path d="M4 17v4h16v-4"/></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    chart: <><path d="M4 20V11h4v9M10 20V5h4v15M16 20v-8h4v8"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="ui-icon" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name] || paths.file}</svg>;
};

export const InvestmentDetails = () => {
  const [activeTab, setActiveTab] = useState('catalog');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [activeModalItem, setActiveModalItem] = useState(null);
  const [hoveredRegionId, setHoveredRegionId] = useState(null);
  const [isMapListOpen, setIsMapListOpen] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'score', direction: 'desc' });
  const [notification, setNotification] = useState('Данные муниципальных образований Югры');

  const filteredMunicipalities = useMemo(() => data.municipalities.filter((m) => {
    const matchesGroup = selectedGroup === 'ALL' || m.group2024 === selectedGroup;
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesGroup && matchesSearch;
  }), [selectedGroup, searchTerm]);

  const sortedMunicipalities = useMemo(() => [...filteredMunicipalities].sort((a, b) => {
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];
    if (sortConfig.key === 'investments') { aVal = a.investments.volumeBillion; bVal = b.investments.volumeBillion; }
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  }), [filteredMunicipalities, sortConfig]);

  const requestSort = (key) => setSortConfig((current) => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }));
  const handleExportPDF = () => { setNotification('Откройте печать и выберите «Сохранить как PDF».'); setTimeout(() => window.print(), 250); };

  return (
    <div className="yugra-app">
      <div className="print-report">
        <h1>Аналитический отчёт — ХМАО — Югра</h1>
        <p>Каталог муниципальных образований · показатели и рейтинг</p>
        <table><thead><tr><th>Муниципальное образование</th><th>Группа</th><th>Балл</th><th>Инвестиции, млрд ₽</th><th>МСП, ед.</th></tr></thead><tbody>
          {sortedMunicipalities.map((m) => <tr key={m.id}><td>{m.name}</td><td>{m.group2024}</td><td>{m.score}</td><td>{m.investments.volumeBillion}</td><td>{m.smeCount.toLocaleString('ru-RU')}</td></tr>)}
        </tbody></table>
      </div>

      <div className="site-shell print:hidden">
        <header className="site-header">
          <div className="brand-lockup">
            <div className="brand-emblem" aria-hidden="true"><span>✣</span></div>
            <div><div className="brand-title">ЮГРА</div><div className="brand-subtitle">Земля традиций</div></div>
          </div>
          <nav className="main-nav" aria-label="Основная навигация">
            <button className={activeTab === 'catalog' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('catalog')}><Icon name="home"/>Главная</button>
            <button className={activeTab === 'map' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('map')}><Icon name="map"/>Карта Югры</button>
            <button className={activeTab === 'compare' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('compare')}><Icon name="table"/>Рейтинг</button>
            <button className="nav-item" onClick={handleExportPDF}><Icon name="file"/>Отчёты</button>
            <button className="nav-item about-nav" onClick={() => setNotification('Проект посвящён муниципалитетам и устойчивому развитию Югры.')}><span className="nav-info">i</span>О проекте</button>
          </nav>
          <div className="header-ornament" aria-hidden="true">◇ ⟐ ◇ ⟐ ◇</div>
        </header>

        <div className="ornament-divider" aria-hidden="true"><div className="ornament-repeat">◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇</div></div>

        <main>
          {activeTab === 'catalog' && <>
            <section className="catalog-hero panel">
              <div className="catalog-hero-copy">
                <div className="eyebrow">СЕВЕР · ЮГРА · ТРАДИЦИИ</div>
                <h1>Каталог муниципальных <span>образований</span></h1>
                <p>Изучайте территории Югры, сравнивайте показатели и открывайте паспорта муниципалитетов.</p>
              </div>
              <div className="search-filter-area">
                <label className="search-box"><Icon name="search"/><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Поиск по названию муниципалитета…" aria-label="Поиск по названию муниципалитета"/></label>
                <div className="filter-row" aria-label="Фильтр по группе">
                  {[['ALL','Все группы'],['A','Группа А'],['B','Группа B']].map(([value,label]) => <button key={value} className={`filter-pill ${selectedGroup === value ? 'selected' : ''}`} onClick={() => setSelectedGroup(value)}>{label}{selectedGroup === value && <span>⌄</span>}</button>)}
                </div>
              </div>
              <div className="hero-watermark" aria-hidden="true">✣</div>
            </section>

            <div className="dashboard-grid">
              <section className="map-panel panel">
                <div className="section-heading"><div className="heading-label"><Icon name="pin"/><h2>Карта Югры</h2></div><span className="subtle-label">ИНТЕРАКТИВНАЯ</span></div>
                <div className="map-stage"><UgraMap municipalities={data.municipalities} hoveredId={hoveredRegionId} onHover={setHoveredRegionId} onSelect={setActiveModalItem}/></div>
                <div className="map-legend"><span><i className="legend-dot high"/>Группа А</span><span><i className="legend-dot mid"/>Группа B</span><span className="legend-hint">Нажмите на район, чтобы открыть паспорт</span></div>
              </section>

              <section className="ranking-panel panel">
                <div className="section-heading ranking-heading"><div className="heading-label"><Icon name="chart"/><div><h2>Рейтинг муниципалитетов</h2><p>Сравнение по ключевым показателям</p></div></div><button className="primary-button" onClick={handleExportPDF}><Icon name="download"/>Скачать в PDF</button></div>
                <div className="table-scroll"><table className="ranking-table"><thead><tr>
                  <th>№</th><th><button onClick={() => requestSort('name')}>Муниципальное образование ↕</button></th><th><button onClick={() => requestSort('group2024')}>Группа ↕</button></th><th><button onClick={() => requestSort('score')}>Рейтинг ↕</button></th><th><button onClick={() => requestSort('investments')}>Инвестиции ↕</button></th><th><button onClick={() => requestSort('smeCount')}>МСП ↕</button></th><th>Паспорт</th>
                </tr></thead><tbody>
                  {sortedMunicipalities.map((m, index) => <tr key={m.id} onMouseEnter={() => setHoveredRegionId(m.id)} onMouseLeave={() => setHoveredRegionId(null)}>
                    <td className="row-number">{index + 1}</td><td><button className="municipality-link" onClick={() => setActiveModalItem(m)}>{m.name}</button></td>
                    <td><span className={`group-badge ${m.group2024 === 'A' ? 'group-a' : 'group-b'}`}>Группа {m.group2024}</span></td><td className="score-cell">{m.score}</td><td>{m.investments.volumeBillion} <small>млрд ₽</small></td><td>{m.smeCount.toLocaleString('ru-RU')}</td><td><button className="icon-button" aria-label={`Открыть паспорт: ${m.name}`} onClick={() => setActiveModalItem(m)}>↗</button></td>
                  </tr>)}
                </tbody></table></div>
                <div className="table-footer"><span>Показано муниципалитетов: <strong>{sortedMunicipalities.length}</strong></span><span className="table-footer-note">Данные рейтинга · 2024</span></div>
              </section>
            </div>
          </>}

          {activeTab === 'map' && <section className="panel full-panel"><div className="section-heading"><div className="heading-label"><Icon name="map"/><div><h2>Муниципальная карта Югры</h2><p>Выберите территорию на карте или в списке</p></div></div><button className="outline-button" onClick={() => setIsMapListOpen(!isMapListOpen)}>{isMapListOpen ? 'Скрыть список' : 'Показать список'}</button></div><div className={`map-layout ${isMapListOpen ? '' : 'map-only'}`}><div className="map-stage large-map"><UgraMap municipalities={data.municipalities} hoveredId={hoveredRegionId} onHover={setHoveredRegionId} onSelect={setActiveModalItem}/></div>{isMapListOpen && <div className="map-list"><UgraMapList municipalities={data.municipalities} hoveredId={hoveredRegionId} onHover={setHoveredRegionId} onSelect={setActiveModalItem}/></div>}</div></section>}

          {activeTab === 'compare' && <section className="panel full-panel"><div className="section-heading"><div className="heading-label"><Icon name="table"/><div><h2>Сводная аналитическая таблица</h2><p>Нажмите на заголовок столбца для сортировки</p></div></div><button className="primary-button" onClick={handleExportPDF}><Icon name="download"/>Скачать в PDF</button></div><div className="table-scroll"><table className="ranking-table compare-table"><thead><tr><th>№</th><th><button onClick={() => requestSort('name')}>Муниципальное образование ↕</button></th><th><button onClick={() => requestSort('group2024')}>Группа ↕</button></th><th><button onClick={() => requestSort('score')}>Рейтинг ↕</button></th><th><button onClick={() => requestSort('investments')}>Инвестиции, млрд ₽ ↕</button></th><th><button onClick={() => requestSort('smeCount')}>МСП, ед. ↕</button></th><th>Оценка бизнеса</th></tr></thead><tbody>{sortedMunicipalities.map((m,i) => <tr key={m.id} onClick={() => setActiveModalItem(m)}><td className="row-number">{i+1}</td><td><button className="municipality-link">{m.name}</button></td><td><span className={`group-badge ${m.group2024 === 'A' ? 'group-a' : 'group-b'}`}>Группа {m.group2024}</span></td><td className="score-cell">{m.score}</td><td>{m.investments.volumeBillion}</td><td>{m.smeCount.toLocaleString('ru-RU')}</td><td>{m.assessmentScore} / 5.0</td></tr>)}</tbody></table></div></section>}
          <div className="status-line"><span className="status-mark"/> {notification}<span className="status-right">ХАНТЫ · МАНСИ · ЮГРА</span></div>
        </main>
        <footer className="site-footer"><span>ЮГРА <i>—</i> Земля традиций</span><span>ЛЮДИ · ЗЕМЛЯ · ПРИРОДА</span><span>⌁</span></footer>
      </div>

      {activeModalItem && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setActiveModalItem(null); }}><section className="municipality-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-topline"><span className="eyebrow">ПАСПОРТ ТЕРРИТОРИИ</span><button className="close-button" onClick={() => setActiveModalItem(null)} aria-label="Закрыть"><Icon name="close"/></button></div>
        <h2 id="modal-title">{activeModalItem.name}</h2><p className="modal-intro">Ключевые показатели муниципального образования</p>
        <div className="modal-stats"><div><span>Группа рейтинга</span><strong>Группа {activeModalItem.group2024}</strong></div><div><span>Итоговый балл</span><strong>{activeModalItem.score}</strong></div><div><span>Инвестиции без добычи</span><strong>{activeModalItem.investments.volumeBillion} млрд ₽</strong></div><div><span>Динамика инвестиций</span><strong className="growth-value">{activeModalItem.investments.growthPercent}%</strong></div><div><span>Субъекты МСП</span><strong>{activeModalItem.smeCount.toLocaleString('ru-RU')}</strong></div><div><span>Оценка предпринимателей</span><strong>{activeModalItem.assessmentScore} / 5.0</strong></div></div>
        <button className="primary-button modal-print" onClick={() => window.print()}><Icon name="file"/>Распечатать / сохранить PDF</button>
      </section></div>}
    </div>
  );
};

export default InvestmentDetails;
