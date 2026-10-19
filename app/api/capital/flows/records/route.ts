import { NextRequest,NextResponse } from 'next/server';
import { listFlowRecords } from '@/lib/capital-flow-provider';
export async function GET(request:NextRequest){
 const q=request.nextUrl.searchParams,windowSize=q.get('window')??'24h',direction=q.get('direction')??'all',sort=q.get('sort')??'recent';
 const page=Number(q.get('page')??1),domain=q.has('domain')?Number(q.get('domain')):null;
 if((windowSize!=='24h'&&windowSize!=='7d')||!['all','in','out'].includes(direction)||!['recent','amount'].includes(sort)||!Number.isInteger(page)||page<1||page>1000||(domain!==null&&(!Number.isInteger(domain)||domain<0||domain>2147483647)))return NextResponse.json({error:'Invalid record filter.'},{status:400});
 try{return NextResponse.json(await listFlowRecords({window:windowSize,direction:direction as 'all'|'in'|'out',sort:sort as 'recent'|'amount',domain,page}),{headers:{'Cache-Control':'public, s-maxage=30'}});}
 catch{return NextResponse.json({error:'Records temporarily unavailable.'},{status:503});}
}
