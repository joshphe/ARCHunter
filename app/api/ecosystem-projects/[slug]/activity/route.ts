import { NextResponse } from 'next/server';
import { getProjectBySlug } from '@/lib/projects-db';
import { projectActivityContracts } from '@/lib/project-activity-contracts';
import { getProjectActivity } from '@/lib/project-activity-provider';
import { isActivityAddress } from '@/lib/project-activity';

export const maxDuration=30;
export async function GET(request:Request,{params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params;
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))return NextResponse.json({error:'Not found'},{status:404});
  try{
    const project=await getProjectBySlug(slug,true);
    if(!project)return NextResponse.json({error:'Not found'},{status:404});
    const scope=new URL(request.url).searchParams.get('scope') ?? 'business';
    if(!['business','token'].includes(scope))return NextResponse.json({error:'Invalid scope'},{status:400});
    const contracts=scope==='business' ? (Object.hasOwn(projectActivityContracts,slug)?projectActivityContracts[slug]:[]) :
      project.tokenAddress && isActivityAddress(project.tokenAddress) ? [{address:project.tokenAddress,label:project.symbol,sourceUrl:project.x}] : [];
    if(contracts.length>3 || contracts.some(c=>!isActivityAddress(c.address)))throw new Error('Invalid contract registry');
    const result=await getProjectActivity(contracts,scope as 'business'|'token');
    return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
  }catch{return NextResponse.json({error:'Activity data unavailable'},{status:503});}
}
