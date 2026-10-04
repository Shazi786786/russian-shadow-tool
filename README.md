# Russian Shadow Tool — Vercel + Neon

Permission-based Telegram multi-group marketing automation.

## Vercel Import Settings
- Repository: `Shazi786786/russian-shadow-scraper`
- Branch / Production Branch: `russian-shadow-tool-20261004`
- Root Directory: `russian-shadow-tool-vercel-v1`
- Framework: Next.js

## Locked plan rules
- Free: maximum 10 authorized groups per campaign; minimum repeat interval 4 hours.
- Premium: maximum 100 authorized groups per campaign; minimum repeat interval 1 minute.
- Telegram permissions are not bypassed. A group admin must explicitly add the bot, grant posting/admin permission, and run `/register_group CODE` inside that group.
- If bot posting permission is later removed, the group is skipped and logged.

## Admin
Set these in Vercel Environment Variables:
- `ADMIN_USERNAME=Shadowlogs`
- `ADMIN_PASSWORD=Shadowlogs@`

## Premium offer
- Regular price: $50
- Today offer: $7
- Telegram: @Shadowteamlog

## Required Vercel environment variables
- `DATABASE_URL` — Neon pooled Postgres connection string
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `CRON_SECRET`
- `NEXT_PUBLIC_UPGRADE_TELEGRAM=Shadowteamlog`

## First production setup
1. Import this repository into Vercel using the branch/root settings above.
2. Connect Neon Postgres and add `DATABASE_URL`.
3. Add all environment variables.
4. Deploy.
5. Login as admin.
6. POST `/api/telegram/setup` once while authenticated as admin to register the Telegram webhook.
7. Customers add the bot to approved groups, grant posting permission, and run the registration command shown on their dashboard.

## Scheduler
`vercel.json` schedules `/api/cron`. Plan interval rules are also enforced server-side.
