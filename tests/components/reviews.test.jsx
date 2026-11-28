import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { hydrateStores, rawProduct, renderWithClient, stubProductApi } from "../helpers";
import { useAuthStore, useOrdersStore, useReviewsStore } from "@/store";

vi.mock("next/image", () => ({ default: ({ fill, priority, ...p }) => <img {...p} /> }));
import { ProductReviews } from "@/features/reviews/product-reviews";
import { MyReviewsView } from "@/features/reviews/my-reviews-view";

const product = { id: 50, title: "Lamp", rating: 4, raw: { reviews: [{ rating: 3, comment: "Okay product overall", reviewerName: "Cat", date: "2026-01-01T00:00:00Z" }] } };
const customer = { id: "u1", name: "Asha Rao", email: "asha@example.com", role: "customer" };
const admin = { id: "a1", name: "Admin", email: "admin@shopsphere.dev", role: "admin" };
const rv = (id, over = {}) => ({ id, productId: 50, userId: `x-${id}`, authorName: id, rating: 4, text: `Review text for ${id}`, createdAt: "2026-11-01T00:00:00.000Z", helpful: 0, notHelpful: 0, ...over });

function seed({ user = null, reviews = [], votes = {}, orders = [] } = {}) {
  localStorage.clear();
  useAuthStore.setState({ session: user ? { token: "t", expiresAt: Date.now() + 3600000, user } : null });
  useReviewsStore.setState({ reviews, votes });
  useOrdersStore.setState({ orders });
  hydrateStores();
}
const authors = () => within(screen.getByRole("list", { name: "Reviews" })).getAllByRole("listitem").map((li) => li.textContent);
afterEach(() => vi.unstubAllGlobals());

describe("summary and distribution", () => {
  it("combines customer and catalogue reviews into the average and a star distribution", () => {
    seed({ reviews: [rv("Ann", { rating: 5 }), rv("Ben", { rating: 1 }), rv("Cid", { rating: 3 })] });
    render(<ProductReviews product={product} />);
    expect(screen.getByText("3.0")).toBeInTheDocument(); // (5 + 1 + 3 + 3) / 4
    expect(screen.getByText("4 reviews")).toBeInTheDocument();
    const rows = within(screen.getByRole("list", { name: "Rating distribution" })).getAllByRole("listitem");
    expect(rows.map((r) => r.textContent)).toEqual(["5 stars1 review", "4 stars0 reviews", "3 stars2 reviews", "2 stars0 reviews", "1 stars1 review"]);
  });
  it("invites the first review when there are none", () => {
    seed();
    render(<ProductReviews product={{ id: 9, raw: {} }} />);
    expect(screen.getByText(/No reviews yet/)).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Sort reviews" })).not.toBeInTheDocument();
  });
});

describe("sorting", () => {
  it("offers Most recent, Highest rated, Lowest rated and Most helpful", async () => {
    seed({ reviews: [rv("Ann", { rating: 5, createdAt: "2026-11-01T00:00:00Z" }), rv("Ben", { rating: 1, createdAt: "2026-11-03T00:00:00Z" }), rv("Cid", { rating: 3, createdAt: "2026-11-02T00:00:00Z", helpful: 5 })] });
    render(<ProductReviews product={product} />);
    const select = screen.getByLabelText("Sort reviews");
    expect([...select.options].map((o) => o.textContent)).toEqual(["Most recent", "Highest rated", "Lowest rated", "Most helpful"]);
    expect(authors()[0]).toContain("Ben"); // newest first by default
    await userEvent.selectOptions(select, "Highest rated");
    expect(authors()[0]).toContain("Ann");
    await userEvent.selectOptions(select, "Lowest rated");
    expect(authors()[0]).toContain("Ben");
    await userEvent.selectOptions(select, "Most helpful");
    expect(authors()[0]).toContain("Cid");
  });
  it("shows the first five and expands on request", async () => {
    seed({ reviews: ["A", "B", "C", "D", "E", "F", "G"].map((id) => rv(id)) });
    render(<ProductReviews product={product} />);
    expect(authors()).toHaveLength(5);
    await userEvent.click(screen.getByRole("button", { name: "Show all 8 reviews" }));
    expect(authors()).toHaveLength(8);
    await userEvent.click(screen.getByRole("button", { name: "Show fewer reviews" }));
    expect(authors()).toHaveLength(5);
  });
});

