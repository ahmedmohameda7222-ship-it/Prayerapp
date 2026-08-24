package de.donaumoschee.app.adhan;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.IBinder;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.annotation.OptIn;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.Player;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;
import androidx.media3.session.CommandButton;
import androidx.media3.session.DefaultMediaNotificationProvider;

import de.donaumoschee.app.R;
import de.donaumoschee.app.localization.AppLocale;
import de.donaumoschee.app.prayer.PrayerScheduler;
import de.donaumoschee.app.prayer.Prayer;
import de.donaumoschee.app.storage.NativeStore;
import de.donaumoschee.app.workers.NativeWork;

import java.io.File;
import java.util.List;

@OptIn(markerClass = UnstableApi.class)
public final class AdhanPlaybackService extends MediaSessionService {
    private static final String TAG = "DanubePrayer";
    public static final String ACTION_PLAY = "de.donaumoschee.app.action.PLAY_ADHAN";
    public static final String CHANNEL = "adhan-playback-v1";

    private ExoPlayer player;
    private MediaSession mediaSession;
    private boolean playbackStarted;
    private boolean playbackAcknowledged;
    private String currentEventId;

    @Override
    public void onCreate() {
        super.onCreate();
        Context localizedContext = localizedContext();
        setMediaNotificationProvider(new DefaultMediaNotificationProvider.Builder(this)
                .setChannelId(CHANNEL)
                .setChannelName(R.string.channel_adhan_playback)
                .build());
        player = new ExoPlayer.Builder(this).build();
        player.setAudioAttributes(new AudioAttributes.Builder().setUsage(C.USAGE_ALARM).setContentType(C.AUDIO_CONTENT_TYPE_MUSIC).build(), true);
        player.setWakeMode(C.WAKE_MODE_LOCAL);
        player.addListener(new Player.Listener() {
            @Override
            public void onIsPlayingChanged(boolean isPlaying) {
                if (!isPlaying || currentEventId == null || playbackAcknowledged) return;
                NativeStore store = new NativeStore(AdhanPlaybackService.this);
                if (!store.markDeliveryDelivered(currentEventId, System.currentTimeMillis())) {
                    store.markEngineError("adhan-delivery-state-persist-failed");
                } else {
                    NativeWork.flushReceipts(AdhanPlaybackService.this);
                }
                playbackAcknowledged = true;
                Log.i(TAG, "adhan.playback acknowledged event=" + currentEventId);
            }

            @Override
            public void onPlaybackStateChanged(int playbackState) {
                if (playbackState == Player.STATE_ENDED || (playbackStarted && playbackState == Player.STATE_IDLE)) {
                    if (!playbackAcknowledged) {
                        markDeliveryFailed("adhan-playback-ended-before-start");
                    }
                    Log.i(TAG, "adhan.playback completed state=" + playbackState);
                    stopAndReleasePlayback();
                }
            }

            @Override
            public void onPlayerError(androidx.media3.common.PlaybackException error) {
                if (!playbackAcknowledged) {
                    markDeliveryFailed("adhan-playback-failed");
                }
                Log.e(TAG, "adhan.playback errorCode=" + error.errorCode);
                stopAndReleasePlayback();
            }
        });
        mediaSession = new MediaSession.Builder(this, player).build();
        mediaSession.setMediaButtonPreferences(List.of(
                new CommandButton.Builder(CommandButton.ICON_STOP)
                        .setPlayerCommand(Player.COMMAND_STOP)
                        .setDisplayName(localizedContext.getString(R.string.stop_adhan))
                        .setSlots(CommandButton.SLOT_FORWARD)
                        .build()
        ));
    }

    @Nullable
    @Override
    public MediaSession onGetSession(MediaSession.ControllerInfo controllerInfo) {
        return mediaSession;
    }

    @Override
    public int onStartCommand(@Nullable Intent intent, int flags, int startId) {
        int result = super.onStartCommand(intent, flags, startId);
        if (intent == null || !ACTION_PLAY.equals(intent.getAction())) return result;

        String eventId = intent.getStringExtra(PrayerScheduler.EXTRA_EVENT_ID);
        String soundId = intent.getStringExtra(PrayerScheduler.EXTRA_ADHAN_SOUND_ID);
        String prayer = intent.getStringExtra(PrayerScheduler.EXTRA_PRAYER);
        if (eventId == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        currentEventId = eventId;
        playbackAcknowledged = false;
        playbackStarted = false;

        if (!AdhanCatalog.isApproved(soundId)) {
            markDeliveryFailed("adhan-sound-invalid");
            stopAndReleasePlayback();
            return START_NOT_STICKY;
        }

        try {
            File cached = AudioCache.verifiedFile(this, soundId);
            if (cached == null) {
                markDeliveryFailed("adhan-audio-unavailable");
                Log.e(TAG, "adhan.playback verified-cache-unavailable soundId=" + soundId);
                stopAndReleasePlayback();
                return START_NOT_STICKY;
            }
            Log.i(TAG, "adhan.playback start prayer=" + prayer + " source=cache");
            Uri uri = Uri.fromFile(cached);
            Context localizedContext = localizedContext();
            String prayerName = prayer;
            try {
                prayerName = Prayer.fromKey(prayer).displayName(this);
            } catch (IllegalArgumentException | NullPointerException ignored) {
                // Keep the raw prayer key for diagnostic metadata.
            }
            MediaMetadata metadata = new MediaMetadata.Builder()
                    .setTitle(localizedContext.getString(R.string.adhan_notification_title))
                    .setArtist(prayerName == null ? localizedContext.getString(R.string.app_name) : prayerName)
                    .build();
            player.setMediaItem(new MediaItem.Builder().setUri(uri).setMediaMetadata(metadata).build());
            player.prepare();
            playbackStarted = true;
            player.play();
        } catch (RuntimeException error) {
            markDeliveryFailed("adhan-playback-start-failed");
            Log.e(TAG, "adhan.playback start-failed=" + error.getClass().getSimpleName());
            stopAndReleasePlayback();
        }
        return START_NOT_STICKY;
    }

    private Context localizedContext() {
        return AppLocale.localizedContext(this, new NativeStore(this).appLocale());
    }

    private void markDeliveryFailed(String failureCode) {
        if (currentEventId == null || playbackAcknowledged) return;
        NativeStore store = new NativeStore(this);
        if (!store.markDeliveryFailed(currentEventId, failureCode, System.currentTimeMillis())) {
            store.markEngineError("adhan-delivery-failure-persist-failed");
        }
        playbackAcknowledged = true;
    }

    private void stopAndReleasePlayback() {
        playbackStarted = false;
        if (player != null) {
            player.stop();
            player.clearMediaItems();
        }
        currentEventId = null;
        playbackAcknowledged = false;
        stopSelf();
    }

    @Override
    public void onDestroy() {
        if (mediaSession != null) mediaSession.release();
        if (player != null) player.release();
        mediaSession = null;
        player = null;
        currentEventId = null;
        playbackAcknowledged = false;
        super.onDestroy();
    }
}
