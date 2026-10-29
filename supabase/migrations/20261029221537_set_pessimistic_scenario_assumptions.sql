-- Reuse the prototype's existing sanctions-stress assumptions for the
-- pessimistic scenario required by the ЮГУ-18 project brief.
-- These are conceptual inputs, not estimates derived from official statistics.
update public.forecast_scenarios
set investment_growth_rate = -8,
    sme_growth_rate = -4,
    score_growth_rate = -3,
    uncertainty_rate = 18
where key = 'cautious';
