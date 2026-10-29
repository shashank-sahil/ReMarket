'use client';
import { useEffect, useRef, useState } from 'react';
import { Check, Store, X } from 'lucide-react';

export default function PlanDialog({ pro, enabled, onSelect, onClose }: { pro:boolean; enabled:boolean; onSelect:(limit:1|5)=>Promise<void>; onClose:()=>void }) {
  const ref=useRef<HTMLDialogElement>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{const node=ref.current;node?.showModal();return()=>{if(node?.open)node.close();};},[]);
  async function select(limit:1|5){setBusy(true);setError('');try{await onSelect(limit);onClose();}catch(error){setError(error instanceof Error?error.message:'Could not change plan.');}finally{setBusy(false);}}
  return <dialog ref={ref} className="kgp-action-dialog kgp-plan-dialog" aria-labelledby="plan-title" onCancel={event=>{event.preventDefault();if(!busy)onClose();}}><div className="kgp-action-card"><div className="kgp-action-top"><span className="kgp-action-icon"><Store size={23}/></span><button aria-label="Close plans" disabled={busy} onClick={onClose}><X size={20}/></button></div><span className="kgp-eyebrow">A LITTLE MORE ROOM</span><h2 id="plan-title">Find your fit.</h2><p>Your first store is free. Try Pro when you need space for more.</p><div className="kgp-plan-choices">{([{name:'Free',limit:1,description:'Your own little corner of campus.'},{name:'Pro',limit:5,description:'More stores. More possibilities.'}] as const).map(plan=><div className={`kgp-plan-choice ${plan.limit===5?'pro':''}`} key={plan.name}><div><h3>{plan.name}{plan.limit===5&&<span>DEMO</span>}</h3><strong>{plan.limit} {plan.limit===1?'store':'stores'}</strong></div><p>{plan.description}</p><button disabled={busy || !enabled || (plan.limit===5?pro:!pro)} onClick={()=>select(plan.limit)}>{(plan.limit===5?pro:!pro)?<><Check size={14}/> Current plan</>:plan.limit===5?'Try Pro demo':'Switch to Free'}</button></div>)}</div><p className="kgp-plan-disclaimer">Demo plans only. No payment is taken.{!enabled&&' Pro demo access must be enabled for your test account.'}</p>{error&&<p role="alert" className="kgp-action-error">{error}</p>}</div></dialog>;
}
