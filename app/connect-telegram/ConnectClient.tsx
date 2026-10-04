'use client'
import {useEffect,useState} from 'react'

type Props={configured:boolean,initialAccount:any}

export default function ConnectClient({configured,initialAccount}:Props){
 const [account,setAccount]=useState(initialAccount)
 const [mode,setMode]=useState<'qr'|'phone'>('qr')
 const [phone,setPhone]=useState('')
 const [challenge,setChallenge]=useState('')
 const [status,setStatus]=useState('')
 const [qr,setQr]=useState('')
 const [code,setCode]=useState('')
 const [password,setPassword]=useState('')
 const [error,setError]=useState('')
 const [busy,setBusy]=useState(false)

 async function api(body:any){
   const r=await fetch('/api/telegram-account',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})
   const j=await r.json()
   if(!r.ok)throw new Error(j.error||'Request failed')
   return j
 }

 async function refreshAccount(){
   const r=await fetch('/api/telegram-account',{cache:'no-store'})
   const j=await r.json()
   setAccount(j.account||null)
 }

 async function startQr(){
   setBusy(true);setError('');setQr('')
   try{const j=await api({action:'start_qr'});setChallenge(j.challenge);setStatus(j.status||'starting')}
   catch(e:any){setError(e.message)}finally{setBusy(false)}
 }

 async function startPhone(){
   setBusy(true);setError('')
   try{const j=await api({action:'start_phone',phone});setChallenge(j.challenge);setStatus(j.status||'starting')}
   catch(e:any){setError(e.message)}finally{setBusy(false)}
 }

 async function sendCode(){
   setBusy(true);setError('')
   try{await api({action:'code',challenge,code});setStatus('verifying')}
   catch(e:any){setError(e.message)}finally{setBusy(false)}
 }

 async function sendPassword(){
   setBusy(true);setError('')
   try{await api({action:'password',challenge,password});setStatus('verifying')}
   catch(e:any){setError(e.message)}finally{setBusy(false)}
 }

 async function sync(){
   setBusy(true);setError('')
   try{await api({action:'sync'});await refreshAccount()}
   catch(e:any){setError(e.message)}finally{setBusy(false)}
 }

 async function disconnect(){
   if(!confirm('Disconnect this Telegram account?'))return
   setBusy(true);setError('')
   try{await api({action:'disconnect'});setAccount(null);setChallenge('');setStatus('')}
   catch(e:any){setError(e.message)}finally{setBusy(false)}
 }

 useEffect(()=>{
   if(!challenge)return
   const timer=setInterval(async()=>{
     try{
       const r=await fetch('/api/telegram-account?challenge='+encodeURIComponent(challenge),{cache:'no-store'})
       const j=await r.json()
       setStatus(j.status||'')
       if(j.qrDataUrl)setQr(j.qrDataUrl)
       if(j.error)setError(j.error)
       if(j.status==='connected'){clearInterval(timer);await refreshAccount()}
       if(j.status==='error'||j.status==='expired')clearInterval(timer)
     }catch{}
   },1500)
   return()=>clearInterval(timer)
 },[challenge])

 if(!configured)return <div className="connect-warning"><h3>Telegram API setup required</h3><p>The app is deployed, but MTProto login needs <b>TELEGRAM_API_ID</b> and <b>TELEGRAM_API_HASH</b> from my.telegram.org before QR/phone connection can start.</p></div>

 if(account?.connected)return <div className="connected-card">
   <div className="connected-icon">✓</div>
   <div><h2>{account.display_name||'Telegram Connected'}</h2><p>@{account.username||'no_username'} · {account.phone_masked||'phone hidden'}</p><small>Last sync: {account.last_sync_at?new Date(account.last_sync_at).toLocaleString():'Not synced yet'}</small></div>
   <div className="connect-actions"><button onClick={sync} disabled={busy}>↻ Sync Groups</button><a href="/dashboard">Open Dashboard</a><button className="danger" onClick={disconnect} disabled={busy}>Disconnect</button></div>
   {error&&<div className="connect-error">{error}</div>}
 </div>

 return <div className="connect-card">
   <div className="connect-tabs"><button className={mode==='qr'?'active':''} onClick={()=>setMode('qr')}>QR Code</button><button className={mode==='phone'?'active':''} onClick={()=>setMode('phone')}>Phone Number</button></div>
   {mode==='qr'?<div className="qr-flow">
     <h2>Connect with QR Code</h2>
     <p>Open Telegram on your phone → Settings → Devices → Link Desktop Device, then scan this QR.</p>
     {!challenge&&<button className="connect-primary" onClick={startQr} disabled={busy}>{busy?'Starting...':'Generate QR Code'}</button>}
     {qr&&<><div className="qr-box"><img src={qr} alt="Telegram QR login"/></div><div className="connect-status">Status: <b>{status}</b></div></>}
     {challenge&&!qr&&<div className="connect-status">Preparing secure QR… <b>{status}</b></div>}
   </div>:<div className="phone-flow">
     <h2>Connect with Phone Number</h2>
     <p>Use your Telegram phone number including country code.</p>
     {!challenge&&<div className="inline-form"><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+1 555 123 4567"/><button onClick={startPhone} disabled={busy||!phone}>{busy?'Sending...':'Send Telegram Code'}</button></div>}
     {challenge&&(status==='code_sent'||status==='verifying')&&<div className="inline-form"><input value={code} onChange={e=>setCode(e.target.value)} placeholder="Telegram code"/><button onClick={sendCode} disabled={busy||!code}>Verify Code</button></div>}
   </div>}
   {status==='needs_password'&&<div className="twofa-box"><h3>Telegram 2-Step Verification</h3><p>Enter your Telegram 2FA password. It is used only for this login step and is not stored.</p><div className="inline-form"><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="2FA password"/><button onClick={sendPassword} disabled={busy||!password}>Continue</button></div></div>}
   {error&&<div className="connect-error">{error}</div>}
   <div className="connect-security"><b>Security</b><span>Your Telegram session is encrypted before it is stored. OTP and 2FA password are not saved.</span></div>
 </div>
}
