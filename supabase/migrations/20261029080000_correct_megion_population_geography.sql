update public.municipality_indicators
set indicator_code = 'population_settlement',
    indicator_name = 'Численность населения населённого пункта на 1 января',
    geographic_level = 'settlement',
    geographic_name = 'Мегион',
    notes = 'Официальная оценка населения города Мегион (населённого пункта) на 01.01.2025 — 59 732 человека. Сохранено как settlement, поскольку паспорт описывает население города, а не отдельно население всего муниципального образования.',
    updated_at = now()
where municipality_id = 'megion'
  and source_id = 'megion_admin_territorial_population'
  and reference_year = 2025;

update public.data_sources
set coverage = 'Частичное покрытие: город Мегион как населённый пункт',
    notes = 'Импортировано значение 59 732 человека на 01.01.2025. Географический уровень — населённый пункт, не весь городской округ.',
    updated_at = now()
where id = 'megion_admin_territorial_population';
