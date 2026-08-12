import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/locale-provider";
import { AgricultureCategoryPicker } from "@/features/onboarding/category-picker";
import { englishMessages } from "@/lib/i18n";
import hindiMessages from "@/lib/i18n/messages/hi-IN";

function renderPicker(
  props: ComponentProps<typeof AgricultureCategoryPicker>,
) {
  return render(
    <LocaleProvider locale="en-IN" messages={englishMessages}>
      <AgricultureCategoryPicker {...props} />
    </LocaleProvider>,
  );
}

describe("agriculture onboarding category picker", () => {
  it("searches and selects curated poultry and fisheries categories by slug", () => {
    const onSelected = vi.fn();
    renderPicker({
      selectedSlugs: [],
      customLabels: [],
      onSelectedSlugsChange: onSelected,
      onCustomLabelsChange: vi.fn(),
    });

    fireEvent.change(screen.getByLabelText("Search agriculture categories"), {
      target: { value: "broiler" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "Broiler chicken" }));
    expect(onSelected).toHaveBeenCalledWith(["broiler-chicken"]);
  });

  it("accepts Indian-script custom activities and rejects contact details", () => {
    const onCustom = vi.fn();
    const { rerender } = renderPicker({
      selectedSlugs: [],
      customLabels: [],
      onSelectedSlugsChange: vi.fn(),
      onCustomLabelsChange: onCustom,
    });

    const input = screen.getByLabelText("Food category, produce or farming activity");
    fireEvent.change(input, { target: { value: "मोती पालन" } });
    fireEvent.click(screen.getByRole("button", { name: "Add category" }));
    expect(onCustom).toHaveBeenCalledWith(["मोती पालन"]);

    rerender(
      <LocaleProvider locale="en-IN" messages={englishMessages}>
        <AgricultureCategoryPicker
          selectedSlugs={[]}
          customLabels={[]}
          onSelectedSlugsChange={vi.fn()}
          onCustomLabelsChange={onCustom}
        />
      </LocaleProvider>,
    );
    fireEvent.change(screen.getByLabelText("Food category, produce or farming activity"), {
      target: { value: "Call +91 98765 43210" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add category" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/contact details/i);
  });

  it("searches aliases, supports Hindi labels and excludes regulated meat from produce", () => {
    const onSelected = vi.fn();
    const { rerender } = renderPicker({
      selectedSlugs: [],
      customLabels: [],
      onSelectedSlugsChange: onSelected,
      onCustomLabelsChange: vi.fn(),
      context: "produce",
    });

    fireEvent.change(screen.getByLabelText("Search agriculture categories"), {
      target: { value: "doodh" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "Milk" }));
    expect(onSelected).toHaveBeenCalledWith(["milk"]);

    rerender(
      <LocaleProvider locale="hi-IN" messages={hindiMessages}>
        <AgricultureCategoryPicker
          selectedSlugs={[]}
          customLabels={[]}
          onSelectedSlugsChange={onSelected}
          onCustomLabelsChange={vi.fn()}
          context="produce"
        />
      </LocaleProvider>,
    );
    fireEvent.change(screen.getByLabelText("कृषि श्रेणियाँ खोजें"), {
      target: { value: "दूध" },
    });
    expect(screen.getByRole("checkbox", { name: "दूध" })).toBeVisible();
    fireEvent.change(screen.getByLabelText("कृषि श्रेणियाँ खोजें"), {
      target: { value: "मांस" },
    });
    expect(screen.queryByRole("checkbox", { name: "मांस" })).not.toBeInTheDocument();
  });

  it("enforces the combined curated and custom selection limit", () => {
    renderPicker({
      selectedSlugs: ["tomato"],
      customLabels: ["Rare forest tuber"],
      onSelectedSlugsChange: vi.fn(),
      onCustomLabelsChange: vi.fn(),
      maxTotalSelections: 2,
    });

    fireEvent.change(screen.getByLabelText("Search agriculture categories"), {
      target: { value: "onion" },
    });
    expect(screen.getByRole("checkbox", { name: "Onion" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add category" })).toBeDisabled();
    expect(screen.getByText("2 of 2 categories selected")).toBeVisible();
  });
});
