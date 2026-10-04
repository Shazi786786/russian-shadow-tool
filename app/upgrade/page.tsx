export const dynamic='force-dynamic';
import {requireUser} from '../../lib/auth';

export default async function Upgrade(){
  await requireUser();
  const tg=process.env.NEXT_PUBLIC_UPGRADE_TELEGRAM||'Shadowteamlog';
  return <div className="upgrade-page">
    <div className="upgrade-wrap">
      <div className="upgrade-head">
        <div className="premium-crown">♛</div>
        <h1>Upgrade to Premium</h1>
        <p>Unlock the full power of Russian Shadow Tool</p>
      </div>

      <div className="upgrade-price-card">
        <div className="price-left">
          <span>Regular Price</span>
          <strong className="price-old">$50</strong>
        </div>
        <div className="price-divider"/>
        <div className="price-right">
          <span className="today-badge">TODAY ONLY</span>
          <small>Special Offer</small>
          <strong className="price-new">$7</strong>
        </div>
      </div>

      <div className="upgrade-benefits">
        <div>✓ Select up to 100 authorized groups</div>
        <div>✓ Minimum repeat interval 1 minute</div>
        <div>✓ Text, photo, video and file URL support</div>
        <div>✓ Advanced scheduling</div>
        <div>✓ Full campaign history and logs</div>
        <div>✓ Premium badge</div>
        <div>✓ Priority support</div>
      </div>

      <div className="upgrade-highlight">🔥 Today only — get Premium access for just <b>$7</b> instead of <b>$50</b>.</div>

      <div className="upgrade-contact">
        <div className="tg-circle">➤</div>
        <div><small>Contact on Telegram</small><strong>@{tg}</strong><p>Message us to upgrade or extend your Premium access.</p></div>
      </div>

      <a className="upgrade-telegram-btn" href={`https://t.me/${tg}`}>➤ Open Telegram</a>
      <a className="upgrade-back-btn" href="/dashboard">← Back to Dashboard</a>
    </div>
  </div>
}