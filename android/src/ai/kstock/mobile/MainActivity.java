package ai.kstock.mobile;

import android.app.*;
import android.os.*;
import android.content.*;
import android.graphics.Color;
import android.net.*;
import android.text.InputType;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import java.io.*;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.json.JSONObject;

public class MainActivity extends Activity {
 private WebView web;
 private TextView status;
 private Button sample;
 private volatile String server;
 private volatile ApiClient client;
 private TokenVault vault;
 private final ExecutorService workers=Executors.newFixedThreadPool(2);
 private final AtomicInteger queued=new AtomicInteger();
 private volatile int generation;
 private boolean healthConnected;
 private byte[] bridgeScript;
 @Override public void onCreate(Bundle state){
  super.onCreate(state);vault=new TokenVault(this);
  SharedPreferences prefs=getPreferences(MODE_PRIVATE);
  String saved=prefs.getString("server",null);
  server=ServerAddress.migrate(saved,prefs.getBoolean("server_explicit_custom",false));
  if(!server.equals(saved)){SharedPreferences.Editor edit=prefs.edit().putString("server",server).putInt("server_migration",1);if(saved!=null)edit.putString("legacy_server_preserved",saved);edit.apply();}
  // Notification preferences are distinct in the legacy app; migrate them without deleting history.
  SharedPreferences notifications=getSharedPreferences("notifications",MODE_PRIVATE);
  String old=notifications.getString("server",null);
  String migrated=ServerAddress.migrate(old,prefs.getBoolean("server_explicit_custom",false));
  if(old!=null&&!old.equals(migrated))notifications.edit().putString("server",migrated).apply();
  try(InputStream in=getAssets().open("native-fetch.js")){ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] b=new byte[4096];int n;while((n=in.read(b))!=-1)out.write(b,0,n);bridgeScript=out.toByteArray();}catch(Exception ignored){bridgeScript=new byte[0];}
  LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(16,12,16,8);root.setBackgroundColor(Color.rgb(243,245,241));
  if(Build.VERSION.SDK_INT>=30){getWindow().setDecorFitsSystemWindows(false);root.setOnApplyWindowInsetsListener((v,insets)->{android.graphics.Insets b=insets.getInsets(WindowInsets.Type.systemBars());v.setPadding(b.left+16,b.top+12,b.right+16,b.bottom+8);return insets;});}
  status=new TextView(this);status.setTextSize(15);status.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);root.addView(status);
  LinearLayout buttons=new LinearLayout(this);root.addView(buttons);
  button(buttons,"연결 설정",()->connectionSettings());button(buttons,"다시 연결",()->openServer());
  sample=button(root,"샘플 분석 확인 (실제 종목 아님)",()->sampleAnalysis());sample.setVisibility(View.GONE);
  web=new WebView(this);root.addView(web,new LinearLayout.LayoutParams(-1,0,1));setContentView(root);
  WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);
  settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  settings.setSaveFormData(false);settings.setSupportMultipleWindows(false);settings.setUserAgentString(settings.getUserAgentString()+" KStockAndroid/2.6.5");
  CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
  web.addJavascriptInterface(new NativeRequests(),"KStockNative");
  web.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
    Uri uri=request.getUrl();
    if("kstock".equals(uri.getScheme())){if("settings".equals(uri.getHost()))connectionSettings();else if("notifications".equals(uri.getHost()))notificationSettings();else if("retry".equals(uri.getHost()))openServer();return true;}
    if(!request.isForMainFrame())return !ServerAddress.sameOrigin(server,uri.toString());
    if(ServerAddress.sameOrigin(server,uri.toString()))return false;
    if("https".equals(uri.getScheme()))try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(ActivityNotFoundException ignored){}
    return true;
   }
   @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
    String address=request.getUrl().toString();ApiClient current=client;
    if(current==null || !ServerAddress.sameOrigin(server,address))return response(ApiClient.failure(ApiClient.State.BLOCKED,403));
    Uri uri=request.getUrl();String path=uri.getEncodedPath();if(uri.getEncodedQuery()!=null)path+="?"+uri.getEncodedQuery();
    if(path.equals("/__kstock_android_bridge__.js"))return new WebResourceResponse("text/javascript","UTF-8",new ByteArrayInputStream(bridgeScript));
    // WebView does not expose POST bodies here. Only the scoped native fetch bridge sends them.
    if(!request.getMethod().equals("GET")&&!request.getMethod().equals("HEAD"))return response(ApiClient.failure(ApiClient.State.BLOCKED,405));
    ApiClient.Reply reply=current.request(path,request.getMethod(),null);
    if(path.startsWith("/api/")&&reply.state!=ApiClient.State.CONNECTED)runOnUiThread(()->showState(reply.state));
    if(request.isForMainFrame() && reply.type.contains("text/html"))return htmlResponse(reply);
    return response(reply);
   }
   @Override public void onReceivedError(WebView view,WebResourceRequest request,WebResourceError error){if(request.isForMainFrame())showState(ApiClient.State.FAILED);}
   @Override public void onReceivedHttpError(WebView view,WebResourceRequest request,WebResourceResponse reply){if(request.isForMainFrame())showState(ApiClient.status(reply.getStatusCode()));}
  });
  openServer();
 }
 private Button button(LinearLayout parent,String text,Runnable action){Button b=new Button(this);b.setText(text);b.setOnClickListener(v->action.run());parent.addView(b);return b;}
 private WebResourceResponse response(ApiClient.Reply r){Map<String,String> headers=new HashMap<>(r.headers);headers.put("Cache-Control","no-store");return new WebResourceResponse(r.type.split(";")[0],"UTF-8",r.code,"Response",headers,new ByteArrayInputStream(r.bytes));}
 private WebResourceResponse htmlResponse(ApiClient.Reply r){return response(new ApiClient.Reply(r.code,injectedHtml(r.text()).getBytes(StandardCharsets.UTF_8),"text/html",r.state,r.headers));}
 private String injectedHtml(String html){String script="<script src='/__kstock_android_bridge__.js'></script>";int p=html.toLowerCase(Locale.ROOT).indexOf("<head");if(p>=0){int end=html.indexOf('>',p);if(end>=0)return html.substring(0,end+1)+script+html.substring(end+1);}return script+html;}
 private void showState(ApiClient.State state){
  if(isFinishing()||isDestroyed())return;
  status.setText((healthConnected&&state==ApiClient.State.AUTH_REQUIRED?"서버는 연결되었지만 ":"")+ApiClient.message(state));
 }
 private boolean online(){ConnectivityManager cm=getSystemService(ConnectivityManager.class);NetworkCapabilities c=cm.getNetworkCapabilities(cm.getActiveNetwork());return c!=null&&c.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);}
 private void openServer(){
  final int epoch=++generation;web.stopLoading();healthConnected=false;sample.setEnabled(true);sample.setVisibility(View.GONE);
  try {server=ServerAddress.normalize(server);client=new ApiClient(server,vault,new ApiClient.Network());}
  catch(Exception ignored){client=null;status.setText("기존 사용자 지정 주소를 보존했습니다. HTTPS 도메인으로 변경해야 연결할 수 있습니다.");connectionSettings();return;}
  status.setText("연결 확인 중 · "+server);
  if(!online()){showState(ApiClient.State.OFFLINE);return;}
  final ApiClient current=client;
  workers.execute(()->{
   ApiClient.Reply health=current.request("/health","GET",null);
   boolean healthy=false,mock=false,safe=false;
   if(health.state==ApiClient.State.CONNECTED)try{JSONObject data=new JSONObject(health.text());healthy=data.optBoolean("ok");mock="mock".equals(data.optString("mode"));safe=data.has("brokerEnabled")&&data.has("liveTrading")&&!data.getBoolean("brokerEnabled")&&!data.getBoolean("liveTrading");}catch(Exception ignored){}
   final boolean connected=healthy,allowsSample=mock&&safe;
   boolean tokenPresent=false;try{tokenPresent=!vault.read(server).isEmpty();}catch(Exception ignored){}
   final boolean authenticated=tokenPresent;
   ApiClient.Reply page=connected?current.request("/","GET",null):null;
   runOnUiThread(()->{
    if(epoch!=generation||isDestroyed())return;healthConnected=connected;
    if(!connected){showState(health.state==ApiClient.State.CONNECTED?ApiClient.State.FAILED:health.state);return;}
    status.setText(authenticated?"서버 연결됨 · API 인증은 요청 시 확인합니다.":"서버는 연결되었지만 인증이 필요합니다. 외부접속 토큰을 설정해 주세요.");
    sample.setVisibility(allowsSample?View.VISIBLE:View.GONE);
    if(page.type.contains("text/html")&&page.state==ApiClient.State.CONNECTED)web.loadUrl(server+"/?source=android");
    else web.loadDataWithBaseURL(null,"<html lang='ko'><meta name='viewport' content='width=device-width,initial-scale=1'><body style='font:17px sans-serif;padding:20px'><h2>K-Stock AI</h2><p>운영 API 서버에 연결했습니다.</p><p>현재 서버는 기존 앱의 웹 화면을 제공하지 않습니다. 연결 설정에서 외부접속 토큰을 저장할 수 있습니다.</p><p>샘플 분석은 연결 검증용 가상 데이터입니다. 실제 종목 조회·분석 화면은 서버의 해당 기능 제공 후 사용할 수 있습니다.</p><p>브로커·실거래는 비활성 상태로 유지됩니다.</p></body></html>","text/html","UTF-8",null);
   });
  });
 }
 private void notificationSettings(){
  try{ServerAddress.normalize(server);if(vault.read(server).isEmpty()){showState(ApiClient.State.AUTH_REQUIRED);connectionSettings();return;}}catch(Exception ignored){connectionSettings();return;}
  if(Build.VERSION.SDK_INT>=33&&checkSelfPermission("android.permission.POST_NOTIFICATIONS")!=android.content.pm.PackageManager.PERMISSION_GRANTED){requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"},263);return;}
  BriefNotificationJob.schedule(this,server);
  Toast.makeText(this,"서버가 분석 알림 기능을 제공하는 경우 알림을 받을 수 있습니다.",Toast.LENGTH_LONG).show();
 }
 @Override public void onRequestPermissionsResult(int code,String[] permissions,int[] results){super.onRequestPermissionsResult(code,permissions,results);if(code==263&&results.length>0&&results[0]==android.content.pm.PackageManager.PERMISSION_GRANTED)notificationSettings();}
 private void sampleAnalysis(){
  final ApiClient current=client;if(current==null)return;sample.setEnabled(false);status.setText("샘플 API 인증 확인 중");final int epoch=generation;
  workers.execute(()->{ApiClient.Reply reply=current.request("/api/test-analysis","POST","{}");runOnUiThread(()->{
   if(epoch!=generation||isDestroyed())return;sample.setEnabled(true);showState(reply.state);
   if(reply.state==ApiClient.State.CONNECTED){status.setText("서버 연결됨 · API 인증 확인 완료");TextView content=new TextView(this);content.setPadding(24,16,24,16);content.setText("가상 샘플 데이터 결과이며 실제 투자 판단용이 아닙니다.\n\n"+reply.text());ScrollView scroll=new ScrollView(this);scroll.addView(content);new AlertDialog.Builder(this).setTitle("샘플 분석 결과").setView(scroll).setPositiveButton("닫기",null).show();}
  });});
 }
 private void connectionSettings(){
  LinearLayout form=new LinearLayout(this);form.setOrientation(LinearLayout.VERTICAL);form.setPadding(32,8,32,8);
  EditText address=new EditText(this);address.setSingleLine(true);address.setText(server);address.setHint("HTTPS 서버 주소");address.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_URI);form.addView(address);
  EditText secret=new EditText(this);secret.setSingleLine(true);secret.setHint("외부접속 토큰 (비워두면 해당 서버의 저장값 유지)");secret.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD);secret.setSaveEnabled(false);secret.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO);form.addView(secret);
  Button useDefault=new Button(this);useDefault.setText("운영 기본 주소 사용");useDefault.setOnClickListener(v->address.setText(ServerAddress.DEFAULT));form.addView(useDefault);
  AlertDialog dialog=new AlertDialog.Builder(this).setTitle("외부접속 설정").setMessage("기본 서버: https://kstock.ai.kr\n토큰은 기기에 암호화 저장하며, 서버 주소별로 구분합니다. 기존 사용자 지정 주소는 직접 변경하기 전까지 보존합니다.").setView(form).setNegativeButton("취소",null).setPositiveButton("저장 후 연결",null).create();
  dialog.setOnDismissListener(d->secret.setText(""));
  dialog.setOnShowListener(d->{dialog.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{
   String next;try{next=ServerAddress.normalize(address.getText().toString());}catch(Exception ignored){address.setError("HTTPS 도메인 주소를 입력하세요. HTTP·IP 주소는 사용할 수 없습니다.");return;}
   String token=secret.getText().toString();try{if(!token.isEmpty())vault.save(next,token);}catch(Exception ignored){secret.setError("토큰을 안전하게 저장하지 못했습니다. 입력값과 기기 보안을 확인해 주세요.");return;}
   server=next;getPreferences(MODE_PRIVATE).edit().putString("server",server).putBoolean("server_explicit_custom",!ServerAddress.DEFAULT.equals(server)).apply();
   if(getSharedPreferences("notifications",MODE_PRIVATE).getBoolean("enabled",false))BriefNotificationJob.schedule(this,server);
   dialog.dismiss();openServer();
  });});dialog.show();
 }
 private final class NativeRequests {
  @JavascriptInterface public void request(int id,String path,String method,String body){
   final ApiClient current=client;final int epoch=generation;
   if(current==null||id<1||path==null||method==null||path.length()>4096||(body!=null&&body.length()>262144))return;
   if(!(path.startsWith("/api/")||path.equals("/api")))return;
   if(queued.incrementAndGet()>16){queued.decrementAndGet();return;}
   try {workers.execute(()->{try{
    ApiClient.Reply r=current.request(path,method,body);
    JSONObject value=new JSONObject();value.put("code",r.code);value.put("type",r.type);value.put("body",r.text());
    String encoded=android.util.Base64.encodeToString(value.toString().getBytes(StandardCharsets.UTF_8),android.util.Base64.NO_WRAP);
    runOnUiThread(()->{if(epoch!=generation||isDestroyed())return;if(r.state!=ApiClient.State.CONNECTED)showState(r.state);web.evaluateJavascript("window.__kstockReply&&window.__kstockReply("+id+",'"+encoded+"')",null);});
   }catch(Exception ignored){}finally{queued.decrementAndGet();}});}catch(RejectedExecutionException ignored){queued.decrementAndGet();}
  }
 }
 @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else super.onBackPressed();}
 @Override public void onDestroy(){generation++;workers.shutdownNow();if(web!=null){web.removeJavascriptInterface("KStockNative");web.stopLoading();web.destroy();}super.onDestroy();}
}
