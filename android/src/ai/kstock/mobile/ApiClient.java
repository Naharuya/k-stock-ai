package ai.kstock.mobile;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import javax.net.ssl.SSLException;

/** No logging, no redirects, no token exposure to web content, and no order routes. */
public final class ApiClient {
 public enum State { CONNECTED, AUTH_REQUIRED, FORBIDDEN, SERVER_ERROR, TIMEOUT, OFFLINE, TLS_ERROR, FAILED, BLOCKED }
 public interface Tokens { String read(String origin) throws Exception; }
 public interface Transport { Reply send(String url,String method,Map<String,String> headers,byte[] body) throws Exception; }
 public static final class Reply {
  public final int code; public final byte[] bytes; public final String type; public final State state; public final Map<String,String> headers;
  public Reply(int code, byte[] bytes, String type){this(code,bytes,type,status(code));}
  public Reply(int code, byte[] bytes, String type,State state){this(code,bytes,type,state,Collections.emptyMap());}
  public Reply(int code, byte[] bytes, String type,State state,Map<String,String> headers){this.code=code;this.bytes=bytes;this.type=type;this.state=state;this.headers=headers;}
  public String text(){return new String(bytes,StandardCharsets.UTF_8);}
 }
 private final String origin; private final Tokens tokens; private final Transport transport;
 public ApiClient(String origin,Tokens tokens,Transport transport) throws Exception {
  this(origin,tokens,transport,false);
 }
 public ApiClient(String origin,Tokens tokens,Transport transport,boolean debug) throws Exception {
  this.origin=ServerAddress.normalize(origin,debug);this.tokens=tokens;this.transport=transport;
 }
 public Reply request(String path,String method,String body) {
  String token="";
  try {
   URI uri=new URI(path);
   if(!path.startsWith("/") || path.startsWith("//") || uri.isAbsolute() || uri.getRawFragment()!=null ||
     path.contains("\\") || !uri.normalize().equals(uri))return failure(State.BLOCKED,400);
   String route=uri.getPath();
   if(route==null || route.contains("..") || route.contains("\\") || route.contains("%"))return failure(State.BLOCKED,400);
   boolean api=route.equals("/api")||route.startsWith("/api/");
   if(route.matches("(?i).*/(?:orders?|trades?|trading|broker|kis)(?:/.*)?"))return failure(State.BLOCKED,403);
   if(!Arrays.asList("GET","POST","PUT","PATCH","DELETE","HEAD").contains(method))return failure(State.BLOCKED,405);
   if(!api && !method.equals("GET") && !method.equals("HEAD"))return failure(State.BLOCKED,405);
   Map<String,String> headers=new HashMap<>();headers.put("Accept","application/json, text/html;q=0.9, */*;q=0.8");
   if(api){
    try{token=tokens.read(origin);}catch(Exception ignored){return failure(State.AUTH_REQUIRED,401);}
    if(token==null||token.isEmpty())return failure(State.AUTH_REQUIRED,401);
    if(!validToken(token))return failure(State.AUTH_REQUIRED,401);
    headers.put("Authorization","Bearer "+token);
   }
   if(body!=null)headers.put("Content-Type","application/json; charset=utf-8");
   Reply r=transport.send(origin+path,method,Collections.unmodifiableMap(headers),body==null?null:body.getBytes(StandardCharsets.UTF_8));
   // Never render a credential reflected by an upstream error page.
   if(!token.isEmpty() && (r.type.contains("json")||r.type.contains("text")))
    return new Reply(r.code,r.text().replace(token,"[REDACTED]").getBytes(StandardCharsets.UTF_8),r.type,r.state,r.headers);
   return r;
  } catch(SocketTimeoutException e){return failure(State.TIMEOUT,504);}
    catch(UnknownHostException | NoRouteToHostException e){return failure(State.OFFLINE,503);}
    catch(SSLException e){return failure(State.TLS_ERROR,502);}
    catch(Exception e){return failure(State.FAILED,502);}
 }
 public static boolean validToken(String token){return token!=null && token.length()>=1 && token.length()<=4096 && token.matches("[A-Za-z0-9._~+/=-]+") ;}
 public static State status(int code){if(code>=200&&code<300)return State.CONNECTED;if(code==401)return State.AUTH_REQUIRED;if(code==403)return State.FORBIDDEN;if(code>=500)return State.SERVER_ERROR;return State.FAILED;}
 public static Reply failure(State state,int code){return new Reply(code,("{\"error\":\""+state.name()+"\"}").getBytes(StandardCharsets.UTF_8),"application/json",state);}
 public static String message(State state){switch(state){
  case CONNECTED:return "서버 연결됨"; case AUTH_REQUIRED:return "인증이 필요합니다. 외부접속 토큰을 설정해 주세요.";
  case FORBIDDEN:return "접근 권한이 없습니다 (403).";case SERVER_ERROR:return "서버 오류가 발생했습니다.";
  case TIMEOUT:return "서버 응답 시간이 초과됐습니다. 인터넷과 서버 연결을 확인해 주세요.";
  case OFFLINE:return "인터넷 연결과 서버 주소를 확인해 주세요.";case TLS_ERROR:return "서버 인증서를 확인할 수 없습니다.";
  case BLOCKED:return "허용되지 않는 요청입니다.";default:return "서버 연결 실패";
 }}
 public static final class Network implements Transport {
  public Reply send(String url,String method,Map<String,String> headers,byte[] body) throws Exception {
   HttpURLConnection c=(HttpURLConnection)new URL(url).openConnection();
   try {
    c.setInstanceFollowRedirects(false);c.setConnectTimeout(10000);c.setReadTimeout(15000);c.setUseCaches(false);c.setRequestMethod(method);
    for(Map.Entry<String,String> h:headers.entrySet())c.setRequestProperty(h.getKey(),h.getValue());
    if(body!=null){if(body.length>262144)throw new IOException("BODY_TOO_LARGE");c.setDoOutput(true);try(OutputStream out=c.getOutputStream()){out.write(body);}}
    int status=c.getResponseCode();String type=c.getContentType();if(type==null)type="application/octet-stream";
    // Redirects are not followed, so credentials never travel to a different origin.
    if(status>=300&&status<400)return failure(State.BLOCKED,502);
    ByteArrayOutputStream out=new ByteArrayOutputStream();InputStream stream=status>=400?c.getErrorStream():c.getInputStream();
    if(stream!=null)try(InputStream in=stream){byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1){out.write(b,0,n);if(out.size()>8388608)throw new IOException("RESPONSE_TOO_LARGE");}}
    Map<String,String> safeHeaders=new HashMap<>();
    for(String name:Arrays.asList("Content-Security-Policy","X-Frame-Options","X-Content-Type-Options","Referrer-Policy")){String value=c.getHeaderField(name);if(value!=null)safeHeaders.put(name,value);}
    return new Reply(status,out.toByteArray(),type,status(status),safeHeaders);
   } finally {c.disconnect();}
  }
 }
}
