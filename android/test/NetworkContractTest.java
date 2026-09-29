import ai.kstock.mobile.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

public class NetworkContractTest {
 static int assertions;
 static void check(boolean value,String label){assertions++;if(!value)throw new AssertionError(label);}
 static ApiClient.Reply ok(){return new ApiClient.Reply(200,"{}".getBytes(StandardCharsets.UTF_8),"application/json");}
 public static void main(String[] args)throws Exception{
  check(ServerAddress.DEFAULT.equals("https://kstock.ai.kr"),"default URL");
  for(String url:Arrays.asList("http://kstock.ai.kr","http://192.168.0.9:3000","https://192.168.0.9","https://10.1.2.3","https://[::1]","https://127.0.0.1","https://localhost","https://test.local","https://2130706433","https://user:secret@example.com","https://good.example/path","https://good.example?token=x","https://good.example#x","https://good.example:0")){
   boolean rejected=false;try{ServerAddress.normalize(url);}catch(Exception e){rejected=true;}check(rejected,"release rejects unsafe URL");
  }
  check(ServerAddress.normalize("https://KSTOCK.ai.kr:443/").equals(ServerAddress.DEFAULT),"canonical origin");
  check(ServerAddress.normalize("http://192.168.0.9:3000",true).startsWith("http:"),"explicit debug-only LAN override");
  check(ServerAddress.migrate(null,false).equals(ServerAddress.DEFAULT),"fresh install");
  check(ServerAddress.migrate(ServerAddress.LEGACY_DEFAULT,false).equals(ServerAddress.DEFAULT),"legacy default migration");
  check(ServerAddress.migrate(ServerAddress.LEGACY_DEFAULT,true).equals(ServerAddress.LEGACY_DEFAULT),"explicit custom default-like value retained");
  check(ServerAddress.migrate("http://192.168.1.8:3000",false).equals("http://192.168.1.8:3000"),"unknown custom LAN retained for review");
  check(ServerAddress.migrate("https://custom.example",true).equals("https://custom.example"),"custom DNS preserved");
  String token=UUID.randomUUID().toString();AtomicInteger calls=new AtomicInteger(),tokenReads=new AtomicInteger();
  ApiClient.Transport wire=(url,method,headers,body)->{
   calls.incrementAndGet();check(url.startsWith(ServerAddress.DEFAULT+"/"),"origin fixed");
   if(url.endsWith("/health"))check(!headers.containsKey("Authorization"),"health unauthenticated");
   else check(headers.get("Authorization").equals("Bearer "+token),"API bearer");
   return ok();
  };
  ApiClient client=new ApiClient(ServerAddress.DEFAULT,origin->{tokenReads.incrementAndGet();check(origin.equals(ServerAddress.DEFAULT),"origin-bound token");return token;},wire);
  client.request("/health","GET",null);check(tokenReads.get()==0,"health never reads token");
  for(String method:Arrays.asList("GET","POST","PUT","PATCH","DELETE","HEAD"))check(client.request("/api/analyze",method,method.equals("GET")||method.equals("HEAD")?null:"{}").state==ApiClient.State.CONNECTED,"API method authenticated");
  int before=calls.get();ApiClient empty=new ApiClient(ServerAddress.DEFAULT,o->"",wire);
  check(empty.request("/api/analyze","POST","{}").state==ApiClient.State.AUTH_REQUIRED,"missing token state");check(calls.get()==before,"missing token blocks transport");
  for(String route:Arrays.asList("https://evil.example/api/analyze","//evil.example/api/a","/api/../health","/api/%2e%2e/health","/api/kis/orders","/api/order","/api/broker/place"))check(client.request(route,"GET",null).state==ApiClient.State.BLOCKED,"unsafe target blocked");
  check(calls.get()==before,"blocked paths no network");
  for(int code:new int[]{401,403,500}){
   ApiClient c=new ApiClient(ServerAddress.DEFAULT,o->token,(u,m,h,b)->new ApiClient.Reply(code,new byte[0],"application/json"));
   check(c.request("/api/read","GET",null).state==(code==401?ApiClient.State.AUTH_REQUIRED:code==403?ApiClient.State.FORBIDDEN:ApiClient.State.SERVER_ERROR),"HTTP state mapped");
  }
  ApiClient timeout=new ApiClient(ServerAddress.DEFAULT,o->token,(u,m,h,b)->{throw new SocketTimeoutException();});
  check(timeout.request("/health","GET",null).state==ApiClient.State.TIMEOUT,"timeout mapped");
  ApiClient offline=new ApiClient(ServerAddress.DEFAULT,o->token,(u,m,h,b)->{throw new UnknownHostException();});
  check(offline.request("/health","GET",null).state==ApiClient.State.OFFLINE,"offline mapped");
  ApiClient echo=new ApiClient(ServerAddress.DEFAULT,o->token,(u,m,h,b)->new ApiClient.Reply(500,("reflected "+token).getBytes(StandardCharsets.UTF_8),"text/plain"));
  check(!echo.request("/api/read","GET",null).text().contains(token),"reflected token redacted");
  ApiClient invalid=new ApiClient(ServerAddress.DEFAULT,o->"bad\r\nheader",wire);
  check(invalid.request("/api/read","GET",null).state==ApiClient.State.AUTH_REQUIRED,"header injection blocked");
  // Test the real transport on a loopback fixture, without production APIs or credentials.
  com.sun.net.httpserver.HttpServer server=com.sun.net.httpserver.HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
  AtomicInteger destination=new AtomicInteger();
  server.createContext("/redirect",e->{e.getResponseHeaders().add("Location","/destination");e.sendResponseHeaders(302,-1);e.close();});
  server.createContext("/destination",e->{destination.incrementAndGet();e.sendResponseHeaders(200,-1);e.close();});
  server.start();try{
   ApiClient.Reply redirect=new ApiClient.Network().send("http://127.0.0.1:"+server.getAddress().getPort()+"/redirect","GET",Collections.singletonMap("Authorization","Bearer "+token),null);
   check(redirect.state==ApiClient.State.BLOCKED,"redirect denied");check(destination.get()==0,"redirect never followed");
  }finally{server.stop(0);}
  System.out.println("Android network contract: "+assertions+" assertions passed");
 }
}
