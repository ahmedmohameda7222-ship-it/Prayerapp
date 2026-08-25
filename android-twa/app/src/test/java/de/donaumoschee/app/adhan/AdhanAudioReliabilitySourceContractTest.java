package de.donaumoschee.app.adhan;

import org.junit.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

public final class AdhanAudioReliabilitySourceContractTest {
    private static Path sourcePath(String relativePath) {
        Path project = Path.of(System.getProperty("user.dir"));
        Path direct = project.resolve("src/main/java").resolve(relativePath);
        Path nested = project.resolve("app/src/main/java").resolve(relativePath);
        return Files.exists(direct) ? direct : nested;
    }

    private static String source(String relativePath) throws IOException {
        return new String(Files.readAllBytes(sourcePath(relativePath)), StandardCharsets.UTF_8);
    }

    @Test
    public void catalogPinsEveryCurrentlyFetchableApprovedAudioByteSequence() throws IOException {
        String catalog = source("de/donaumoschee/app/adhan/AdhanCatalog.java");

        assertTrue(catalog.contains("26989f59db7a11400478d91b40bf9684a0eaf8d02eaae04f814b7137d6f336a6"));
        assertTrue(catalog.contains("ee054cce38ef75fdb43f1fbb67504300afe575dd3dfe2ae7250c391bf6a60159"));
        assertTrue(catalog.contains("b5c42734f61498af03d33f439225737da20c8cd303cee0b904679fe545704ec3"));
        assertTrue(catalog.contains("fde397de2a5e07fc52c44d7f7d2fecc8e50c75141f2e98b538408e91843a568d"));
        assertTrue(catalog.contains("a25ea28777c7e3871758c51ade558a1fa3d2a8e4274f79aeced14b42437ed5f5"));
        assertTrue(catalog.contains("ed46ade566b30bee108e08f4dbc1a5341f7a2111eaf7de240686e3669af6ee65"));
        assertTrue(catalog.contains("27b6018f25cb3b227bb1089108721d94c63cbae4ce8ee13848dd81b50ff20112"));
        assertTrue(catalog.contains("7048e6b80e95ae72834cdb650ddb10fc2179e38b356cb78112700d1646db454c"));
        assertTrue(catalog.contains("approvedSha256"));
        assertTrue(catalog.contains("hasPinnedAudio"));
    }

    @Test
    public void cacheVerificationUsesCatalogPinAndNeverTrustsASelfGeneratedSidecar() throws IOException {
        String cache = source("de/donaumoschee/app/adhan/AudioCache.java");

        assertTrue(cache.contains("AdhanCatalog.approvedSha256(soundId)"));
        assertFalse(cache.contains(".sha256"));
        assertFalse(cache.contains("writeText("));
        assertFalse(cache.contains("readBounded("));
    }

    @Test
    public void verifiedDownloadIsInstalledAtomicallyWithoutDeletingTheGoodTargetFirst() throws IOException {
        String cache = source("de/donaumoschee/app/adhan/AudioCache.java");
        int expected = cache.indexOf("AdhanCatalog.approvedSha256(soundId)");
        int digest = cache.indexOf("sha256(temporary)", expected);
        int rename = cache.indexOf("Os.rename(", digest);

        assertTrue(expected >= 0);
        assertTrue(digest > expected);
        assertTrue(rename > digest);
        assertFalse(cache.contains("target.delete()"));
        assertFalse(cache.contains("temporary.renameTo(target)"));
    }

    @Test
    public void prayerTimePlaybackFailsClosedWhenVerifiedCacheIsUnavailable() throws IOException {
        String service = source("de/donaumoschee/app/adhan/AdhanPlaybackService.java");

        assertTrue(service.contains("if (cached == null)"));
        assertTrue(service.contains("adhan-audio-unavailable"));
        assertTrue(service.contains("Uri.fromFile(cached)"));
        assertFalse(service.contains("Uri.parse(AdhanCatalog.approvedUrl(soundId))"));
        assertFalse(service.contains("source=(cached == null ? \"remote\" : \"cache\")"));
    }

    @Test
    public void brokenLegacyFajrMadinahSourceIsNotRetriedAsIfItWerePinned() throws IOException {
        String catalog = source("de/donaumoschee/app/adhan/AdhanCatalog.java");
        String worker = source("de/donaumoschee/app/workers/AudioCacheWorker.java");

        assertTrue(catalog.contains("fajr-madinah"));
        assertTrue(worker.contains("AdhanCatalog.hasPinnedAudio(soundId)"));
    }
}
