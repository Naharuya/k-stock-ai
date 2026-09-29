package ai.kstock.mobile;

import java.net.URI;
import java.util.Locale;

public final class ServerAddress {
 public static final String DEFAULT = "https://kstock.ai.kr";
 public static final String LEGACY_DEFAULT = "http://192.168.0.9:3000";
 private ServerAddress() {}
 public static String normalize(String value) throws Exception { return normalize(value, false); }
 public static String normalize(String value, boolean debug) throws Exception {
  if(value == null) throw new Exception("INVALID_SERVER_ADDRESS");
  URI u = new URI(value.trim());
  String h=u.getHost(), s=u.getScheme();
  if(h==null || s==null || u.getUserInfo()!=null || u.getRawQuery()!=null || u.getRawFragment()!=null ||
    !(u.getPath()==null || u.getPath().isEmpty() || u.getPath().equals("/")) || u.getPort()==0 || u.getPort()>65535)
   throw new Exception("INVALID_SERVER_ADDRESS");
  h=h.toLowerCase(Locale.ROOT);s=s.toLowerCase(Locale.ROOT);
  // A DNS name with an alphabetic TLD excludes IPv4, IPv6, numeric and local aliases.
  boolean dns=h.length()<=253 && h.matches("(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}")
    && !h.endsWith(".localhost") && !h.endsWith(".local") && !h.endsWith(".internal");
  if(!(s.equals("https") && dns) && !(debug && s.equals("http") && privateIpv4(h)))
   throw new Exception("HTTPS_DNS_REQUIRED");
  return s+"://"+h+((u.getPort()==-1 || (s.equals("https")&&u.getPort()==443))?"":":"+u.getPort());
 }
 private static boolean privateIpv4(String h) {
  String[] p=h.split("\\.");if(p.length!=4)return false;int[] n=new int[4];
  for(int i=0;i<4;i++){if(!p[i].matches("0|[1-9][0-9]{0,2}"))return false;n[i]=Integer.parseInt(p[i]);if(n[i]>255)return false;}
  return n[0]==10 || (n[0]==172 && n[1]>=16 && n[1]<=31) || (n[0]==192 && n[1]==168);
 }
 public static boolean sameOrigin(String base, String target) {
  try {URI a=new URI(base),b=new URI(target);return b.getUserInfo()==null &&
    a.getScheme().equalsIgnoreCase(b.getScheme()) && a.getHost().equalsIgnoreCase(b.getHost()) && port(a)==port(b);}
  catch(Exception e){return false;}
 }
 private static int port(URI u){return u.getPort()==-1?("https".equals(u.getScheme())?443:80):u.getPort();}
 public static String migrate(String saved, boolean explicitCustom) {
  if(saved==null || saved.trim().isEmpty())return DEFAULT;
  if(!explicitCustom && saved.trim().replaceAll("/+$", "").equals(LEGACY_DEFAULT))return DEFAULT;
  return saved; // Preserve non-default/custom values, including invalid ones, for user review.
 }
}
