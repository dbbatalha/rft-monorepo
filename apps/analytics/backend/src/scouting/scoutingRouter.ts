import { z } from "zod";
import axios from "axios";
import { spawn } from "node:child_process";
import { publicProcedure, router } from "../_core/trpc";

// Caminho absoluto para o script Python que faz a inferência ML.
// Configurável via env var ML_PREDICT_SCRIPT — útil para deploy.
const ML_PREDICT_SCRIPT =
  process.env.ML_PREDICT_SCRIPT ??
  "/Users/diegobatalhacunhadasilva/Desktop/Projeto/projeto_scouting/projeto_scouting_manus/mma_project/modulo_3_ml/predict.py";

const PYTHON_BIN = process.env.PYTHON_BIN ?? "python3";

/** Roda o predict.py via subprocess, passando JSON pelo stdin. */
async function runMLPredict(payload: unknown): Promise<any> {
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON_BIN, [ML_PREDICT_SCRIPT], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => { out += d.toString(); });
    child.stderr.on("data", (d) => { err += d.toString(); });
    child.on("error", (e) => reject(e));
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`predict.py exit ${code}: ${err}`));
        return;
      }
      try {
        resolve(JSON.parse(out.trim()));
      } catch (e) {
        reject(new Error(`predict.py invalid JSON: ${out.slice(0, 200)}`));
      }
    });
    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}
import {
  getAllFighters,
  getAllFightersAlpha,
  getTop10FighterNames,
  getOrganizations,
  getRankingOrganizations,
  getRecentFighters,
  getRankingsByWeightClass,
  getUpcomingEventsByOrg,
  replaceUpcomingEventsForOrg,
  getFighterById,
  searchFighters,
  upsertFighter,
  getFightsByFighterId,
  getFightStatsByFightIds,
  insertFight,
  getScoutingReports,
  insertScoutingReport,
  getRecentPredictions,
  insertPrediction,
  insertMatchupAnalysis,
  getMatchupAnalyses,
} from "./db";

// ============================================================================
// FIGHTER DATA (Michael Chiesa + Carlston Harris)
// ============================================================================

const CHIESA_DATA = {
  externalId: "michael-chiesa",
  name: "Michael Chiesa",
  nickname: "Maverick",
  nationality: "United States",
  birthDate: "1987-12-07",
  age: 38,
  heightCm: 185.42,
  reachCm: null,
  weightKg: 77.1,
  stance: null,
  primaryTeam: "Sikjitsu",
  weightClass: "Welterweight",
  primaryBases: ["Wrestling", "Brazilian Jiu-Jitsu"],
  styleArchetype: "Control grappler / attritional wrestler",
  strengths: [
    "Controle de costas acima da média",
    "Progressão posicional paciente (meia-guarda -> costas)",
    "Bom cardio para amarrar ritmo em lutas longas",
    "QI de luta (prioriza vitória por controle)",
  ],
  weaknesses: [
    "Striking pouco ameaçador (baixo KO threat)",
    "Entradas previsíveis quando precisa pontuar em pé",
    "Vulnerável a scrambles e contra-ataques de pescoço",
    "Pouco jogo efetivo por baixo (guarda defensiva)",
  ],
  howHeWins: [
    "Clinch na grade -> queda -> controle -> costas -> RNC",
    "Controle de rounds -> decisão",
  ],
  howHeLoses: [
    "Anti-wrestling forte + controle do adversário",
    "Scrambles caóticos + submissões oportunistas",
  ],
  totalFightsPro: 26,
  wins: 19,
  losses: 7,
  draws: 0,
  winRate: 0.7308,
  finishRate: 0.6316,
  submissionWinRate: 0.6316,
  koTkoWins: 0,
  submissionWins: 12,
  decisionWins: 7,
  currentStreak: "W",
  currentStreakCount: 3,
  longestWinStreak: 12,
  avgFightTimeSeconds: 512.81,
};

const HARRIS_DATA = {
  externalId: "carlston-harris",
  name: "Carlston Harris",
  nickname: "Moo Cow",
  nationality: "Guyana",
  birthDate: null,
  age: null,
  heightCm: 180,
  reachCm: null,
  weightKg: 77.1,
  stance: null,
  primaryTeam: null,
  weightClass: "Welterweight",
  primaryBases: ["Wrestling", "Grappling"],
  styleArchetype: "Grappler de controle",
  strengths: [
    "Excelente em scrambles",
    "Ataques de pescoço em transição",
    "Finalizações oportunistas",
    "Confortável no caos",
    "Mais explosivo que o oponente",
  ],
  weaknesses: [
    "Aceitar clinch prolongado",
    "Tentar vencer no controle posicional",
    "Desacelerar e virar luta de xadrez",
    "Entregar costas para defender depois",
  ],
  howHeWins: ["Scrambles + pescoço em transição", "Finalizações oportunistas"],
  howHeLoses: ["Controle prolongado", "Clinch estabilizado"],
  totalFightsPro: 15,
  wins: 10,
  losses: 5,
  draws: 0,
  winRate: 0.667,
  finishRate: 0.7,
  submissionWinRate: 0.5,
  koTkoWins: 2,
  submissionWins: 5,
  decisionWins: 3,
  currentStreak: "W",
  currentStreakCount: 2,
  longestWinStreak: 5,
  avgFightTimeSeconds: 380,
};

