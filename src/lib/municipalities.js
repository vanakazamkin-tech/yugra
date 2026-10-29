/** Приводит строку Supabase к формату, который уже использует интерфейс Yugra. */
export function mapMunicipalityRow(row) {
  return {
    id: row.id,
    name: row.name,
    group2024: row.group_2024 ?? row.group2024 ?? null,
    rank2024: row.rank_2024 ?? row.rank2024 ?? null,
    score: row.score ?? null,
    investments: {
      volumeBillion: row.investments_volume_billion ?? row.investments?.volumeBillion ?? null,
      growthPercent: row.investments_growth_percent ?? row.investments?.growthPercent ?? null,
    },
    smeCount: row.sme_count ?? row.smeCount ?? null,
    assessmentScore: row.assessment_score ?? row.assessmentScore ?? null,
  }
}

/** Загружает актуальный срез из таблицы public.municipalities. */
export async function fetchMunicipalities(client) {
  const { data, error } = await client
    .from('municipalities')
    .select('*')
    .order('rank_2024', { ascending: true, nullsFirst: false })

  if (error) throw error
  if (!Array.isArray(data)) throw new Error('Supabase вернул данные в неожиданном формате')
  return data.map(mapMunicipalityRow)
}
