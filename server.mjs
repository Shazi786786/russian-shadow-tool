import next from 'next'
import { createServer } from 'http'

const port=Number(process.env.PORT||10000)
const app=next({dev:false})
const handle=app.getRequestHandler()

await app.prepare()

createServer((req,res)=>handle(req,res)).listen(port,'0.0.0.0',()=>{
  console.log('Russian Shadow Tool listening on',port)
  setInterval(async()=>{
    try{
      const r=await fetch(`http://127.0.0.1:${port}/api/cron`)
      console.log('scheduler tick',r.status)
    }catch(e){
      console.error('scheduler tick failed',e?.message||e)
    }
  },60000)
})
