package ai.kstock.mobile;
import android.content.Context;
import java.io.File;
import java.nio.file.Files;
import org.json.JSONObject;

/** Explicit operator-only one-shot import for the existing device validation build. */
public final class DeviceCredentialImport {
 private DeviceCredentialImport() {}
 public static void consume(Context context,TokenVault vault) throws Exception {
  File file=new File(context.getExternalFilesDir(null),"kstock-auth-import.json");
  if(!file.isFile()||file.length()>8192)throw new Exception("IMPORT_UNAVAILABLE");
  byte[] bytes=Files.readAllBytes(file.toPath());
  if(!file.delete())throw new Exception("IMPORT_CLEANUP_FAILED");
  JSONObject input=new JSONObject(new String(bytes,java.nio.charset.StandardCharsets.UTF_8));
  if(!"https://kstock.ai.kr".equals(input.optString("origin"))||Math.abs(System.currentTimeMillis()/1000.0-input.optDouble("issuedAt",0))>=300)throw new Exception("IMPORT_EXPIRED_OR_ORIGIN_MISMATCH");
  vault.save("https://kstock.ai.kr",input.getString("token"));
 }
}
