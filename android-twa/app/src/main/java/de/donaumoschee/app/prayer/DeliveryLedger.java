package de.donaumoschee.app.prayer;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;

public final class DeliveryLedger {
    private final int maxRecords;
    private final LinkedHashMap<String, DeliveryRecord> records = new LinkedHashMap<>();

    public DeliveryLedger(int maxRecords) {
        if (maxRecords < 1) throw new IllegalArgumentException("maxRecords must be positive");
        this.maxRecords = maxRecords;
    }

    public boolean schedule(String eventId, String kind, long dueAtMs) {
        DeliveryRecord current = records.get(eventId);
        if (current != null) {
            if (current.state() == DeliveryState.SCHEDULED) {
                return current.kind().equals(kind) && current.dueAtMs() == dueAtMs;
            }
            if (
                    current.state() == DeliveryState.FAILED
                    && current.failureCode().startsWith("alarm-cancelled")
                    && current.kind().equals(kind)
                    && current.dueAtMs() == dueAtMs
            ) {
                records.put(eventId, DeliveryRecord.schedule(eventId, kind, dueAtMs));
                return true;
            }
            return false;
        }
        if (!reserveSlot()) return false;
        records.put(eventId, DeliveryRecord.schedule(eventId, kind, dueAtMs));
        return true;
    }

    public boolean cancelScheduled(String eventId, String failureCode, long cancelledAtMs) {
        DeliveryRecord current = records.get(eventId);
        if (current == null || current.state() != DeliveryState.SCHEDULED) return false;
        records.put(eventId, current.cancelScheduled(failureCode, cancelledAtMs));
        return true;
    }

    public boolean begin(String eventId, String kind, long dueAtMs, long attemptedAtMs) {
        DeliveryRecord current = records.get(eventId);
        if (current == null) {
            if (!reserveSlot()) return false;
            records.put(eventId, DeliveryRecord.begin(eventId, kind, dueAtMs, attemptedAtMs));
            return true;
        }
        if (!current.kind().equals(kind) || current.dueAtMs() != dueAtMs) return false;
        if (current.state() == DeliveryState.SCHEDULED) {
            records.put(eventId, current.fire(attemptedAtMs));
            return true;
        }
        if (current.state() == DeliveryState.FAILED) {
            records.put(eventId, current.restart(attemptedAtMs));
            return true;
        }
        return false;
    }

    public boolean markDelivered(String eventId, long deliveredAtMs) {
        DeliveryRecord current = records.get(eventId);
        if (current == null || current.state() != DeliveryState.FIRING) return false;
        records.put(eventId, current.markDelivered(deliveredAtMs));
        return true;
    }

    public boolean markFailed(String eventId, String failureCode, long failedAtMs) {
        DeliveryRecord current = records.get(eventId);
        if (current == null || current.state() != DeliveryState.FIRING) return false;
        records.put(eventId, current.markFailed(failureCode, failedAtMs));
        return true;
    }

    public DeliveryRecord record(String eventId) {
        return records.get(eventId);
    }

    public boolean contains(String eventId) {
        return records.containsKey(eventId);
    }

    public int size() {
        return records.size();
    }

    public JSONObject toJson() throws JSONException {
        JSONObject object = new JSONObject();
        for (Map.Entry<String, DeliveryRecord> entry : records.entrySet()) {
            object.put(entry.getKey(), entry.getValue().toJson());
        }
        return object;
    }

    public static DeliveryLedger fromJson(JSONObject object, int maxRecords) throws JSONException {
        DeliveryLedger ledger = new DeliveryLedger(maxRecords);
        Iterator<String> keys = object.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            DeliveryRecord record = DeliveryRecord.fromJson(object.getJSONObject(key));
            if (!key.equals(record.eventId())) throw new JSONException("Delivery record key mismatch");
            if (ledger.records.size() >= maxRecords && !ledger.reserveSlot()) {
                throw new JSONException("Too many active delivery records");
            }
            ledger.records.put(key, record);
        }
        return ledger;
    }

    private boolean reserveSlot() {
        if (records.size() < maxRecords) return true;
        String oldestTerminalId = null;
        long oldestTimestamp = Long.MAX_VALUE;
        for (Map.Entry<String, DeliveryRecord> entry : records.entrySet()) {
            DeliveryRecord record = entry.getValue();
            if (!record.terminal()) continue;
            long timestamp = record.retentionTimestampMs();
            if (timestamp < oldestTimestamp) {
                oldestTimestamp = timestamp;
                oldestTerminalId = entry.getKey();
            }
        }
        if (oldestTerminalId == null) return false;
        records.remove(oldestTerminalId);
        return true;
    }
}
