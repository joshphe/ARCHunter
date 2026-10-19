import { after, NextRequest, NextResponse } from 'next/server';
import { getCapitalFlows } from '@/lib/capital-flow-provider';
import { collectCapitalFlows } from '@/lib/capital-flow-collector';
export const maxDuration = 30;
export async function GET(request: NextRequest) {
  const windowSize=request.nextUrl.searchParams.get('window')??'24h';
  if(windowSize!=='24h'&&windowSize!=='7d')return NextResponse.json({error:'Invalid time window.'},{status:400});
  try {
    const data=await getCapitalFlows(windowSize,request.nextUrl.searchParams.has('refresh'));
    // Never hold the response open while reading chain history. A durable lease caps collection globally.
    after(async()=>{try{await collectCapitalFlows();}catch{console.warn('CCTP background collection unavailable');}});
    return NextResponse.json(data,{headers:{'Cache-Control':data.status==='complete'&&!data.stale?'public, s-maxage=30, stale-while-revalidate=30':'no-store'}});
  }catch{
    console.warn('Could not read persisted CCTP data');
    return NextResponse.json({error:'Flow data is temporarily unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}});
  }
}
