package de.donaumoschee.app.bridge;

import org.json.JSONException;
import org.junit.Test;

import static org.junit.Assert.assertEquals;

public final class BridgeProtocolTest {
    @Test
    public void acceptsOnlyVersionedWhitelistedMessages() throws Exception {
        BridgeProtocol.Envelope envelope = BridgeProtocol.parseInbound(
                "{\"version\":1,\"type\":\"native.status.request\",\"payload\":{}}"
        );
        assertEquals("native.status.request", envelope.type);
    }

    @Test
    public void acceptsAccountResetCommand() throws Exception {
        BridgeProtocol.Envelope envelope = BridgeProtocol.parseInbound(
                "{\"version\":1,\"type\":\"native.account.reset\",\"payload\":{}}"
        );
        assertEquals("native.account.reset", envelope.type);
    }

    @Test
    public void acceptsAuthorityBindingCommand() throws Exception {
        BridgeProtocol.Envelope envelope = BridgeProtocol.parseInbound(
                "{\"version\":1,\"type\":\"native.authority.bind\",\"payload\":{\"authorityId\":\"8e5f7ac6-7a84-4d3e-946a-e4f91be50a7c\"}}"
        );
        assertEquals("native.authority.bind", envelope.type);
    }

    @Test
    public void acceptsAuthorityClearCommand() throws Exception {
        BridgeProtocol.Envelope envelope = BridgeProtocol.parseInbound(
                "{\"version\":1,\"type\":\"native.authority.clear\",\"payload\":{}}"
        );
        assertEquals("native.authority.clear", envelope.type);
    }

    @Test(expected = JSONException.class)
    public void rejectsUnknownTypes() throws Exception {
        BridgeProtocol.parseInbound("{\"version\":1,\"type\":\"native.open.url\",\"payload\":{}}");
    }

    @Test(expected = JSONException.class)
    public void rejectsUnknownVersions() throws Exception {
        BridgeProtocol.parseInbound("{\"version\":2,\"type\":\"native.status.request\",\"payload\":{}}");
    }

    @Test(expected = JSONException.class)
    public void rejectsNonObjectPayloads() throws Exception {
        BridgeProtocol.parseInbound("{\"version\":1,\"type\":\"native.status.request\",\"payload\":[]}");
    }

    @Test(expected = JSONException.class)
    public void rejectsOversizedMessages() throws Exception {
        BridgeProtocol.parseInbound("x".repeat(BridgeProtocol.MAX_MESSAGE_LENGTH + 1));
    }
}