const CHIESA_FIGHTS = [
  { opponent: "Court McGee", fightDate: "2025-06-14", result: "win", methodCategory: "DECISION", methodDetail: "Unanimous Decision", round: 3, timeInRound: "5:00", elapsedTimeSeconds: 900, promotion: "UFC", event: "UFC on ESPN 69 - Usman vs. Buckley", referee: "Mike Beltran", weightClass: "Welterweight", notes: ["3 rounds completos"] },
  { opponent: "Max Griffin", fightDate: "2024-12-07", result: "win", methodCategory: "SUBMISSION", methodDetail: "Rear-Naked Choke", round: 3, timeInRound: "1:56", elapsedTimeSeconds: 716, promotion: "UFC", event: "UFC 310 - Pantoja vs. Asakura", referee: "Marc Goddard", weightClass: "Welterweight", notes: [] },
  { opponent: "Tony Ferguson", fightDate: "2024-08-03", result: "win", methodCategory: "SUBMISSION", methodDetail: "Rear-Naked Choke", round: 1, timeInRound: "3:44", elapsedTimeSeconds: 224, promotion: "UFC", event: "UFC on ABC 7 - Sandhagen vs. Nurmagomedov", referee: "Marc Goddard", weightClass: "Welterweight", notes: ["finalização rápida no R1"] },
  { opponent: "Kevin Holland", fightDate: "2023-07-29", result: "loss", methodCategory: "SUBMISSION", methodDetail: "Brabo Choke", round: 1, timeInRound: "2:39", elapsedTimeSeconds: 159, promotion: "UFC", event: "UFC 291 - Poirier vs. Gaethje 2", referee: "Marc Goddard", weightClass: "Welterweight", notes: ["derrota rápida por pescoço em scramble"] },
  { opponent: "Sean Brady", fightDate: "2021-11-20", result: "loss", methodCategory: "DECISION", methodDetail: "Unanimous Decision", round: 3, timeInRound: "5:00", elapsedTimeSeconds: 900, promotion: "UFC", event: "UFC Fight Night 198 - Vieira vs. Tate", referee: "Herb Dean", weightClass: "Welterweight", notes: ["neutralizado por defesa/controle"] },
  { opponent: "Vicente Luque", fightDate: "2021-08-07", result: "loss", methodCategory: "SUBMISSION", methodDetail: "Brabo Choke", round: 1, timeInRound: "3:25", elapsedTimeSeconds: 205, promotion: "UFC", event: "UFC 265 - Lewis vs. Gane", referee: "Kerry Hatley", weightClass: "Welterweight", notes: ["contra-ataque de pescoço"] },
  { opponent: "Neil Magny", fightDate: "2021-01-20", result: "win", methodCategory: "DECISION", methodDetail: "Unanimous Decision", round: 5, timeInRound: "5:00", elapsedTimeSeconds: 1500, promotion: "UFC", event: "UFC on ESPN 20 - Chiesa vs. Magny", referee: "Marc Goddard", weightClass: "Welterweight", notes: ["main event 5 rounds completos"] },
  { opponent: "Rafael dos Anjos", fightDate: "2020-01-25", result: "win", methodCategory: "DECISION", methodDetail: "Unanimous Decision", round: 3, timeInRound: "5:00", elapsedTimeSeconds: 900, promotion: "UFC", event: "UFC Fight Night 166 - Blaydes vs. dos Santos", referee: "Kevin MacDonald", weightClass: "Welterweight", notes: ["vitória estratégica"] },
  { opponent: "Diego Sanchez", fightDate: "2019-07-06", result: "win", methodCategory: "DECISION", methodDetail: "Unanimous Decision", round: 3, timeInRound: "5:00", elapsedTimeSeconds: 900, promotion: "UFC", event: "UFC 239 - Jones vs. Santos", referee: "Mark Smith", weightClass: "Welterweight", notes: [] },
  { opponent: "Carlos Condit", fightDate: "2018-12-29", result: "win", methodCategory: "SUBMISSION", methodDetail: "Kimura", round: 2, timeInRound: "0:56", elapsedTimeSeconds: 356, promotion: "UFC", event: "UFC 232 - Jones vs. Gustafsson 2", referee: "Mike Beltran", weightClass: "Welterweight", notes: ["finalização técnica de alavanca"] },
  { opponent: "Anthony Pettis", fightDate: "2018-07-07", result: "loss", methodCategory: "SUBMISSION", methodDetail: "Triangle Armbar", round: 2, timeInRound: "0:52", elapsedTimeSeconds: 352, promotion: "UFC", event: "UFC 226 - Miocic vs. Cormier", referee: "Herb Dean", weightClass: "Lightweight", notes: ["punido em transição/braços"] },
  { opponent: "Kevin Lee", fightDate: "2017-06-25", result: "loss", methodCategory: "SUBMISSION", methodDetail: "Rear-Naked Choke (Technical Submission)", round: 1, timeInRound: "4:37", elapsedTimeSeconds: 277, promotion: "UFC", event: "UFC Fight Night 112 - Chiesa vs. Lee", referee: "Mario Yamasaki", weightClass: "Lightweight", notes: [] },
  { opponent: "Beneil Dariush", fightDate: "2016-04-16", result: "win", methodCategory: "SUBMISSION", methodDetail: "Rear-Naked Choke", round: 2, timeInRound: "1:20", elapsedTimeSeconds: 380, promotion: "UFC", event: "UFC on Fox 19 - Teixeira vs. Evans", referee: "Dan Miragliotta", weightClass: "Lightweight", notes: [] },
  { opponent: "Jim Miller", fightDate: "2015-12-10", result: "win", methodCategory: "SUBMISSION", methodDetail: "Rear-Naked Choke", round: 2, timeInRound: "2:57", elapsedTimeSeconds: 477, promotion: "UFC", event: "UFC Fight Night 80 - Namajunas vs. VanZant", referee: "Jason Herzog", weightClass: "Lightweight", notes: ["vitória contra veterano perigoso"] },
  { opponent: "Joe Lauzon", fightDate: "2014-09-05", result: "loss", methodCategory: "KO_TKO", methodDetail: "TKO (Doctor Stoppage)", round: 2, timeInRound: "2:14", elapsedTimeSeconds: 434, promotion: "UFC", event: "UFC Fight Night 50 - Jacare vs. Mousasi 2", referee: "Herb Dean", weightClass: "Lightweight", notes: ["única derrota não-submission"] },
  { opponent: "Jorge Masvidal", fightDate: "2013-07-27", result: "loss", methodCategory: "SUBMISSION", methodDetail: "Brabo Choke", round: 2, timeInRound: "4:59", elapsedTimeSeconds: 599, promotion: "UFC", event: "UFC on Fox 8 - Johnson vs. Moraga", referee: "Dan Miragliotta", weightClass: "Lightweight", notes: ["primeira derrota profissional"] },
  { opponent: "Al Iaquinta", fightDate: "2012-06-01", result: "win", methodCategory: "SUBMISSION", methodDetail: "Rear-Naked Choke (Technical Submission)", round: 1, timeInRound: "2:47", elapsedTimeSeconds: 167, promotion: "UFC", event: "UFC - The Ultimate Fighter 15 Finale", referee: "Herb Dean", weightClass: "Lightweight", notes: ["título do TUF 15"] },
];

