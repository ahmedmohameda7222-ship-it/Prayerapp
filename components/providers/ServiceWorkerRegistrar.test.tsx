import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ServiceWorkerRegistrar } from "./ServiceWorkerRegistrar";

const originalServiceWorker = Object.getOwnPropertyDescriptor(navigator, "serviceWorker");

afterEach(() => {
  if (originalServiceWorker) {
    Object.defineProperty(navigator, "serviceWorker", originalServiceWorker);
  } else {
    Reflect.deleteProperty(navigator, "serviceWorker");
  }
});

describe("ServiceWorkerRegistrar", () => {
  it("removes old registrations without registering a service worker outside production", async () => {
    const unregister = vi.fn().mockResolvedValue(true);
    const register = vi.fn();
    const getRegistrations = vi.fn().mockResolvedValue([{ unregister }]);
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { getRegistrations, register },
    });

    render(<ServiceWorkerRegistrar />);

    await waitFor(() => expect(unregister).toHaveBeenCalledOnce());
    expect(register).not.toHaveBeenCalled();
  });
});
