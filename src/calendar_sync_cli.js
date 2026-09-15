import 'dotenv/config';
import {syncOfficialCalendar} from './services/official_calendar_service.js';
const r=await syncOfficialCalendar();console.log(JSON.stringify({source:r.source,year:r.year,closures:r.closures.length,retrievedAt:r.retrievedAt}));
