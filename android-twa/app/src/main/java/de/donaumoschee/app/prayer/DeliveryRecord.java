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
    public static DeliveryRecord schedule(String eventId, String kind, long dueAtMs) {
        return new DeliveryRecord(eventId, kind, DeliveryState.SCHEDULED, dueAtMs, 0L, 0L, "");
    }

    public static DeliveryRecord begin(String eventId, String kind, long dueAtMs, long attemptedAtMs) {
        return schedule(eventId, kind, dueAtMs).fire(attemptedAtMs);
    }

    public DeliveryRecord fire(long attemptedAtMs) {
        if (state != DeliveryState.SCHEDULED) {
            throw new IllegalStateException("Only scheduled delivery may start firing");
        }
        return new DeliveryRecord(eventId, kind, DeliveryState.FIRING, dueAtMs, attemptedAtMs, 0L, "");
    }

    public DeliveryRecord markDelivered(long deliveredAtMs) {
        requireFiring();
        return new DeliveryRecord(eventId, kind, DeliveryState.DELIVERED, dueAtMs, attemptedAtMs, deliveredAtMs, "");
    }

    public DeliveryRecord markFailed(String failureCode, long failedAtMs) {
        requireFiring();
        String code = failureCode == null || failureCode.isBlank() ? "delivery-failed" : failureCode;
        return new DeliveryRecord(eventId, kind, DeliveryState.FAILED, dueAtMs, attemptedAtMs, 0L, code);
    }

    public DeliveryRecord restart(long attemptedAtMs) {
        if (!canBeginAgain()) throw new IllegalStateException("Only failed delivery may restart");
        return begin(eventId, kind, dueAtMs, attemptedAtMs);
    }

    public boolean canBeginAgain() {
        return state == DeliveryState.FAILED;
    }

    public long retentionTimestampMs() {
        if (deliveredAtMs > 0L) return deliveredAtMs;
        if (attemptedAtMs > 0L) return attemptedAtMs;
        return dueAtMs;
    }

    public boolean terminal() {
        return state == DeliveryState.DELIVERED || state == DeliveryState.FAILED;
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
        try {
            return new DeliveryRecord(
                    object.getString("eventId"),
                    object.getString("kind"),
                    DeliveryState.valueOf(object.getString("state")),
                    object.getLong("dueAtMs"),
                    object.optLong("attemptedAtMs", 0L),
                    object.optLong("deliveredAtMs", 0L),
                    object.optString("failureCode", "")
            );
        } catch (IllegalArgumentException error) {
            throw new JSONException("Invalid delivery state");
        }
    }

    private void requireFiring() {
        if (state != DeliveryState.FIRING) {
            throw new IllegalStateException("Delivery is not firing");
        }
    }
}
