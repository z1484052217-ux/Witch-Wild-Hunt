import {integer,sqliteTable,text} from 'drizzle-orm/sqlite-core';
export const cards = sqliteTable('card_edits',{id:text('id').primaryKey(),draft:text('draft').notNull(),published:text('published'),revision:integer('revision').notNull().default(1),updatedAt:text('updated_at').notNull(),writeEpoch:integer('write_epoch').notNull().default(0)});
export const catalogUpdates=sqliteTable('catalog_updates',{name:text('name').primaryKey()});
export const otpChallenges = sqliteTable('admin_otp_challenges', {
  id: text('id').primaryKey(), email: text('email').notNull(), codeHash: text('code_hash').notNull(),
  expiresAt: integer('expires_at').notNull(), attempts: integer('attempts').notNull().default(0),
  sent: integer('sent').notNull().default(0), createdAt: integer('created_at').notNull(),
});
export const adminSessions = sqliteTable('admin_sessions', {
  tokenHash: text('token_hash').primaryKey(), email: text('email').notNull(),
  expiresAt: integer('expires_at').notNull(), createdAt: integer('created_at').notNull(),
});
export const authLimits = sqliteTable('admin_auth_limits', {
  key: text('key').primaryKey(), count: integer('count').notNull(), expiresAt: integer('expires_at').notNull(),
});
export const siteContent = sqliteTable('site_content', {
  id:text('id').primaryKey(),kind:text('kind').notNull(),draft:text('draft').notNull(),published:text('published'),
  revision:integer('revision').notNull().default(1),updatedAt:text('updated_at').notNull(),writeEpoch:integer('write_epoch').notNull().default(0)
});