describe("verified purchase badge (derived from order history)", () => {
  it("appears only for reviewers who ordered this product", () => {
    seed({ reviews: [rv("Buyer", { userId: "u2" }), rv("Stranger", { userId: "u3" })], orders: [{ id: "O1", userId: "u2", items: [{ productId: 50 }] }, { id: "O2", userId: "u3", items: [{ productId: 51 }] }] });
    render(<ProductReviews product={product} />);
    const items = within(screen.getByRole("list", { name: "Reviews" })).getAllByRole("listitem");
    const buyer = items.find((li) => li.textContent.includes("Buyer"));
    const stranger = items.find((li) => li.textContent.includes("Stranger"));
    expect(within(buyer).getByText("Verified purchase")).toBeInTheDocument();
    expect(within(stranger).queryByText("Verified purchase")).not.toBeInTheDocument();
    expect(screen.getAllByText("Verified purchase")).toHaveLength(1); // not every review
  });
});

describe("helpful voting", () => {
  it("lets a guest vote once, switch sides and take a vote back", async () => {
    seed({ reviews: [rv("Ann", { helpful: 2, notHelpful: 1 })] });
    render(<ProductReviews product={{ id: 50, raw: {} }} />);
    const up = () => screen.getByRole("button", { name: /^Helpful, / });
    const down = () => screen.getByRole("button", { name: /^Not helpful, / });
    expect(up()).toHaveAccessibleName("Helpful, 2");
    await userEvent.click(up());
    expect(up()).toHaveAccessibleName("Helpful, 3");
    expect(up()).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(down());
    expect(up()).toHaveAccessibleName("Helpful, 2");
    expect(down()).toHaveAccessibleName("Not helpful, 2");
    await userEvent.click(down());
    expect(down()).toHaveAccessibleName("Not helpful, 1");
    expect(down()).toHaveAttribute("aria-pressed", "false");
  });
  it("tracks votes per signed-in customer", async () => {
    seed({ user: customer, reviews: [rv("Ann")], votes: { Ann: { someoneElse: "up" } } });
    render(<ProductReviews product={{ id: 50, raw: {} }} />);
    await userEvent.click(screen.getByRole("button", { name: /^Helpful, / }));
    expect(useReviewsStore.getState().votes.Ann).toEqual({ someoneElse: "up", u1: "up" });
  });
});

