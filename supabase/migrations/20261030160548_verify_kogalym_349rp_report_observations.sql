DO $$
DECLARE changed integer;
BEGIN
  UPDATE public.municipality_indicators
  SET verification_status = 'verified',
      notes = 'Повторно сверено по таблице 1 официального сводного доклада Правительства ХМАО — Югры за 2024 год (распоряжение от 29.07.2025 № 349-рп). Проверены все 18 фактических значений Когалыма за 2022–2024 годы: доля земельных участков, прибыльные сельскохозяйственные организации, транспортная доступность и три показателя среднемесячной заработной платы. Плановые значения 2025–2027 не включались. Источник: https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/ (публикация текста приложения к распоряжению № 349-рп).'
  WHERE municipality_id = 'kogalym'
    AND source_id = 'ugra_municipal_efficiency_349rp_2024_kogalym'
    AND reference_year BETWEEN 2022 AND 2024
    AND verification_status = 'needs_review';
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 18 THEN
    RAISE EXCEPTION 'Expected 18 Kogalym observations to verify, updated %', changed;
  END IF;
END $$;
