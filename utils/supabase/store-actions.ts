import { createClient } from './client';

export async function runStoreAction(body: object) {
  const client=createClient();
  const {data:{session}}=await client.auth.getSession();
  if(!session)throw new Error('Your session has ended. Please sign in again.');
  let result=await client.functions.invoke('store-action',{body,headers:{Authorization:`Bearer ${session.access_token}`}});
  if(result.error && 'context' in result.error && result.error.context instanceof Response && result.error.context.status===401){
    const refreshed=await client.auth.refreshSession();
    if(refreshed.data.session)result=await client.functions.invoke('store-action',{body,headers:{Authorization:`Bearer ${refreshed.data.session.access_token}`}});
  }
  const {data,error}=result;
  if (error) {
    let message = error.message;
    if ('context' in error && error.context instanceof Response) {
      try { const result = await error.context.clone().json(); message=result.error||result.message||message; } catch { /* Keep the original error. */ }
      message=`${message} (${error.context.status})`;
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
