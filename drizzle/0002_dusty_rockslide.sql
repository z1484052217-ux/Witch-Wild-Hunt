CREATE TABLE `catalog_updates` (
	`name` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE `card_edits` ADD `write_epoch` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `site_content` ADD `write_epoch` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TRIGGER card_write_insert BEFORE INSERT ON card_edits WHEN NEW.write_epoch < 1 BEGIN SELECT RAISE(ABORT,'Refresh catalog before editing'); END;
--> statement-breakpoint
CREATE TRIGGER card_write_update BEFORE UPDATE ON card_edits WHEN NEW.write_epoch != OLD.write_epoch + 1 BEGIN SELECT RAISE(ABORT,'Refresh catalog before editing'); END;

--> statement-breakpoint
CREATE TRIGGER content_write_insert BEFORE INSERT ON site_content WHEN NEW.write_epoch < 1 BEGIN SELECT RAISE(ABORT,'Refresh catalog before editing'); END;
--> statement-breakpoint
CREATE TRIGGER content_write_update BEFORE UPDATE ON site_content WHEN NEW.write_epoch != OLD.write_epoch + 1 BEGIN SELECT RAISE(ABORT,'Refresh catalog before editing'); END;
