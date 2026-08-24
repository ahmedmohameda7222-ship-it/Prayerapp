package de.donaumoschee.app.diagnostics;

import org.junit.Test;

import java.lang.reflect.Method;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

public final class DeliveryDiagnosticsTest {
    @Test
    public void exposesOnlyKnownOperationalSignalsAndSanitizesCodes() {
        try {
            Class<?> diagnostics = Class.forName("de.donaumoschee.app.diagnostics.DeliveryDiagnostics");
            Method isKnownSignal = diagnostics.getMethod("isKnownSignal", String.class);
            Method sanitizeCode = diagnostics.getMethod("sanitizeCode", String.class);

            assertTrue((Boolean) isKnownSignal.invoke(null, "schedule_refresh_failure"));
            assertTrue((Boolean) isKnownSignal.invoke(null, "receipt_retry_failure"));
            assertTrue((Boolean) isKnownSignal.invoke(null, "native_unhealthy"));
            assertTrue((Boolean) isKnownSignal.invoke(null, "adhan_playback_failure"));
            assertFalse((Boolean) isKnownSignal.invoke(null, "credential_dump"));

            assertEquals("refresh-failed", sanitizeCode.invoke(null, "REFRESH-FAILED"));
            assertEquals("none", sanitizeCode.invoke(null, new Object[] { null }));
            assertEquals("redacted", sanitizeCode.invoke(null, "Native secret token=super-sensitive"));
            assertEquals("redacted", sanitizeCode.invoke(null, "x".repeat(80)));
        } catch (ReflectiveOperationException error) {
            fail("Structured delivery diagnostics contract missing: " + error);
        }
    }
}
