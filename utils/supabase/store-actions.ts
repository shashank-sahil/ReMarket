import { createClient } from './client';

export async function runStoreAction(body: object) {
  const { data, error } = await createClient().functions.invoke('store-action', { body });
  if (error) {
    let message = error.message;
    if ('context' in error && error.context instanceof Response) {
      try { const result = await error.context.json(); if (result.error) message = result.error; } catch { /* Keep the original error. */ }
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
