-- ===========================================================================
-- 0003 — Raw layer + Kaggle imports + enriched timestamps
-- ===========================================================================
-- Architecture: scrape → *_raw (append-only history) → ETL → enriched → site
-- Site reads ONLY from enriched tables.
-- Raw tables are never updated; every scrape adds new rows. History via scrapedAt.
-- ===========================================================================

-- 1. fighters_raw  — every scrape of a fighter profile
CREATE TABLE IF NOT EXISTS `fighters_raw` (
  `id`           INT NOT NULL AUTO_INCREMENT,
  `source`       VARCHAR(50)  NOT NULL,
  `externalId`   VARCHAR(200) NULL,
  `name`         VARCHAR(200) NOT NULL,
  `nickname`     VARCHAR(100) NULL,
  `nationality`  VARCHAR(100) NULL,
  `birthDate`    VARCHAR(20)  NULL,
  `heightCm`     FLOAT        NULL,
  `reachCm`      FLOAT        NULL,
  `weightKg`     FLOAT        NULL,
  `stance`       VARCHAR(50)  NULL,
  `primaryTeam`  VARCHAR(200) NULL,
  `weightClass`  VARCHAR(100) NULL,
  `sourceUrl`    VARCHAR(500) NULL,
  `recordRaw`    VARCHAR(60)  NULL,
  `payload`      JSON NULL,
  `scrapedAt`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_fighters_raw_source` (`source`),
  INDEX `idx_fighters_raw_external` (`externalId`),
  INDEX `idx_fighters_raw_name` (`name`),
  INDEX `idx_fighters_raw_scraped` (`scrapedAt`)
);

-- 2. fights_raw  — every scrape of a fight row
CREATE TABLE IF NOT EXISTS `fights_raw` (
  `id`                 INT NOT NULL AUTO_INCREMENT,
  `source`             VARCHAR(50)  NOT NULL,
  `fighterExternalId`  VARCHAR(200) NULL,
  `fighterName`        VARCHAR(200) NOT NULL,
  `opponent`           VARCHAR(200) NOT NULL,
  `fightDate`          VARCHAR(20)  NULL,
  `result`             VARCHAR(20)  NULL,
  `methodCategory`     VARCHAR(30)  NULL,
  `methodDetail`       VARCHAR(200) NULL,
  `round`              INT NULL,
  `timeInRound`        VARCHAR(10)  NULL,
  `promotion`          VARCHAR(100) NULL,
  `event`              VARCHAR(300) NULL,
  `weightClass`        VARCHAR(100) NULL,
  `payload`            JSON NULL,
  `scrapedAt`          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_fights_raw_source` (`source`),
  INDEX `idx_fights_raw_fighter` (`fighterName`),
  INDEX `idx_fights_raw_date` (`fightDate`),
  INDEX `idx_fights_raw_scraped` (`scrapedAt`)
);

-- 3. fight_stats_raw — per-fighter strike/grappling detail (UFCStats, Kaggle, etc.)
CREATE TABLE IF NOT EXISTS `fight_stats_raw` (
  `id`                       INT NOT NULL AUTO_INCREMENT,
  `source`                   VARCHAR(50)  NOT NULL,
  `fighterExternalId`        VARCHAR(200) NULL,
  `fighterName`              VARCHAR(200) NOT NULL,
  `opponent`                 VARCHAR(200) NOT NULL,
  `fightDate`                VARCHAR(20)  NULL,
  `event`                    VARCHAR(300) NULL,
  `sigStrikesLanded`         INT NULL,
  `sigStrikesAttempted`      INT NULL,
  `sigStrikesPct`            FLOAT NULL,
  `totalStrikesLanded`       INT NULL,
  `totalStrikesAttempted`    INT NULL,
  `knockdowns`               INT NULL,
  `headLanded`               INT NULL,
  `headAttempted`            INT NULL,
  `bodyLanded`               INT NULL,
  `bodyAttempted`            INT NULL,
  `legLanded`                INT NULL,
  `legAttempted`             INT NULL,
  `distanceLanded`           INT NULL,
  `distanceAttempted`        INT NULL,
  `clinchLanded`             INT NULL,
  `clinchAttempted`          INT NULL,
  `groundLanded`             INT NULL,
  `groundAttempted`          INT NULL,
  `takedownsLanded`          INT NULL,
  `takedownsAttempted`       INT NULL,
  `takedownPct`              FLOAT NULL,
  `submissionAttempts`       INT NULL,
  `reversals`                INT NULL,
  `controlTimeSeconds`       INT NULL,
  `payload`                  JSON NULL,
  `scrapedAt`                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_fstats_raw_source` (`source`),
  INDEX `idx_fstats_raw_fighter` (`fighterName`),
  INDEX `idx_fstats_raw_date` (`fightDate`)
);

-- 4. kaggle_imports — preserve every Kaggle CSV row verbatim (payload JSON)
CREATE TABLE IF NOT EXISTS `kaggle_imports` (
  `id`           INT NOT NULL AUTO_INCREMENT,
  `dataset`      VARCHAR(100) NOT NULL,
  `rowFormat`    VARCHAR(50)  NULL,
  `fighterName`  VARCHAR(200) NULL,
  `opponent`     VARCHAR(200) NULL,
  `eventName`    VARCHAR(300) NULL,
  `eventDate`    VARCHAR(20)  NULL,
  `weightClass`  VARCHAR(100) NULL,
  `payload`      JSON NOT NULL,
  `importedAt`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_kaggle_dataset` (`dataset`),
  INDEX `idx_kaggle_fighter` (`fighterName`),
  INDEX `idx_kaggle_date` (`eventDate`)
);

