-- Record the observed discrepancy between search-index and opened-page metadata.
update public.data_sources
set notes=concat_ws(' ',nullif(notes,''),
  'Контроль версии 30.10.2026: поисковый индекс карточки общего набора показывал обновление 28.09.2026 и охват 2005–2026, однако открытая страница на момент проверки показывала 03.08.2026 и охват 2005–2025. До получения фактической выгрузки верхний год и актуальность не подтверждены; статус остаётся identified.')
where id='tochno_bdmo_2026';
