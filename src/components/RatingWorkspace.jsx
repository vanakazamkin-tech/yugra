import { useMemo, useState } from 'react';
import './RatingWorkspace.css';

const toNumber = (value) => value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
const formatNumber = (value, digits = 0) => {
  const number = toNumber(value);
  return number == null ? '—' : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits }).format(number);
};
const normalize = (value) => String(value ?? '').trim().toLocaleLowerCase('ru-RU').replace(/ё/g, 'е');
const formatBillion = (value) => toNumber(value) == null ? '—' : formatNumber(value, 1) + ' млрд ₽';
const csvEscape = (value) => '"' + String(value ?? '').replace(/"/g, '""') + '"';

const downloadRatingCsv = (rows) => {
  const headers = ['Место в наборе 2024', 'Муниципалитет', 'Группа', 'Итоговый балл · демо', 'Инвестиции, млрд ₽ · демо', 'МСП · демо', 'Оценка бизнеса · демо'];
  const contentRows = rows.map((item) => [
    item.rank2024, item.name, item.group2024, item.score,
    item.investments?.volumeBillion, item.smeCount, item.assessmentScore,
  ]);
  const content = '\uFEFF' + [headers, ...contentRows].map((row) => row.map(csvEscape).join(';')).join('\r\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'yugra-rating.csv';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const SectionHeading = ({ eyebrow, title, description, aside }) => (
  <div className="rw-section-heading">
    <div>
      {eyebrow && <span className="rw-eyebrow">{eyebrow}</span>}
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
    {aside && <div className="rw-heading-aside">{aside}</div>}
  </div>
);

const RatingWorkspace = ({
  municipalities = [],
  officialIndicators = [],
  investmentSites = [],
  investmentProjects = [],
  industrialEnterprises = [],
  infrastructureObjects = [],
  landParcels = [],
  programExecution = [],
  facilities = [],
  externalRatings = [],
  onOpenMunicipality,
  onCreateReport,
  onCompare,
  onOpenData,
}) => {
  const [ratingSearch, setRatingSearch] = useState('');
  const [ratingGroup, setRatingGroup] = useState('all');
  const [ratingScope, setRatingScope] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'rank2024', direction: 'asc' });
  const [selectedCompareIds, setSelectedCompareIds] = useState([]);
  const [passportSearch, setPassportSearch] = useState('');
  const [passportCoverage, setPassportCoverage] = useState('all');
  const [projectSearch, setProjectSearch] = useState('');
  const [projectMunicipality, setProjectMunicipality] = useState('all');
  const [projectStatus, setProjectStatus] = useState('all');

  const verifiedIndicators = useMemo(() => officialIndicators.filter((item) => (
    item.verification_status === 'verified'
    && ['municipality', 'settlement'].includes(item.geographic_level || 'municipality')
  )), [officialIndicators]);

  const passportFacts = useMemo(() => {
    const result = new Map();
    municipalities.forEach((municipality) => {
      const id = municipality.id;
      const counts = {
        indicators: verifiedIndicators.filter((item) => item.municipality_id === id).length,
        sites: investmentSites.filter((item) => item.municipality_id === id).length,
        projects: investmentProjects.filter((item) => item.municipality_id === id).length,
        enterprises: industrialEnterprises.filter((item) => item.municipality_id === id).length,
        infrastructure: infrastructureObjects.filter((item) => item.municipality_id === id).length,
        land: landParcels.filter((item) => item.municipality_id === id).length,
        programs: programExecution.filter((item) => item.municipality_id === id).length,
        education: facilities.filter((item) => item.municipality_id === id).length,
      };
      const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);
      result.set(id, { ...counts, totalRecords, hasData: totalRecords > 0 });
    });
    return result;
  }, [municipalities, verifiedIndicators, investmentSites, investmentProjects, industrialEnterprises, infrastructureObjects, landParcels, programExecution, facilities]);

  const passportCoverageCount = useMemo(
    () => municipalities.filter((item) => passportFacts.get(item.id)?.hasData).length,
    [municipalities, passportFacts]
  );

  const filteredRanking = useMemo(() => {
    const query = normalize(ratingSearch);
    return municipalities.filter((item) => {
      const matchesSearch = !query || normalize(item.name).includes(query);
      const matchesGroup = ratingGroup === 'all' || item.group2024 === ratingGroup;
      const hasData = Boolean(passportFacts.get(item.id)?.hasData);
      const matchesScope = ratingScope === 'all'
        || (ratingScope === 'top' && toNumber(item.rank2024) != null && Number(item.rank2024) <= 5)
        || (ratingScope === 'covered' && hasData);
      return matchesSearch && matchesGroup && matchesScope;
    });
  }, [municipalities, ratingSearch, ratingGroup, ratingScope, passportFacts]);

  const sortedRanking = useMemo(() => {
    const getValue = (item) => {
      if (sortConfig.key === 'name') return String(item.name || '');
      if (sortConfig.key === 'investment') return toNumber(item.investments?.volumeBillion);
      if (sortConfig.key === 'sme') return toNumber(item.smeCount);
      if (sortConfig.key === 'assessment') return toNumber(item.assessmentScore);
      if (sortConfig.key === 'group2024') return String(item.group2024 || '');
      return toNumber(item[sortConfig.key]);
    };
    return [...filteredRanking].sort((a, b) => {
      const left = getValue(a);
      const right = getValue(b);
      if (left == null && right != null) return 1;
      if (right == null && left != null) return -1;
      const comparison = typeof left === 'string' || typeof right === 'string'
        ? String(left ?? '').localeCompare(String(right ?? ''), 'ru-RU')
        : (left ?? 0) - (right ?? 0);
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredRanking, sortConfig]);

  const passportRows = useMemo(() => {
    const query = normalize(passportSearch);
    return municipalities.filter((item) => {
      const facts = passportFacts.get(item.id);
      const matchesSearch = !query || normalize(item.name).includes(query);
      const matchesCoverage = passportCoverage === 'all'
        || (passportCoverage === 'with-data' && facts?.hasData)
        || (passportCoverage === 'without-data' && !facts?.hasData);
      return matchesSearch && matchesCoverage;
    }).sort((a, b) => a.name.localeCompare(b.name, 'ru-RU'));
  }, [municipalities, passportFacts, passportSearch, passportCoverage]);

  const projectStatusOptions = useMemo(() => [...new Set(investmentProjects
    .map((item) => item.project_status || item.project_stage)
    .filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'ru-RU')), [investmentProjects]);

  const filteredProjects = useMemo(() => {
    const query = normalize(projectSearch);
    return investmentProjects.filter((item) => {
      const municipality = municipalities.find((entry) => entry.id === item.municipality_id);
      const searchText = [
        item.project_name, item.investor, item.project_category, item.activity_type,
        item.project_status, item.project_stage, item.location_text, item.description,
        municipality?.name,
      ].filter(Boolean).join(' ');
      const status = item.project_status || item.project_stage || '';
      return (!query || normalize(searchText).includes(query))
        && (projectMunicipality === 'all' || item.municipality_id === projectMunicipality)
        && (projectStatus === 'all' || status === projectStatus);
    }).slice().sort((a, b) => String(a.project_name || '').localeCompare(String(b.project_name || ''), 'ru-RU'));
  }, [investmentProjects, municipalities, projectSearch, projectMunicipality, projectStatus]);

  const verifiedExternalRatings = useMemo(() => externalRatings
    .filter((item) => item.verification_status === 'verified')
    .slice()
    .sort((a, b) => {
      const left = toNumber(a.national_rank);
      const right = toNumber(b.national_rank);
      if (left == null && right != null) return 1;
      if (right == null && left != null) return -1;
      return (left ?? 0) - (right ?? 0);
    }), [externalRatings]);

  const changeSort = (key) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const toggleCompare = (id) => {
    setSelectedCompareIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      return current.length >= 4 ? current : [...current, id];
    });
  };

  const statCards = [
    { label: 'Муниципалитетов', value: municipalities.length, note: 'территории в текущем наборе' },
    { label: 'Паспорта с записями', value: passportCoverageCount, note: 'хотя бы один раздел содержит записи' },
    { label: 'Проверенные наблюдения', value: verifiedIndicators.length, note: 'официальные муниципальные и поселенческие ряды' },
    { label: 'Инвестпроекты в реестре', value: investmentProjects.length, note: 'загруженные карточки, не оценка реального числа проектов' },
  ];

  const rankSortLabel = (key, label) => (
    <button type="button" className="rw-sort-button" onClick={() => changeSort(key)}>
      {label}<span aria-hidden="true">{sortConfig.key === key ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</span>
    </button>
  );

  const projectMunicipalityName = (id) => municipalities.find((item) => item.id === id)?.name || 'Территория не указана';

  return (
    <section className="panel full-panel rw-workspace">
      <section className="rw-hero">
        <div className="rw-hero-copy">
          <span className="rw-eyebrow rw-eyebrow-light">АНАЛИТИЧЕСКИЙ РАЗДЕЛ · ЮГРА</span>
          <h1>Рейтинг и паспорта территорий</h1>
          <p>Единое пространство для просмотра рейтинговых позиций, сведений о муниципалитетах и инвестиционных проектов.</p>
          <div className="rw-hero-actions">
            <a href="#rw-ranking">Рейтинг</a>
            <a href="#rw-passports">Паспорта территорий</a>
            <a href="#rw-projects">Инвестиционные проекты</a>
          </div>
        </div>
        <div className="rw-hero-mark" aria-hidden="true">
          <img src="/images/khanty-prosperity-seal.svg" alt="" />
          <span>ЛЮДИ · ЗЕМЛЯ · ПРИРОДА</span>
        </div>
      </section>

      <div className="rw-concept-note">
        <strong>Важно о статусе показателей</strong>
        <p>Баллы, места, объём инвестиций, число субъектов МСП и оценка бизнеса в рейтинговой таблице — демонстрационные поля концептуального набора проекта. Это не официальный рейтинг и не подтверждённая статистика. Проверенные ряды и внешние рейтинги показаны отдельно, с указанием территории, периода и источника.</p>
      </div>

      <div className="rw-stat-grid">
        {statCards.map((item) => (
          <article className="rw-stat-card" key={item.label}>
            <span>{item.label}</span>
            <strong>{formatNumber(item.value)}</strong>
            <small>{item.note}</small>
          </article>
        ))}
      </div>

      <section className="rw-section" id="rw-ranking">
        <SectionHeading
          eyebrow="01 · РЕЙТИНГОВАЯ ТАБЛИЦА"
          title="Позиции муниципалитетов"
          description="Сортируйте показатели, фильтруйте территории и выбирайте до четырёх муниципалитетов для сравнения."
          aside={<div className="rw-section-actions">
            <button type="button" className="rw-button rw-button-light" onClick={() => downloadRatingCsv(sortedRanking)}>Выгрузить CSV</button>
            <button type="button" className="rw-button rw-button-light" onClick={() => onCreateReport?.(sortedRanking.map((item) => item.id))}>Собрать отчёт</button>
            <button type="button" className="rw-button rw-button-primary" disabled={selectedCompareIds.length < 2} onClick={() => onCompare?.(selectedCompareIds)}>Сравнить выбранные · {selectedCompareIds.length}/4</button>
          </div>}
        />
        <div className="rw-filter-bar">
          <label className="rw-search">
            <span aria-hidden="true">⌕</span>
            <input value={ratingSearch} onChange={(event) => setRatingSearch(event.target.value)} placeholder="Найти муниципалитет…" aria-label="Поиск муниципалитета в рейтинге" />
          </label>
          <label className="rw-select">
            <span>Группа</span>
            <select value={ratingGroup} onChange={(event) => setRatingGroup(event.target.value)}>
              <option value="all">Все группы</option>
              <option value="A">Группа A</option>
              <option value="B">Группа B</option>
            </select>
          </label>
          <label className="rw-select">
            <span>Срез</span>
            <select value={ratingScope} onChange={(event) => setRatingScope(event.target.value)}>
              <option value="all">Все территории</option>
              <option value="top">Топ-5 набора</option>
              <option value="covered">Есть записи в паспорте</option>
            </select>
          </label>
          <span className="rw-result-count">Найдено: <strong>{sortedRanking.length}</strong> из {municipalities.length}</span>
        </div>

        <div className="rw-selected-row">
          <span>Отметьте территории для сравнения. Выбрано: <strong>{selectedCompareIds.length} из 4</strong>.</span>
          <button type="button" className="rw-text-button" onClick={() => setSelectedCompareIds([])} disabled={!selectedCompareIds.length}>Сбросить выбор</button>
        </div>

        <div className="rw-table-wrap" role="region" tabIndex={0} aria-label="Рейтинг муниципалитетов. Прокручиваемая таблица">
          <table className="rw-table">
            <thead>
              <tr>
                <th scope="col">Сравнить</th>
                <th scope="col" aria-sort={sortConfig.key === 'rank2024' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : undefined}>{rankSortLabel('rank2024', 'Место в наборе 2024')}</th>
                <th scope="col" aria-sort={sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : undefined}>{rankSortLabel('name', 'Муниципалитет')}</th>
                <th scope="col" aria-sort={sortConfig.key === 'group2024' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : undefined}>{rankSortLabel('group2024', 'Группа')}</th>
                <th scope="col" aria-sort={sortConfig.key === 'score' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : undefined}>{rankSortLabel('score', 'Балл · демо')}</th>
                <th scope="col" aria-sort={sortConfig.key === 'investment' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : undefined}>{rankSortLabel('investment', 'Инвестиции · демо')}</th>
                <th scope="col" aria-sort={sortConfig.key === 'sme' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : undefined}>{rankSortLabel('sme', 'МСП · демо')}</th>
                <th scope="col" aria-sort={sortConfig.key === 'assessment' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : undefined}>{rankSortLabel('assessment', 'Оценка бизнеса · демо')}</th>
                <th scope="col">Паспорт</th>
              </tr>
            </thead>
            <tbody>
              {sortedRanking.map((item) => {
                const selected = selectedCompareIds.includes(item.id);
                const facts = passportFacts.get(item.id);
                return (
                  <tr key={item.id}>
                    <td><input type="checkbox" checked={selected} disabled={!selected && selectedCompareIds.length >= 4} onChange={() => toggleCompare(item.id)} aria-label={'Добавить ' + item.name + ' к сравнению'} /></td>
                    <td className="rw-rank-cell">{toNumber(item.rank2024) == null ? '—' : '№ ' + formatNumber(item.rank2024)}</td>
                    <td><button type="button" className="rw-name-button" onClick={() => onOpenMunicipality?.(item)}>{item.name}</button></td>
                    <td><span className={'rw-group rw-group-' + (item.group2024 === 'A' ? 'a' : 'b')}>Группа {item.group2024 || '—'}</span></td>
                    <td className="rw-number">{formatNumber(item.score, 1)}</td>
                    <td className="rw-number">{formatBillion(item.investments?.volumeBillion)}</td>
                    <td className="rw-number">{formatNumber(item.smeCount)}</td>
                    <td className="rw-number">{toNumber(item.assessmentScore) == null ? '—' : formatNumber(item.assessmentScore, 2) + ' / 5'}</td>
                    <td><button type="button" className="rw-passport-link" onClick={() => onOpenMunicipality?.(item)}>{facts?.hasData ? 'Открыть паспорт ↗' : 'Паспорт ↗'}</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!sortedRanking.length && <p className="rw-empty">По заданным условиям муниципалитеты не найдены. Измените поиск или фильтры.</p>}
        </div>
        <p className="rw-table-note">Место и баллы отражают структуру демонстрационного набора проекта. Сортировка меняет порядок строк, но не подменяет исходную позицию в наборе. Пропущенные значения не считаются нулём.</p>
      </section>

      <section className="rw-section" id="rw-passports">
        <SectionHeading
          eyebrow="02 · МУНИЦИПАЛЬНЫЕ ПАСПОРТА"
          title="Паспорта территорий"
          description="Краткая карта наполнения каждого паспорта. Откройте территорию, чтобы посмотреть официальные показатели, источники, инфраструктуру, программы и другие разделы."
          aside={<span className="rw-section-total">{passportRows.length} территорий</span>}
        />
        <div className="rw-filter-bar rw-passport-filters">
          <label className="rw-search">
            <span aria-hidden="true">⌕</span>
            <input value={passportSearch} onChange={(event) => setPassportSearch(event.target.value)} placeholder="Поиск по территории…" aria-label="Поиск в паспортах территорий" />
          </label>
          <label className="rw-select">
            <span>Наполнение паспорта</span>
            <select value={passportCoverage} onChange={(event) => setPassportCoverage(event.target.value)}>
              <option value="all">Все паспорта</option>
              <option value="with-data">Есть записи</option>
              <option value="without-data">Пока нет записей</option>
            </select>
          </label>
        </div>
        <div className="rw-passport-grid">
          {passportRows.map((item) => {
            const facts = passportFacts.get(item.id);
            const coverageItems = [
              ['Показатели', facts?.indicators || 0],
              ['Проекты', facts?.projects || 0],
              ['Площадки', facts?.sites || 0],
              ['Предприятия', facts?.enterprises || 0],
              ['Инфраструктура', facts?.infrastructure || 0],
              ['Образование', facts?.education || 0],
              ['Земельные участки', facts?.land || 0],
              ['Программы', facts?.programs || 0],
            ];
            return (
              <article className="rw-passport-card" key={item.id}>
                <div className="rw-passport-card-top">
                  <span className={'rw-status ' + (facts?.hasData ? 'rw-status-ready' : 'rw-status-pending')}>{facts?.hasData ? 'Есть записи' : 'Наполняется'}</span>
                  <span className="rw-passport-rank">{toNumber(item.rank2024) == null ? 'Место не задано' : '№ ' + formatNumber(item.rank2024) + ' · демо'}</span>
                </div>
                <h3>{item.name}</h3>
                <div className="rw-passport-demo-line">
                  <span>Балл · демо</span>
                  <strong>{formatNumber(item.score, 1)}</strong>
                  <span className={'rw-group rw-group-' + (item.group2024 === 'A' ? 'a' : 'b')}>Группа {item.group2024 || '—'}</span>
                </div>
                <div className="rw-passport-counts">
                  {coverageItems.map(([label, count]) => (
                    <span key={label}><small>{label}</small><strong>{formatNumber(count)}</strong></span>
                  ))}
                </div>
                <div className="rw-passport-card-footer">
                  <span>{formatNumber(facts?.totalRecords || 0)} записей по разделам</span>
                  <button type="button" onClick={() => onOpenMunicipality?.(item)}>Открыть паспорт <span aria-hidden="true">↗</span></button>
                </div>
              </article>
            );
          })}
        </div>
        {!passportRows.length && <p className="rw-empty">По этому запросу паспорта не найдены.</p>}
        <p className="rw-table-note">Статус «Есть записи» означает только наличие записей в подключённых наборах, а не полноту паспорта. Нулевое число проектов, объектов или наблюдений не означает их отсутствия на территории.</p>
      </section>

      <section className="rw-section" id="rw-projects">
        <SectionHeading
          eyebrow="03 · ИНВЕСТИЦИОННЫЙ РЕЕСТР"
          title="Инвестиционные проекты и паспорта проектов"
          description="Реестр показывает только карточки, загруженные в базу. Раскройте проект, чтобы увидеть его паспортные сведения и первоисточник."
          aside={<span className="rw-section-total">{investmentProjects.length} записей</span>}
        />
        {investmentProjects.length > 0 ? (
          <>
            <div className="rw-filter-bar rw-project-filters">
              <label className="rw-search">
                <span aria-hidden="true">⌕</span>
                <input value={projectSearch} onChange={(event) => setProjectSearch(event.target.value)} placeholder="Название, инвестор, отрасль…" aria-label="Поиск инвестиционного проекта" />
              </label>
              <label className="rw-select">
                <span>Территория</span>
                <select value={projectMunicipality} onChange={(event) => setProjectMunicipality(event.target.value)}>
                  <option value="all">Все территории</option>
                  {municipalities.slice().sort((a, b) => a.name.localeCompare(b.name, 'ru-RU')).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label className="rw-select">
                <span>Статус проекта</span>
                <select value={projectStatus} onChange={(event) => setProjectStatus(event.target.value)}>
                  <option value="all">Все статусы</option>
                  {projectStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <span className="rw-result-count">Найдено: <strong>{filteredProjects.length}</strong></span>
            </div>
            <div className="rw-project-grid">
              {filteredProjects.map((item) => {
                const amount = toNumber(item.investment_amount_thousand);
                const status = item.project_status || item.project_stage || 'Статус не указан';
                return (
                  <details className="rw-project-card" key={item.id || item.project_name}>
                    <summary>
                      <span className="rw-project-kicker">{item.project_category || item.activity_type || 'Инвестиционный проект'}</span>
                      <strong>{item.project_name || 'Проект без названия'}</strong>
                      <span className="rw-project-meta">{projectMunicipalityName(item.municipality_id)} · {status}</span>
                      <span className="rw-project-summary-bottom">
                        <span>{amount == null ? 'Объём не указан' : formatNumber(amount / 1000, 1) + ' млн ₽'}</span>
                        <span>{item.planned_jobs == null ? 'Рабочие места не указаны' : formatNumber(item.planned_jobs) + ' рабочих мест'}</span>
                        <b>Паспорт проекта <span aria-hidden="true">＋</span></b>
                      </span>
                    </summary>
                    <div className="rw-project-details">
                      <div className="rw-project-detail-heading"><span>ПАСПОРТ ПРОЕКТА</span><span>{status}</span></div>
                      <dl>
                        <div><dt>Муниципалитет</dt><dd>{projectMunicipalityName(item.municipality_id)}</dd></div>
                        <div><dt>Инвестор</dt><dd>{item.investor || 'Не указан в записи'}</dd></div>
                        <div><dt>Категория / отрасль</dt><dd>{item.project_category || item.activity_type || 'Не указана'}</dd></div>
                        <div><dt>Статус / этап</dt><dd>{status}</dd></div>
                        <div><dt>Объём инвестиций</dt><dd>{amount == null ? 'Не указан' : formatNumber(amount / 1000, 1) + ' млн ₽'}</dd></div>
                        <div><dt>Плановые рабочие места</dt><dd>{item.planned_jobs == null ? 'Не указаны' : formatNumber(item.planned_jobs)}</dd></div>
                        <div><dt>Местоположение</dt><dd>{item.location_text || 'Не указано'}</dd></div>
                      </dl>
                      {item.description && <p>{item.description}</p>}
                      {item.source_url
                        ? <a className="rw-source-link" href={item.source_url} target="_blank" rel="noreferrer">Открыть первоисточник ↗</a>
                        : <span className="rw-no-source">Ссылка на первоисточник в записи не указана.</span>}
                    </div>
                  </details>
                );
              })}
            </div>
            {!filteredProjects.length && <p className="rw-empty">Проекты по заданным фильтрам не найдены. Сбросьте фильтры или измените запрос.</p>}
          </>
        ) : (
          <div className="rw-project-empty">
            <span className="rw-empty-mark" aria-hidden="true">◇</span>
            <div>
              <strong>В реестре пока нет загруженных карточек проектов</strong>
              <p>Это означает, что записи об инвестиционных проектах ещё не внесены в подключённую базу. Это не означает, что в муниципалитетах Югры нет действующих или планируемых проектов.</p>
            </div>
            <button type="button" className="rw-button rw-button-light" onClick={onOpenData}>Каталог данных</button>
          </div>
        )}
      </section>

      <section className="rw-section" id="rw-external-ratings">
        <SectionHeading
          eyebrow="04 · ВНЕШНИЕ ИСТОЧНИКИ"
          title="Внешние рейтинги и бенчмарки"
          description="Независимые рейтинговые публикации вынесены отдельно от концептуального балла Yugra18 и не прибавляются к нему автоматически."
          aside={<span className="rw-section-total">{verifiedExternalRatings.length} проверенных записей</span>}
        />
        {verifiedExternalRatings.length ? (
          <div className="rw-external-grid">
            {verifiedExternalRatings.map((item) => {
              const metrics = item.metrics || {};
              return (
                <article className="rw-external-card" key={item.id}>
                  <div className="rw-external-card-top">
                    <span>{item.source_name || 'Внешний источник'}</span>
                    <strong>{item.national_rank == null ? 'Место не указано' : '№ ' + formatNumber(item.national_rank)}</strong>
                  </div>
                  <h3>{item.title || 'Рейтинговая публикация'}</h3>
                  <p>{item.geography_name || 'Территория не указана'} · {item.reference_period || 'период не указан'} · {item.geographic_level === 'city' ? 'городской уровень' : item.geographic_level || 'уровень не указан'}</p>
                  <div className="rw-external-metrics">
                    {toNumber(metrics.average_net_monthly_salary_rub) != null && <span><small>Средняя чистая зарплата</small><strong>{formatNumber(metrics.average_net_monthly_salary_rub)} ₽/мес.</strong></span>}
                    {toNumber(metrics.salary_growth_yoy_percent) != null && <span><small>Изменение зарплаты</small><strong>{formatNumber(metrics.salary_growth_yoy_percent, 1)}%</strong></span>}
                    {toNumber(metrics.salary_to_fixed_consumer_basket_ratio) != null && <span><small>Покупательная способность</small><strong>{formatNumber(metrics.salary_to_fixed_consumer_basket_ratio, 2)} набора</strong></span>}
                  </div>
                  {(item.source_url || item.dataset_url || item.url) && <a className="rw-source-link" href={item.source_url || item.dataset_url || item.url} target="_blank" rel="noreferrer">Первоисточник ↗</a>}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="rw-empty">Проверенные внешние рейтинговые записи пока не загружены. Внешние публикации появятся здесь после проверки источника, периода и уровня территории.</p>
        )}
        <p className="rw-table-note">Например, городской рейтинг РИА Рейтинг может использоваться как внешний ориентир для конкретного города. Его показатели нельзя автоматически переносить на муниципальный район или смешивать с муниципальной статистикой.</p>
      </section>

      <section className="rw-methodology">
        <div>
          <span className="rw-eyebrow">ПРАВИЛА ЧТЕНИЯ РАЗДЕЛА</span>
          <h2>Как интерпретировать рейтинг и паспорта</h2>
        </div>
        <div className="rw-method-grid">
          <article><strong>Демо-набор</strong><p>Баллы и места в таблице сохранены из концептуального набора и не заявляются как официальная оценка муниципалитетов.</p></article>
          <article><strong>Проверенные данные</strong><p>Официальные наблюдения показываются только при наличии подтверждённого источника, периода, единицы и территориального уровня.</p></article>
          <article><strong>Нет записи ≠ нет объекта</strong><p>Пустой реестр проектов, площадок или инфраструктуры означает отсутствие загруженных карточек, а не отсутствие объектов в реальности.</p></article>
        </div>
      </section>
    </section>
  );
};

export default RatingWorkspace;
