package de.donaumoschee.app.bridge;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.Set;

public final class BridgeProtocol {
    public static final int VERSION = 1;
    public static final int MAX_MESSAGE_LENGTH = 65_536;

    private static final Set<String> INBOUND_TYPES = Set.of(
            "web.configure",
            "web.bridge.ready",
            "native.permissions.request",
            "native.status.request",
            "native.test.schedule",
            "native.test.status",
            "native.authority.enroll",
            "native.authority.bind",
            "native.authority.clear",
            "native.update.required",
            "native.account.reset"
    );

    private BridgeProtocol() {}

    public static Envelope parseInbound(String message) throws JSONException {
        if (message == null || message.length() == 0 || message.length() > MAX_MESSAGE_LENGTH) {
            throw new JSONException("Invalid bridge message length");
        }
        JSONObject object = new JSONObject(message);
        if (object.optInt("version", -1) != VERSION) throw new JSONException("Unsupported protocol version");
        String type = object.optString("type", "");
        if (!INBOUND_TYPES.contains(type)) throw new JSONException("Unsupported message type");
        Object rawPayload = object.opt("payload");
        if (rawPayload != null && rawPayload != JSONObject.NULL && !(rawPayload instanceof JSONObject)) {
            throw new JSONException("Payload must be an object");
        }
        return new Envelope(type, rawPayload instanceof JSONObject ? (JSONObject) rawPayload : new JSONObject());
    }

    public static String outbound(String type, JSONObject payload) throws JSONException {
        if (type == null || !type.matches("^native\\.[a-z.]+$")) throw new JSONException("Invalid outbound type");
        return new JSONObject()
                .put("version", VERSION)
                .put("type", type)
                .put("payload", payload == null ? new JSONObject() : payload)
                .toString();
    }

    public static final class Envelope {
        public final String type;
        public final JSONObject payload;

        private Envelope(String type, JSONObject payload) {
            this.type = type;
            this.payload = payload;
        }
    }
}
