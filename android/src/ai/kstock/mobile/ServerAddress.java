package ai.kstock.mobile;
import java.net.URI;
import java.net.InetAddress;
import java.util.Locale;
public final class ServerAddress {
 private ServerAddress(){}
 public static String normalize(String value) throws Exception {
  URI uri=new URI(value.trim());String host=uri.getHost(),scheme=uri.getScheme();
  if(host==null||scheme==null||uri.getUserInfo()!=null||uri.getRawQuery()!=null||uri.getRawFragment()!=null||
     !(uri.getPath()==null||uri.getPath().isEmpty()||uri.getPath().equals("/"))||uri.getPort()==0||uri.getPort()>65535)throw new Exception("INVALID_SERVER_ADDRESS");
  host=host.toLowerCase(Locale.ROOT);scheme=scheme.toLowerCase(Locale.ROOT);
  String plain=host.replaceAll("\\.$","");
  if(plain.equals("localhost")||plain.endsWith(".localhost")||plain.startsWith("127.")||plain.equals("0.0.0.0"))throw new Exception("LOOPBACK_NOT_ALLOWED");
  if(host.contains(":")){InetAddress ip=InetAddress.getByName(host);if(ip.isLoopbackAddress()||ip.isAnyLocalAddress())throw new Exception("LOOPBACK_NOT_ALLOWED");}
  int[] octets=ipv4(host);
  if(host.matches("[0-9.]+")&&octets==null)throw new Exception("INVALID_IPV4");
  boolean lan=octets!=null&&(octets[0]==10||(octets[0]==172&&octets[1]>=16&&octets[1]<=31)||(octets[0]==192&&octets[1]==168));
  if(!scheme.equals("https")&&!(scheme.equals("http")&&lan))throw new Exception("HTTPS_OR_LAN_REQUIRED");
  return scheme+"://"+host+(uri.getPort()==-1?"":":"+uri.getPort());
 }
 private static int[] ipv4(String host){
  String[] parts=host.split("\\.",-1);if(parts.length!=4)return null;int[] values=new int[4];
  for(int i=0;i<4;i++){if(!parts[i].matches("0|[1-9][0-9]{0,2}"))return null;values[i]=Integer.parseInt(parts[i]);if(values[i]>255)return null;}return values;
 }
 public static boolean isAllowed(String value){try{normalize(value);return true;}catch(Exception e){return false;}}
 public static boolean allowsRequest(String server,String target){
  try{
   URI request=new URI(target),origin=new URI(server);
   String scheme=request.getScheme();if(!"http".equals(scheme)&&!"https".equals(scheme))return true;
   normalize(new URI(scheme,null,request.getHost(),request.getPort(),null,null,null).toString());
   return "https".equals(scheme)||(origin.getScheme().equals(scheme)&&origin.getHost().equals(request.getHost())&&origin.getPort()==request.getPort());
  }catch(Exception e){return false;}
 }
}
