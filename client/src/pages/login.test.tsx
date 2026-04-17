import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("@/services/authPersistence", () => ({
  authPersistence: { setToken: vi.fn() },
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import LoginPage from "./login";

function setUrl(search: string) {
  window.history.replaceState({}, "", `/login${search}`);
}

describe("LoginPage email prefill from query string", () => {
  beforeEach(() => {
    cleanup();
  });

  it("prefills the email input when ?email=... is present", () => {
    setUrl("?email=foo%40bar.com");
    render(<LoginPage />);
    const input = screen.getByTestId("input-email") as HTMLInputElement;
    expect(input.value).toBe("foo@bar.com");
  });

  it("leaves the email input empty when no email query param is present", () => {
    setUrl("");
    render(<LoginPage />);
    const input = screen.getByTestId("input-email") as HTMLInputElement;
    expect(input.value).toBe("");
  });

  it("leaves the email input empty when an unrelated query param is present", () => {
    setUrl("?returnTo=/account");
    render(<LoginPage />);
    const input = screen.getByTestId("input-email") as HTMLInputElement;
    expect(input.value).toBe("");
  });
});
