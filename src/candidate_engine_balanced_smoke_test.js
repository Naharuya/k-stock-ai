import "dotenv/config";
import { runDailyCandidateEngine } from "./services/candidate_engine_service.js";

try {
  const result = await runDailyCandidateEngine({
    exchange: "all",
    top: 20,
    candidatePool: 40,
    quoteLimit: 15,
    deepLimit: 3,
    businessYear: String(new Date().getFullYear())
  });

  const summary = {
    ok: result.ok,
    date: result.date,
    label: result.label,
    recommendation: result.recommendation,
    pipeline: result.pipeline,
    top: result.top.slice(0, 20).map((x) => ({
      code: x.code,
      name: x.name,
      score: x.finalScore,
      state: x.finalState,
      level: x.validationLevel,
      roe: x.roe,
      per: x.quote?.per ?? null,
      pbr: x.quote?.pbr ?? null,
      committee: x.committee?.status ?? x.deep?.committeeStatus ?? null,
      committeeScore: x.committee?.score ?? x.deep?.committeeScore ?? null,
      riskHardStop: x.committee?.hardStop ?? x.deep?.riskHardStop ?? null,
      hardStopReason: x.committee?.hardStopReason ?? x.deep?.hardStopReason ?? null,
      flags: x.quality?.flags ?? [],
      tags: x.styleTags ?? []
    })),
    rejected: result.rejected?.slice(0, 10).map((x) => ({
      code: x.code,
      name: x.name,
      state: x.finalState,
      level: x.validationLevel,
      committee: x.committee?.status ?? null,
      committeeScore: x.committee?.score ?? null,
      riskHardStop: x.committee?.hardStop ?? null,
      hardStopReason: x.committee?.hardStopReason ?? x.deep?.hardStopReason ?? null,
      riskLevel: x.deep?.riskLevel ?? null,
      riskScore: x.deep?.riskScore ?? null,
      criticalRisk: x.deep?.criticalRisk ?? null,
      excludeSuggested: x.deep?.excludeSuggested ?? null,
      dartImpact: x.deep?.dartImpact ?? null,
      dartImportant: x.deep?.dartImportant ?? null,
      riskReasons: x.deep?.riskReasons ?? [],
      redFlags: x.deep?.redFlags ?? [],
      flags: x.quality?.flags ?? []
    })) ?? [],
    errors: result.errors
  };

  console.log(JSON.stringify(summary, null, 2));

  const pass = result.ok
    && result.pipeline.quoteRequested === 15
    && result.pipeline.quoteValidated > 0
    && result.pipeline.deepRequested === 3
    && (result.pipeline.deepCompleted + result.pipeline.deepFailed) === 3;
  if (!pass) process.exitCode = 1;
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exitCode = 1;
}
