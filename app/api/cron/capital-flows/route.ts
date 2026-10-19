import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { collectCapitalFlows } from '@/lib/capital-flow-collector';
export const maxDuration=300;
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET,actual=Buffer.from(request.headers.get('authorization')??'');
 const expected=Buffer.from(`Bearer ${secret??''}`);
 if(!secret||actual.length!==expected.length||!timingSafeEqual(actual,expected))return NextResponse.json({error:'Unauthorized.'},{status:401});
 try{return NextResponse.json(await collectCapitalFlows({budgetMs:240000,force:true}),{headers:{'Cache-Control':'no-store'}});}
 catch{return NextResponse.json({error:'Collection temporarily unavailable.'},{status:503});}
}
