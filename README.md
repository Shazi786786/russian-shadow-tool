# Russian Shadow Tool — Vercel + Neon

Permission-based Telegram multi-group marketing automation.

## Vercel Import
- Repository: `Shazi786786/russian-shadow-tool`
- Branch: `main`
- Root Directory: project root
- Framework: Next.js

## Plan Rules
- Free: max 10 authorized groups; minimum repeat interval 4 hours.
- Premium: max 100 authorized groups; minimum repeat interval 1 minute.
- Only groups where the Telegram bot has been explicitly added and granted posting permission can be registered.
- If posting permission is removed later, that group is skipped and logged.

## Required Vercel Environment Variables
- `DATABASE_URL` — Neon pooled PostgreSQL connection string
- `ADMIN_USERNAME` — set to your admin username
- `ADMIN_PASSWORD` — set only in Vercel, never commit it to GitHub
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `CRON_SECRET`
- `NEXT_PUBLIC_UPGRADE_TELEGRAM=Shadowteamlog`

## Premium Offer
- Regular price: $50
- Today offer: $7
- Telegram: @Shadowteamlog

## First Production Setup
1. Import this repo into Vercel.
2. Connect a Neon Postgres database and add its pooled `DATABASE_URL`.
3. Add the environment variables above.
4. Deploy.
5. Login as admin.
6. While logged in as admin, POST `/api/telegram/setup` once to register the Telegram webhook.
7. Users can then authorize groups by adding the bot, granting posting permission, and using the registration command shown in their dashboard.

## Scheduler
`vercel.json` runs the cron endpoint on a one-minute schedule. Each campaign still obeys its own Free/Premium interval rules server-side.
