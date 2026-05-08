import { eq, ne, like, desc, asc, and, or, isNotNull, isNull, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  fighters,
  fights,
  fightStats,
  organizations,
  scoutingReports,
  fightPredictions,
  matchupAnalyses,
  officialRankings,
  upcomingEvents,
  upcomingBouts,
  type InsertFighter,
  type InsertFight,
  type InsertScoutingReport,
  type InsertFightPrediction,
  type InsertMatchupAnalysis,
} from "../../drizzle/schema";
import { ENV } from "../_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// FIGHTER QUERIES
// ============================================================================

const NOT_BELLATOR = or(isNull(fighters.sourceOrg), ne(fighters.sourceOrg, "Bellator"));

// Only show fighters that have at least one scraped fight record AND a non-zero record.
const HAS_DATA = sql`(${fighters.wins} > 0 OR ${fighters.losses} > 0 OR ${fighters.draws} > 0) AND EXISTS (SELECT 1 FROM fights WHERE fights.fighterId = ${fighters.id})`;

export async function getAllFighters() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(fighters).where(and(NOT_BELLATOR, HAS_DATA)).orderBy(desc(fighters.wins));
}

export async function getAllFightersAlpha() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(fighters).where(and(NOT_BELLATOR, HAS_DATA)).orderBy(asc(fighters.name));
}

export async function getOrganizations(): Promise<{ name: string; shortName: string | null }[]> {
  const db = await getDb();
  if (!db) return [];

  const [orgsTable, fightPromos, rankingOrgs, allOrgRows] = await Promise.all([
    db.select({ name: organizations.name, shortName: organizations.shortName })
      .from(organizations)
      .where(eq(organizations.active, true)),
    db.selectDistinct({ promotion: fights.promotion })
      .from(fights)
      .where(isNotNull(fights.promotion)),
    db.selectDistinct({ org: officialRankings.org }).from(officialRankings),
    db.select({ name: organizations.name }).from(organizations),
  ]);

  const promoSet = new Set(fightPromos.map((r) => r.promotion).filter(Boolean));
  const rankingOrgSet = new Set(rankingOrgs.map((r) => r.org));
  const allOrgNames = new Set(allOrgRows.map((o) => o.name));

  // Include active orgs that have fights OR official rankings data
  const resultMap = new Map<string, { name: string; shortName: string | null }>();
  for (const o of orgsTable) {
    if (promoSet.has(o.name) || rankingOrgSet.has(o.name)) {
      resultMap.set(o.name, o);
    }
  }
  // Add unknown promos from fights not in organizations table
  for (const p of promoSet) {
    if (p && !allOrgNames.has(p)) resultMap.set(p, { name: p, shortName: null });
  }
  return [...resultMap.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getFighterById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(fighters).where(eq(fighters.id, id)).limit(1);
  return result[0];
}

export async function searchFighters(query: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(fighters)
    .where(or(like(fighters.name, `%${query}%`), like(fighters.nickname, `%${query}%`)))
    .limit(20);
}

export async function upsertFighter(data: InsertFighter) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.externalId) {
    const existing = await db
      .select()
      .from(fighters)
      .where(eq(fighters.externalId, data.externalId))
      .limit(1);
    if (existing.length > 0) {
      await db.update(fighters).set(data).where(eq(fighters.externalId, data.externalId));
      return existing[0].id;
    }
  }
  const result = await db.insert(fighters).values(data);
  return (result as any)[0]?.insertId as number;
}

// ============================================================================
// FIGHT QUERIES
// ============================================================================

const WEIGHT_CLASS_ORDER = [
  "Flyweight",
  "Bantamweight",
  "Featherweight",
  "Lightweight",
  "Welterweight",
  "Middleweight",
  "Light Heavyweight",
  "Heavyweight",
  "Women's Strawweight",
  "Women's Flyweight",
  "Women's Bantamweight",
  "Women's Featherweight",
];

