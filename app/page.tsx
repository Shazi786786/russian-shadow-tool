import {me} from '../lib/auth';import {redirect} from 'next/navigation';export default async function Page(){const u=await me();redirect(!u?'/login':u.role==='admin'?'/admin':'/dashboard')}
