insert into public.data_sources
(id, name, category, url, description, format, coverage, update_frequency, import_status, notes)
values
(
  'municipal_ser_surgut_2025',
  'Администрация Сургута — итоги социально-экономического развития за 2025 год',
  'municipal_official_report',
  'https://docsurgut.ru/Document/View/8676',
  'Официальный годовой отчёт администрации городского округа Сургут за 2025 год; распоряжение администрации от 03.02.2026 № 59, опубликован 07.02.2026, позднее изменён 14.05.2026 № 351.',
  'docx/pdf',
  'городской округ Сургут',
  'annual',
  'identified',
  'Источник подтверждён по официальному порталу документов docsurgut.ru и странице инвестиционного портала администрации. DOCX: https://invest.admsurgut.ru/files/file_list/download/3774. PDF: https://dumasurgut.ru/upload/iblock/80f/xzxknp8dh16e3mftqxj3zm870d0xc7ut/963-VII%20%D0%94%D0%93%20%D0%BE%D1%82%2003.03.2026.pdf. Числовые наблюдения пока не импортированы: требуется извлечь таблицы из полного документа и сверить определения, единицы и статус факта/оценки. Не смешивать с прогнозными значениями.'
)
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  url = excluded.url,
  description = excluded.description,
  format = excluded.format,
  coverage = excluded.coverage,
  update_frequency = excluded.update_frequency,
  import_status = 'identified',
  notes = excluded.notes,
  updated_at = now();
