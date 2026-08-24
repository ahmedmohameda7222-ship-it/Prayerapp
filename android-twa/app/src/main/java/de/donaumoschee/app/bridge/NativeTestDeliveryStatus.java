package de.donaumoschee.app.bridge;

import de.donaumoschee.app.prayer.DeliveryRecord;
import de.donaumoschee.app.prayer.DeliveryState;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.Locale;

public record NativeTestDeliveryStatus(
        String eventId,
        String state,
        boolean terminal,
        boolean success,
        String failureCode
) {
    public static NativeTestDeliveryStatus from(DeliveryRecord record) {
        if (record == null) {
            return new NativeTestDeliveryStatus("", "failed", true, false, "test-delivery-missing");
        }
        DeliveryState state = record.state();
        boolean terminal = record.terminal();
        boolean success = state == DeliveryState.DELIVERED;
        return new NativeTestDeliveryStatus(
                record.eventId(),
                state.name().toLowerCase(Locale.ROOT),
                terminal,
                success,
                record.failureCode()
        );
    }

    public JSONObject toJson() throws JSONException {
        return new JSONObject()
                .put("eventId", eventId)
                .put("state", state)
                .put("terminal", terminal)
                .put("success", success)
                .put("failureCode", failureCode);
    }
}
