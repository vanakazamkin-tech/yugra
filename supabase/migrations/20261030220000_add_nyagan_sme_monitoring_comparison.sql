DO $$
DECLARE inserted_count integer;
BEGIN
  UPDATE public.data_sources
  SET name = 'Сводный доклад Правительства Югры об эффективности муниципалитетов за 2024 год — Нягань, Урай, Югорск и Ханты-Мансийск',
      description = 'Таблицы 6, 11–13: фактические показатели за 2022–2024 годы. Для показателя доли работников МСП добавлена таблица 6 по Нягани.',
      coverage = 'Нягань, Урай, Югорск и Ханты-Мансийск; показатели МСП.',
      notes = 'Импортированы только фактические значения 2022–2024; планы 2025–2027 исключены. Для доли занятости в МСП значения сохраняются отдельно от отчёта рейтинга 2023 года: последний основан на информации, предоставленной муниципальными администрациями, тогда как настоящий источник — сводный доклад мониторинга эффективности № 349-рп. При расхождениях не объединять и не выбирать ряд без проверки методики и первичных расчётов.',
      last_checked_at = now(),
      updated_at = now()
  WHERE id = 'ugra_municipal_efficiency_349rp_2024_uray_yugorsk_khm';

  INSERT INTO public.municipality_indicators
    (municipality_id, indicator_code, indicator_name, reference_year, value, unit,
     source_id, source_url, source_published_at, retrieved_at, verification_status,
     notes, geographic_level, geographic_name, reference_period)
  SELECT
    'nyagan-city',
    'sme_employment_share',
    'Доля среднесписочной численности работников (без внешних совместителей) малых и средних предприятий в среднесписочной численности работников (без внешних совместителей) всех предприятий и организаций',
    v.reference_year, v.value, '%',
    'ugra_municipal_efficiency_349rp_2024_uray_yugorsk_khm',
    'https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/',
    DATE '2025-07-29', now(), 'needs_review',
    'Таблица 6 сводного доклада Правительства ХМАО — Югры за 2024 год (распоряжение от 29.07.2025 № 349-рп). Значение переписано из опубликованной таблицы: 2022 — 21,8%; 2023 — 22,3%. Сопоставляется с отчётом рейтинга муниципалитетов за 2023 год (таблица 12: 32% и 31%), который, согласно разделу 2.3.2, основан на информации, предоставленной органами местного самоуправления. До проверки методики и исходных расчётов ряды хранятся отдельно и исключены из verified.',
    'municipality', 'Нягань', 'annual'
  FROM (VALUES (2022, 21.8::numeric), (2023, 22.3::numeric)) AS v(reference_year, value)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.municipality_indicators i
    WHERE i.municipality_id = 'nyagan-city'
      AND i.indicator_code = 'sme_employment_share'
      AND i.reference_year = v.reference_year
      AND i.source_id = 'ugra_municipal_efficiency_349rp_2024_uray_yugorsk_khm'
  );
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  IF inserted_count NOT IN (0, 2) THEN
    RAISE EXCEPTION 'Expected 0 or 2 Nyagan observations, inserted %', inserted_count;
  END IF;

  UPDATE public.municipality_indicators
  SET notes = CASE
    WHEN source_id = 'investugra_municipal_rating_report_2023' THEN
      'Таблица 12 аналитического отчёта рейтинга муниципальных образований за 2023 год. Раздел 2.3.2 указывает, что расчёт основан на информации, предоставленной органами местного самоуправления за 2023 год. Значение показателя — доля среднесписочной численности работников МСП (без внешних совместителей) в среднесписочной численности работников всех предприятий и организаций (без внешних совместителей). При сопоставлении с докладом № 349-рп обнаружено расхождение; оба официальных ряда сохранены отдельно и оставлены needs_review до проверки методики и исходных расчётов.'
    ELSE
      'Сводный доклад Правительства ХМАО — Югры за 2024 год, распоряжение от 29.07.2025 № 349-рп; таблицы 6, 11 и 13. Фактические значения за 2022–2024 годы, планы 2025–2027 исключены. При сопоставлении с отчётом рейтинга муниципалитетов за 2023 год обнаружено расхождение; оба официальных ряда сохранены отдельно и оставлены needs_review до проверки методики и исходных расчётов.'
    END
  WHERE indicator_code = 'sme_employment_share'
    AND verification_status = 'needs_review'
    AND municipality_id IN ('nyagan-city','uray','ugorsk');
END $$;
