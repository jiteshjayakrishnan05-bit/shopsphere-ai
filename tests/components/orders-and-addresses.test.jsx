import { describe, it, expect, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { hydrateStores } from "../helpers";
import { useAddressesStore, useAuthStore, useOrdersStore } from "@/store";
import seed from "@/data/orders.json";
import { OrdersView } from "@/features/orders/orders-view";
import { OrderDetail } from "@/features/orders/order-detail";
import { AddressesView } from "@/features/account/addresses-view";

const signIn = (user) => {
  localStorage.clear();
  useAuthStore.setState({ session: { token: "t", expiresAt: Date.now() + 3600000, user } });
  useOrdersStore.setState({ orders: seed });
  useAddressesStore.setState({ addresses: [] });
  hydrateStores();
};
const demo = { id: "demo-customer", name: "Demo Customer", email: "customer@shopsphere.dev", role: "customer" };
const admin = { id: "demo-admin", name: "Demo Admin", email: "admin@shopsphere.dev", role: "admin" };

describe("OrdersView", () => {
  it("lists the customer's orders newest first with status and total", () => {
    signIn(demo);
    render(<OrdersView />);
    const items = within(screen.getByRole("list", { name: "Orders" })).getAllByRole("listitem");
    expect(items).toHaveLength(6);
    expect(items[0]).toHaveTextContent("SS-20261120-DEMO1");
    expect(items[0]).toHaveTextContent("Order placed");
    expect(items[5]).toHaveTextContent("Delivered");
  });
  it("shows an empty state for a customer with no orders", () => {
    signIn({ id: "u-new", name: "New", email: "n@x.com", role: "customer" });
    render(<OrdersView />);
    expect(screen.getByText("No orders yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start shopping" })).toBeInTheDocument();
  });
  it("lets an administrator see every customer's orders", () => {
    signIn(admin);
    useOrdersStore.setState({ orders: [...seed, { ...seed[0], id: "OTHER-1", userId: "u9" }] });
    render(<OrdersView />);
    expect(screen.getByRole("heading", { name: "All orders" })).toBeInTheDocument();
    expect(screen.getByText(/OTHER-1/)).toBeInTheDocument();
  });
});

describe("OrderDetail", () => {
  it("shows the timeline with timestamps for completed stages and marks the current one", () => {
    signIn(demo);
    render(<OrderDetail id="SS-20261110-DEMO4" />); // shipped
    const steps = within(screen.getByRole("list", { name: "Order progress" })).getAllByRole("listitem");
    expect(steps).toHaveLength(6);
    expect(steps[3]).toHaveAttribute("aria-current", "step");
    expect(steps[3]).toHaveTextContent("Shipped");
    expect(steps[0]).not.toHaveTextContent("Pending");
    expect(steps[4]).toHaveTextContent("Pending");
    expect(steps[5]).toHaveTextContent("Pending");
    expect(screen.getByText(/Pay on delivery/)).toBeInTheDocument();
    expect(screen.getByText(/Simulated tracking/)).toBeInTheDocument();
  });
  it("shows items, quantities, prices, address and totals", () => {
    signIn(demo);
    render(<OrderDetail id="SS-20261101-DEMO6" />);
    expect(screen.getByText("Essence Mascara Lash Princess")).toBeInTheDocument();
    expect(screen.getByText(/₹839 × 2/)).toBeInTheDocument();
    expect(screen.getByText(/12 Anna Salai/)).toBeInTheDocument();
  });
  it("treats another customer's order exactly like a missing one", () => {
    signIn({ id: "u9", name: "Other", email: "o@x.com", role: "customer" });
    render(<OrderDetail id="SS-20261120-DEMO1" />);
    expect(screen.getByText("We couldn't find that order")).toBeInTheDocument();
    expect(screen.queryByText("Essence Mascara Lash Princess")).not.toBeInTheDocument();
  });
  it("does not show admin controls to customers", () => {
    signIn(demo);
    render(<OrderDetail id="SS-20261120-DEMO1" />);
    expect(screen.queryByRole("button", { name: /admin/ })).not.toBeInTheDocument();
  });
  it("lets an administrator advance an order through every stage; COD is collected on delivery", async () => {
    signIn(admin);
    render(<OrderDetail id="SS-20261110-DEMO4" />); // shipped, cash on delivery
    await userEvent.click(screen.getByRole("button", { name: /Advance to “Out for delivery”/ }));
    expect(useOrdersStore.getState().orders.find((o) => o.id === "SS-20261110-DEMO4").status).toBe("out_for_delivery");
    await userEvent.click(screen.getByRole("button", { name: /Advance to “Delivered”/ }));
    const o = useOrdersStore.getState().orders.find((x) => x.id === "SS-20261110-DEMO4");
    expect(o.status).toBe("delivered");
    expect(o.payment.status).toBe("paid");
    expect(o.timeline).toHaveLength(6);
    expect(screen.getByRole("button", { name: "Order delivered" })).toBeDisabled();
  });
});

describe("AddressesView", () => {
  const fill = async (over = {}) => {
    const v = { Address: "1 Lake Rd", City: "Kochi", State: "Kerala", "Postal code": "682001", ...over };
    for (const [label, text] of Object.entries(v)) await userEvent.type(screen.getByLabelText(label), text);
  };
  it("shows an empty state, then adds, edits, defaults and deletes addresses", async () => {
    signIn(demo);
    render(<AddressesView />);
    expect(screen.getByText("No saved addresses")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Add new address" }));
    await fill();
    await userEvent.click(screen.getByRole("button", { name: "Save address" }));
    expect(await screen.findByText(/1 Lake Rd, Kochi/)).toBeInTheDocument();
    expect(screen.getByText("Default")).toBeInTheDocument(); // first address is the default

    await userEvent.click(screen.getByRole("button", { name: "Add new address" }));
    await fill({ Address: "9 Hill St", City: "Ooty", "Postal code": "643001" });
    await userEvent.click(screen.getByRole("button", { name: "Save address" }));
    await userEvent.click(await screen.findByRole("button", { name: "Make Home address the default" }));
    expect(useAddressesStore.getState().addresses.filter((a) => a.isDefault)).toHaveLength(1);

    await userEvent.click(screen.getAllByRole("button", { name: /Edit Home address/ })[0]);
    await userEvent.clear(screen.getByLabelText("City"));
    await userEvent.type(screen.getByLabelText("City"), "Munnar");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText(/Munnar/)).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole("button", { name: /Delete Home address/ })[0]);
    expect(useAddressesStore.getState().addresses).toHaveLength(1);
    expect(useAddressesStore.getState().addresses[0].isDefault).toBe(true); // default promoted
  });
  it("validates the form", async () => {
    signIn(demo);
    render(<AddressesView />);
    await userEvent.click(screen.getByRole("button", { name: "Add new address" }));
    await userEvent.click(screen.getByRole("button", { name: "Save address" }));
    expect(await screen.findByText("Enter your street address.")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid 6-digit postal code.")).toBeInTheDocument();
  });
  it("only shows the signed-in user's addresses", () => {
    signIn(demo);
    useAddressesStore.setState({ addresses: [{ id: "x", userId: "someone-else", label: "Home", address: "Secret St 1", city: "C", state: "S", pincode: "600001", country: "India", isDefault: true }] });
    render(<AddressesView />);
    expect(screen.queryByText(/Secret St/)).not.toBeInTheDocument();
  });
});
