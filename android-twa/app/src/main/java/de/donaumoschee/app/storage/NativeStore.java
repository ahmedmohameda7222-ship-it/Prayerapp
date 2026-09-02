package de.donaumoschee.app.storage;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Base64;

import de.donaumoschee.app.diagnostics.DeliveryDiagnostics;
import de.donaumoschee.app.localization.AppLocale;
import de.donaumoschee.app.prayer.DeliveryLedger;
import de.donaumoschee.app.prayer.DeliveryReceiptQueue;
import de.donaumoschee.app.prayer.DeliveryRecord;
import de.donaumoschee.app.prayer.DeliveryState;
import de.donaumoschee.app.prayer.NativeConfig;

import org.json.JSONException;
import org.json.JSONObject;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public final class NativeStore {
    private static final String PREFERENCES = "native-prayer-engine-v1";
    private static final String CONFIG = "config";
    private static final String APP_LOCALE = "app-locale";
    private static final String INSTALLATION_ID = "installation-id";
    private static final String CREDENTIAL = "credential";
    private static final String AUTHORITY_ID = "authority-id";
    private static final String PENDING_AUTHORITY_REVOCATION = "pending-authority-revocation-v2";
    private static final String DELIVERED = "delivered-events";
    private static final String DELIVERY_RECORDS = "delivery-records-v2";
    private static final String DELIVERY_RECEIPTS = "delivery-receipts-v2";
    private static final int MAX_DELIVERY_RECORDS = 512;
    private static final int MAX_DELIVERY_RECEIPTS = 512;
    private static final String SCHEDULE_INSTALLED = "schedule-installed";
    private static final String ENGINE_HEALTHY = "engine-healthy";
    private static final String LAST_ERROR = "last-error";
    private static final String SCHEDULED_REQUEST_CODES = "scheduled-request-codes";
    private static final String ACCOUNT_GENERATION = "account-generation";
    private static final Object ACCOUNT_LOCK = new Object();

    private final SharedPreferences preferences;

    public NativeStore(Context context) {
        preferences = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
    }

    public NativeConfig saveConfig(JSONObject object, Instant now) throws JSONException {
        NativeConfig config = NativeConfig.parse(object, now);
        if (!preferences.edit()
                .putString(CONFIG, config.source.toString())
                .putString(APP_LOCALE, config.locale)
                .putBoolean(ENGINE_HEALTHY, true)
                .putString(LAST_ERROR, "")
                .commit()) {
            throw new JSONException("Could not persist native config");
        }
        return config;
    }

    public boolean saveConfigIfGeneration(JSONObject object, Instant now, int generation) throws JSONException {
        synchronized (ACCOUNT_LOCK) {
            if (accountGeneration() != generation) return false;
            NativeConfig config = NativeConfig.parse(object, now);
            return preferences.edit()
                    .putString(CONFIG, config.source.toString())
                    .putString(APP_LOCALE, config.locale)
                    .putBoolean(ENGINE_HEALTHY, true)
                    .putString(LAST_ERROR, "")
                    .commit();
        }
    }

    public NativeConfig loadConfig(Instant now) {
        String value = preferences.getString(CONFIG, null);
        if (value == null) return null;
        try {
            return NativeConfig.parse(new JSONObject(value), now);
        } catch (JSONException error) {
            markEngineError("stored-config-invalid");
            return null;
        }
    }

    public JSONObject rawConfig() {
        String value = preferences.getString(CONFIG, null);
        if (value == null) return null;
        try {
            return new JSONObject(value);
        } catch (JSONException error) {
            return null;
        }
    }

    public String appLocale() {
        return AppLocale.normalize(preferences.getString(APP_LOCALE, "en"));
    }

    public synchronized String installationId() {
        String value = preferences.getString(INSTALLATION_ID, null);
        if (value != null) return value;
        value = UUID.randomUUID().toString();
        preferences.edit().putString(INSTALLATION_ID, value).commit();
        return value;
    }

    public synchronized String credential() {
        return new NativeCredentialStore(preferences).getOrCreate();
    }

    public synchronized String authorityId() {
        return preferences.getString(AUTHORITY_ID, "");
    }

    public synchronized boolean bindAuthorityId(String value) {
        String canonical = canonicalAuthorityId(value);
        return canonical != null && preferences.edit().putString(AUTHORITY_ID, canonical).commit();
    }

    public boolean bindAuthorityIdIfGeneration(String value, int generation) {
        synchronized (ACCOUNT_LOCK) {
            if (accountGeneration() != generation) return false;
            String canonical = canonicalAuthorityId(value);
            return canonical != null && preferences.edit().putString(AUTHORITY_ID, canonical).commit();
        }
    }

    public synchronized boolean clearAuthorityId() {
        return preferences.edit().remove(AUTHORITY_ID).commit();
    }

    public PendingAuthorityRevocation pendingAuthorityRevocation() {
        synchronized (ACCOUNT_LOCK) {
            return pendingAuthorityRevocationLocked();
        }
    }

    public boolean acknowledgeAuthorityRevocation(String authorityId, int targetGeneration) {
        synchronized (ACCOUNT_LOCK) {
            if (accountGeneration() != targetGeneration) return false;
            PendingAuthorityRevocation pending = pendingAuthorityRevocationLocked();
            if (pending == null) return true;
            if (!pending.authorityId.equals(authorityId) || pending.targetGeneration != targetGeneration) return false;
            return preferences.edit().remove(PENDING_AUTHORITY_REVOCATION).commit();
        }
    }

    /** Legacy v1 compatibility only. New delivery paths use the delivery ledger below. */
    public synchronized boolean markDelivered(String eventId) {
        Set<String> current = new HashSet<>(preferences.getStringSet(DELIVERED, Set.of()));
        if (current.contains(eventId) || current.size() >= MAX_DELIVERY_RECORDS) return false;
        current.add(eventId);
        return preferences.edit().putStringSet(DELIVERED, current).commit();
    }

    public boolean markDeliveryScheduled(String eventId, String kind, long dueAtMs) {
        synchronized (ACCOUNT_LOCK) {
            if (legacyDeliveredLocked(eventId)) return false;
            DeliveryLedger ledger = loadDeliveryLedgerLocked();
            if (ledger == null || !ledger.schedule(eventId, kind, dueAtMs)) return false;
            return persistDeliveryLedgerLocked(ledger);
        }
    }

    public boolean cancelDeliveryScheduled(String eventId, String failureCode, long cancelledAtMs) {
        synchronized (ACCOUNT_LOCK) {
            DeliveryLedger ledger = loadDeliveryLedgerLocked();
            if (ledger == null) return false;
            DeliveryRecord current = ledger.record(eventId);
            if (current == null || current.state() != DeliveryState.SCHEDULED) return true;
            if (!ledger.cancelScheduled(eventId, failureCode, cancelledAtMs)) return false;
            return persistDeliveryLedgerLocked(ledger);
        }
    }

    public boolean beginDelivery(String eventId, String kind, long dueAtMs, long attemptedAtMs) {
        synchronized (ACCOUNT_LOCK) {
            if (legacyDeliveredLocked(eventId)) return false;
            DeliveryLedger ledger = loadDeliveryLedgerLocked();
            if (ledger == null || !ledger.begin(eventId, kind, dueAtMs, attemptedAtMs)) return false;
            return persistDeliveryLedgerLocked(ledger);
        }
    }

    public boolean markDeliveryDelivered(String eventId, long deliveredAtMs) {
        synchronized (ACCOUNT_LOCK) {
            DeliveryLedger ledger = loadDeliveryLedgerLocked();
            DeliveryRecord current = ledger == null ? null : ledger.record(eventId);
            if (current == null || !ledger.markDelivered(eventId, deliveredAtMs)) return false;
            if (!eventId.startsWith("p2:")) return persistDeliveryLedgerLocked(ledger);

            DeliveryReceiptQueue receiptQueue = loadDeliveryReceiptQueueLocked();
            if (receiptQueue == null || !receiptQueue.enqueue(eventId, current.kind(), deliveredAtMs, accountGeneration())) {
                markEngineError("delivery-receipt-queue-unavailable");
                return false;
            }
            return persistDeliveredAndReceiptQueueLocked(ledger, receiptQueue);
        }
    }

    public boolean markDeliveryFailed(String eventId, String failureCode, long failedAtMs) {
        synchronized (ACCOUNT_LOCK) {
            DeliveryLedger ledger = loadDeliveryLedgerLocked();
            if (ledger == null || !ledger.markFailed(eventId, failureCode, failedAtMs)) return false;
            return persistDeliveryLedgerLocked(ledger);
        }
    }

    public DeliveryRecord deliveryRecord(String eventId) {
        synchronized (ACCOUNT_LOCK) {
            DeliveryLedger ledger = loadDeliveryLedgerLocked();
            return ledger == null ? null : ledger.record(eventId);
        }
    }

    public List<DeliveryReceiptQueue.Receipt> pendingDeliveryReceipts(int generation) {
        synchronized (ACCOUNT_LOCK) {
            DeliveryReceiptQueue receiptQueue = loadDeliveryReceiptQueueLocked();
            return receiptQueue == null ? List.of() : receiptQueue.pending(generation);
        }
    }

    public boolean acknowledgeDeliveryReceipt(String eventId, int generation) {
        synchronized (ACCOUNT_LOCK) {
            if (accountGeneration() != generation) return false;
            DeliveryReceiptQueue receiptQueue = loadDeliveryReceiptQueueLocked();
            if (receiptQueue == null) return false;
            if (!receiptQueue.acknowledge(eventId, generation)) return true;
            return persistDeliveryReceiptQueueLocked(receiptQueue);
        }
    }

    public void setScheduleInstalled(boolean installed) {
        preferences.edit().putBoolean(SCHEDULE_INSTALLED, installed).apply();
    }

    public boolean scheduleInstalled() {
        return preferences.getBoolean(SCHEDULE_INSTALLED, false);
    }

    public void markEngineHealthy() {
        preferences.edit().putBoolean(ENGINE_HEALTHY, true).putString(LAST_ERROR, "").apply();
    }

    public void markEngineError(String code) {
        DeliveryDiagnostics.emit("native_unhealthy", code);
        preferences.edit().putBoolean(ENGINE_HEALTHY, false).putString(LAST_ERROR, code).apply();
    }

    public boolean engineHealthy() {
        return preferences.getBoolean(ENGINE_HEALTHY, false);
    }

    public String lastError() {
        return preferences.getString(LAST_ERROR, "");
    }

    public Set<String> scheduledRequestCodes() {
        return new HashSet<>(preferences.getStringSet(SCHEDULED_REQUEST_CODES, Set.of()));
    }

    public void setScheduledRequestCodes(Set<String> values) {
        preferences.edit().putStringSet(SCHEDULED_REQUEST_CODES, new HashSet<>(values)).apply();
    }

    public boolean setScheduledRequestCodesIfGeneration(Set<String> values, int generation) {
        synchronized (ACCOUNT_LOCK) {
            if (accountGeneration() != generation) return false;
            return preferences.edit().putStringSet(SCHEDULED_REQUEST_CODES, new HashSet<>(values)).commit();
        }
    }

    public boolean addScheduledRequestCodesIfGeneration(Set<String> values, int generation) {
        synchronized (ACCOUNT_LOCK) {
            if (accountGeneration() != generation) return false;
            Set<String> current = new HashSet<>(preferences.getStringSet(SCHEDULED_REQUEST_CODES, Set.of()));
            current.addAll(values);
            return preferences.edit().putStringSet(SCHEDULED_REQUEST_CODES, current).commit();
        }
    }

    public boolean markScheduleInstalledIfGeneration(int generation) {
        synchronized (ACCOUNT_LOCK) {
            if (accountGeneration() != generation) return false;
            return preferences.edit()
                    .putBoolean(SCHEDULE_INSTALLED, true)
                    .putBoolean(ENGINE_HEALTHY, true)
                    .putString(LAST_ERROR, "")
                    .commit();
        }
    }

    public void markScheduleFailureIfGeneration(String code, int generation) {
        synchronized (ACCOUNT_LOCK) {
            if (accountGeneration() != generation) return;
            preferences.edit()
                    .putBoolean(SCHEDULE_INSTALLED, false)
                    .putBoolean(ENGINE_HEALTHY, false)
                    .putString(LAST_ERROR, code)
                    .commit();
        }
    }

    public int accountGeneration() {
        synchronized (ACCOUNT_LOCK) {
            return preferences.getInt(ACCOUNT_GENERATION, 0);
        }
    }

    public int advanceAccountGeneration() {
        synchronized (ACCOUNT_LOCK) {
            return advanceAccountGenerationLocked();
        }
    }

    public int resetAccountState() {
        synchronized (ACCOUNT_LOCK) {
            int generation = advanceAccountGenerationLocked();
            if (!preferences.edit()
                    .remove(CONFIG)
                    .remove(DELIVERED)
                    .remove(DELIVERY_RECORDS)
                    .remove(DELIVERY_RECEIPTS)
                    .putBoolean(SCHEDULE_INSTALLED, false)
                    .putBoolean(ENGINE_HEALTHY, false)
                    .putString(LAST_ERROR, "")
                    .commit()) {
                throw new IllegalStateException("Could not reset native account state");
            }
            return generation;
        }
    }

    public int resetAccountStateAndQueueAuthorityRevocation() {
        synchronized (ACCOUNT_LOCK) {
            int current = preferences.getInt(ACCOUNT_GENERATION, 0);
            int generation = nextAccountGeneration(current);
            PendingAuthorityRevocation existingPending = pendingAuthorityRevocationLocked();
            String authorityId = preferences.getString(AUTHORITY_ID, "");
            if ((authorityId == null || authorityId.isBlank()) && existingPending != null) {
                authorityId = existingPending.authorityId;
            }

            SharedPreferences.Editor editor = preferences.edit()
                    .putInt(ACCOUNT_GENERATION, generation)
                    .remove(AUTHORITY_ID)
                    .remove(CONFIG)
                    .remove(DELIVERED)
                    .remove(DELIVERY_RECORDS)
                    .remove(DELIVERY_RECEIPTS)
                    .putBoolean(SCHEDULE_INSTALLED, false)
                    .putBoolean(ENGINE_HEALTHY, false)
                    .putString(LAST_ERROR, "");
            String canonicalAuthorityId = canonicalAuthorityId(authorityId);
            if (canonicalAuthorityId == null) {
                editor.remove(PENDING_AUTHORITY_REVOCATION);
            } else {
                try {
                    editor.putString(PENDING_AUTHORITY_REVOCATION, new JSONObject()
                            .put("authorityId", canonicalAuthorityId)
                            .put("targetGeneration", generation)
                            .toString());
                } catch (JSONException error) {
                    throw new IllegalStateException("Could not queue native authority revocation", error);
                }
            }
            if (!editor.commit()) throw new IllegalStateException("Could not reset native account state");
            return generation;
        }
    }

    public void clearAccountState() {
        synchronized (ACCOUNT_LOCK) {
            if (!clearAccountStateLocked()) {
                throw new IllegalStateException("Could not clear native account state");
            }
        }
    }

    private DeliveryLedger loadDeliveryLedgerLocked() {
        String raw = preferences.getString(DELIVERY_RECORDS, null);
        if (raw == null || raw.isBlank()) return new DeliveryLedger(MAX_DELIVERY_RECORDS);
        try {
            return DeliveryLedger.fromJson(new JSONObject(raw), MAX_DELIVERY_RECORDS);
        } catch (JSONException | RuntimeException error) {
            preferences.edit()
                    .putBoolean(ENGINE_HEALTHY, false)
                    .putString(LAST_ERROR, "delivery-ledger-invalid")
                    .commit();
            return null;
        }
    }

    private DeliveryReceiptQueue loadDeliveryReceiptQueueLocked() {
        String raw = preferences.getString(DELIVERY_RECEIPTS, null);
        if (raw == null || raw.isBlank()) return new DeliveryReceiptQueue(MAX_DELIVERY_RECEIPTS);
        try {
            return DeliveryReceiptQueue.fromJson(new JSONObject(raw), MAX_DELIVERY_RECEIPTS);
        } catch (JSONException | RuntimeException error) {
            preferences.edit()
                    .putBoolean(ENGINE_HEALTHY, false)
                    .putString(LAST_ERROR, "delivery-receipts-invalid")
                    .commit();
            return null;
        }
    }

    private PendingAuthorityRevocation pendingAuthorityRevocationLocked() {
        String raw = preferences.getString(PENDING_AUTHORITY_REVOCATION, null);
        if (raw == null || raw.isBlank()) return null;
        try {
            JSONObject object = new JSONObject(raw);
            String authorityId = canonicalAuthorityId(object.optString("authorityId", ""));
            int targetGeneration = object.optInt("targetGeneration", -1);
            if (authorityId == null || targetGeneration < 0) throw new JSONException("Invalid pending authority revocation");
            return new PendingAuthorityRevocation(authorityId, targetGeneration);
        } catch (JSONException | RuntimeException error) {
            preferences.edit()
                    .remove(PENDING_AUTHORITY_REVOCATION)
                    .putBoolean(ENGINE_HEALTHY, false)
                    .putString(LAST_ERROR, "authority-revocation-invalid")
                    .commit();
            return null;
        }
    }

    private boolean persistDeliveryLedgerLocked(DeliveryLedger ledger) {
        try {
            boolean persisted = preferences.edit()
                    .putString(DELIVERY_RECORDS, ledger.toJson().toString())
                    .commit();
            if (!persisted) {
                preferences.edit()
                        .putBoolean(ENGINE_HEALTHY, false)
                        .putString(LAST_ERROR, "delivery-ledger-persist-failed")
                        .commit();
            }
            return persisted;
        } catch (JSONException error) {
            preferences.edit()
                    .putBoolean(ENGINE_HEALTHY, false)
                    .putString(LAST_ERROR, "delivery-ledger-persist-failed")
                    .commit();
            return false;
        }
    }

    private boolean persistDeliveredAndReceiptQueueLocked(DeliveryLedger ledger, DeliveryReceiptQueue receiptQueue) {
        try {
            boolean persisted = preferences.edit()
                    .putString(DELIVERY_RECORDS, ledger.toJson().toString())
                    .putString(DELIVERY_RECEIPTS, receiptQueue.toJson().toString())
                    .commit();
            if (!persisted) markEngineError("delivery-receipt-persist-failed");
            return persisted;
        } catch (JSONException error) {
            markEngineError("delivery-receipt-persist-failed");
            return false;
        }
    }

    private boolean persistDeliveryReceiptQueueLocked(DeliveryReceiptQueue receiptQueue) {
        try {
            boolean persisted = preferences.edit()
                    .putString(DELIVERY_RECEIPTS, receiptQueue.toJson().toString())
                    .commit();
            if (!persisted) markEngineError("delivery-receipt-persist-failed");
            return persisted;
        } catch (JSONException error) {
            markEngineError("delivery-receipt-persist-failed");
            return false;
        }
    }

    private boolean legacyDeliveredLocked(String eventId) {
        return preferences.getStringSet(DELIVERED, Set.of()).contains(eventId);
    }

    private int advanceAccountGenerationLocked() {
        int current = preferences.getInt(ACCOUNT_GENERATION, 0);
        int next = nextAccountGeneration(current);
        if (!preferences.edit().putInt(ACCOUNT_GENERATION, next).remove(DELIVERY_RECEIPTS).commit()) {
            throw new IllegalStateException("Could not advance native account generation");
        }
        return next;
    }

    private static int nextAccountGeneration(int current) {
        return current == Integer.MAX_VALUE ? 1 : current + 1;
    }

    private static String canonicalAuthorityId(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            String canonical = UUID.fromString(value).toString();
            return canonical.equalsIgnoreCase(value) ? canonical : null;
        } catch (IllegalArgumentException error) {
            return null;
        }
    }

    private boolean clearAccountStateLocked() {
        return preferences.edit()
                .remove(CONFIG)
                .remove(DELIVERED)
                .remove(DELIVERY_RECORDS)
                .remove(DELIVERY_RECEIPTS)
                .putBoolean(SCHEDULE_INSTALLED, false)
                .putBoolean(ENGINE_HEALTHY, false)
                .putString(LAST_ERROR, "")
                .remove(SCHEDULED_REQUEST_CODES)
                .commit();
    }

    public static final class PendingAuthorityRevocation {
        public final String authorityId;
        public final int targetGeneration;

        public PendingAuthorityRevocation(String authorityId, int targetGeneration) {
            this.authorityId = authorityId;
            this.targetGeneration = targetGeneration;
        }
    }
}
