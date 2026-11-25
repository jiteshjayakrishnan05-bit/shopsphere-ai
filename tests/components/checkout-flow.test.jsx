import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { cartItem, hydrateStores, rawProduct, renderWithClient, stubProductApi } from "../helpers";
import { useAddressesStore, useAuthStore, useCartStore, useCheckoutStore, useOrdersStore } from "@/store";

vi.mock("next/image", () => ({ default: ({ fill, priority, ...p }) => <img {...p} /> }));
// Keep the real payment rules but skip the artificial processing delay.
vi.mock("@/features/checkout/mock-payment", async (orig) => {
  const actual = await orig();
  return { ...actual, simulatePayment: (m, d) => actual.simulatePayment(m, d, { delayMs: 0 }) };
});
import { CheckoutFlow } from "@/features/checkout/checkout-flow";

const user = { id: "u1", name: "Asha Rao", email: "asha@example.com", phone: "9876543210", role: "customer" };
const address = { address: "12 Anna Salai", city: "Chennai", state: "Tamil Nadu", pincode: "600002", country: "India" };

function seed({ cart = [cartItem(1, 2)], step = 0, data = {}, routes = { 1: rawProduct(1) }, saved = [] } = {}) {
  localStorage.clear();
  useAuthStore.setState({ session: { token: "t", expiresAt: Date.now() + 3600000, user } });
  useCartStore.setState({ items: cart, savedForLater: [], couponCode: null });
  useCheckoutStore.setState({ step, data: { ownerId: "u1", ...data } });
  useAddressesStore.setState({ addresses: saved });
  useOrdersStore.setState({ orders: [] });
  hydrateStores();
  stubProductApi(routes);
}
afterEach(() => vi.unstubAllGlobals());
const heading = () => screen.findByRole("heading", { level: 2, name: /^(Customer|Address|Delivery|Summary|Payment|Confirmation)$/ });
const filled = { customer: { name: "Asha Rao", email: "asha@example.com", phone: "9876543210" }, address, deliveryId: "standard" };