export async function getRankingsByWeightClass(org?: string) {
  const db = await getDb();
  if (!db) return [];

  const targetOrg = org && org !== "all" ? org : "UFC";

  // 1. Fetch official rankings for this org (scraped from ufc.com.br)
  const official = await db
    .select()
    .from(officialRankings)
    .where(eq(officialRankings.org, targetOrg))
    .orderBy(officialRankings.weightClass, officialRankings.rank);

  // Return empty list per division if no official data
  if (official.length === 0) {
    return WEIGHT_CLASS_ORDER.map((wc) => ({ weightClass: wc, fighters: [] }));
  }

  // 2. Build a name→fighter lookup for profile links
  const names = [...new Set(official.map((r) => r.fighterName))];
  type FighterProfile = {
    id: number;
    name: string;
    wins: number | null;
    losses: number | null;
    draws: number | null;
    nickname: string | null;
    winRate: number | null;
    isChampion: number | null;
    nationality: string | null;
  };
  const profileMap = new Map<string, FighterProfile>();

  // Batch lookup by name — do in chunks to avoid huge IN clauses
  for (let i = 0; i < names.length; i += 50) {
    const chunk = names.slice(i, i + 50);
    const rows = await db
      .select({
        id: fighters.id,
        name: fighters.name,
        wins: fighters.wins,
        losses: fighters.losses,
        draws: fighters.draws,
        nickname: fighters.nickname,
        winRate: fighters.winRate,
        isChampion: fighters.isChampion,
        nationality: fighters.nationality,
      })
      .from(fighters)
      .where(inArray(fighters.name, chunk));
    for (const r of rows) profileMap.set(r.name, r);
  }

  // 3. Group by weight class preserving official order
  const classMap = new Map<string, any[]>();
  for (const entry of official) {
    const wc = entry.weightClass;
    if (!classMap.has(wc)) classMap.set(wc, []);
    const profile = profileMap.get(entry.fighterName);
    classMap.get(wc)!.push({
      // Official ranking fields
      rank: entry.rank,
      isChampion: entry.isChampion,
      isInterim: entry.isInterim,
      name: entry.fighterName,
      // Fighter profile fields (may be null if not in DB yet)
      id: profile?.id ?? null,
      wins: profile?.wins ?? null,
      losses: profile?.losses ?? null,
      draws: profile?.draws ?? null,
      nickname: profile?.nickname ?? null,
      winRate: profile?.winRate ?? null,
      nationality: profile?.nationality ?? null,
    });
  }

  // 4. Emit all standard weight classes in canonical order (skip P4P for grid)
  const result = [];
  for (const wc of WEIGHT_CLASS_ORDER) {
    const entries = classMap.get(wc) ?? [];
    result.push({ weightClass: wc, fighters: entries });
    classMap.delete(wc);
  }
  // Append remaining (P4P, etc.) if any
  for (const [wc, entries] of classMap) {
    if (!wc.includes("P4P")) {
      result.push({ weightClass: wc, fighters: entries });
    }
  }
  return result;
}

export async function getRankingOrganizations(): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.selectDistinct({ org: officialRankings.org }).from(officialRankings);
  return rows.map((r) => r.org).filter(Boolean) as string[];
}

export async function getTop10FighterNames(): Promise<Set<string>> {
  const db = await getDb();
  if (!db) return new Set();
  const rows = await db
    .select({ name: officialRankings.fighterName })
    .from(officialRankings)
    .where(and(sql`\`rank\` >= 1`, sql`\`rank\` <= 10`));
  return new Set(rows.map((r) => r.name));
}

export async function getRecentFighters(limit = 20) {
  const db = await getDb();
  if (!db) return [];

  const recentFights = await db
    .select({ fighterId: fights.fighterId })
    .from(fights)
    .where(isNotNull(fights.fightDate))
    .orderBy(desc(fights.fightDate))
    .limit(limit * 6);

  const seen = new Set<number>();
  const fighterIds: number[] = [];
  for (const row of recentFights) {
    const id = row.fighterId;
    if (id && !seen.has(id)) {
      seen.add(id);
      fighterIds.push(id);
      if (fighterIds.length >= limit) break;
    }
  }
  if (fighterIds.length === 0) return [];

  const allFighters = await db.select().from(fighters);
  const map = new Map(allFighters.map((f) => [f.id, f]));
  return fighterIds.map((id) => map.get(id)).filter(Boolean) as (typeof allFighters)[number][];
}

export async function getFightsByFighterId(fighterId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(fights)
    .where(eq(fights.fighterId, fighterId))
    .orderBy(desc(fights.fightDate));
}

export async function insertFight(data: InsertFight) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(fights).values(data);
  return (result as any)[0]?.insertId as number;
}

// ============================================================================
// SCOUTING REPORT QUERIES
// ============================================================================

export async function getScoutingReports(fighterId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(scoutingReports)
    .where(eq(scoutingReports.fighterId, fighterId))
    .orderBy(desc(scoutingReports.createdAt));
}

export async function insertScoutingReport(data: InsertScoutingReport) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(scoutingReports).values(data);
  return (result as any)[0]?.insertId as number;
}

// ============================================================================
// PREDICTION QUERIES
// ============================================================================

