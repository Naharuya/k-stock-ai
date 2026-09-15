import path from 'node:path';
import assert from 'node:assert/strict';
export const normalizeWindowsPath=(value,base)=>path.win32.normalize(path.win32.resolve(base||process.cwd(),value)).toLowerCase();
export function verifyIdentity(data,root,expectedPid){
 const norm=v=>normalizeWindowsPath(v,root),expectedRoot=norm(root);
 assert.equal(norm(data.workspace),expectedRoot,'WORKSPACE_MISMATCH');assert.equal(norm(data.taskCwd),expectedRoot,'TASK_CWD_MISMATCH');
 const [server,supervisor]=data.processes;assert.equal(server.pid,expectedPid,'SERVER_PID_MISMATCH');assert.equal(server.parentPid,supervisor.pid,'PARENT_MISMATCH');
 for(const [proc,file]of [[server,'server.js'],[supervisor,'server_supervisor.js']]){
  assert.equal(norm(proc.cwd),expectedRoot,'PROCESS_CWD_MISMATCH');
  const args=proc.commandLine.match(/"[^"\r\n]*"|[^\s"]+/g)?.map(x=>x.replace(/^"|"$/g,''));
  assert.equal(args?.length,2,'UNEXPECTED_PROCESS_ARGUMENTS');
  assert.equal(norm(args[0]),norm(proc.executable),'EXECUTABLE_MISMATCH');assert.equal(path.win32.basename(norm(proc.executable)),'node.exe');
  assert.equal(normalizeWindowsPath(args[1],proc.cwd),norm(path.win32.join(root,'src',file)),'SCRIPT_PATH_MISMATCH');
 }
 return {serverPid:server.pid,supervisorPid:supervisor.pid,processes:data.processes.map(({pid,created})=>({pid,created})),cwdVerified:true,scriptPathsVerified:true};
}
if(process.argv.includes('--test')){
 const root='C:\\Users\\SJ\\AndroidStudioProjects\\k-stock-ai';
 const fixture={workspace:root.toUpperCase(),taskCwd:root.replaceAll('\\','/'),processes:[{pid:1,parentPid:2,cwd:root,executable:'C:\\node.exe',commandLine:'C:/NODE.EXE src/server.js'},{pid:2,cwd:root.toLowerCase(),executable:'C:/node.exe',commandLine:'C:\\node.exe src\\server_supervisor.js'}]};
 assert.equal(verifyIdentity(fixture,root,1).cwdVerified,true);
 for(const change of [d=>d.processes[0].cwd='C:/other',d=>d.processes[0].commandLine='C:/node.exe C:/other/server.js',d=>d.taskCwd='C:/other',d=>d.processes[0].parentPid=3]){const bad=structuredClone(fixture);change(bad);assert.throws(()=>verifyIdentity(bad,root,1));}
 console.log('Windows path guard PASS: separators, case, absolute/relative paths; wrong cwd/script/task/parent rejected.');
}
