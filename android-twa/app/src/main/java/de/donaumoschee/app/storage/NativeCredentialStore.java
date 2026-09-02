package de.donaumoschee.app.storage;

import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.security.KeyStore;
import java.security.SecureRandom;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

final class NativeCredentialStore {
    private static final String ANDROID_KEY_STORE = "AndroidKeyStore";
    private static final String KEY_ALIAS = "danube-mosque-native-authority-credential-v1";
    private static final String LEGACY_CREDENTIAL = "credential";
    private static final String ENCRYPTED_CREDENTIAL = "credential-encrypted-v1";
    private static final String ENCRYPTED_CREDENTIAL_IV = "credential-encrypted-v1-iv";
    private static final String CIPHER_TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_TAG_BITS = 128;
    private static final Object LOCK = new Object();

    private final SharedPreferences preferences;

    NativeCredentialStore(SharedPreferences preferences) {
        this.preferences = preferences;
    }

    String getOrCreate() {
        synchronized (LOCK) {
            String encrypted = preferences.getString(ENCRYPTED_CREDENTIAL, null);
            String encodedIv = preferences.getString(ENCRYPTED_CREDENTIAL_IV, null);
            if (encrypted != null || encodedIv != null) {
                if (encrypted == null || encodedIv == null) {
                    throw new IllegalStateException("Native credential storage is incomplete");
                }
                return decrypt(encrypted, encodedIv);
            }

            String legacy = preferences.getString(LEGACY_CREDENTIAL, null);
            if (legacy != null) {
                persistEncrypted(legacy);
                return legacy;
            }

            byte[] bytes = new byte[32];
            new SecureRandom().nextBytes(bytes);
            String credential = Base64.encodeToString(bytes, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
            persistEncrypted(credential);
            return credential;
        }
    }

    private void persistEncrypted(String credential) {
        try {
            SecretKey key = loadKey(true);
            Cipher cipher = Cipher.getInstance(CIPHER_TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, key);
            String ciphertext = Base64.encodeToString(
                    cipher.doFinal(credential.getBytes(java.nio.charset.StandardCharsets.UTF_8)),
                    Base64.NO_WRAP);
            String iv = Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP);
            if (!preferences.edit()
                    .putString(ENCRYPTED_CREDENTIAL, ciphertext)
                    .putString(ENCRYPTED_CREDENTIAL_IV, iv)
                    .remove(LEGACY_CREDENTIAL)
                    .commit()) {
                throw new IllegalStateException("Could not persist protected native credential");
            }
        } catch (GeneralSecurityException | IOException error) {
            throw new IllegalStateException("Could not protect native credential", error);
        }
    }

    private String decrypt(String encrypted, String encodedIv) {
        try {
            SecretKey key = loadKey(false);
            Cipher cipher = Cipher.getInstance(CIPHER_TRANSFORMATION);
            byte[] iv = Base64.decode(encodedIv, Base64.DEFAULT);
            byte[] ciphertext = Base64.decode(encrypted, Base64.DEFAULT);
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_BITS, iv));
            return new String(cipher.doFinal(ciphertext), java.nio.charset.StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IOException | IllegalArgumentException error) {
            throw new IllegalStateException("Could not read protected native credential", error);
        }
    }

    private SecretKey loadKey(boolean allowCreate) throws GeneralSecurityException, IOException {
        KeyStore keyStore = KeyStore.getInstance(ANDROID_KEY_STORE);
        keyStore.load(null);
        if (keyStore.containsAlias(KEY_ALIAS)) {
            java.security.Key key = keyStore.getKey(KEY_ALIAS, null);
            if (key instanceof SecretKey secretKey) return secretKey;
            throw new GeneralSecurityException("Native credential key has unexpected type");
        }
        if (!allowCreate) {
            throw new GeneralSecurityException("Native credential key is missing");
        }

        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEY_STORE);
        generator.init(new KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .build());
        return generator.generateKey();
    }
}
