package de.donaumoschee.app.workers;

import android.content.Context;

import de.donaumoschee.app.storage.NativeStore;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

public final class NativeAuthorityClient {
    private static final String ORIGIN = "https://donaumoschee.vercel.app";
    private static final Object REVOCATION_LOCK = new Object();

    private NativeAuthorityClient() {}

    public static JSONObject enroll(
            Context context,
            String accountAccessToken,
            String browserId,
            String endpoint,
            int expectedGeneration
    ) throws IOException, JSONException {
        NativeStore store = new NativeStore(context);
        if (store.accountGeneration() != expectedGeneration) throw new IOException("Native account generation changed");
        flushPendingRevocation(context, store);
        if (store.accountGeneration() != expectedGeneration) throw new IOException("Native account generation changed");

        JSONObject body = new JSONObject()
                .put("installationId", store.installationId())
                .put("accountGeneration", expectedGeneration)
                .put("browserId", browserId)
                .put("endpoint", endpoint == null || endpoint.isBlank() ? JSONObject.NULL : endpoint);
        String authorityId = store.authorityId();
        body.put("authorityId", authorityId.isBlank() ? JSONObject.NULL : authorityId);

        return NativeHttp.post(ORIGIN + "/api/android/native-authority/enroll", body, Map.of(
                "Authorization", "Bearer " + accountAccessToken,
                "X-Native-Credential", store.credential()
        ));
    }

    static boolean flushPendingRevocation(Context context, NativeStore store) throws IOException, JSONException {
        synchronized (REVOCATION_LOCK) {
            NativeStore.PendingAuthorityRevocation pending = store.pendingAuthorityRevocation();
            if (pending == null) return true;
            if (store.accountGeneration() != pending.targetGeneration) return false;
            revoke(context, pending, store.credential());
            if (store.accountGeneration() != pending.targetGeneration) return false;
            return store.acknowledgeAuthorityRevocation(pending.authorityId, pending.targetGeneration);
        }
    }

    static JSONObject revoke(
            Context context,
            NativeStore.PendingAuthorityRevocation pending,
            String credential
    ) throws IOException, JSONException {
        NativeStore store = new NativeStore(context);
        Map<String, String> headers = new HashMap<>();
        headers.put("X-Native-Installation-Id", store.installationId());
        headers.put("X-Native-Authority-Id", pending.authorityId);
        headers.put("Authorization", "Native " + credential);
        return NativeHttp.delete(ORIGIN + "/api/android/native-authority/heartbeat", headers);
    }
}
