package de.donaumoschee.app.prayer;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

public final class DeliveryReceiptQueue {
    private static final Pattern EVENT_ID = Pattern.compile("^p2:[0-9a-f]{64}$");
    private static final int VERSION = 1;

    private final int capacity;
    private final LinkedHashMap<String, Receipt> receipts = new LinkedHashMap<>();

    public DeliveryReceiptQueue(int capacity) {
        if (capacity < 1) throw new IllegalArgumentException("Receipt queue capacity must be positive");
        this.capacity = capacity;
    }

    public synchronized boolean enqueue(String eventId, String kind, long deliveredAtMs, int accountGeneration) {
        if (eventId == null || !EVENT_ID.matcher(eventId).matches()) return false;
        if (kind == null) return false;
        String normalizedKind = kind.toLowerCase(Locale.ROOT);
        if (!"reminder".equals(normalizedKind) && !"adhan".equals(normalizedKind)) return false;
        if (deliveredAtMs <= 0L || accountGeneration < 0) return false;

        String key = key(eventId, accountGeneration);
        if (receipts.containsKey(key)) return true;
        if (receipts.size() >= capacity) return false;
        receipts.put(key, new Receipt(eventId, normalizedKind, deliveredAtMs, accountGeneration));
        return true;
    }

    public synchronized List<Receipt> pending(int accountGeneration) {
        List<Receipt> pending = new ArrayList<>();
        for (Receipt receipt : receipts.values()) {
            if (receipt.accountGeneration == accountGeneration) pending.add(receipt);
        }
        return List.copyOf(pending);
    }

    public synchronized boolean acknowledge(String eventId, int accountGeneration) {
        return receipts.remove(key(eventId, accountGeneration)) != null;
    }

    public synchronized JSONObject toJson() throws JSONException {
        JSONArray items = new JSONArray();
        for (Receipt receipt : receipts.values()) items.put(receipt.toJson());
        return new JSONObject().put("version", VERSION).put("receipts", items);
    }

    public static DeliveryReceiptQueue fromJson(JSONObject object, int capacity) throws JSONException {
        if (object == null || object.optInt("version", -1) != VERSION) {
            throw new JSONException("Invalid delivery receipt queue version");
        }
        JSONArray items = object.optJSONArray("receipts");
        if (items == null || items.length() > capacity) {
            throw new JSONException("Invalid delivery receipt queue size");
        }
        DeliveryReceiptQueue queue = new DeliveryReceiptQueue(capacity);
        for (int index = 0; index < items.length(); index++) {
            Receipt receipt = Receipt.fromJson(items.getJSONObject(index));
            if (!queue.enqueue(receipt.eventId, receipt.kind, receipt.deliveredAtMs, receipt.accountGeneration)) {
                throw new JSONException("Invalid delivery receipt");
            }
        }
        return queue;
    }

    private static String key(String eventId, int accountGeneration) {
        return accountGeneration + "|" + eventId;
    }

    public static final class Receipt {
        public final String eventId;
        public final String kind;
        public final long deliveredAtMs;
        public final int accountGeneration;

        Receipt(String eventId, String kind, long deliveredAtMs, int accountGeneration) {
            this.eventId = eventId;
            this.kind = kind;
            this.deliveredAtMs = deliveredAtMs;
            this.accountGeneration = accountGeneration;
        }

        public JSONObject toJson() throws JSONException {
            return new JSONObject()
                    .put("eventId", eventId)
                    .put("kind", kind)
                    .put("deliveredAtMs", deliveredAtMs)
                    .put("accountGeneration", accountGeneration);
        }

        static Receipt fromJson(JSONObject object) throws JSONException {
            return new Receipt(
                    object.getString("eventId"),
                    object.getString("kind"),
                    object.getLong("deliveredAtMs"),
                    object.getInt("accountGeneration")
            );
        }
    }
}
