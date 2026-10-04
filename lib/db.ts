import { neon } from '@neondatabase/serverless'
let sqlClient:any
export function sql(){ if(!sqlClient){ if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL missing'); sqlClient=neon(process.env.DATABASE_URL) } return sqlClient }
export async function ensureSchema(){
 const q=sql();
 await q`CREATE TABLE IF NOT EXISTS users(id bigserial primary key, username text unique not null, password_hash text not null, role text not null default 'user', is_premium boolean not null default false, premium_until timestamptz, is_active boolean not null default true, created_at timestamptz not null default now(), last_login_at timestamptz)`;
 await q`CREATE TABLE IF NOT EXISTS sessions(id bigserial primary key, user_id bigint references users(id) on delete cascade, token_hash text unique not null, ip text, user_agent text, created_at timestamptz not null default now(), last_seen_at timestamptz not null default now(), active boolean not null default true)`;
 await q`CREATE TABLE IF NOT EXISTS authorized_groups(id bigserial primary key, user_id bigint references users(id) on delete cascade, chat_id bigint not null, title text not null, registered_by bigint, can_post boolean not null default true, created_at timestamptz not null default now(), unique(user_id,chat_id))`;
 await q`CREATE TABLE IF NOT EXISTS campaigns(id bigserial primary key, user_id bigint references users(id) on delete cascade, name text not null, message text not null, media_type text, media_url text, interval_minutes int not null, status text not null default 'paused', next_run_at timestamptz, cursor_index int not null default 0, sent_count int not null default 0, failed_count int not null default 0, created_at timestamptz not null default now())`;
 await q`CREATE TABLE IF NOT EXISTS campaign_groups(campaign_id bigint references campaigns(id) on delete cascade, group_id bigint references authorized_groups(id) on delete cascade, primary key(campaign_id,group_id))`;
 await q`CREATE TABLE IF NOT EXISTS send_logs(id bigserial primary key, campaign_id bigint references campaigns(id) on delete cascade, group_id bigint, status text not null, detail text, created_at timestamptz not null default now())`;
 await q`CREATE TABLE IF NOT EXISTS registration_codes(user_id bigint primary key references users(id) on delete cascade, code text unique not null, expires_at timestamptz not null)`;
}
