package ai.kstock.mobile;
import android.app.*;
import android.app.job.*;
import android.content.*;
import android.os.*;
import org.json.JSONObject;
import java.io.*;
import java.net.*;
import java.util.concurrent.atomic.AtomicBoolean;
public class BriefNotificationJob extends JobService {
 private AtomicBoolean cancelled=new AtomicBoolean(false);
 public static void schedule(Context context,String server){
  context.getSharedPreferences("notifications",MODE_PRIVATE).edit().putString("server",server).putBoolean("enabled",true).apply();
  NotificationManager manager=context.getSystemService(NotificationManager.class);
  manager.createNotificationChannel(new NotificationChannel("morning","일일 분석 결과",NotificationManager.IMPORTANCE_DEFAULT));
  JobInfo job=new JobInfo.Builder(263,new ComponentName(context,BriefNotificationJob.class)).setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setPeriodic(15*60*1000L).setPersisted(true).build();
  context.getSystemService(JobScheduler.class).schedule(job);
 }
 @Override public boolean onStartJob(JobParameters params){
  final String server=getSharedPreferences("notifications",MODE_PRIVATE).getString("server","");
  try{ServerAddress.normalize(server);}catch(Exception ignored){return false;}
  if(!getSharedPreferences("notifications",MODE_PRIVATE).getBoolean("enabled",false))return false;
  final TokenVault vault=new TokenVault(this);
  final AtomicBoolean stop=new AtomicBoolean(false);cancelled=stop;
  new Thread(()->{
   try{
    ApiClient client=new ApiClient(server,vault,new ApiClient.Network());
    ApiClient.Reply reply=client.request("/api/operations/health","GET",null);
    if(reply.code!=200||stop.get())return;
    JSONObject result=new JSONObject(reply.text()).optJSONObject("result");JSONObject event=result==null?null:result.optJSONObject("notification");if(event==null||stop.get())return;
    String id=server+"|"+event.optString("at"),status=event.optString("status");
    if(id.equals(getSharedPreferences("notifications",MODE_PRIVATE).getString("seen","")))return;
    if(!status.equals("SUCCESS")&&!status.equals("PARTIAL")&&!status.equals("FAILED"))return;
    NotificationManager manager=getSystemService(NotificationManager.class);if(!manager.areNotificationsEnabled())return;
    manager.createNotificationChannel(new NotificationChannel("morning","일일 분석 결과",NotificationManager.IMPORTANCE_DEFAULT));
    PendingIntent open=PendingIntent.getActivity(this,0,new Intent(this,MainActivity.class),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
    String text=status.equals("SUCCESS")?"일일 분석이 완료됐습니다.":status.equals("PARTIAL")?"일일 분석 중 확인이 필요한 자료가 있습니다.":"일일 분석에 실패했습니다. 앱에서 상태를 확인해 주세요.";
    Notification notification=new Notification.Builder(this,"morning").setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle("K-Stock AI").setContentText(text).setContentIntent(open).setAutoCancel(true).setVisibility(Notification.VISIBILITY_PRIVATE).build();
    if(!stop.get()){manager.notify(263,notification);getSharedPreferences("notifications",MODE_PRIVATE).edit().putString("seen",id).apply();}
   }catch(Exception ignored){}finally{if(!stop.get())jobFinished(params,false);}
  },"KStockBriefNotification").start();
  return true;
 }
 @Override public boolean onStopJob(JobParameters params){cancelled.set(true);return true;}
}
