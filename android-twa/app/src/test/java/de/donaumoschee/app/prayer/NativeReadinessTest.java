package de.donaumoschee.app.prayer;

import org.junit.Test;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

public final class NativeReadinessTest {
    @Test
    public void activeRequiresEveryCapability() {
        assertTrue(NativeReadiness.isReady(true, true, true, true, true, true, true, true, true));
        assertFalse(NativeReadiness.isReady(false, true, true, true, true, true, true, true, true));
        assertFalse(NativeReadiness.isReady(true, false, true, true, true, true, true, true, true));
        assertFalse(NativeReadiness.isReady(true, true, false, true, true, true, true, true, true));
        assertFalse(NativeReadiness.isReady(true, true, true, false, true, true, true, true, true));
        assertFalse(NativeReadiness.isReady(true, true, true, true, false, true, true, true, true));
        assertFalse(NativeReadiness.isReady(true, true, true, true, true, false, true, true, true));
        assertFalse(NativeReadiness.isReady(true, true, true, true, true, true, false, true, true));
        assertFalse(NativeReadiness.isReady(true, true, true, true, true, true, true, false, true));
        assertFalse(NativeReadiness.isReady(true, true, true, true, true, true, true, true, false));
    }
}
