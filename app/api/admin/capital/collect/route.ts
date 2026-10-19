import { NextResponse } from 'next/server';
import { isAdmin,isSameOrigin } from '@/lib/admin-auth';
import { collectCapitalFlows } from '@/lib/capital-flow-collector';
export const maxDuration=300;
export async function POST(request:Request){
 if(!(await isAdmin()))return NextResponse.json({error:'Unauthorized.'},{status:401});
 if(!isSameOrigin(request))return NextResponse.json({error:'Invalid origin.'},{status:403});
 try{return NextResponse.json(await collectCapitalFlows({budgetMs:240000,force:true}),{headers:{'Cache-Control':'no-store'}});}
 catch{return NextResponse.json({error:'Collection temporarily unavailable.'},{status:503});}
}
