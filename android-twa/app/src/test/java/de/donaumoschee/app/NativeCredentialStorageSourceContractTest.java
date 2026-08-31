package de.donaumoschee.app;

import org.junit.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

public final class NativeCredentialStorageSourceContractTest {
    private static Path repositoryRoot() {
        Path current = Path.of(System.getProperty("user.dir")).toAbsolutePath();
        for (Path cursor = current; cursor != null; cursor = cursor.getParent()) {
            if (Files.exists(cursor.resolve("android-twa/app/src/main"))) return cursor;
            if (cursor.getFileName() != null
                    && "android-twa".equals(cursor.getFileName().toString())
                    && Files.exists(cursor.resolve("app/src/main"))) return cursor.getParent();
        }
        throw new IllegalStateException("Repository root not found");
    }

    private static String source(String path) throws IOException {
        return Files.readString(repositoryRoot().resolve(path), StandardCharsets.UTF_8);
    }

    @Test
    public void nativeAuthorityCredentialUsesAndroidKeystoreBackedEncryption() throws IOException {
        String nativeStore = source("android-twa/app/src/main/java/de/donaumoschee/app/storage/NativeStore.java");

        assertTrue(nativeStore.contains("NativeCredentialStore"));
        assertFalse(nativeStore.contains("putString(CREDENTIAL, value)"));

        String secureStore = source("android-twa/app/src/main/java/de/donaumoschee/app/storage/NativeCredentialStore.java");
        assertTrue(secureStore.contains("AndroidKeyStore"));
        assertTrue(secureStore.contains("KeyProperties.KEY_ALGORITHM_AES"));
        assertTrue(secureStore.contains("KeyProperties.BLOCK_MODE_GCM"));
        assertTrue(secureStore.contains("KeyProperties.ENCRYPTION_PADDING_NONE"));
        assertTrue(secureStore.contains("GCMParameterSpec"));
        assertTrue(secureStore.contains("remove(LEGACY_CREDENTIAL)"));
    }
}
