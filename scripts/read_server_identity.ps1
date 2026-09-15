param([int]$ServerPid=13672)
$ErrorActionPreference='Stop'
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class KStockCwdReader {
 [DllImport("kernel32.dll",SetLastError=true)] static extern IntPtr OpenProcess(uint a,bool b,int p);
 [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool ReadProcessMemory(IntPtr h,IntPtr a,byte[] b,int n,out IntPtr read);
 [DllImport("ntdll.dll")] static extern int NtQueryInformationProcess(IntPtr h,int c,byte[] b,int n,out int len);
 static byte[] Read(IntPtr h,long a,int n){var b=new byte[n];IntPtr read;if(!ReadProcessMemory(h,new IntPtr(a),b,n,out read)||read.ToInt64()!=n)throw new Exception("PROCESS_CWD_READ_FAILED");return b;}
 public static string Get(int pid){
  if(IntPtr.Size!=8)throw new Exception("REQUIRES_64_BIT_HOST");
  var h=OpenProcess(0x410,false,pid);if(h==IntPtr.Zero)throw new Exception("PROCESS_READ_DENIED");
  try{var info=new byte[48];int len;if(NtQueryInformationProcess(h,0,info,48,out len)!=0)throw new Exception("PROCESS_QUERY_FAILED");
   long peb=BitConverter.ToInt64(info,8);long parameters=BitConverter.ToInt64(Read(h,peb+0x20,8),0);
   var descriptor=Read(h,parameters+0x38,16);int size=BitConverter.ToUInt16(descriptor,0);long ptr=BitConverter.ToInt64(descriptor,8);
   if(size<2||size>32766)throw new Exception("INVALID_CWD_LENGTH");return Encoding.Unicode.GetString(Read(h,ptr,size));
  }finally{CloseHandle(h);}
 }
}
"@
$server=Get-CimInstance Win32_Process -Filter "ProcessId=$ServerPid"
if(!$server){throw 'SERVER_PID_MISSING'}
$supervisor=Get-CimInstance Win32_Process -Filter "ProcessId=$($server.ParentProcessId)"
if(!$supervisor){throw 'SUPERVISOR_PID_MISSING'}
$items=@(foreach($proc in @($server,$supervisor)){
 [pscustomobject]@{pid=$proc.ProcessId;parentPid=$proc.ParentProcessId;executable=$proc.ExecutablePath;commandLine=$proc.CommandLine;cwd=[KStockCwdReader]::Get($proc.ProcessId);created=$proc.CreationDate.ToUniversalTime().ToString('o')}
})
$task=Get-ScheduledTask -TaskName 'K-Stock AI Research Server'
[pscustomobject]@{processes=$items;taskCwd=$task.Actions[0].WorkingDirectory;workspace=(Get-Location).Path}|ConvertTo-Json -Depth 4
