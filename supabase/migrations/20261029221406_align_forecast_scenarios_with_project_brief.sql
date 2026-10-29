-- Align the three stored scenario labels and descriptions with the ЮГУ-18 project brief.
-- The scenario rates are intentionally preserved: this migration changes only
-- the Russian presentation text and documents that sanctions belong in the
-- pessimistic scenario rather than as a fourth scenario.
update public.forecast_scenarios
set title = case key
  when 'cautious' then 'Пессимистичный'
  when 'base' then 'Базовый'
  when 'ambitious' then 'Оптимистичный'
  else title
end,
summary = case key
  when 'cautious' then 'Неблагоприятный сценарий: снижение экспортной выручки, усиление санкционных ограничений, рост издержек предприятий и дефицит кадров.'
  when 'base' then 'Базовый сценарий: продолжение наблюдаемых тенденций при сохранении текущих внешних и внутренних условий.'
  when 'ambitious' then 'Оптимистичный сценарий: улучшение инвестиционной активности, расширение занятости и реализация мер поддержки при доступности ресурсов.'
  else summary
end
where key in ('cautious','base','ambitious');
