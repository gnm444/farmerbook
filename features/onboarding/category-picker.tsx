"use client";

import { useId, useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { useTranslations } from "@/components/locale-provider";
import {
  AGRICULTURE_CATEGORIES,
  agricultureCategoriesForContext,
  agricultureCategoryByLabel,
  agricultureCategoryBySlug,
  agricultureCategoryMatches,
  type AgricultureCategory,
  type AgricultureCategorySlug,
  type AgricultureSelectionContext,
} from "@/lib/agriculture/categories";
import {
  categoryLabelKey,
  validateCustomCategoryLabel,
} from "@/lib/agriculture/normalization";

function rootSlugFor(slug: string) {
  let category = agricultureCategoryBySlug(slug);
  const seen = new Set<string>();
  while (
    category &&
    "parentSlug" in category &&
    category.parentSlug &&
    !seen.has(category.slug)
  ) {
    seen.add(category.slug);
    category = agricultureCategoryBySlug(category.parentSlug);
  }
  return category?.slug ?? slug;
}

function sectionSlugFor(slug: string, rootSlug: string) {
  let category = agricultureCategoryBySlug(slug);
  const seen = new Set<string>();
  while (
    category?.parentSlug &&
    category.parentSlug !== rootSlug &&
    !seen.has(category.slug)
  ) {
    seen.add(category.slug);
    category = agricultureCategoryBySlug(category.parentSlug);
  }
  return category?.slug ?? slug;
}

const validationMessageNames = {
  too_short: "validationTooShort",
  too_long: "validationTooLong",
  unsafe_characters: "validationUnsafeCharacters",
  contact_information: "validationContactInformation",
  advertising_copy: "validationAdvertisingCopy",
} as const;

type CategorySection = {
  slug: string;
  categories: AgricultureCategory[];
};

type CategoryGroup = {
  slug: string;
  sections: CategorySection[];
};

export function AgricultureCategoryPicker({
  selectedSlugs,
  customLabels,
  onSelectedSlugsChange,
  onCustomLabelsChange,
  context = "profile",
  title,
  maxSelections,
  maxTotalSelections = maxSelections ?? 20,
  maxCustomLabels = 3,
  maxCustomLabelLength = 80,
}: {
  selectedSlugs: string[];
  customLabels: string[];
  onSelectedSlugsChange: (slugs: string[]) => void;
  onCustomLabelsChange: (labels: string[]) => void;
  context?: AgricultureSelectionContext;
  title?: string;
  /** @deprecated Use maxTotalSelections. Retained for existing callers. */
  maxSelections?: number;
  maxTotalSelections?: number;
  maxCustomLabels?: number;
  maxCustomLabelLength?: number;
}) {
  const onboarding = useTranslations("onboarding");
  const categoryMessages = useTranslations("agricultureCategories");
  const id = useId();
  const searchId = `${id}-category-search`;
  const customId = `${id}-custom-category`;
  const customErrorId = `${id}-custom-category-error`;
  const [query, setQuery] = useState("");
  const [customInput, setCustomInput] = useState("");
  const [customError, setCustomError] = useState("");
  const totalSelected = selectedSlugs.length + customLabels.length;

  function labelFor(category: AgricultureCategory) {
    return categoryMessages(category.slug as AgricultureCategorySlug);
  }

  const availableCategories = useMemo(
    () => agricultureCategoriesForContext(context),
    [context],
  );

  const groups = useMemo(() => {
    const visible = availableCategories.filter((category) =>
      agricultureCategoryMatches(
        category,
        query,
        categoryMessages(category.slug as AgricultureCategorySlug),
      ),
    );
    const grouped = new Map<string, Map<string, AgricultureCategory[]>>();
    for (const category of visible) {
      const root = rootSlugFor(category.slug);
      const section = sectionSlugFor(category.slug, root);
      const rootSections = grouped.get(root) ?? new Map();
      rootSections.set(section, [
        ...(rootSections.get(section) ?? []),
        category,
      ]);
      grouped.set(root, rootSections);
    }
    return [...grouped.entries()].map<CategoryGroup>(([slug, sections]) => ({
      slug,
      sections: [...sections.entries()].map(([sectionSlug, categories]) => ({
        slug: sectionSlug,
        categories,
      })),
    }));
  }, [availableCategories, categoryMessages, query]);

  const selectedCategories = selectedSlugs
    .map(agricultureCategoryBySlug)
    .filter((category): category is AgricultureCategory => Boolean(category));

  function toggle(slug: string) {
    if (selectedSlugs.includes(slug)) {
      onSelectedSlugsChange(selectedSlugs.filter((item) => item !== slug));
      return;
    }
    if (totalSelected >= maxTotalSelections) return;
    onSelectedSlugsChange([...selectedSlugs, slug]);
  }

  function addCustom() {
    setCustomError("");
    if (totalSelected >= maxTotalSelections) {
      setCustomError(
        onboarding("maxTotalActivities", { max: maxTotalSelections }),
      );
      return;
    }
    if (customLabels.length >= maxCustomLabels) {
      setCustomError(onboarding("maxCustomActivities", { max: maxCustomLabels }));
      return;
    }
    const result = validateCustomCategoryLabel(
      customInput,
      maxCustomLabelLength,
    );
    if (!result.ok) {
      setCustomError(onboarding(validationMessageNames[result.error]));
      return;
    }
    const key = result.value.normalizedLabel;
    const catalogMatch = agricultureCategoryByLabel(result.value.displayLabel);
    const localizedMatch = AGRICULTURE_CATEGORIES.some(
      (category) => categoryLabelKey(labelFor(category)) === key,
    );
    if (
      customLabels.some((label) => categoryLabelKey(label) === key) ||
      Boolean(catalogMatch) ||
      localizedMatch
    ) {
      setCustomError(onboarding("duplicateActivity"));
      return;
    }
    onCustomLabelsChange([...customLabels, result.value.displayLabel]);
    setCustomInput("");
  }

  return (
    <fieldset className="category-picker">
      <legend>{title ?? onboarding("activitiesTitle")}</legend>
      <p className="form-helper">
        {onboarding("activitiesHelp", { max: maxTotalSelections })}
      </p>

      {selectedCategories.length ? (
        <ul className="category-picker__selected" aria-label={onboarding("selectedCategories")}>
          {selectedCategories.map((category) => (
            <li key={category.slug}>
              <span dir="auto">{labelFor(category)}</span>
              <button
                className="icon-button"
                type="button"
                aria-label={onboarding("removeActivity", {
                  label: labelFor(category),
                })}
                onClick={() => toggle(category.slug)}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <label className="market-search" htmlFor={searchId}>
        <Search size={18} aria-hidden="true" />
        <span className="sr-only">{onboarding("searchCategories")}</span>
        <input
          className="input"
          id={searchId}
          type="search"
          placeholder={onboarding("searchPlaceholder")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      <p className="form-helper" aria-live="polite">
        {onboarding("selectedCount", {
          selected: totalSelected,
          max: maxTotalSelections,
        })}
      </p>

      <div className="category-picker__groups">
        {groups.map((group) => {
          const root = agricultureCategoryBySlug(group.slug);
          const containsSelected = group.sections.some((section) =>
            section.categories.some((category) =>
              selectedSlugs.includes(category.slug),
            ),
          );
          return (
            <details
              key={group.slug}
              className="category-picker__group"
              open={Boolean(query.trim()) || containsSelected}
            >
              <summary>
                <span dir="auto">{root ? labelFor(root) : group.slug}</span>
                <span className="muted">
                  {group.sections.reduce(
                    (count, section) => count + section.categories.length,
                    0,
                  )}
                </span>
              </summary>
              <div className="category-picker__sections">
                {group.sections.map((section) => {
                  const heading = agricultureCategoryBySlug(section.slug);
                  return (
                    <section key={section.slug} className="category-picker__section">
                      <h3 dir="auto">{heading ? labelFor(heading) : section.slug}</h3>
                      <div className="category-picker__choices">
                        {section.categories.map((category) => {
                          const checked = selectedSlugs.includes(category.slug);
                          const disabled =
                            !checked && totalSelected >= maxTotalSelections;
                          return (
                            <label key={category.slug}>
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={disabled}
                                onChange={() => toggle(category.slug)}
                              />
                              <span dir="auto">{labelFor(category)}</span>
                            </label>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </details>
          );
        })}
        {!groups.length ? (
          <p className="muted">{onboarding("noCategoryMatch")}</p>
        ) : null}
      </div>

      <div className="category-picker__custom">
        <h3>{onboarding("customTitle")}</h3>
        <p className="form-helper">{onboarding("customHelp")}</p>
        <div className="form-row">
          <label className="field" htmlFor={customId}>
            <span>{onboarding("customActivity")}</span>
            <input
              className="input"
              dir="auto"
              id={customId}
              maxLength={maxCustomLabelLength}
              value={customInput}
              onChange={(event) => setCustomInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addCustom();
                }
              }}
              aria-invalid={Boolean(customError)}
              aria-describedby={customError ? customErrorId : undefined}
            />
          </label>
          <button
            className="button button--secondary"
            type="button"
            disabled={!customInput.trim() || totalSelected >= maxTotalSelections}
            onClick={addCustom}
          >
            <Plus size={16} aria-hidden="true" /> {onboarding("addActivity")}
          </button>
        </div>
        {customError ? (
          <p className="form-error" id={customErrorId} role="alert">
            {customError}
          </p>
        ) : null}
        {customLabels.length ? (
          <ul className="category-picker__custom-list">
            {customLabels.map((label, index) => (
              <li key={`${categoryLabelKey(label)}-${index}`}>
                <span dir="auto">{label}</span>
                <button
                  className="icon-button"
                  type="button"
                  aria-label={onboarding("removeActivity", { label })}
                  onClick={() =>
                    onCustomLabelsChange(
                      customLabels.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </fieldset>
  );
}
