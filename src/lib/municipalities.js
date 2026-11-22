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

/**
 * Загружает справочник из DB2 и дополняет его локальными демонстрационными полями.
 * Пустые поля БД не затирают резервный концептуальный набор; подтверждённые
 * статистические показатели хранятся отдельно в municipality_indicators.
 */
export async function fetchMunicipalities(client, fallbackMunicipalities = []) {
  const { data, error } = await client
    .from('municipalities')
    .select('id,name,group_2024,rank_2024,score,investments_volume_billion,investments_growth_percent,sme_count,assessment_score')
    .order('rank_2024', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true })

  if (error) throw error
  if (!Array.isArray(data)) throw new Error('Supabase вернул данные в неожиданном формате')

  const fallbackById = new Map(fallbackMunicipalities.map((item) => [String(item.id), item]))
  const merged = data.map((row) => {
    const mapped = mapMunicipalityRow(row)
    const fallback = fallbackById.get(String(row.id)) || {}
    return {
      ...fallback,
      ...mapped,
      group2024: mapped.group2024 ?? fallback.group2024 ?? null,
      rank2024: mapped.rank2024 ?? fallback.rank2024 ?? null,
      score: mapped.score ?? fallback.score ?? null,
      investments: {
        ...(fallback.investments || {}),
        ...(mapped.investments || {}),
        volumeBillion: mapped.investments.volumeBillion ?? fallback.investments?.volumeBillion ?? null,
        growthPercent: mapped.investments.growthPercent ?? fallback.investments?.growthPercent ?? null,
      },
      smeCount: mapped.smeCount ?? fallback.smeCount ?? null,
      assessmentScore: mapped.assessmentScore ?? fallback.assessmentScore ?? null,
    }
  })

  return merged.sort((a, b) => {
    const rankA = Number(a.rank2024)
    const rankB = Number(b.rank2024)
    if (Number.isFinite(rankA) && Number.isFinite(rankB)) return rankA - rankB
    if (Number.isFinite(rankA)) return -1
    if (Number.isFinite(rankB)) return 1
    return String(a.name).localeCompare(String(b.name), 'ru')
  })
}
