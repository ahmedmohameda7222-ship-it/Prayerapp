package de.donaumoschee.app.prayer;

import org.junit.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

public final class NativeSecretBoundarySourceContractTest {
    private static Path projectRoot() throws IOException {
        Path cursor = Path.of(System.getProperty("user.dir")).toAbsolutePath();
        while (cursor != null) {
            if (Files.exists(cursor.resolve("app/src/main/java"))) return cursor;
            Path nested = cursor.resolve("android-twa");
            if (Files.exists(nested.resolve("app/src/main/java"))) return nested;
            cursor = cursor.getParent();
        }
        throw new IOException("Could not locate android-twa project root");
    }

    private static String read(Path path) throws IOException {
        return new String(Files.readAllBytes(path), StandardCharsets.UTF_8);
    }

    private static String javaSource(String relativePath) throws IOException {
        return read(projectRoot().resolve("app/src/main/java").resolve(relativePath));
    }

    @Test
    public void statusDoesNotExposeCredentialAndAdvertisesPrivateSecretCapability() throws IOException {
        String status = javaSource("de/donaumoschee/app/prayer/NativeStatus.java");
        assertTrue(status.contains("native-secret-private-v2"));
        assertFalse(status.contains(".put(\"credential\""));
    }

    @Test
    public void bridgeOwnsEnrollmentAndAccountRevocation() throws IOException {
        String protocol = javaSource("de/donaumoschee/app/bridge/BridgeProtocol.java");
        String bridge = javaSource("de/donaumoschee/app/bridge/BridgeHandler.java");
        assertTrue(protocol.contains("native.authority.enroll"));
        assertTrue(bridge.contains("NativeAuthorityClient.enroll"));
        assertTrue(bridge.contains("resetAccountStateAndQueueAuthorityRevocation"));
        assertTrue(bridge.contains("flushAuthorityRevocation"));
    }

    @Test
    public void revocationWorkerUsesPrivateCredentialAndGenerationGuard() throws IOException {
        String worker = javaSource("de/donaumoschee/app/workers/NativeAuthorityWorker.java");
        assertTrue(worker.contains("store.credential()"));
        assertTrue(worker.contains("pending.targetGeneration"));
        assertTrue(worker.contains("store.accountGeneration() != pending.targetGeneration"));
    }
}