export async function getRecentPredictions(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(fightPredictions)
    .orderBy(desc(fightPredictions.createdAt))
    .limit(limit);
}

export async function insertPrediction(data: InsertFightPrediction) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(fightPredictions).values(data);
  return (result as any)[0]?.insertId as number;
}

// ============================================================================
// MATCHUP QUERIES
// ============================================================================

export async function insertMatchupAnalysis(data: InsertMatchupAnalysis) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(matchupAnalyses).values(data);
  return (result as any)[0]?.insertId as number;
}

export async function getFightStatsByFightIds(fightIds: number[]) {
  const db = await getDb();
  if (!db || fightIds.length === 0) return [];
  return db
    .select()
    .from(fightStats)
    .where(inArray(fightStats.fightId, fightIds));
}

export async function getMatchupAnalyses(fighter1Id: number, fighter2Id?: number) {
  const db = await getDb();
  if (!db) return [];
  if (fighter2Id) {
    return db
      .select()
      .from(matchupAnalyses)
      .where(
        and(
          eq(matchupAnalyses.fighter1Id, fighter1Id),
          eq(matchupAnalyses.fighter2Id, fighter2Id)
        )
      )
      .orderBy(desc(matchupAnalyses.createdAt))
      .limit(5);
  }
  return db
    .select()
    .from(matchupAnalyses)
    .where(eq(matchupAnalyses.fighter1Id, fighter1Id))
    .orderBy(desc(matchupAnalyses.createdAt))
    .limit(10);
}

// ============================================================================
// Upcoming events — site reads only from these tables
// ============================================================================

export type UpcomingBoutDTO = { fighter1: string; fighter2: string; weightClass: string };
export type UpcomingEventDTO = {
  name: string;
  date: string;
  location: string;
  url: string;
  bouts: UpcomingBoutDTO[];
};

export async function getUpcomingEventsByOrg(org: string): Promise<UpcomingEventDTO[]> {
  const db = await getDb();
  if (!db) return [];

  const eventRows = await db
    .select()
    .from(upcomingEvents)
    .where(eq(upcomingEvents.org, org.toLowerCase()))
    .orderBy(desc(upcomingEvents.updatedAt));

  if (eventRows.length === 0) return [];

  const ids = eventRows.map((e) => e.id);
  const boutRows = await db
    .select()
    .from(upcomingBouts)
    .where(inArray(upcomingBouts.eventId, ids))
    .orderBy(asc(upcomingBouts.eventId), asc(upcomingBouts.position));

  const boutsByEvent = new Map<number, UpcomingBoutDTO[]>();
  for (const b of boutRows) {
    if (!boutsByEvent.has(b.eventId)) boutsByEvent.set(b.eventId, []);
    boutsByEvent.get(b.eventId)!.push({
      fighter1: b.fighter1,
      fighter2: b.fighter2,
      weightClass: b.weightClass ?? "",
    });
  }

  return eventRows
    .map((e) => ({
      name:     e.name,
      date:     e.eventDate ?? "",
      location: e.location  ?? "",
      url:      e.url,
      bouts:    boutsByEvent.get(e.id) ?? [],
    }));
  // Mantém eventos sem bouts no resultado (PFL/listing-only) — frontend mostra
  // "card a confirmar" quando o array está vazio.
}

export async function replaceUpcomingEventsForOrg(
  org: string,
  source: string,
  events: UpcomingEventDTO[],
): Promise<{ events: number; bouts: number }> {
  const db = await getDb();
  if (!db) throw new Error("DB not configured");

  const orgKey = org.toLowerCase();

  // Wipe existing rows for this org (cascade deletes bouts via FK)
  await db.delete(upcomingEvents).where(eq(upcomingEvents.org, orgKey));

  let evCount = 0;
  let boutCount = 0;
  for (const ev of events) {
    if (!ev.url || !ev.name) continue;
    const inserted = await db.insert(upcomingEvents).values({
      org:       orgKey,
      source,
      name:      ev.name,
      eventDate: ev.date || null,
      location:  ev.location || null,
      url:       ev.url,
    });
    const insertId = (inserted as any)?.[0]?.insertId
                  ?? (inserted as any)?.insertId;
    if (!insertId) continue;
    evCount++;

    if (ev.bouts.length > 0) {
      await db.insert(upcomingBouts).values(
        ev.bouts.map((b, i) => ({
          eventId: Number(insertId),
          position: i,
          fighter1: b.fighter1,
          fighter2: b.fighter2,
          weightClass: b.weightClass || null,
        })),
      );
      boutCount += ev.bouts.length;
    }
  }
  return { events: evCount, bouts: boutCount };
}
