package de.donaumoschee.app.prayer;

import org.json.JSONException;
import org.json.JSONObject;

public record DeliveryRecord(
        String eventId,
        String kind,
        DeliveryState state,
        long dueAtMs,
        long attemptedAtMs,
        long deliveredAtMs,
        String failureCode
) {
    public static DeliveryRecord begin(String eventId, String kind, long dueAtMs, long attemptedAtMs) {
        return new DeliveryRecord(eventId, kind, DeliveryState.FIRING, dueAtMs, attemptedAtMs, 0L, "");
    }

    public DeliveryRecord markDelivered(long deliveredAtMs) {
        requireFiring();
        return new DeliveryRecord(eventId, kind, DeliveryState.DELIVERED, dueAtMs, attemptedAtMs, deliveredAtMs, "");
    }

    public DeliveryRecord markFailed(String failureCode, long failedAtMs) {
        requireFiring();
        String code = failureCode == null ? "delivery-failed" : failureCode;
        return new DeliveryRecord(eventId, kind, DeliveryState.FAILED, dueAtMs, failedAtMs, 0L, code);
    }

    public DeliveryRecord restart(long attemptedAtMs) {
        if (!canBeginAgain()) throw new IllegalStateException("Only failed delivery may restart");
        return begin(eventId, kind, dueAtMs, attemptedAtMs);
    }

    public boolean canBeginAgain() {
        return state == DeliveryState.FAILED;
    }

    public JSONObject toJson() throws JSONException {
        return new JSONObject()
                .put("eventId", eventId)
                .put("kind", kind)
                .put("state", state.name())
                .put("dueAtMs", dueAtMs)
                .put("attemptedAtMs", attemptedAtMs)
                .put("deliveredAtMs", deliveredAtMs)
                .put("failureCode", failureCode);
    }

    public static DeliveryRecord fromJson(JSONObject object) throws JSONException {
        return new DeliveryRecord(
                object.getString("eventId"),
                object.getString("kind"),
                DeliveryState.valueOf(object.getString("state")),
                object.getLong("dueAtMs"),
                object.getLong("attemptedAtMs"),
                object.optLong("deliveredAtMs", 0L),
                object.optString("failureCode", "")
        );
    }

    private void requireFiring() {
        if (state != DeliveryState.FIRING) {
            throw new IllegalStateException("Delivery is not firing");
        }
    }
}
