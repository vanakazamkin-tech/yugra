-- Flag six Kogalym indicators for source re-verification.
-- The 18 observations remain available, but are excluded from verified-only views
-- until the original 349-rp source table is checked against the stored values.
update public.municipality_indicators
set
  verification_status = 'needs_review',
  notes = case
    when coalesce(notes, '') like '%независимая сверка с первичным документом не завершена%'
      then notes
    else coalesce(notes, '') || ' Дополнительная проверка: значения перенесены из ранее выполненной выборки сводного доклада, но независимая сверка с первичным документом не завершена; не использовать как подтверждённые до повторной проверки.'
  end
where municipality_id = 'kogalym'
  and source_id = 'ugra_municipal_efficiency_349rp_2024_kogalym'
  and indicator_code in (
    'kogalym_taxable_land_share',
    'kogalym_profitable_agri_org_share',
    'kogalym_no_regular_transport_population_share',
    'kogalym_wage_large_medium',
    'kogalym_wage_preschool',
    'kogalym_wage_school'
  );
