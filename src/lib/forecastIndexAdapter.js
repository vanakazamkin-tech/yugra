/**
 * Narrow adapter from a calculated resilience-index run to forecast options.
 *
 * It never approves a methodology itself. Callers must provide an explicitly
 * approved, versioned contract and the exact reference period they intend to
 * forecast from. Missing, partial, duplicate, or invalid municipality results
 * remain unavailable; conceptual municipality.score is never copied here.
 */

const isFiniteIndex = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 && value <= 100;
  if (typeof value !== 'string' || value.trim() === '') return false;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100;
};

const hasTraceableCompleteResult = (result, expectedYear, expectedPeriod, diagnostics, minimumPeers, minimumCoveragePercent) => {
  if (!Array.isArray(result?.pillars) || result.pillars.length !== 6) return false;
  return result.pillars.every((pillar) =>
    pillar
    && typeof pillar.key === 'string'
    && pillar.key.trim() !== ''
    && isFiniteIndex(pillar.score)
    && Array.isArray(pillar.indicators)
    && pillar.indicators.length > 0
    && pillar.indicators.every((indicator) =>
      indicator
      && typeof indicator.code === 'string'
      && indicator.code.trim() !== ''
      && (diagnostics || []).some((group) =>
        group?.code === indicator.code
        && group.comparable === true
        && Number(group.municipalityCount) >= minimumPeers
        && Number(group.peerCoveragePercent) >= minimumCoveragePercent
      )
      && typeof indicator.sourceId === 'string'
      && indicator.sourceId.trim() !== ''
      && typeof indicator.sourceUrl === 'string'
      && indicator.sourceUrl.trim() !== ''
      && Number(indicator.year) === expectedYear
      && String(indicator.period ?? '').trim() === expectedPeriod
      && isFiniteIndex(indicator.score)
      && typeof indicator.unit === 'string'
      && indicator.unit.trim() !== ''
      && Number.isFinite(indicator.rawValue)
    )
  );
};

const municipalityId = (row) => {
  const id = row?.id ?? row?.municipality_id;
  return id == null ? '' : String(id).trim();
};

export function createForecastIndexOptions({
  indexRun,
  municipalities = [],
  indexContract,
  referenceYear,
  referencePeriod,
} = {}) {
  const rows = Array.isArray(municipalities) ? municipalities : [];
  const expectedYear = Number(referenceYear);
  const expectedPeriod = typeof referencePeriod === 'string' ? referencePeriod.trim() : '';
  const runYear = Number(indexRun?.referenceYear);
  const runPeriod = typeof indexRun?.referencePeriod === 'string' ? indexRun.referencePeriod.trim() : '';
  const runHasExpectedPeriod = Number.isInteger(expectedYear)
    && Number.isInteger(runYear)
    && runYear === expectedYear
    && expectedPeriod !== ''
    && runPeriod === expectedPeriod;
  const scaleMatches = indexRun?.indexScale === '0–100 percentile score';
  const minimumPeerMunicipalities = Number(indexContract?.minimumPeerMunicipalities);
  const minimumPeerCoveragePercent = Number(indexContract?.minimumPeerCoveragePercent);
  const contractApproved = indexContract?.status === 'approved'
    && typeof indexContract?.version === 'string'
    && indexContract.version.trim() !== ''
    && Number.isInteger(minimumPeerMunicipalities)
    && minimumPeerMunicipalities >= 5
    && Number.isFinite(minimumPeerCoveragePercent)
    && minimumPeerCoveragePercent > 0
    && minimumPeerCoveragePercent <= 100;
  const runAvailable = indexRun?.results && typeof indexRun.results === 'object'
    && !Array.isArray(indexRun.results);
  const approved = contractApproved && runHasExpectedPeriod && scaleMatches && runAvailable;

  const idCounts = new Map();
  for (const row of rows) {
    const id = municipalityId(row);
    if (id) idCounts.set(id, (idCounts.get(id) || 0) + 1);
  }

  const indexResults = {};
  let completeCount = 0;
  let incompleteCount = 0;
  let invalidCount = 0;
  let duplicateMunicipalityCount = 0;
  for (const row of rows) {
    const id = municipalityId(row);
    if (!id) continue;
    if (idCounts.get(id) > 1) {
      duplicateMunicipalityCount += 1;
      continue;
    }
    const result = runAvailable ? indexRun.results[id] : null;
    if (!result || result.status !== 'complete') {
      indexResults[id] = { status: 'insufficient_coverage', index: null };
      incompleteCount += 1;
      continue;
    }
    if (String(result.municipalityId ?? '').trim() !== id
      || !isFiniteIndex(result.index)
      || !hasTraceableCompleteResult(
        result,
        expectedYear,
        expectedPeriod,
        indexRun?.diagnostics?.indicatorGroups,
        minimumPeerMunicipalities,
        minimumPeerCoveragePercent,
      )) {
      indexResults[id] = { status: 'invalid_index_result', index: null };
      invalidCount += 1;
      continue;
    }
    indexResults[id] = { status: 'complete', index: Number(result.index) };
    completeCount += 1;
  }

  return {
    scoreSource: 'resilience-index',
    indexContract: {
      status: approved ? 'approved' : 'candidate',
      version: approved ? indexContract.version.trim() : null,
      minimumPeerMunicipalities: approved ? minimumPeerMunicipalities : null,
      minimumPeerCoveragePercent: approved ? minimumPeerCoveragePercent : null,
    },
    indexResults,
    diagnostics: {
      available: approved,
      reason: !contractApproved ? 'approved_versioned_peer_coverage_contract_required'
        : !runHasExpectedPeriod ? 'reference_period_mismatch'
          : !scaleMatches ? 'unsupported_index_scale'
            : !runAvailable ? 'calculated_index_results_required'
              : null,
      referenceYear: Number.isInteger(runYear) ? runYear : null,
      referencePeriod: runPeriod || null,
      methodologyVersion: approved ? indexContract.version.trim() : null,
      minimumPeerMunicipalities: approved ? minimumPeerMunicipalities : null,
      minimumPeerCoveragePercent: approved ? minimumPeerCoveragePercent : null,
      municipalityCount: rows.length,
      completeCount,
      incompleteCount,
      invalidCount,
      duplicateMunicipalityCount,
    },
  };
}