// ============================================================================
// PREDICTION ENGINE — Multi-Model Ensemble
// Models: Elo Rating, Logistic Regression, Decision Tree, Random Forest,
//         XGBoost (approximated), Neural Network (MLP approximated)
// ============================================================================

function eloExpected(ratingA: number, ratingB: number): number {
  return 1.0 / (1.0 + Math.pow(10, (ratingB - ratingA) / 400));
}

function estimateElo(f: any): number {
  const wr = f.winRate || 0.5;
  const streak = f.currentStreak === "W" ? (f.currentStreakCount || 0) : -(f.currentStreakCount || 0);
  const total = f.totalFightsPro || 10;
  return 1500 + (wr - 0.5) * 400 + Math.min(total, 30) * 3 + streak * 15 + (f.finishRate || 0.5) * 50;
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function calculatePrediction(fighter1: any, fighter2: any) {
  const factors: string[] = [];

  const wr1 = fighter1.winRate || 0.5;
  const wr2 = fighter2.winRate || 0.5;
  const fr1 = fighter1.finishRate || 0.5;
  const fr2 = fighter2.finishRate || 0.5;
  const exp1 = fighter1.totalFightsPro || 10;
  const exp2 = fighter2.totalFightsPro || 10;
  const streak1 = fighter1.currentStreak === "W" ? (fighter1.currentStreakCount || 0) : -(fighter1.currentStreakCount || 0);
  const streak2 = fighter2.currentStreak === "W" ? (fighter2.currentStreakCount || 0) : -(fighter2.currentStreakCount || 0);
  const subWr1 = fighter1.submissionWinRate || 0;
  const subWr2 = fighter2.submissionWinRate || 0;
  const koWr1 = (fighter1.koTkoWins || 0) / Math.max(fighter1.wins || 1, 1);
  const koWr2 = (fighter2.koTkoWins || 0) / Math.max(fighter2.wins || 1, 1);

  // --- Model 1: Elo Rating (FiveThirtyEight style) ---
  const elo1 = estimateElo(fighter1);
  const elo2 = estimateElo(fighter2);
  const eloProb = eloExpected(elo1, elo2);

  // --- Model 2: Logistic Regression ---
  const lrLogit = (wr1 - wr2) * 3.0 + (fr1 - fr2) * 1.5 + (streak1 - streak2) * 0.15
    + (exp1 - exp2) / 30 * 0.8 + (subWr1 - subWr2) * 1.2 + (koWr1 - koWr2) * 1.0;
  const lrProb = sigmoid(lrLogit);

  // --- Model 3: Decision Tree (rule-based approximation) ---
  let dtScore = 0;
  if (wr1 > wr2 + 0.1) dtScore += 2;
  else if (wr2 > wr1 + 0.1) dtScore -= 2;
  if (fr1 > fr2 + 0.1) dtScore += 1;
  else if (fr2 > fr1 + 0.1) dtScore -= 1;
  if (streak1 > 2) dtScore += 1;
  else if (streak2 > 2) dtScore -= 1;
  if (exp1 > exp2 + 5) dtScore += 1;
  else if (exp2 > exp1 + 5) dtScore -= 1;
  const dtProb = sigmoid(dtScore * 0.7);

  // --- Model 4: Random Forest (ensemble of decision trees approximation) ---
  const rfFeatures = [
    sigmoid((wr1 - wr2) * 4),
    sigmoid((fr1 - fr2) * 3),
    sigmoid((streak1 - streak2) * 0.3),
    sigmoid((exp1 - exp2) / 20),
    sigmoid((subWr1 - subWr2) * 3),
    sigmoid((koWr1 - koWr2) * 3),
    sigmoid((elo1 - elo2) / 200),
  ];
  const rfProb = rfFeatures.reduce((a, b) => a + b, 0) / rfFeatures.length;

  // --- Model 5: XGBoost (gradient boosting approximation) ---
  const xgbBase = (wr1 - wr2) * 2.5 + (fr1 - fr2) * 1.8;
  const xgbBoost1 = (streak1 > 0 ? Math.log(1 + streak1) * 0.2 : 0);
  const xgbBoost2 = (streak2 > 0 ? -Math.log(1 + streak2) * 0.2 : 0);
  const xgbProb = sigmoid(xgbBase + xgbBoost1 + xgbBoost2 + (elo1 - elo2) / 600);

  // --- Model 6: Neural Network (MLP approximation) ---
  // Layer 1: 4 hidden units
  const h1 = [
    sigmoid(wr1 * 2 - wr2 * 2 + fr1 - 0.5),
    sigmoid(streak1 * 0.3 - streak2 * 0.3 + exp1 / 30 - 0.5),
    sigmoid(subWr1 * 2 - subWr2 * 2 + koWr1 - koWr2),
    sigmoid((elo1 - elo2) / 300),
  ];
  // Layer 2: output
  const nnProb = sigmoid(h1[0] * 1.5 + h1[1] * 1.2 + h1[2] * 1.0 + h1[3] * 1.8 - 2.5);

  // --- Ensemble: weighted average ---
  const weights = { elo: 0.20, lr: 0.15, dt: 0.10, rf: 0.20, xgb: 0.20, nn: 0.15 };
  const ensembleProb = (
    eloProb * weights.elo +
    lrProb * weights.lr +
    dtProb * weights.dt +
    rfProb * weights.rf +
    xgbProb * weights.xgb +
    nnProb * weights.nn
  );

  const f1Prob = Math.max(0.05, Math.min(0.95, ensembleProb));
  const f2Prob = 1 - f1Prob;

  // --- Model breakdown ---
  const modelBreakdown = [
    { model: "Elo Rating (FiveThirtyEight)", f1Prob: parseFloat(eloProb.toFixed(3)), f2Prob: parseFloat((1 - eloProb).toFixed(3)), weight: weights.elo },
    { model: "Logistic Regression", f1Prob: parseFloat(lrProb.toFixed(3)), f2Prob: parseFloat((1 - lrProb).toFixed(3)), weight: weights.lr },
    { model: "Decision Tree", f1Prob: parseFloat(dtProb.toFixed(3)), f2Prob: parseFloat((1 - dtProb).toFixed(3)), weight: weights.dt },
    { model: "Random Forest", f1Prob: parseFloat(rfProb.toFixed(3)), f2Prob: parseFloat((1 - rfProb).toFixed(3)), weight: weights.rf },
    { model: "XGBoost", f1Prob: parseFloat(xgbProb.toFixed(3)), f2Prob: parseFloat((1 - xgbProb).toFixed(3)), weight: weights.xgb },
    { model: "Neural Network (MLP)", f1Prob: parseFloat(nnProb.toFixed(3)), f2Prob: parseFloat((1 - nnProb).toFixed(3)), weight: weights.nn },
  ];

  // --- Confidence: based on model agreement ---
  const allProbs = [eloProb, lrProb, dtProb, rfProb, xgbProb, nnProb];
  const mean = allProbs.reduce((a, b) => a + b, 0) / allProbs.length;
  const variance = allProbs.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / allProbs.length;
  const std = Math.sqrt(variance);
  const agreementScore = Math.max(0, 1 - std * 4);
  const decisiveness = Math.abs(f1Prob - 0.5) * 2;
  const confidence = agreementScore * 0.6 + decisiveness * 0.4;

  // --- Finish method probabilities ---
  // Winner's style determines method
  const winnerIsF1 = f1Prob > 0.5;
  const winner = winnerIsF1 ? fighter1 : fighter2;
  const loser = winnerIsF1 ? fighter2 : fighter1;

  const winnerKoRate = (winner.koTkoWins || 0) / Math.max(winner.wins || 1, 1);
  const winnerSubRate = winner.submissionWinRate || subWr1;
  const winnerDecRate = 1 - winnerKoRate - winnerSubRate;

  const totalMethodRate = winnerKoRate + winnerSubRate + Math.max(winnerDecRate, 0.1);
  const normKo = winnerKoRate / totalMethodRate;
  const normSub = winnerSubRate / totalMethodRate;
  const normDec = Math.max(winnerDecRate, 0.1) / totalMethodRate;

  const finishProb = (winner.finishRate || 0.5) * 0.7 + (1 - (loser.winRate || 0.5)) * 0.3;
  const probKoTko = parseFloat((normKo * finishProb).toFixed(4));
  const probSubmission = parseFloat((normSub * finishProb).toFixed(4));
  const probDecision = parseFloat((1 - finishProb + normDec * finishProb).toFixed(4));

  // Fighter-specific method breakdown
  const f1KoProb = winnerIsF1 ? probKoTko : parseFloat((normKo * finishProb * (1 - f1Prob)).toFixed(4));
  const f1SubProb = winnerIsF1 ? probSubmission : parseFloat((normSub * finishProb * (1 - f1Prob)).toFixed(4));
  const f1DecProb = winnerIsF1 ? parseFloat((probDecision * f1Prob).toFixed(4)) : parseFloat((probDecision * f1Prob).toFixed(4));
  const f2KoProb = !winnerIsF1 ? probKoTko : parseFloat((normKo * finishProb * f2Prob).toFixed(4));
  const f2SubProb = !winnerIsF1 ? probSubmission : parseFloat((normSub * finishProb * f2Prob).toFixed(4));
  const f2DecProb = !winnerIsF1 ? parseFloat((probDecision * f2Prob).toFixed(4)) : parseFloat((probDecision * f2Prob).toFixed(4));

  // --- Key factors ---
  if (wr1 > wr2) factors.push(`${fighter1.name} tem taxa de vitória superior (${(wr1 * 100).toFixed(1)}% vs ${(wr2 * 100).toFixed(1)}%)`);
  else if (wr2 > wr1) factors.push(`${fighter2.name} tem taxa de vitória superior (${(wr2 * 100).toFixed(1)}% vs ${(wr1 * 100).toFixed(1)}%)`);
  if (fr1 > fr2 + 0.1) factors.push(`${fighter1.name} tem maior taxa de finalização (${(fr1 * 100).toFixed(0)}%)`);
  else if (fr2 > fr1 + 0.1) factors.push(`${fighter2.name} tem maior taxa de finalização (${(fr2 * 100).toFixed(0)}%)`);
  if (exp1 > exp2 + 5) factors.push(`${fighter1.name} tem mais experiência (${exp1} vs ${exp2} lutas)`);
  else if (exp2 > exp1 + 5) factors.push(`${fighter2.name} tem mais experiência (${exp2} vs ${exp1} lutas)`);
  if (streak1 > 2) factors.push(`${fighter1.name} está em sequência de ${streak1} vitórias`);
  else if (streak2 > 2) factors.push(`${fighter2.name} está em sequência de ${streak2} vitórias`);
  if (elo1 > elo2 + 100) factors.push(`${fighter1.name} tem Elo Rating superior (${elo1.toFixed(0)} vs ${elo2.toFixed(0)})`);
  else if (elo2 > elo1 + 100) factors.push(`${fighter2.name} tem Elo Rating superior (${elo2.toFixed(0)} vs ${elo1.toFixed(0)})`);

  // --- Odds ---
  const margin = 0.05;
  const odds1 = f1Prob > 0 ? 1 / (f1Prob * (1 - margin)) : 2.0;
  const odds2 = f2Prob > 0 ? 1 / (f2Prob * (1 - margin)) : 2.0;
  const americanOdds1 = odds1 >= 2 ? Math.round((odds1 - 1) * 100) : Math.round(-100 / (odds1 - 1));
  const americanOdds2 = odds2 >= 2 ? Math.round((odds2 - 1) * 100) : Math.round(-100 / (odds2 - 1));

  return {
    fighter1WinProbability: parseFloat(f1Prob.toFixed(4)),
    fighter2WinProbability: parseFloat(f2Prob.toFixed(4)),
    predictedWinner: f1Prob > f2Prob ? fighter1.name : fighter2.name,
    confidence: parseFloat(confidence.toFixed(4)),
    fighter1DecimalOdds: parseFloat(odds1.toFixed(2)),
    fighter2DecimalOdds: parseFloat(odds2.toFixed(2)),
    fighter1AmericanOdds: americanOdds1,
    fighter2AmericanOdds: americanOdds2,
    keyFactors: factors,
    // Finish method probabilities
    probKoTko,
    probSubmission,
    probDecision,
    fighter1KoProb: f1KoProb,
    fighter1SubProb: f1SubProb,
    fighter1DecProb: f1DecProb,
    fighter2KoProb: f2KoProb,
    fighter2SubProb: f2SubProb,
    fighter2DecProb: f2DecProb,
    // Model breakdown
    modelBreakdown,
  };
}

// ============================================================================
// ROUTERS
// ============================================================================

export const fightersRouter = router({
    list: publicProcedure.query(async () => {
      return getAllFighters();
    }),

    listAlpha: publicProcedure.query(async () => {
      return getAllFightersAlpha();
    }),

    top10Names: publicProcedure.query(async () => {
      const names = await getTop10FighterNames();
      return [...names];
    }),

    recent: publicProcedure.query(async () => {
      return getRecentFighters(20);
    }),

    rankings: publicProcedure
      .input(z.object({ org: z.string().optional() }))
      .query(async ({ input }) => {
        return getRankingsByWeightClass(input.org);
      }),

    search: publicProcedure
      .input(z.object({ query: z.string().min(1) }))
      .query(async ({ input }) => {
        return searchFighters(input.query);
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getFighterById(input.id);
      }),

    seed: publicProcedure.mutation(async () => {
      // Seed Michael Chiesa
      const chiesaId = await upsertFighter(CHIESA_DATA as any);
      // Seed Carlston Harris
      const harrisId = await upsertFighter(HARRIS_DATA as any);

      // Seed Chiesa fights
      for (const fight of CHIESA_FIGHTS) {
        await insertFight({ fighterId: chiesaId, ...fight } as any);
      }

      return { chiesaId, harrisId, fightsSeeded: CHIESA_FIGHTS.length };
    }),
});

export const fightsRouter = router({
    byFighter: publicProcedure
      .input(z.object({ fighterId: z.number() }))
      .query(async ({ input }) => {
        return getFightsByFighterId(input.fighterId);
      }),

    stats: publicProcedure
      .input(z.object({ fightIds: z.array(z.number()) }))
      .query(async ({ input }) => {
        return getFightStatsByFightIds(input.fightIds);
      }),
});

export const scoutingSubRouter = router({
    list: publicProcedure
      .input(z.object({ fighterId: z.number() }))
      .query(async ({ input }) => {
        return getScoutingReports(input.fighterId);
      }),

    generate: publicProcedure
      .input(
        z.object({
          fighterId: z.number(),
          opponentName: z.string(),
          reportType: z.enum(["full", "managerial", "coach"]),
        })
      )
      .mutation(async ({ input }) => {
        const fighter = await getFighterById(input.fighterId);
        if (!fighter) throw new Error("Fighter not found");

        const reportData = generateScoutingReport(fighter, input.opponentName, input.reportType);

        const id = await insertScoutingReport({
          fighterId: input.fighterId,
          opponentName: input.opponentName,
          reportType: input.reportType,
          reportData,
        });

        return { id, reportData };
      }),
});

export const predictionsRouter = router({
    recent: publicProcedure.query(async () => {
      return getRecentPredictions(10);
    }),

    predict: publicProcedure
      .input(
        z.object({
          fighter1Id: z.number(),
          fighter2Id: z.number().optional(),
          fighter1Name: z.string(),
          fighter2Name: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const fighter1 = input.fighter1Id ? await getFighterById(input.fighter1Id) : null;
        const fighter2 = input.fighter2Id ? await getFighterById(input.fighter2Id) : null;

        const toPayload = (f: any, fallbackName: string) => {
          const name = f?.name ?? fallbackName;
          const dob = f?.birthDate;
          let age: number | null = null;
          if (dob) {
            const d = new Date(dob as any);
            if (!isNaN(d.getTime())) {
              age = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
            }
          }
          return {
            name,
            wins: f?.wins ?? null,
            losses: f?.losses ?? null,
            draws: f?.draws ?? null,
            age,
            height_cm: f?.heightCm ?? null,
            weight_kg: f?.weightKg ?? null,
            reach_cm: f?.reachCm ?? null,
            stance: f?.stance ?? "Orthodox",
            finishRate: f?.finishRate ?? 0.5,
            submissionWinRate: f?.submissionWinRate ?? 0,
          };
        };

        const payload = {
          fighter1: toPayload(fighter1, input.fighter1Name),
          fighter2: toPayload(fighter2, input.fighter2Name),
          context: { is_title_bout: 0, total_rounds: 3, gender_male: 1 },
        };

        let prediction: any;
        try {
          prediction = await runMLPredict(payload);
        } catch (err) {
          console.warn("[ML] predict.py failed, falling back to heuristic:", err);
          const f1Data = fighter1 || { name: input.fighter1Name, winRate: 0.5, finishRate: 0.5, totalFightsPro: 10, currentStreak: "W", currentStreakCount: 1 };
          const f2Data = fighter2 || { name: input.fighter2Name, winRate: 0.5, finishRate: 0.5, totalFightsPro: 10, currentStreak: "W", currentStreakCount: 1 };
          prediction = calculatePrediction(f1Data, f2Data);
        }

        const id = await insertPrediction({
          fighter1Id: input.fighter1Id,
          fighter2Id: input.fighter2Id,
          fighter1Name: input.fighter1Name,
          fighter2Name: input.fighter2Name,
          ...prediction,
          confidence: parseFloat(String(prediction.confidence)),
        } as any);

        return { id, ...prediction };
      }),

    // Matchup analysis
    matchup: publicProcedure
      .input(
        z.object({
          fighter1Id: z.number(),
          fighter2Id: z.number().optional(),
          fighter1Name: z.string(),
          fighter2Name: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const fighter1 = await getFighterById(input.fighter1Id);
        const fighter2 = input.fighter2Id ? await getFighterById(input.fighter2Id) : null;

        const analysis = generateMatchupAnalysis(
          fighter1 || { name: input.fighter1Name },
          fighter2 || { name: input.fighter2Name }
        );

        await insertMatchupAnalysis({
          fighter1Id: input.fighter1Id,
          fighter2Id: input.fighter2Id,
          fighter1Name: input.fighter1Name,
          fighter2Name: input.fighter2Name,
          analysisData: analysis,
        });

        return analysis;
      }),
});

export const eventsRouter = router({
  // Site reads ONLY from MySQL. Scrapers run on schedule (run_weekly.sh)
  // and persist into upcoming_events / upcoming_bouts.
  upcoming: publicProcedure
    .input(z.object({ org: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const org = (input?.org ?? "ufc").toLowerCase();
      return getUpcomingEventsByOrg(org);
    }),

  // Admin/cron: scrape one org and replace its rows in MySQL.
  refreshUpcoming: publicProcedure
    .input(z.object({ org: z.string() }))
    .mutation(async ({ input }) => {
      const org = input.org.toLowerCase();
      let source: "ufcstats" | "tapology" = "tapology";
      let events: UpcomingEvent[] = [];
      if (org === "ufc") {
        try {
          events = await scrapeUpcomingEvents();
          if (events.length > 0) source = "ufcstats";
        } catch {
          events = [];
        }
      }
      if (events.length === 0) {
        events = await scrapeTapologyUpcoming(org);
        source = "tapology";
      }
      const stats = await replaceUpcomingEventsForOrg(org, source, events);
      return { org, source, ...stats };
    }),
});

export const dashboardRouter = router({
  stats: publicProcedure.query(async () => {
    const allFighters = await getAllFighters();
    const predictions = await getRecentPredictions(100);

    return {
      totalFighters: allFighters.length,
      totalPredictions: predictions.length,
      avgWinRate: allFighters.length > 0
        ? allFighters.reduce((acc, f) => acc + (f.winRate || 0), 0) / allFighters.length
        : 0,
      topFighters: allFighters.slice(0, 5),
    };
  }),

  organizations: publicProcedure.query(async () => {
    return getOrganizations();
  }),

  rankingOrganizations: publicProcedure.query(async () => {
    return getRankingOrganizations();
  }),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateScoutingReport(fighter: any, opponentName: string, reportType: string) {
  const base = {
    fighter: {
      name: fighter.name,
      nickname: fighter.nickname,
      record: `${fighter.wins}-${fighter.losses}-${fighter.draws}`,
      weightClass: fighter.weightClass,
      style: fighter.styleArchetype,
    },
    generatedAt: new Date().toISOString(),
    reportType,
  };

  if (reportType === "full") {
    return {
      ...base,
      physicalProfile: {
        height: fighter.heightCm ? `${fighter.heightCm} cm` : "N/A",
        reach: fighter.reachCm ? `${fighter.reachCm} cm` : "N/A",
        weight: fighter.weightKg ? `${fighter.weightKg} kg` : "N/A",
        stance: fighter.stance || "N/A",
        team: fighter.primaryTeam || "N/A",
        primaryBases: fighter.primaryBases || [],
      },
      statistics: {
        winRate: `${((fighter.winRate || 0) * 100).toFixed(1)}%`,
        finishRate: `${((fighter.finishRate || 0) * 100).toFixed(1)}%`,
        submissionWinRate: `${((fighter.submissionWinRate || 0) * 100).toFixed(1)}%`,
        koTkoWins: fighter.koTkoWins || 0,
        submissionWins: fighter.submissionWins || 0,
        decisionWins: fighter.decisionWins || 0,
        avgFightTime: fighter.avgFightTimeSeconds
          ? `${Math.floor(fighter.avgFightTimeSeconds / 60)}m ${Math.round(fighter.avgFightTimeSeconds % 60)}s`
          : "N/A",
        currentStreak: fighter.currentStreak === "W"
          ? `${fighter.currentStreakCount} vitórias consecutivas`
          : fighter.currentStreak === "L"
          ? `${fighter.currentStreakCount} derrotas consecutivas`
          : "N/A",
        longestWinStreak: fighter.longestWinStreak || 0,
      },
      strengths: fighter.strengths || [],
      weaknesses: fighter.weaknesses || [],
      howHeWins: fighter.howHeWins || [],
      howHeLoses: fighter.howHeLoses || [],
      vsOpponent: {
        opponent: opponentName,
        keyThreats: ["Análise específica requer dados do oponente"],
        recommendations: ["Coletar dados do oponente para análise completa"],
      },
    };
  }

  if (reportType === "managerial") {
    return {
      ...base,
      executiveSummary: {
        record: `${fighter.wins}W-${fighter.losses}L-${fighter.draws}D`,
        winRate: `${((fighter.winRate || 0) * 100).toFixed(1)}%`,
        finishRate: `${((fighter.finishRate || 0) * 100).toFixed(1)}%`,
        currentStreak: fighter.currentStreak === "W"
          ? `${fighter.currentStreakCount} vitórias`
          : "N/A",
        styleProfile: fighter.styleArchetype,
      },
      kpis: [
        { metric: "Taxa de Vitória", value: `${((fighter.winRate || 0) * 100).toFixed(1)}%`, benchmark: "70%+", status: (fighter.winRate || 0) >= 0.7 ? "green" : "yellow" },
        { metric: "Taxa de Finalização", value: `${((fighter.finishRate || 0) * 100).toFixed(1)}%`, benchmark: "50%+", status: (fighter.finishRate || 0) >= 0.5 ? "green" : "yellow" },
        { metric: "Experiência", value: `${fighter.totalFightsPro} lutas`, benchmark: "20+", status: (fighter.totalFightsPro || 0) >= 20 ? "green" : "yellow" },
      ],
      strategicRecommendations: [
        `Explorar estilo ${fighter.styleArchetype}`,
        `Preparar contra-estratégia para ${opponentName}`,
        "Analisar histórico recente de lutas",
      ],
      riskAssessment: {
        level: fighter.losses > 3 ? "medium" : "low",
        mainRisks: fighter.weaknesses || [],
      },
    };
  }

  // coach report
  return {
    ...base,
    coachSummary: {
      fighter: fighter.name,
      opponent: opponentName,
      style: fighter.styleArchetype,
      record: `${fighter.wins}W-${fighter.losses}L`,
    },
    keyStrengths: (fighter.strengths || []).slice(0, 3),
    keyWeaknesses: (fighter.weaknesses || []).slice(0, 3),
    gameplan: {
      primaryObjective: `Usar ${fighter.styleArchetype} para dominar ${opponentName}`,
      winConditions: fighter.howHeWins || [],
      avoidThese: fighter.howHeLoses || [],
    },
    cornerCues: [
      "MANTER PRESSÃO",
      "BUSCAR FINALIZAÇÃO",
      "CONTROLAR DISTÂNCIA",
    ],
    roundByRound: [
      { round: 1, focus: "Estabelecer ritmo e testar defesas", tempo: "high" },
      { round: 2, focus: "Aumentar pressão e buscar finalização", tempo: "high" },
      { round: 3, focus: "Garantir vitória ou finalizar", tempo: "medium" },
    ],
  };
}

function generateMatchupAnalysis(fighter1: any, fighter2: any) {
  return {
    fighter1: { name: fighter1.name, style: fighter1.styleArchetype },
    fighter2: { name: fighter2.name, style: fighter2.styleArchetype },
    styleMatchup: {
      description: `${fighter1.name} (${fighter1.styleArchetype || "N/A"}) vs ${fighter2.name} (${fighter2.styleArchetype || "N/A"})`,
      advantages: {
        fighter1: fighter1.strengths?.slice(0, 3) || [],
        fighter2: fighter2.strengths?.slice(0, 3) || [],
      },
    },
    keyBattlegrounds: [
      "Controle de distância",
      "Luta em pé vs grappling",
      "Gestão de energia",
    ],
    prediction: calculatePrediction(fighter1, fighter2),
  };
}

// ============================================================================
// UPCOMING EVENTS SCRAPER
// ============================================================================

const UFCSTATS_BASE = "http://ufcstats.com";
const UPCOMING_URL  = `${UFCSTATS_BASE}/statistics/events/upcoming?page=all`;

const SCRAPE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

// Simple regex-based HTML parser — no external lib needed
function extractText(html: string, pattern: RegExp): string {
  const m = html.match(pattern);
  return m ? m[1].replace(/<[^>]+>/g, "").trim() : "";
}

async function fetchHtml(url: string): Promise<string> {
  const resp = await axios.get(url, { headers: SCRAPE_HEADERS, timeout: 15000 });
  return resp.data as string;
}

export type UpcomingBout = {
  fighter1: string;
  fighter2: string;
  weightClass: string;
};

export type UpcomingEvent = {
  name: string;
  date: string;
  location: string;
  url: string;
  bouts: UpcomingBout[];
};

async function scrapeEventCard(eventUrl: string): Promise<UpcomingBout[]> {
  const html = await fetchHtml(eventUrl);
  const bouts: UpcomingBout[] = [];

  // Each row pattern: fighter cell contains two <a> links with fighter names; next relevant col has weight class
  // Split into table rows
  const rowPattern = /<tr[^>]*b-fight-details__table-row[^>]*>([\s\S]*?)<\/tr>/g;
  let rowMatch;
  while ((rowMatch = rowPattern.exec(html)) !== null) {
    const rowHtml = rowMatch[1];

    // Extract fighter links
    const fighterLinks = [...rowHtml.matchAll(/href="[^"]*fighter-details[^"]*"[^>]*>\s*([\s\S]*?)\s*<\/a>/g)];
    if (fighterLinks.length < 2) continue;

    const f1 = fighterLinks[0][1].replace(/<[^>]+>/g, "").trim();
    const f2 = fighterLinks[1][1].replace(/<[^>]+>/g, "").trim();
    if (!f1 || !f2) continue;

    // Extract weight class from this row (first text-only cell after fighters)
    const wcMatch = rowHtml.match(/b-fight-details__table-text">\s*((?:Women's\s+)?[A-Z][a-zA-Z'\s]+weight)\s*<br>/);
    const weightClass = wcMatch ? wcMatch[1].trim() : "";

    bouts.push({ fighter1: f1, fighter2: f2, weightClass });
  }

  return bouts;
}

async function scrapeUpcomingEvents(): Promise<UpcomingEvent[]> {
  const html = await fetchHtml(UPCOMING_URL);
  const events: UpcomingEvent[] = [];

  // Find event rows with link + date + location
  const eventRowPattern = /<tr[^>]*b-statistics__table-row[^>]*>([\s\S]*?)<\/tr>/g;
  let m;
  while ((m = eventRowPattern.exec(html)) !== null) {
    const rowHtml = m[1];

    const linkMatch = rowHtml.match(/href="(http:\/\/ufcstats\.com\/event-details\/[^"]+)"[^>]*>\s*([\s\S]*?)\s*<\/a>/);
    if (!linkMatch) continue;

    const url  = linkMatch[1].trim();
    const name = linkMatch[2].replace(/<[^>]+>/g, "").trim();
    if (!name) continue;

    // Date and location are in <td> cells
    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)];
    const date     = cells[1] ? cells[1][1].replace(/<[^>]+>/g, "").trim() : "";
    const location = cells[2] ? cells[2][1].replace(/<[^>]+>/g, "").trim() : "";

    events.push({ name, date, location, url, bouts: [] });
  }

  // Fetch card for each event (limit to 4 nearest events to keep response fast)
  const nearest = events.slice(0, 4);
  await Promise.all(nearest.map(async (ev) => {
    try {
      ev.bouts = await scrapeEventCard(ev.url);
    } catch {
      ev.bouts = [];
    }
  }));

  return nearest.filter((ev) => ev.bouts.length > 0);
}

// ============================================================================
// TAPOLOGY UPCOMING (multi-org)
// ============================================================================

const TAPOLOGY_BASE = "https://www.tapology.com";

const TAPOLOGY_ORG_SLUGS: Record<string, string> = {
  ufc:           "ultimate-fighting-championship-ufc",
  one:           "one-championship",
  pfl:           "pfl-professional-fighters-league",
  lfa:           "legacy-fighting-alliance-lfa",
  "jungle-fight": "jungle-fight",
  "jungle":      "jungle-fight",
};

const TAPOLOGY_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9,pt;q=0.8",
  "Cache-Control": "no-cache",
};

// In-memory cache: org → { ts, data }, 6h TTL
const TAPOLOGY_CACHE = new Map<string, { ts: number; data: UpcomingEvent[] }>();
const TAPOLOGY_TTL = 6 * 60 * 60 * 1000;

async function fetchTapology(url: string): Promise<string> {
  const resp = await axios.get(url, {
    headers: TAPOLOGY_HEADERS,
    timeout: 20000,
    validateStatus: (s) => s < 500,
  });
  if (resp.status !== 200) throw new Error(`Tapology ${url} → ${resp.status}`);
  return resp.data as string;
}

async function scrapeTapologyEvent(eventUrl: string): Promise<UpcomingBout[]> {
  let html: string;
  try {
    html = await fetchTapology(eventUrl);
  } catch {
    return [];
  }
  const bouts: UpcomingBout[] = [];

  // Tapology bout rows: each contains two fighter links + weight class
  // Pattern: <a href="/fightcenter/fighters/...">Name</a> ... vs ... <a href="/fightcenter/fighters/...">Name</a>
  const boutBlocks = html.split(/<li[^>]*class="[^"]*fightCard[^"]*"/);

  for (const block of boutBlocks.slice(1)) {
    const fighterLinks = [...block.matchAll(/href="\/fightcenter\/fighters\/[^"]+"[^>]*>\s*([^<]+?)\s*<\/a>/g)];
    if (fighterLinks.length < 2) continue;
    const fighter1 = fighterLinks[0][1].replace(/&[a-z]+;/g, "").trim();
    const fighter2 = fighterLinks[1][1].replace(/&[a-z]+;/g, "").trim();
    if (!fighter1 || !fighter2) continue;

    // Try to extract weight class
    const wcMatch = block.match(/(?:weight class|Weight)[^<]*<[^>]*>([^<]+)</i)
                 ?? block.match(/>\s*((?:Women's\s+)?(?:Strawweight|Atomweight|Flyweight|Bantamweight|Featherweight|Lightweight|Welterweight|Middleweight|Light Heavyweight|Heavyweight|Catchweight|Openweight))\s*</);
    const weightClass = wcMatch ? wcMatch[1].trim() : "";

    bouts.push({ fighter1, fighter2, weightClass });
  }

  return bouts;
}

async function scrapeTapologyUpcoming(orgKey: string): Promise<UpcomingEvent[]> {
  const slug = TAPOLOGY_ORG_SLUGS[orgKey] ?? TAPOLOGY_ORG_SLUGS["ufc"];

  // Cache hit?
  const cached = TAPOLOGY_CACHE.get(slug);
  if (cached && Date.now() - cached.ts < TAPOLOGY_TTL) return cached.data;

  const promotionUrl = `${TAPOLOGY_BASE}/fightcenter/promotions/p/${slug}`;
  let html: string;
  try {
    html = await fetchTapology(promotionUrl);
  } catch {
    return [];
  }

  const events: UpcomingEvent[] = [];
  // Tapology promotion page: each upcoming event is a row with link to /fightcenter/events/<id>-<slug>
  const eventLinkPattern = /<a[^>]*href="(\/fightcenter\/events\/[^"]+)"[^>]*>\s*([^<]+)\s*<\/a>/g;
  const seen = new Set<string>();
  let m;
  while ((m = eventLinkPattern.exec(html)) !== null) {
    const path = m[1];
    if (seen.has(path)) continue;
    seen.add(path);

    const name = m[2].replace(/&[a-z]+;/g, "").trim();
    if (!name || name.length < 3) continue;

    // Find date near this link (Tapology renders date in adjacent span)
    const around = html.slice(Math.max(0, m.index - 400), m.index + 400);
    const dateMatch = around.match(/(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2}(?:,\s*\d{4})?)/);
    const locMatch = around.match(/(?:venue|location|city)[^<]*<[^>]*>\s*([^<]+)\s*</i);

    events.push({
      name,
      date: dateMatch ? dateMatch[1] : "",
      location: locMatch ? locMatch[1].trim() : "",
      url: `${TAPOLOGY_BASE}${path}`,
      bouts: [],
    });
  }

  // Limit to 4 nearest, fetch their cards in parallel
  const nearest = events.slice(0, 4);
  await Promise.all(nearest.map(async (ev) => {
    ev.bouts = await scrapeTapologyEvent(ev.url);
  }));

  const filtered = nearest.filter((ev) => ev.bouts.length > 0);
  TAPOLOGY_CACHE.set(slug, { ts: Date.now(), data: filtered });
  return filtered;
}
