package de.donaumoschee.app.bridge;

import android.content.Context;

import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;

import de.donaumoschee.app.storage.NativeStore;

import org.json.JSONObject;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.util.ArrayList;
import java.util.List;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

@RunWith(AndroidJUnit4.class)
public final class BridgeHandlerInstrumentationTest {
    private static final String PREFERENCES = "native-prayer-engine-v1";

    private Context context;

    @Before
    public void setUp() {
        context = ApplicationProvider.getApplicationContext();
        clearNativeState();
    }

    @After
    public void tearDown() {
        clearNativeState();
    }

    @Test
    public void readyHandshakeReturnsRuntimeStatusWithoutExposingNativeCredential() throws Exception {
        NativeStore store = new NativeStore(context);
        String credential = store.credential();
        List<String> outbound = new ArrayList<>();
        BridgeHandler handler = new BridgeHandler(context, outbound::add);

        handler.sendReady();
        handler.handle(new JSONObject()
                .put("version", BridgeProtocol.VERSION)
                .put("type", "web.bridge.ready")
                .put("payload", new JSONObject())
                .toString());

        assertEquals(2, outbound.size());
        assertStatusEnvelope(outbound.get(0), "native.ready", credential, store.installationId());
        assertStatusEnvelope(outbound.get(1), "native.status", credential, store.installationId());
    }

    private void assertStatusEnvelope(
            String raw,
            String expectedType,
            String credential,
            String installationId
    ) throws Exception {
        JSONObject envelope = new JSONObject(raw);
        assertEquals(BridgeProtocol.VERSION, envelope.getInt("version"));
        assertEquals(expectedType, envelope.getString("type"));

        JSONObject payload = envelope.getJSONObject("payload");
        assertTrue(payload.getBoolean("native"));
        assertEquals(context.getPackageName(), payload.getString("packageId"));
        assertEquals(installationId, payload.getString("installationId"));
        assertFalse(payload.has("credential"));
        assertFalse(raw.contains(credential));
    }

    private void clearNativeState() {
        context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
                .edit()
                .clear()
                .commit();
    }
}
