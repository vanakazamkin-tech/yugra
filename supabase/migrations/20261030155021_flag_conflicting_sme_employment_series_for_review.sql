-- Keep conflicting official SME employment-share values out of the
-- verified/public layer until definitions and source tables are reconciled.
-- The historical source uses a "yugorsk" alias; the actual municipality ID
-- is "ugorsk", handled in the follow-up migration.
update public.municipality_indicators
set verification_status = 'needs_review',
    notes = concat_ws(' ', nullif(notes, ''),
      'Временно исключено из подтверждённого слоя: обнаружено расхождение значений между официальным аналитическим отчётом рейтинга за 2023 год и сводным докладом по распоряжению № 349-рп за 2024 год; требуется сверка определений и исходных таблиц.')
where municipality_id in ('uray','yugorsk','nyagan-city')
  and indicator_code = 'sme_employment_share'
  and reference_year in (2022, 2023)
  and verification_status = 'verified'
  and source_id in (
    'investugra_municipal_rating_report_2023',
    'ugra_municipal_efficiency_349rp_2024_uray_yugorsk_khm'
  );
