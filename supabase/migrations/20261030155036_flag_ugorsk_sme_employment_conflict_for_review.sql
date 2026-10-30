-- The canonical municipality ID for Yugorsk is "ugorsk".
-- Retain both source values but exclude them from the verified/public layer
-- until the conflicting official series are reconciled.
update public.municipality_indicators
set verification_status = 'needs_review',
    notes = concat_ws(' ', nullif(notes, ''),
      'Временно исключено из подтверждённого слоя: обнаружено расхождение значений между официальным аналитическим отчётом рейтинга за 2023 год и сводным докладом по распоряжению № 349-рп за 2024 год; требуется сверка определений и исходных таблиц.')
where municipality_id = 'ugorsk'
  and indicator_code = 'sme_employment_share'
  and reference_year in (2022, 2023)
  and verification_status = 'verified'
  and source_id in (
    'investugra_municipal_rating_report_2023',
    'ugra_municipal_efficiency_349rp_2024_uray_yugorsk_khm'
  );
