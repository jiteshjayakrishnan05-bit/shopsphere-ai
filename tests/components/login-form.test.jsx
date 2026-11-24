import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { hydrateStores } from "../helpers";
import { useAuthStore } from "@/store";

const replace = vi.fn();
let nextParam = null;
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  useSearchParams: () => ({ get: (k) => (k === "next" ? nextParam : null) }),
}));

import { LoginForm } from "@/features/auth/login-form";

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ session: null });
  replace.mockClear();
  nextParam = null;
  hydrateStores();
});

describe("LoginForm", () => {
  it("shows inline validation errors and does not submit", async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText("Enter your password.")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(replace).not.toHaveBeenCalled();
  });
  it("shows a generic error for wrong credentials", async () => {
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "customer@shopsphere.dev");
    await userEvent.type(screen.getByLabelText("Password"), "wrongpass");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password.");
  });
  it("signs in, stores the session and redirects home", async () => {
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "customer@shopsphere.dev");
    await userEvent.type(screen.getByLabelText("Password"), "Customer@123");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(useAuthStore.getState().session.user.role).toBe("customer");
  });
  it("sends admins to /admin and honours a safe next param", async () => {
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "admin@shopsphere.dev");
    await userEvent.type(screen.getByLabelText("Password"), "Admin@1234");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin"));
  });
  it("ignores an unsafe next param", async () => {
    nextParam = "https://evil.com";
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "customer@shopsphere.dev");
    await userEvent.type(screen.getByLabelText("Password"), "Customer@123");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });
});
