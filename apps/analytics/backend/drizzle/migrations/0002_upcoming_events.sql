-- Upcoming events scraped from UFC Stats / Tapology, persisted for the site.
-- Site reads from these tables only — never calls scrapers live.

CREATE TABLE IF NOT EXISTS `upcoming_events` (
  `id`        INT NOT NULL AUTO_INCREMENT,
  `org`       VARCHAR(50)  NOT NULL,
  `source`    VARCHAR(50)  NOT NULL,
  `name`      VARCHAR(300) NOT NULL,
  `date`      VARCHAR(60)  NULL,
  `location`  VARCHAR(300) NULL,
  `url`       VARCHAR(500) NOT NULL,
  `scrapedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_upcoming_events_org` (`org`),
  UNIQUE KEY `uniq_upcoming_events_url` (`url`)
);

CREATE TABLE IF NOT EXISTS `upcoming_bouts` (
  `id`          INT NOT NULL AUTO_INCREMENT,
  `eventId`     INT NOT NULL,
  `position`    INT NOT NULL DEFAULT 0,
  `fighter1`    VARCHAR(200) NOT NULL,
  `fighter2`    VARCHAR(200) NOT NULL,
  `weightClass` VARCHAR(100) NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_upcoming_bouts_event` (`eventId`),
  CONSTRAINT `fk_upcoming_bouts_event` FOREIGN KEY (`eventId`) REFERENCES `upcoming_events`(`id`) ON DELETE CASCADE
);
