export const dynamic='force-dynamic';
import {requireUser,isPremium} from '../../lib/auth';
import {sql} from '../../lib/db';
import {tg} from '../../lib/telegram';

function Side({u,premium}:{u:any,premium:boolean}){
  return <aside className="rs-side">
    <div className="rs-brand"><div className="rs-mark">RS</div><div><strong>RUSSIAN SHADOW TOOL</strong><small>ADVANCED TELEGRAM AUTOMATION</small></div></div>
    <nav className="rs-nav">
      <a href="/dashboard">⌂ <span>Dashboard</span></a>
      <a className="active" href="#groups">➤ <span>Telegram Group Poster</span></a><a href="/connect-telegram">◉ <span>Connect Telegram</span></a>
      <a href="#groups">▣ <span>Groups</span></a>
      <a href="#create">↗ <span>Create Post</span></a>
      <a href="#schedule">▣ <span>Scheduler</span></a>
      <a href="#campaigns">◷ <span>Campaigns</span></a>
      <a href="#campaigns">▱ <span>History</span></a>
      <a href="/upgrade">⚙ <span>Settings</span></a>
    </nav>
    <div className="rs-userbox"><div className="rs-avatar">S</div><div><b>{u.username}</b><small>{premium?'Premium User':'Free User'}</small></div><span className="crown">♛</span></div>
    <a className="rs-upgrade" href="/upgrade">♛ Upgrade / Extend</a>
  </aside>
}

