import next from 'next'
import { createServer } from 'http'

const port=Number(process.env.PORT||10000)
const app=next({dev:false})
const handle=app.getRequestHandler()

await app.prepare()

createServer((req,res)=>handle(req,res)).listen(port,'0.0.0.0',async()=>{
  console.log('Russian Shadow Tool listening on',port)

  const appUrl=process.env.APP_URL
  const botToken=process.env.TELEGRAM_BOT_TOKEN
  const webhookSecret=process.env.TELEGRAM_WEBHOOK_SECRET

  if(appUrl && botToken){
    try{
      const r=await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`,{
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({
          url:`${appUrl.replace(/\/$/,'')}/api/telegram/webhook`,
          secret_token:webhookSecret||undefined,
          allowed_updates:['message']
        })
      })
      console.log('telegram webhook setup',r.status)
    }catch(e){
      console.error('telegram webhook setup failed',e?.message||e)
    }
  }

  setInterval(async()=>{
    try{
      const headers={}
      if(process.env.CRON_SECRET) headers.authorization=`Bearer ${process.env.CRON_SECRET}`
      const r=await fetch(`http://127.0.0.1:${port}/api/cron`,{headers})
      console.log('scheduler tick',r.status)
    }catch(e){
      console.error('scheduler tick failed',e?.message||e)
    }
  },60000)
})
