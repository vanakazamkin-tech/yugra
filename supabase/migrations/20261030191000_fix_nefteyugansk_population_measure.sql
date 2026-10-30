-- Distinguish the annual-average population in the municipal SER report from Rosstat's population at 1 January.
update public.municipality_indicators
set indicator_code = 'population_average_annual',
    indicator_name = 'Среднегодовая численность постоянного населения'
where municipality_id = 'nefteyugansk'
  and reference_year = 2025
  and source_id = 'municipal_ser_nefteyugansk_2025'
  and indicator_code = 'population_municipality';
