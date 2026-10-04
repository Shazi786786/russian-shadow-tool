export const dynamic='force-dynamic'
import {requireUser} from '../../lib/auth'
import {ensureSchema,sql} from '../../lib/db'
import {telegramAccountConfigured} from '../../lib/telegramAccount'
import ConnectClient from './ConnectClient'

export default async function ConnectTelegramPage(){
  const u=await requireUser()
  await ensureSchema()
  const q=sql()
  const account=(await q`SELECT id,telegram_user_id,username,display_name,phone_masked,connected,last_sync_at FROM telegram_accounts WHERE user_id=${u.id} LIMIT 1`)[0]||null
  return <div className="connect-page">
    <div className="connect-wrap">
      <div className="connect-top"><div><a href="/dashboard">← Dashboard</a><h1>Connect Telegram Account</h1><p>Connect with QR or phone number, then sync groups and channels where your account can post.</p></div><span className={account?.connected?"connect-pill on":"connect-pill"}>{account?.connected?'● Connected':'● Not Connected'}</span></div>
      <ConnectClient configured={telegramAccountConfigured()} initialAccount={account}/>
    </div>
  </div>
}
