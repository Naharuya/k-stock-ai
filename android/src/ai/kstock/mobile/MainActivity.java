package ai.kstock.mobile;
import android.app.*;
import android.os.*;
import android.content.*;
import android.graphics.Color;
import android.net.Uri;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import java.net.URI;

public class MainActivity extends Activity {
 private WebView web; private String server; private boolean failed;
 @Override public void onCreate(Bundle state){
  super.onCreate(state);
  server=getPreferences(MODE_PRIVATE).getString("server","http://192.168.0.9:3000");
  FrameLayout root=new FrameLayout(this);root.setBackgroundColor(Color.rgb(243,245,241));
  if(Build.VERSION.SDK_INT>=30){getWindow().setDecorFitsSystemWindows(false);root.setOnApplyWindowInsetsListener((v,insets)->{android.graphics.Insets b=insets.getInsets(WindowInsets.Type.systemBars());v.setPadding(b.left,b.top,b.right,b.bottom);return insets;});}
  web=new WebView(this);root.addView(web,new FrameLayout.LayoutParams(-1,-1));setContentView(root);
  WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);
  settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  settings.setUserAgentString(settings.getUserAgentString()+" KStockAndroid/2.6.4");
  web.setBackgroundColor(Color.rgb(243,245,241));
  web.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
    Uri uri=request.getUrl();
    if("kstock".equals(uri.getScheme())){if("settings".equals(uri.getHost()))connectionSettings();else if("notifications".equals(uri.getHost()))notificationSettings();else if("retry".equals(uri.getHost()))openServer();return true;}
    if(!"http".equals(uri.getScheme())&&!"https".equals(uri.getScheme()))return true;
    Uri origin=Uri.parse(server);
    if(origin.getScheme().equals(uri.getScheme())&&origin.getHost().equals(uri.getHost())&&origin.getPort()==uri.getPort())return false;
    try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(ActivityNotFoundException e){}
    return true;
   }
   @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
    if(!ServerAddress.allowsRequest(server,request.getUrl().toString()))return new WebResourceResponse("text/plain","UTF-8",403,"Blocked",java.util.Collections.emptyMap(),new java.io.ByteArrayInputStream(new byte[0]));
    return null;
   }
   @Override public void onReceivedError(WebView view,WebResourceRequest request,WebResourceError error){if(request.isForMainFrame()&&!failed){failed=true;showConnectionError();}}
   @Override public void onReceivedHttpError(WebView view,WebResourceRequest request,WebResourceResponse response){if(request.isForMainFrame()&&response.getStatusCode()>=400&&!failed){failed=true;showConnectionError();}}
  });
  if(!allowedServer(server)){server="";connectionSettings();}else openServer();
 }
 private void notificationSettings(){
  if(Build.VERSION.SDK_INT>=33&&checkSelfPermission("android.permission.POST_NOTIFICATIONS")!=android.content.pm.PackageManager.PERMISSION_GRANTED){requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"},263);return;}
  CookieManager.getInstance().flush();BriefNotificationJob.schedule(this,server);Toast.makeText(this,"분석 알림을 켰습니다. 네트워크·배터리 상태에 따라 도착이 지연될 수 있습니다.",Toast.LENGTH_LONG).show();
 }
 @Override public void onRequestPermissionsResult(int code,String[] permissions,int[] results){super.onRequestPermissionsResult(code,permissions,results);if(code==263&&results.length>0&&results[0]==android.content.pm.PackageManager.PERMISSION_GRANTED)notificationSettings();}
 private boolean allowedServer(String value){try{String normalized=ServerAddress.normalize(value);return normalized.startsWith("https:")||android.security.NetworkSecurityPolicy.getInstance().isCleartextTrafficPermitted(new URI(normalized).getHost());}catch(Exception e){return false;}}
 private void openServer(){if(!allowedServer(server)){connectionSettings();return;}failed=false;web.loadUrl(server+"/?source=android");}
 private void showConnectionError(){
  String html="<!doctype html><meta name='viewport' content='width=device-width,initial-scale=1'><style>body{background:#f3f5f1;color:#193c2b;font:16px sans-serif;padding:55px 28px;line-height:1.8}h1{font-size:27px}a{display:block;background:#23583e;color:white;padding:14px;text-align:center;border-radius:14px;text-decoration:none;margin:12px 0}small{color:#6d7e65}</style><h1>서버에 연결할 수 없어요</h1><p>PC에서 K-Stock AI 서버를 실행하고, 휴대폰과 PC를 같은 Wi-Fi에 연결해 주세요.</p><a href='kstock://retry'>다시 연결</a><a href='kstock://settings'>서버 주소 설정</a><small>서버가 꺼져 있으면 최신 분석을 조회할 수 없습니다.</small>";
  web.loadDataWithBaseURL(null,html,"text/html","UTF-8",null);
 }
 private void connectionSettings(){
  EditText input=new EditText(this);input.setSingleLine(true);input.setText(server);input.setInputType(android.text.InputType.TYPE_CLASS_TEXT|android.text.InputType.TYPE_TEXT_VARIATION_URI);
  AlertDialog dialog=new AlertDialog.Builder(this).setTitle("PC 서버 주소").setMessage("같은 Wi-Fi에서는 앱에 허용된 PC LAN 주소를 입력하세요. 예: http://192.168.0.9:3000\n외부 서버는 HTTPS 고정 도메인을 사용하세요.").setView(input).setNegativeButton("취소",null).setPositiveButton("연결",null).create();
  dialog.setOnShowListener(d->dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{
   String value=input.getText().toString().trim();
   try{
    value=ServerAddress.normalize(value);if(!allowedServer(value))throw new Exception();
    server=value.replaceAll("/+$","");getPreferences(MODE_PRIVATE).edit().putString("server",server).apply();if(getSharedPreferences("notifications",MODE_PRIVATE).getBoolean("enabled",false))BriefNotificationJob.schedule(this,server);dialog.dismiss();openServer();
   }catch(Exception e){input.setError("허용된 PC LAN IP 또는 HTTPS 주소를 입력하세요. localhost는 사용할 수 없으며 LAN IP 변경 시 앱을 다시 빌드해야 합니다.");}
  }));dialog.show();
 }
 @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else super.onBackPressed();}
 @Override public void onDestroy(){if(web!=null){web.stopLoading();web.destroy();}super.onDestroy();}
}
