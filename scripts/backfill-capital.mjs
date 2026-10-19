import { createHmac } from 'node:crypto';
const secret=process.env.ADMIN_SESSION_SECRET;
if(!secret){console.error('Run through vercel env run with development environment variables.');process.exit(1);}
const origin='http://localhost:3000';
const payload=Buffer.from(JSON.stringify({role:'admin',exp:Math.floor(Date.now()/1000)+300})).toString('base64url');
const signature=createHmac('sha256',secret).update(payload).digest('base64url');
try{
 const response=await fetch(`${origin}/api/admin/capital/collect`,{method:'POST',headers:{Origin:origin,Cookie:`arcwatch_admin=${payload}.${signature}`},redirect:'error',signal:AbortSignal.timeout(270000)});
 if(!response.ok)throw new Error(`Collection HTTP ${response.status}`);
 console.log(JSON.stringify(await response.json()));
}catch(error){console.error(error.message);process.exit(1);}