describe("writing, editing and deleting a review", () => {
  it("validates, posts, and marks the new review as verified when the customer ordered the product", async () => {
    seed({ user: customer, orders: [{ id: "O9", userId: "u1", items: [{ productId: 50 }] }] });
    render(<ProductReviews product={product} />);
    await userEvent.click(screen.getByRole("button", { name: "Submit review" }));
    expect(await screen.findByText("Choose a rating from 1 to 5.")).toBeInTheDocument();
    expect(screen.getByText("Write at least 10 characters.")).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText("4 stars"));
    await userEvent.type(screen.getByLabelText("Your review"), "too short");
    await userEvent.click(screen.getByRole("button", { name: "Submit review" }));
    expect(await screen.findByText("Write at least 10 characters.")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Your review"), " but now long enough");
    expect(screen.getByText(/\/1000 characters/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Submit review" }));

    expect(await screen.findByText(/Your review was posted/)).toBeInTheDocument();
    const mine = useReviewsStore.getState().reviews[0];
    expect(mine).toMatchObject({ productId: 50, userId: "u1", authorName: "Asha Rao", rating: 4 });
    expect(screen.getByText("You have reviewed this product.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Your review")).not.toBeInTheDocument(); // one review per customer
    const own = within(screen.getByRole("list", { name: "Reviews" })).getAllByRole("listitem").find((li) => li.textContent.includes("Your review"));
    expect(within(own).getByText("Verified purchase")).toBeInTheDocument();
  });
  it("limits the text length in the field", async () => {
    seed({ user: customer });
    render(<ProductReviews product={product} />);
    expect(screen.getByLabelText("Your review")).toHaveAttribute("maxlength", "1000");
  });
  it("lets the customer edit their review", async () => {
    seed({ user: customer, reviews: [rv("Mine", { userId: "u1", authorName: "Asha Rao", rating: 2, text: "Not great at all really" })] });
    render(<ProductReviews product={product} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit your review" }));
    expect(screen.getByLabelText("Your review")).toHaveValue("Not great at all really");
    await userEvent.clear(screen.getByLabelText("Your review"));
    await userEvent.type(screen.getByLabelText("Your review"), "Grew on me, now quite happy");
    await userEvent.click(screen.getByLabelText("5 stars"));
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Your review was updated.")).toBeInTheDocument();
    expect(useReviewsStore.getState().reviews[0]).toMatchObject({ rating: 5, text: "Grew on me, now quite happy" });
    expect(screen.getByText("(edited)", { exact: false })).toBeInTheDocument();
  });
  it("lets the customer delete their review after confirming", async () => {
    seed({ user: customer, reviews: [rv("Mine", { userId: "u1", authorName: "Asha Rao" })] });
    render(<ProductReviews product={product} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete your review" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(useReviewsStore.getState().reviews).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: "Delete your review" }));
    await userEvent.click(screen.getByRole("button", { name: "Yes, remove" }));
    expect(useReviewsStore.getState().reviews).toHaveLength(0);
    expect(await screen.findByLabelText("Your review")).toBeInTheDocument(); // can write a new one
  });
});

describe("access rules", () => {
  it("asks guests to sign in and returns them to the product afterwards", () => {
    seed();
    render(<ProductReviews product={product} />);
    expect(screen.queryByLabelText("Your review")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login?next=%2Fproducts%2F50");
  });
  it("lets administrators moderate customer reviews but not post or remove catalogue reviews", async () => {
    seed({ user: admin, reviews: [rv("Ann")] });
    render(<ProductReviews product={product} />);
    expect(screen.queryByLabelText("Your review")).not.toBeInTheDocument();
    expect(screen.getByText(/moderate reviews and cannot post/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /\(moderation\)/ })).toHaveLength(1); // the catalogue review has no remove action
    await userEvent.click(screen.getByRole("button", { name: /Remove review by Ann/ }));
    await userEvent.click(screen.getByRole("button", { name: "Yes, remove" }));
    expect(useReviewsStore.getState().reviews).toHaveLength(0);
  });
  it("never shows delete controls to other customers", () => {
    seed({ user: customer, reviews: [rv("Ann")] });
    render(<ProductReviews product={product} />);
    expect(screen.queryByRole("button", { name: /Delete your review|moderation/ })).not.toBeInTheDocument();
  });
});

describe("safe rendering", () => {
  it("shows markup in a review as plain text and never creates elements", () => {
    seed({ reviews: [rv("Evil", { text: '<script>alert("x")</script> <img src=x onerror=alert(1)> <b>bold</b>' })] });
    const { container } = render(<ProductReviews product={product} />);
    expect(screen.getByText(/<script>alert\("x"\)<\/script>/)).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
  });
});

describe("MyReviewsView (account page)", () => {
  const view = () => renderWithClient(<MyReviewsView />);
  it("shows an empty state", () => {
    seed({ user: customer });
    stubProductApi({});
    view();
    expect(screen.getByText("No reviews yet")).toBeInTheDocument();
  });
  it("lists only the customer's own reviews with product names, and supports edit and remove", async () => {
    seed({ user: customer, reviews: [rv("Mine1", { productId: 1, userId: "u1", text: "Works nicely for me" }), rv("Mine2", { productId: 2, userId: "u1", text: "Decent but nothing special" }), rv("Other", { productId: 1, userId: "u9", text: "Someone else wrote this" })] });
    stubProductApi({ 1: rawProduct(1), 2: rawProduct(2) });
    view();
    expect(await screen.findByRole("link", { name: "Product 1" })).toHaveAttribute("href", "/products/1");
    expect(screen.getByRole("link", { name: "Product 2" })).toBeInTheDocument();
    expect(screen.queryByText("Someone else wrote this")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Edit your review of Product 1" }));
    await userEvent.clear(screen.getByLabelText("Your review"));
    await userEvent.type(screen.getByLabelText("Your review"), "Even better after a month");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Your review was updated.")).toBeInTheDocument();
    expect(screen.getByText("Even better after a month")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Remove your review of Product 2" }));
    await userEvent.click(screen.getByRole("button", { name: "Yes, remove" }));
    expect(useReviewsStore.getState().reviews.map((r) => r.id).sort()).toEqual(["Mine1", "Other"]);
  });
});

describe("React StrictMode (as in npm run dev)", () => {
  it("posts a review exactly once", async () => {
    const { StrictMode } = await import("react");
    seed({ user: customer });
    render(<StrictMode><ProductReviews product={product} /></StrictMode>);
    await userEvent.click(screen.getByLabelText("5 stars"));
    await userEvent.type(screen.getByLabelText("Your review"), "Lovely lamp, works perfectly");
    await userEvent.click(screen.getByRole("button", { name: "Submit review" }));
    expect(await screen.findByText(/Your review was posted/)).toBeInTheDocument();
    expect(useReviewsStore.getState().reviews).toHaveLength(1);
  });
});