describe("CheckoutFlow", () => {
  it("completes all six steps with a simulated UPI payment and creates the order", async () => {
    seed();
    renderWithClient(<CheckoutFlow />);
    expect(await screen.findByRole("heading", { name: "Customer" })).toBeInTheDocument();
    expect(screen.getByLabelText("Full name")).toHaveValue("Asha Rao"); // prefilled from the account
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByRole("heading", { name: "Address" })).toBeInTheDocument();
    await userEvent.type(screen.getByRole("textbox", { name: "Address" }), "12 Anna Salai");
    await userEvent.type(screen.getByLabelText("City"), "Chennai");
    await userEvent.type(screen.getByLabelText("State"), "Tamil Nadu");
    await userEvent.type(screen.getByLabelText("Postal code"), "600002");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByRole("heading", { name: "Delivery" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByRole("heading", { name: "Summary" })).toBeInTheDocument();
    expect(screen.getByText(/Product 1/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Continue to payment" }));

    expect(await screen.findByRole("heading", { name: "Payment" })).toBeInTheDocument();
    expect(screen.getByText(/Test mode\./)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: "Mock UPI" }));
    await userEvent.type(screen.getByLabelText("Test UPI handle"), "success@test");
    await userEvent.click(screen.getByRole("button", { name: /Pay .* \(test\)/ }));

    const id = (await screen.findByTestId("order-id")).textContent;
    expect(id).toMatch(/^SS-\d{8}-[0-9A-Z]{5}$/);
    expect(screen.getByText(/Paid \(simulated test payment\)/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Track your order" })).toHaveAttribute("href", `/orders/${id}`);

    const [order] = useOrdersStore.getState().orders;
    expect(order).toMatchObject({ id, userId: "u1", status: "placed", pricing: { subtotal: 1680, shipping: 0, tax: 302, total: 1982 } });
    expect(order.items[0]).toMatchObject({ productId: 1, quantity: 2, price: 840 });
    expect(useCartStore.getState().items).toHaveLength(0); // cart cleared only after success
  });

  it("finishes the payment under React StrictMode, like `npm run dev` (regression: button stuck on Processing)", async () => {
    seed({ step: 4, data: filled });
    renderWithClient(<CheckoutFlow />, { strict: true });
    await userEvent.click(await screen.findByRole("button", { name: /Pay .* \(test\)/ }));
    expect(await screen.findByTestId("order-id")).toBeInTheDocument();
    expect(useOrdersStore.getState().orders).toHaveLength(1);
  });

  it("validates each step before continuing", async () => {
    seed({ data: { customer: { name: "", email: "bad", phone: "1" } } });
    renderWithClient(<CheckoutFlow />);
    await userEvent.click(await screen.findByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Enter your full name.")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid 10-digit mobile number.")).toBeInTheDocument();
    expect(useCheckoutStore.getState().step).toBe(0);
  });

  it("rejects an invalid postal code and saves a valid new address to the account", async () => {
    seed({ step: 1, data: { customer: filled.customer } });
    renderWithClient(<CheckoutFlow />);
    await userEvent.type(await screen.findByRole("textbox", { name: "Address" }), "12 Anna Salai");
    await userEvent.type(screen.getByLabelText("City"), "Chennai");
    await userEvent.type(screen.getByLabelText("State"), "Tamil Nadu");
    await userEvent.type(screen.getByLabelText("Postal code"), "123");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Enter a valid 6-digit postal code.")).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText("Postal code"));
    await userEvent.type(screen.getByLabelText("Postal code"), "600002");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("heading", { name: "Delivery" })).toBeInTheDocument();
    expect(useAddressesStore.getState().addresses).toHaveLength(1);
    expect(useAddressesStore.getState().addresses[0]).toMatchObject({ userId: "u1", pincode: "600002", isDefault: true });
  });

  it("lets a registered user pick a saved address", async () => {
    const saved = [{ id: "a1", userId: "u1", label: "Home", ...address, isDefault: true }, { id: "a2", userId: "u1", label: "Work", ...address, city: "Madurai", isDefault: false }];
    seed({ step: 1, data: { customer: filled.customer }, saved });
    renderWithClient(<CheckoutFlow />);
    expect(await screen.findByRole("radio", { name: /Home/ })).toBeChecked(); // default preselected
    await userEvent.click(screen.getByRole("radio", { name: /Work/ }));
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("heading", { name: "Delivery" })).toBeInTheDocument();
    expect(useCheckoutStore.getState().data).toMatchObject({ addressId: "a2", address: { city: "Madurai" } });
  });

  it("shows a payment failure and lets the customer retry without restarting checkout", async () => {
    seed({ step: 4, data: filled });
    renderWithClient(<CheckoutFlow />);
    await screen.findByRole("heading", { name: "Payment" });
    await userEvent.click(screen.getByRole("radio", { name: /ending 0002/ }));
    await userEvent.click(screen.getByRole("button", { name: /Pay .* \(test\)/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Payment failed: The test card was declined/);
    expect(screen.getByRole("heading", { name: "Payment" })).toBeInTheDocument(); // still on the payment step
    expect(useOrdersStore.getState().orders).toHaveLength(0);
    expect(useCartStore.getState().items).toHaveLength(1); // nothing lost
    await userEvent.click(screen.getByRole("radio", { name: /ending 4242/ }));
    await userEvent.click(screen.getByRole("button", { name: "Retry payment" }));
    expect(await screen.findByTestId("order-id")).toBeInTheDocument();
    expect(useOrdersStore.getState().orders).toHaveLength(1); // exactly one order
  });

  it("validates the test UPI handle and never accepts real-looking ones", async () => {
    seed({ step: 4, data: filled });
    renderWithClient(<CheckoutFlow />);
    await userEvent.click(await screen.findByRole("radio", { name: "Mock UPI" }));
    await userEvent.type(screen.getByLabelText("Test UPI handle"), "9876543210@okbank");
    await userEvent.click(screen.getByRole("button", { name: /Pay .* \(test\)/ }));
    expect(await screen.findByText(/Use a test handle ending in @test/)).toBeInTheDocument();
    expect(useOrdersStore.getState().orders).toHaveLength(0);
  });

  it("places a cash-on-delivery order with payment pending", async () => {
    seed({ step: 4, data: filled });
    renderWithClient(<CheckoutFlow />);
    await userEvent.click(await screen.findByRole("radio", { name: "Cash on delivery" }));
    await userEvent.click(screen.getByRole("button", { name: "Place order" }));
    expect(await screen.findByText(/Pay on delivery/)).toBeInTheDocument();
    expect(useOrdersStore.getState().orders[0].payment.status).toBe("cod_pending");
  });

  it("restores the saved step and details after a refresh", async () => {
    seed({ step: 3, data: filled });
    const first = renderWithClient(<CheckoutFlow />);
    expect(await screen.findByRole("heading", { name: "Summary" })).toBeInTheDocument();
    first.unmount();
    hydrateStores(); // simulate a fresh page load reading localStorage
    renderWithClient(<CheckoutFlow />);
    expect(await screen.findByRole("heading", { name: "Summary" })).toBeInTheDocument();
    expect(screen.getByText(/12 Anna Salai/)).toBeInTheDocument();
  });

  it("goes back to change an earlier step from the summary", async () => {
    seed({ step: 3, data: filled });
    renderWithClient(<CheckoutFlow />);
    const customer = (await screen.findByText("Customer", { selector: "h3" })).closest("section");
    await userEvent.click(within(customer).getByRole("button", { name: "Change" }));
    expect(await screen.findByRole("heading", { name: "Customer" })).toBeInTheDocument();
  });

  it("does not leak one customer's saved details to another", async () => {
    seed({ step: 3, data: { ...filled, ownerId: "someone-else" } });
    renderWithClient(<CheckoutFlow />);
    expect(await screen.findByRole("heading", { name: "Customer" })).toBeInTheDocument();
    await waitFor(() => expect(useCheckoutStore.getState().data).toEqual({ ownerId: "u1" }));
  });

  it("blocks checkout when a cart item is no longer available", async () => {
    seed({ routes: { 1: "404" } });
    renderWithClient(<CheckoutFlow />);
    expect(await screen.findByText("Some items in your cart need attention")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review your cart" })).toHaveAttribute("href", "/cart");
  });

  it("shows an empty-cart message instead of an empty checkout", async () => {
    seed({ cart: [] });
    renderWithClient(<CheckoutFlow />);
    expect(await screen.findByText("Your cart is empty")).toBeInTheDocument();
  });

  it("shows the confirmation again after a refresh on the last step", async () => {
    seed({ cart: [], step: 5, data: { ...filled, orderId: "SS-TEST-00001" } });
    useOrdersStore.setState({ orders: [{ id: "SS-TEST-00001", userId: "u1", status: "placed", timeline: [], items: [{ productId: 1, title: "Product 1", price: 840, quantity: 2, variant: null }], pricing: { subtotal: 1680, discount: 0, shipping: 0, tax: 302, total: 1982 }, delivery: { label: "Standard delivery" }, address, payment: { label: "Mock UPI", status: "paid" }, expectedDelivery: new Date().toISOString() }] });
    renderWithClient(<CheckoutFlow />);
    expect(await screen.findByTestId("order-id")).toHaveTextContent("SS-TEST-00001");
  });
});
