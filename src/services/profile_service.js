import path from 'node:path';
export function profileId(){const id=process.env.KSTOCK_PROFILE||'local-owner';if(!/^[a-z0-9][a-z0-9_-]{0,39}$/.test(id))throw new Error('INVALID_PROFILE');return id;}
export function dataPath(...parts){const id=profileId();return path.resolve('.data',...(id==='local-owner'?[]:['profiles',id]),...parts);}