-- 5. official_rankings_raw  — every weekly rankings scrape, full snapshot
CREATE TABLE IF NOT EXISTS `official_rankings_raw` (
  `id`            INT NOT NULL AUTO_INCREMENT,
  `org`           VARCHAR(50)  NOT NULL,
  `weightClass`   VARCHAR(100) NOT NULL,
  `rank`          INT NOT NULL,
  `fighterName`   VARCHAR(200) NOT NULL,
  `isChampion`    INT NULL DEFAULT 0,
  `isInterim`     INT NULL DEFAULT 0,
  `sourceUrl`     VARCHAR(500) NULL,
  `payload`       JSON NULL,
  `scrapedAt`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_ranks_raw_org` (`org`),
  INDEX `idx_ranks_raw_scraped` (`scrapedAt`)
);

-- 6. upcoming_events_raw + upcoming_bouts_raw
CREATE TABLE IF NOT EXISTS `upcoming_events_raw` (
  `id`         INT NOT NULL AUTO_INCREMENT,
  `org`        VARCHAR(50)  NOT NULL,
  `source`     VARCHAR(50)  NOT NULL,
  `name`       VARCHAR(300) NOT NULL,
  `eventDate`  VARCHAR(60)  NULL,
  `location`   VARCHAR(300) NULL,
  `url`        VARCHAR(500) NOT NULL,
  `payload`    JSON NULL,
  `scrapedAt`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_uev_raw_org` (`org`),
  INDEX `idx_uev_raw_scraped` (`scrapedAt`)
);

CREATE TABLE IF NOT EXISTS `upcoming_bouts_raw` (
  `id`           INT NOT NULL AUTO_INCREMENT,
  `eventRawId`   INT NOT NULL,
  `position`     INT NOT NULL DEFAULT 0,
  `fighter1`     VARCHAR(200) NOT NULL,
  `fighter2`     VARCHAR(200) NOT NULL,
  `weightClass`  VARCHAR(100) NULL,
  `scrapedAt`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_ubt_raw_event` (`eventRawId`),
  CONSTRAINT `fk_ubt_raw_event` FOREIGN KEY (`eventRawId`)
    REFERENCES `upcoming_events_raw` (`id`) ON DELETE CASCADE
);

-- ===========================================================================
-- 7. enriched — UPCOMING (created in 0002, evolved here to match new schema)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS `upcoming_events` (
  `id`        INT NOT NULL AUTO_INCREMENT,
  `org`       VARCHAR(50)  NOT NULL,
  `source`    VARCHAR(50)  NOT NULL,
  `name`      VARCHAR(300) NOT NULL,
  `eventDate` VARCHAR(60)  NULL,
  `location`  VARCHAR(300) NULL,
  `url`       VARCHAR(500) NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_uev_org` (`org`),
  UNIQUE KEY `uniq_uev_url` (`url`)
);

CREATE TABLE IF NOT EXISTS `upcoming_bouts` (
  `id`          INT NOT NULL AUTO_INCREMENT,
  `eventId`     INT NOT NULL,
  `position`    INT NOT NULL DEFAULT 0,
  `fighter1`    VARCHAR(200) NOT NULL,
  `fighter2`    VARCHAR(200) NOT NULL,
  `weightClass` VARCHAR(100) NULL,
  `createdAt`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_ubt_event` (`eventId`),
  CONSTRAINT `fk_ubt_event` FOREIGN KEY (`eventId`)
    REFERENCES `upcoming_events` (`id`) ON DELETE CASCADE
);

-- ===========================================================================
-- 8. ALTER existing enriched tables to add updatedAt where missing
-- ===========================================================================
-- fights: add updatedAt
ALTER TABLE `fights`
  ADD COLUMN IF NOT EXISTS `updatedAt` TIMESTAMP NOT NULL
    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- fight_stats: add updatedAt
ALTER TABLE `fight_stats`
  ADD COLUMN IF NOT EXISTS `updatedAt` TIMESTAMP NOT NULL
    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- official_rankings: rename scrapedAt → updatedAt + add createdAt (if not present)
-- Schema-safe form for MySQL 8: idempotent guard via INFORMATION_SCHEMA.
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE()
             AND TABLE_NAME = 'official_rankings'
             AND COLUMN_NAME = 'createdAt');
SET @sql := IF(@c = 0,
  'ALTER TABLE `official_rankings` ADD COLUMN `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE()
             AND TABLE_NAME = 'official_rankings'
             AND COLUMN_NAME = 'updatedAt');
SET @sql := IF(@c = 0,
  'ALTER TABLE `official_rankings` ADD COLUMN `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- if older schemas had `scrapedAt` we keep it (backward compat).
