package de.donaumoschee.app.adhan;

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
import de.donaumoschee.app.prayer.PrayerScheduler;
import de.donaumoschee.app.prayer.Prayer;

import java.io.File;
import java.util.List;

@OptIn(markerClass = UnstableApi.class)
public final class AdhanPlaybackService extends MediaSessionService {
    private static final String TAG = "DanubePrayer";
    public static final String ACTION_PLAY = "de.donaumoschee.app.action.PLAY_ADHAN";

    private ExoPlayer player;
    private MediaSession mediaSession;
    private boolean playbackStarted;

    @Override
    public void onCreate() {
        super.onCreate();
        setMediaNotificationProvider(new DefaultMediaNotificationProvider.Builder(this)
                .setChannelId("adhan-playback-v1")
                .setChannelName(R.string.channel_adhan_playback)
                .build());
        player = new ExoPlayer.Builder(this).build();
        player.setAudioAttributes(new AudioAttributes.Builder().setUsage(C.USAGE_ALARM).setContentType(C.AUDIO_CONTENT_TYPE_MUSIC).build(), true);
        player.setWakeMode(C.WAKE_MODE_LOCAL);
        player.addListener(new Player.Listener() {
            @Override
            public void onPlaybackStateChanged(int playbackState) {
                if (playbackState == Player.STATE_ENDED || (playbackStarted && playbackState == Player.STATE_IDLE)) {
                    Log.i(TAG, "adhan.playback completed state=" + playbackState);
                    stopAndReleasePlayback();
                }
            }

            @Override
            public void onPlayerError(androidx.media3.common.PlaybackException error) {
                Log.e(TAG, "adhan.playback errorCode=" + error.errorCode);
                stopAndReleasePlayback();
            }
        });
        mediaSession = new MediaSession.Builder(this, player).build();
        mediaSession.setMediaButtonPreferences(List.of(
                new CommandButton.Builder(CommandButton.ICON_STOP)
                        .setPlayerCommand(Player.COMMAND_STOP)
                        .setDisplayName(getString(R.string.stop_adhan))
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
        String soundId = intent.getStringExtra(PrayerScheduler.EXTRA_ADHAN_SOUND_ID);
        String prayer = intent.getStringExtra(PrayerScheduler.EXTRA_PRAYER);
        if (!AdhanCatalog.isApproved(soundId)) {
            stopSelf();
            return START_NOT_STICKY;
        }
        File cached = AudioCache.verifiedFile(this, soundId);
        Log.i(TAG, "adhan.playback start prayer=" + prayer + " source=" + (cached == null ? "remote" : "cache"));
        Uri uri = cached == null ? Uri.parse(AdhanCatalog.approvedUrl(soundId)) : Uri.fromFile(cached);
        String prayerName = prayer;
        try { prayerName = Prayer.fromKey(prayer).displayName(this); }
        catch (IllegalArgumentException | NullPointerException ignored) { }
        MediaMetadata metadata = new MediaMetadata.Builder()
                .setTitle(getString(R.string.adhan_notification_title))
                .setArtist(prayerName == null ? getString(R.string.app_name) : prayerName)
                .build();
        player.setMediaItem(new MediaItem.Builder().setUri(uri).setMediaMetadata(metadata).build());
        player.prepare();
        playbackStarted = true;
        player.play();
        return START_NOT_STICKY;
    }

    private void stopAndReleasePlayback() {
        if (player != null) {
            playbackStarted = false;
            player.stop();
            player.clearMediaItems();
        }
        stopSelf();
    }

    @Override
    public void onDestroy() {
        if (mediaSession != null) mediaSession.release();
        if (player != null) player.release();
        mediaSession = null;
        player = null;
        super.onDestroy();
    }
}
