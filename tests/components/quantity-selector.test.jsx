import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuantitySelector } from "@/components/common/quantity-selector";

describe("QuantitySelector", () => {
  it("increments and decrements within bounds", async () => {
    const onChange = vi.fn();
    const { rerender } = render(<QuantitySelector value={2} max={3} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Increase quantity" }));
    expect(onChange).toHaveBeenLastCalledWith(3);
    await userEvent.click(screen.getByRole("button", { name: "Decrease quantity" }));
    expect(onChange).toHaveBeenLastCalledWith(1);
    rerender(<QuantitySelector value={3} max={3} onChange={onChange} />);
    expect(screen.getByRole("button", { name: "Increase quantity" })).toBeDisabled();
    rerender(<QuantitySelector value={1} max={3} onChange={onChange} />);
    expect(screen.getByRole("button", { name: "Decrease quantity" })).toBeDisabled();
  });
  it("clamps typed values to the maximum", async () => {
    const onChange = vi.fn();
    render(<QuantitySelector value={1} max={4} onChange={onChange} />);
    await userEvent.type(screen.getByRole("spinbutton"), "9");
    expect(onChange).toHaveBeenLastCalledWith(4);
  });
});
