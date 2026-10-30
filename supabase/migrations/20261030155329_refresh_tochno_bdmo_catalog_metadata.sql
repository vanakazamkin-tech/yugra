-- Refresh metadata for the processed Rosstat municipal-statistics dataset.
-- The dataset is catalogued but not treated as imported until the source rows
-- are downloaded and reconciled with original Rosstat BDMO records.
update public.data_sources
set coverage='Муниципальные образования России, включая все 22 муниципалитета ХМАО — Югры; уровень МО верхнего уровня; исторический охват 2005–2026.',
    notes='Страница набора обновлена 28.09.2026; заявлены 603 показателя и 33 раздела, включая раздел 31 «Население» и раздел 32 «Занятость и заработная плата». CSV: UTF-8, разделитель «;». Лицензия Creative Commons BY 4.0. Набор преобразован «Если быть точным» из БД ПМО Росстата и является вспомогательной обработанной копией, а не первичным интерфейсом Росстата. Перед импортом сверить код БД ПМО, ОКТМО, тип/границы муниципалитета, год и разрез. Сырые данные в Supabase ещё не импортированы; статус остаётся identified.'
where id='tochno_bdmo_2026';
