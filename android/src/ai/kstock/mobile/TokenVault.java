package ai.kstock.mobile;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.security.KeyStore;
import java.nio.charset.StandardCharsets;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;

/** Only ciphertext is stored in preferences. The key never leaves Android Keystore. */
public final class TokenVault implements ApiClient.Tokens {
 private static final String ALIAS="kstock.external.access.aes.v1";
 private final SharedPreferences prefs;
 public TokenVault(Context context){prefs=context.getSharedPreferences("external_access_encrypted",Context.MODE_PRIVATE);}
 private javax.crypto.SecretKey key() throws Exception {
  KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);
  if(store.containsAlias(ALIAS))return (javax.crypto.SecretKey)store.getKey(ALIAS,null);
  KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
  generator.init(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT)
   .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
   .setKeySize(256).setRandomizedEncryptionRequired(true).build());
  return generator.generateKey();
 }
 public synchronized void save(String origin,String token) throws Exception {
  if(!ApiClient.validToken(token))throw new Exception("INVALID_TOKEN");
  Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key());
  cipher.updateAAD(origin.getBytes(StandardCharsets.UTF_8));
  String value=Base64.encodeToString(cipher.getIV(),Base64.NO_WRAP)+":"+Base64.encodeToString(cipher.doFinal(token.getBytes(StandardCharsets.UTF_8)),Base64.NO_WRAP);
  if(!prefs.edit().putString(origin,value).commit())throw new Exception("TOKEN_SAVE_FAILED");
 }
 public synchronized String read(String origin) throws Exception {
  String value=prefs.getString(origin,"");if(value.isEmpty())return "";
  String[] parts=value.split(":",-1);if(parts.length!=2)throw new Exception("TOKEN_READ_FAILED");
  Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
  cipher.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(parts[0],Base64.NO_WRAP)));
  cipher.updateAAD(origin.getBytes(StandardCharsets.UTF_8));
  return new String(cipher.doFinal(Base64.decode(parts[1],Base64.NO_WRAP)),StandardCharsets.UTF_8);
 }
}
