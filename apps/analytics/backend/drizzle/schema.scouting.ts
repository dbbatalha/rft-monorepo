import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
  boolean,
  json,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

// ============================================================================
// USERS TABLE (Auth)
// ============================================================================

export const users = mysqlTable("users", {
  id:            int("id").autoincrement().primaryKey(),
  openId:        varchar("openId",       { length: 64  }).notNull().unique(),
  name:          text("name"),
  email:         varchar("email",        { length: 320 }),
  loginMethod:   varchar("loginMethod",  { length: 64  }),
  role:          mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt:     timestamp("createdAt").defaultNow().notNull(),
  updatedAt:     timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn:  timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;

// ============================================================================
// ORGANIZATIONS TABLE
// ============================================================================

export const organizations = mysqlTable("organizations", {
  id:        int("id").autoincrement().primaryKey(),
  name:      varchar("name",      { length: 100 }).notNull().unique(),
  shortName: varchar("shortName", { length: 20  }),
  country:   varchar("country",   { length: 50  }),
  website:   varchar("website",   { length: 200 }),
  active:    boolean("active").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Organization = typeof organizations.$inferSelect;

// ============================================================================
// EVENTS TABLE
// ============================================================================

export const events = mysqlTable("events", {
  id:             int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId"),
  name:           varchar("name",     { length: 300 }).notNull(),
  eventDate:      date("eventDate"),
  location:       varchar("location", { length: 300 }),
  venue:          varchar("venue",    { length: 300 }),
  sourceUrl:      varchar("sourceUrl",{ length: 500 }).unique(),
  isUpcoming:     boolean("isUpcoming").default(false),
  createdAt:      timestamp("createdAt").defaultNow().notNull(),
  updatedAt:      timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Event = typeof events.$inferSelect;

// ============================================================================
// FIGHTERS TABLE
// ============================================================================

export const fighters = mysqlTable("fighters", {
  id:                  int("id").autoincrement().primaryKey(),
  externalId:          varchar("externalId",  { length: 128 }).unique(),
  name:                varchar("name",        { length: 200 }).notNull(),
  nickname:            varchar("nickname",    { length: 100 }),
  nationality:         varchar("nationality", { length: 100 }),
  birthDate:           varchar("birthDate",   { length: 20  }),
  age:                 int("age"),
  heightCm:            float("heightCm"),
  reachCm:             float("reachCm"),
  weightKg:            float("weightKg"),
  stance:              varchar("stance",      { length: 50  }),
  primaryTeam:         varchar("primaryTeam", { length: 200 }),
  weightClass:         varchar("weightClass", { length: 100 }),
  // Sources
  sourceUrl:           varchar("sourceUrl",   { length: 500 }),
  sourceOrg:           varchar("sourceOrg",   { length: 100 }),
  lastScrapedAt:       timestamp("lastScrapedAt"),
  // Style analysis
  primaryBases:        json("primaryBases"),
  styleArchetype:      varchar("styleArchetype", { length: 200 }),
  strengths:           json("strengths"),
  weaknesses:          json("weaknesses"),
  howHeWins:           json("howHeWins"),
  howHeLoses:          json("howHeLoses"),
  // Champion flags
  isChampion:          int("isChampion").default(0),
  isInterim:           int("isInterim").default(0),
  // Computed stats
  totalFightsPro:      int("totalFightsPro").default(0),
  wins:                int("wins").default(0),
  losses:              int("losses").default(0),
  draws:               int("draws").default(0),
  winRate:             float("winRate").default(0),
  finishRate:          float("finishRate").default(0),
  submissionWinRate:   float("submissionWinRate").default(0),
  koTkoWins:           int("koTkoWins").default(0),
  submissionWins:      int("submissionWins").default(0),
  decisionWins:        int("decisionWins").default(0),
  currentStreak:       varchar("currentStreak",     { length: 10 }),
  currentStreakCount:  int("currentStreakCount").default(0),
  longestWinStreak:    int("longestWinStreak").default(0),
  avgFightTimeSeconds: float("avgFightTimeSeconds"),
  createdAt:           timestamp("createdAt").defaultNow().notNull(),
  updatedAt:           timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Fighter = typeof fighters.$inferSelect;
export type InsertFighter = typeof fighters.$inferInsert;

// ============================================================================
// FIGHTS TABLE
// ============================================================================

export const fights = mysqlTable("fights", {
  id:                   int("id").autoincrement().primaryKey(),
  fighterId:            int("fighterId").notNull(),
  // Cross-reference to events and opponent fighters when available
  eventId:              int("eventId"),
  opponentId:           int("opponentId"),
  // Raw denormalised fields (kept for backward compat + easy querying)
  opponent:             varchar("opponent",     { length: 200 }).notNull(),
  fightDate:            varchar("fightDate",    { length: 20  }),
  result:               mysqlEnum("result", ["win", "loss", "draw", "no_contest"]),
  methodCategory:       mysqlEnum("methodCategory", ["KO_TKO", "SUBMISSION", "DECISION", "OTHER"]),
  methodDetail:         varchar("methodDetail", { length: 200 }),
  round:                int("round"),
  timeInRound:          varchar("timeInRound",  { length: 10  }),
  elapsedTimeSeconds:   int("elapsedTimeSeconds"),
  promotion:            varchar("promotion",    { length: 100 }),
  event:                varchar("event",        { length: 300 }),
  referee:              varchar("referee",      { length: 200 }),
  weightClass:          varchar("weightClass",  { length: 100 }),
  notes:                json("notes"),
  createdAt:            timestamp("createdAt").defaultNow().notNull(),
});

export type Fight = typeof fights.$inferSelect;
export type InsertFight = typeof fights.$inferInsert;

// ============================================================================
// UPCOMING EVENTS TABLE
// ============================================================================

export const upcomingEvents = mysqlTable("upcoming_events", {
  id:         int("id").autoincrement().primaryKey(),
  name:       varchar("name",     { length: 300 }).notNull(),
  eventDate:  varchar("eventDate",{ length: 50  }),
  location:   varchar("location", { length: 300 }),
  ufcUrl:     varchar("ufcUrl",   { length: 500 }).unique(),
  fetchedAt:  timestamp("fetchedAt").defaultNow().onUpdateNow().notNull(),
});

export type UpcomingEvent = typeof upcomingEvents.$inferSelect;

// ============================================================================
// UPCOMING BOUTS TABLE
// ============================================================================

export const upcomingBouts = mysqlTable("upcoming_bouts", {
  id:          int("id").autoincrement().primaryKey(),
  eventId:     int("eventId").notNull(),
  fighter1:    varchar("fighter1",    { length: 200 }).notNull(),
  fighter2:    varchar("fighter2",    { length: 200 }).notNull(),
  weightClass: varchar("weightClass", { length: 100 }),
  orderNum:    int("orderNum").default(0),
});

export type UpcomingBout = typeof upcomingBouts.$inferSelect;

// ============================================================================
// FIGHT STATS TABLE  (per-fight strike/grappling stats from UFCStats/FightMetric)
// ============================================================================

export const fightStats = mysqlTable("fight_stats", {
  id:     int("id").autoincrement().primaryKey(),
  fightId: int("fightId").notNull().unique(),   // FK → fights.id

  // ── Fighter 1 (the primary fighter in fights table) ──
  f1SigStrikesLanded:     int("f1SigStrikesLanded"),
  f1SigStrikesAttempted:  int("f1SigStrikesAttempted"),
  f1SigStrikesPct:        float("f1SigStrikesPct"),        // %
  f1SigStrikesPerMin:     float("f1SigStrikesPerMin"),
  f1TotalStrikesLanded:   int("f1TotalStrikesLanded"),
  f1TotalStrikesAttempted:int("f1TotalStrikesAttempted"),
  f1Knockdowns:           int("f1Knockdowns"),
  f1TakedownsLanded:      int("f1TakedownsLanded"),
  f1TakedownsAttempted:   int("f1TakedownsAttempted"),
  f1TakedownPct:          float("f1TakedownPct"),
  f1SubmissionAttempts:   int("f1SubmissionAttempts"),
  f1Reversals:            int("f1Reversals"),
  f1ControlTimeSeconds:   int("f1ControlTimeSeconds"),
  // Significant strikes by position/target (UFCStats detail)
  f1HeadLanded:           int("f1HeadLanded"),
  f1HeadAttempted:        int("f1HeadAttempted"),
  f1BodyLanded:           int("f1BodyLanded"),
  f1BodyAttempted:        int("f1BodyAttempted"),
  f1LegLanded:            int("f1LegLanded"),
  f1LegAttempted:         int("f1LegAttempted"),
  f1DistanceLanded:       int("f1DistanceLanded"),
  f1DistanceAttempted:    int("f1DistanceAttempted"),
  f1ClinicLanded:         int("f1ClinicLanded"),
  f1ClinicAttempted:      int("f1ClinicAttempted"),
  f1GroundLanded:         int("f1GroundLanded"),
  f1GroundAttempted:      int("f1GroundAttempted"),

  // ── Fighter 2 (the opponent) ──
  f2SigStrikesLanded:     int("f2SigStrikesLanded"),
  f2SigStrikesAttempted:  int("f2SigStrikesAttempted"),
  f2SigStrikesPct:        float("f2SigStrikesPct"),
  f2SigStrikesPerMin:     float("f2SigStrikesPerMin"),
  f2TotalStrikesLanded:   int("f2TotalStrikesLanded"),
  f2TotalStrikesAttempted:int("f2TotalStrikesAttempted"),
  f2Knockdowns:           int("f2Knockdowns"),
  f2TakedownsLanded:      int("f2TakedownsLanded"),
  f2TakedownsAttempted:   int("f2TakedownsAttempted"),
  f2TakedownPct:          float("f2TakedownPct"),
  f2SubmissionAttempts:   int("f2SubmissionAttempts"),
  f2Reversals:            int("f2Reversals"),
  f2ControlTimeSeconds:   int("f2ControlTimeSeconds"),
  f2HeadLanded:           int("f2HeadLanded"),
  f2HeadAttempted:        int("f2HeadAttempted"),
  f2BodyLanded:           int("f2BodyLanded"),
  f2BodyAttempted:        int("f2BodyAttempted"),
  f2LegLanded:            int("f2LegLanded"),
  f2LegAttempted:         int("f2LegAttempted"),
  f2DistanceLanded:       int("f2DistanceLanded"),
  f2DistanceAttempted:    int("f2DistanceAttempted"),
  f2ClinicLanded:         int("f2ClinicLanded"),
  f2ClinicAttempted:      int("f2ClinicAttempted"),
  f2GroundLanded:         int("f2GroundLanded"),
  f2GroundAttempted:      int("f2GroundAttempted"),

  sourceUrl: varchar("sourceUrl", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FightStat = typeof fightStats.$inferSelect;
export type InsertFightStat = typeof fightStats.$inferInsert;

// ============================================================================
// SCOUTING REPORTS TABLE
// ============================================================================

export const scoutingReports = mysqlTable("scouting_reports", {
  id:           int("id").autoincrement().primaryKey(),
  fighterId:    int("fighterId").notNull(),
  opponentId:   int("opponentId"),
  opponentName: varchar("opponentName", { length: 200 }),
  reportType:   mysqlEnum("reportType", ["full", "managerial", "coach"]).notNull(),
  reportData:   json("reportData"),
  generatedAt:  timestamp("generatedAt").defaultNow().notNull(),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
});

export type ScoutingReport = typeof scoutingReports.$inferSelect;
export type InsertScoutingReport = typeof scoutingReports.$inferInsert;

// ============================================================================
// FIGHT PREDICTIONS TABLE
// ============================================================================

export const fightPredictions = mysqlTable("fight_predictions", {
  id:                     int("id").autoincrement().primaryKey(),
  fighter1Id:             int("fighter1Id").notNull(),
  fighter2Id:             int("fighter2Id"),
  fighter1Name:           varchar("fighter1Name", { length: 200 }).notNull(),
  fighter2Name:           varchar("fighter2Name", { length: 200 }).notNull(),
  fighter1WinProbability: float("fighter1WinProbability"),
  fighter2WinProbability: float("fighter2WinProbability"),
  predictedWinner:        varchar("predictedWinner", { length: 200 }),
  confidence:             float("confidence"),
  fighter1DecimalOdds:    float("fighter1DecimalOdds"),
  fighter2DecimalOdds:    float("fighter2DecimalOdds"),
  fighter1AmericanOdds:   int("fighter1AmericanOdds"),
  fighter2AmericanOdds:   int("fighter2AmericanOdds"),
  keyFactors:             json("keyFactors"),
  modelVersion:           varchar("modelVersion", { length: 50 }).default("1.0"),
  createdAt:              timestamp("createdAt").defaultNow().notNull(),
});

export type FightPrediction = typeof fightPredictions.$inferSelect;
export type InsertFightPrediction = typeof fightPredictions.$inferInsert;

// ============================================================================
// MATCHUP ANALYSIS TABLE
// ============================================================================

export const matchupAnalyses = mysqlTable("matchup_analyses", {
  id:           int("id").autoincrement().primaryKey(),
  fighter1Id:   int("fighter1Id").notNull(),
  fighter2Id:   int("fighter2Id"),
  fighter1Name: varchar("fighter1Name", { length: 200 }).notNull(),
  fighter2Name: varchar("fighter2Name", { length: 200 }).notNull(),
  analysisData: json("analysisData"),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
});

export type MatchupAnalysis = typeof matchupAnalyses.$inferSelect;
export type InsertMatchupAnalysis = typeof matchupAnalyses.$inferInsert;

// ============================================================================
// OFFICIAL RANKINGS TABLE  (scraped from ufc.com.br/rankings)
// ============================================================================

export const officialRankings = mysqlTable("official_rankings", {
  id:          int("id").autoincrement().primaryKey(),
  org:         varchar("org",         { length: 50  }).notNull(),
  weightClass: varchar("weightClass", { length: 100 }).notNull(),
  rank:        int("rank").notNull(),          // 0=champion, -1=interim, 1-15=ranked
  fighterName: varchar("fighterName", { length: 200 }).notNull(),
  isChampion:  int("isChampion").default(0),
  isInterim:   int("isInterim").default(0),
  scrapedAt:   timestamp("scrapedAt").defaultNow().onUpdateNow().notNull(),
});

export type OfficialRanking = typeof officialRankings.$inferSelect;
