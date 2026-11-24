import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { hydrateStores } from "../helpers";
import { useAuthStore, useUsersStore } from "@/store";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

import { RegisterForm } from "@/features/auth/register-form";

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ session: null });
  useUsersStore.setState({ users: [] });
  replace.mockClear();
  hydrateStores();
});

async function fill(values) {
  for (const [label, text] of Object.entries(values)) await userEvent.type(screen.getByLabelText(label), text);
}

describe("RegisterForm", () => {
  it("validates every field", async () => {
    render(<RegisterForm />);
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Enter your full name.")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid 10-digit mobile number.")).toBeInTheDocument();
    expect(screen.getByText("Use at least 8 characters.")).toBeInTheDocument();
  });
  it("creates an account, signs in and redirects", async () => {
    render(<RegisterForm />);
    await fill({ "Full name": "Asha Rao", Email: "asha@example.com", "Mobile number": "9876543210", Password: "password1" });
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(useUsersStore.getState().users).toHaveLength(1);
    expect(useAuthStore.getState().session.user.email).toBe("asha@example.com");
  });
  it("shows a field error for an existing email", async () => {
    render(<RegisterForm />);
    await fill({ "Full name": "Asha Rao", Email: "admin@shopsphere.dev", "Mobile number": "9876543210", Password: "password1" });
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("An account with this email already exists.")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