export default async function Dashboard(){
 const u=await requireUser(); const q=sql(); const premium=isPremium(u); const limit=premium?100:10;
 const groups=await q`SELECT * FROM authorized_groups WHERE user_id=${u.id} AND can_post=true ORDER BY id DESC`;
 const tgAccount=(await q`SELECT * FROM telegram_accounts WHERE user_id=${u.id} AND connected=true LIMIT 1`)[0]||null;
 const tgDialogs=tgAccount?await q`SELECT * FROM telegram_dialogs WHERE account_id=${tgAccount.id} AND can_post=true ORDER BY title ASC LIMIT 500`:[];
 const camps=await q`SELECT c.*,count(cg.group_id)::int AS groups_count FROM campaigns c LEFT JOIN campaign_groups cg ON cg.campaign_id=c.id WHERE c.user_id=${u.id} GROUP BY c.id ORDER BY c.id DESC`;
 const sent=camps.reduce((a:number,c:any)=>a+c.sent_count,0), failed=camps.reduce((a:number,c:any)=>a+c.failed_count,0);
 let bot:any=null; try{bot=await tg('getMe',{})}catch{}
 let rc=await q`SELECT code,expires_at FROM registration_codes WHERE user_id=${u.id}`;
 if(!rc.length||new Date(rc[0].expires_at)<new Date()){const code=Math.random().toString(36).slice(2,8).toUpperCase();await q`INSERT INTO registration_codes(user_id,code,expires_at) VALUES(${u.id},${code},now()+interval '24 hours') ON CONFLICT(user_id) DO UPDATE SET code=excluded.code,expires_at=excluded.expires_at`;rc=[{code}]}
 return <div className="rs-shell">
   <Side u={u} premium={premium}/>
   <main className="rs-main">
     <header className="rs-topbar"><div><h1>Telegram Group Poster</h1><p>Permission-based multi-group posting</p></div><div className="rs-topactions"><span className={premium?"plan-pill premium":"plan-pill"}>{premium?'♛ Premium User':'Free'}</span><div className="mini-user"><div className="mini-avatar">S</div><div><b>{u.username}</b><small>{premium?'Premium':'Free'}</small></div></div><form action="/api/auth/logout" method="post"><button className="icon-btn">↪</button></form></div></header>

     <section className="rs-stats">
       <div className="metric"><span className="metric-icon">👥</span><div><small>Telegram Groups</small><strong>{tgAccount?tgDialogs.length:groups.length}</strong><em>{tgAccount?"Synced from your account":"Bot authorized groups"}</em></div></div>
       <div className="metric"><span className="metric-icon ok">✓</span><div><small>Group Limit</small><strong>{limit}</strong><em>Max {limit} ({premium?'Premium':'Free'})</em></div></div>
       <div className="metric"><span className="metric-icon">➤</span><div><small>Active Campaigns</small><strong>{camps.filter((x:any)=>x.status==='running').length}</strong><em>Running now</em></div></div>
       <div className="metric"><span className="metric-icon green">▮▮▮</span><div><small>Total Sent</small><strong>{sent}</strong><em>All time</em></div></div>
       <div className="metric"><span className="metric-icon bad">✕</span><div><small>Failed</small><strong>{failed}</strong><em>View logs</em></div></div>
     </section>

     <div className="rs-workgrid">
       <section className="panel" id="groups"><div className="panel-title">👥 Select Telegram Groups <span className={tgAccount?"bot-status online":"bot-status offline"}>{tgAccount?`● Account Connected @${tgAccount.username||'telegram'}`:(bot?`● Bot Connected @${bot.username}`:"● Not Connected")}</span></div><input className="searchbox" placeholder="Search groups..."/>
       {tgAccount?<><div className="account-strip"><div><b>{tgAccount.display_name||'Telegram Account'}</b><small>@{tgAccount.username||'no_username'} · synced groups/channels</small></div><a href="/connect-telegram">Manage / Sync</a></div><div className="group-tools"><label>My Telegram Groups</label><span>{Math.min(tgDialogs.length,limit)} available</span></div><div className="group-list">{tgDialogs.length?tgDialogs.slice(0,limit).map((g:any)=><label className="group-row" key={'tg-'+g.id}><input type="checkbox" name="dialogIds" value={g.id} form="campaign-form"/><span className="group-logo">{g.title?.slice(0,1)?.toUpperCase()||'G'}</span><div><b>{g.title}</b><small>{g.kind}{g.member_count?` · ${g.member_count} members`:''}</small></div><em>✓ Can Post</em></label>):<div className="empty-state">No writable groups found. Click Manage / Sync.</div>}</div></>:<><div className="connect-prompt"><b>Connect your Telegram account</b><p>Use QR or phone number to load your real joined groups and channels.</p><a href="/connect-telegram">Connect Telegram Account</a></div><div className="register-note">Bot mode is still available: add the bot to a group, grant posting permission, then a group admin sends <b>/register_group {rc[0].code}</b>.</div><div className="group-list">{groups.slice(0,limit).map((g:any)=><label className="group-row" key={'bot-'+g.id}><input type="checkbox" name="groupIds" value={g.id} form="campaign-form"/><span className="group-logo">{g.title?.slice(0,1)?.toUpperCase()||'G'}</span><div><b>{g.title}</b><small>Bot authorized group</small></div><em>✓ Selected</em></label>)}</div></>}</section>

       <section className="panel" id="create"><div className="panel-title">▣ Create Post</div><div className="tabs"><span className="active">Text</span><span>Photo</span><span>Video</span><span>File</span></div><form id="campaign-form" action="/api/campaigns" method="post"><select className="field" name="deliveryMode" defaultValue={tgAccount?"account":"bot"}><option value="account" disabled={!tgAccount}>My Telegram Account{tgAccount?"":" (connect first)"}</option><option value="bot">Bot Authorized Groups</option></select><input className="field" name="name" defaultValue="New Campaign"/><textarea className="composer" name="message" placeholder="Write your marketing post..." required/><select className="field" name="mediaType" defaultValue=""><option value="">Text only</option><option value="photo">Photo URL</option><option value="video">Video URL</option><option value="document">File URL</option></select><input className="field" name="mediaUrl" placeholder="Optional HTTPS media URL"/></form><div className="preview"><b>Preview</b><p>Your post preview will appear here.</p></div></section>

       <section className="panel" id="schedule"><div className="panel-title">▣ Schedule & Repeat</div><div className="radio-row"><span>○ Send Now</span><span className="on">● Schedule / Repeat</span></div><label className="field-label">Interval {premium&&<b>(♛ Premium: 1 minute)</b>}</label><select className="field" name="interval" form="campaign-form" defaultValue={premium?1:240}>{premium&&<><option value="1">Every 1 Minute</option><option value="5">Every 5 Minutes</option><option value="15">Every 15 Minutes</option><option value="30">Every 30 Minutes</option><option value="60">Every 1 Hour</option></>}<option value="240">Every 4 Hours</option><option value="720">Every 12 Hours</option><option value="1440">Every 24 Hours</option></select><div className="schedule-box"><b>♛ {premium?'Premium Feature':'Free Plan'}</b><p>{premium?'You can send posts every 1 minute and select up to 100 groups.':'Free plan supports up to 10 groups and minimum 4-hour interval.'}</p></div><button className="primary-btn" form="campaign-form">▶ Start Campaign</button></section>

       <aside className="premium-card"><div className="premium-crown">♛</div><h2>{premium?'Premium Activated':'Upgrade to Premium'}</h2><p>Unlock Full Power of Telegram Group Poster</p><div className="offer"><div><small>Regular Price</small><span className="old">$50</span></div><div><small>TODAY ONLY</small><strong>$7</strong></div></div><ul><li>✓ Select up to 100 groups</li><li>✓ Send posts every 1 minute</li><li>✓ Text, photo, video, file support</li><li>✓ Advanced scheduling</li><li>✓ Full history and logs</li><li>✓ Premium badge</li></ul><a className="telegram-btn" href="https://t.me/Shadowteamlog">➤ Contact @Shadowteamlog</a></aside>
     </div>

     <section className="panel campaigns" id="campaigns"><div className="panel-title"><span>▣ Campaigns</span><a href="#create" className="new-campaign">＋ New Campaign</a></div><div className="table-wrap"><table className="tbl"><thead><tr><th>#</th><th>Message</th><th>Groups</th><th>Interval</th><th>Status</th><th>Sent</th><th>Failed</th><th>Actions</th></tr></thead><tbody>{camps.length?camps.map((c:any)=><tr key={c.id}><td>{c.id}</td><td>{c.name}</td><td>{c.groups_count}</td><td>{c.interval_minutes} min</td><td><span className={'status '+c.status}>{c.status}</span></td><td>{c.sent_count}</td><td className="fail">{c.failed_count}</td><td><form action="/api/campaign-action" method="post"><input type="hidden" name="id" value={c.id}/><input type="hidden" name="action" value={c.status==='running'?'pause':'start'}/><button className="mini-action">{c.status==='running'?'Ⅱ':'▶'}</button></form></td></tr>):<tr><td colSpan={8} className="empty-table">No campaigns yet.</td></tr>}</tbody></table></div></section>
   </main>
 </div>
}