# Supper Club AI Catalog Validation Review

**Assessment:** Ready for prototype use with caveats; not ready for production publication  
**Validation run:** 2026-08-31T18:53:37Z

## Dataset and grain

| Catalog | Grain | Records | Status |
|---|---|---:|---|
| Books | One contextual work per record | 10 | Pass |
| Recipes | One dinner recipe per record | 24 | Pass |
| Pairings | One wine style or zero-proof option per record | 30 | Pass |

All 64 records remain `DRAFT`, as intended.

## Checks performed

- UTF-8 and JSON parsing.
- Draft 2020-12 schema validation against the workspace schemas.
- Required record counts and composition.
- Unique catalog IDs.
- Theme-to-source reference integrity within each record.
- Recipe course balance and vegetarian minimum.
- Recipe timing consistency and obvious vegetarian ingredient contradictions.
- Wine versus zero-proof balance and alcohol-flag consistency.
- Copyright, instruction-link, image, and price handling.
- Live reachability checks for 64 unique source URLs.
- Cross-file timestamp reasonableness.

## Verified findings

- All three catalogs pass their JSON Schemas with zero schema errors.
- All three pass the supplied integrity checks with zero integrity errors.
- The recipe set contains eight starters, six mains, two sides, and eight desserts. Twenty-one of twenty-four records are marked vegetarian.
- All recipes use `SOURCE_LINK`; no third-party instructions or images are embedded.
- The pairing set contains exactly twenty wine styles and ten zero-proof options. No current prices, vintages, bottle images, or retail claims are stored.
- All book records are marked copyrighted with `mayStoreFullText: false`. The primary *Parable of the Sower* record is present.
- No recipe has total time shorter than prep time plus cooking time, and the ingredient keyword spot check found no obvious meat ingredient in a vegetarian-labeled record.

## Issues and caveats

### Medium: editorial and dietary review is still required

The records are structurally sound but intentionally remain drafts. Cultural framing, ingredient substitutions, serving assumptions, allergens, and linked-source fidelity need human review before the app presents them as authoritative. The UI must not promise that a recipe is safe for an allergy; it should display the ingredient list and ask the host to verify labels and cross-contact.

### Low: future-dated catalog metadata

The catalog `generatedAt` values are 2026-08-31T23:00:00Z, 23:15:00Z, and 23:30:00Z, while the independent validation ran at 18:53:37Z. These timestamps are syntactically valid but temporally inconsistent. They do not block prototype use, but the original generation time should be corrected or the field should be renamed to represent its intended timezone or delivery time.

### Low: one automated URL check receives HTTP 403

The scripted request to Food Network's hibiscus-poached pear recipe receives HTTP 403, so the machine-readable report shows 63 of 64 passing. A separate browser retrieval confirms that the page exists and contains the referenced recipe. This is bot protection rather than evidence of a broken source, but the app should not depend on unattended extraction from that page.

### Resolved during import: coconut allergen classification

The mango–coconut fruit salad originally encoded coconut as `TREE_NUT`. That value was removed from the workspace copy because current FDA guidance no longer includes coconut in its major tree-nut list. The schema and Manus brief now define `allergens` as the nine major U.S. allergen categories, not every possible individual sensitivity.

## Recommendation

Use these catalogs now for Supper Club AI interface development, tool orchestration, menu curation, shopping-list tests, and the hackathon demo. Before public or production use, complete a human editorial pass and correct the three `generatedAt` values. Keep Spoonacular and TinyFish responses behind the same schemas so live data cannot bypass these checks.

## Reproducible artifacts

- Validator: `/Users/tarikmoody/Projects/WebMCP/scripts/validate_catalogs.py`
- Machine-readable result: `/Users/tarikmoody/Projects/WebMCP/data/catalogs/validation_report.json`
- Catalogs: `/Users/tarikmoody/Projects/WebMCP/data/catalogs/`
- Schemas: `/Users/tarikmoody/Projects/WebMCP/data/schemas/`

## Sources receipt

- Supplied catalog delivery report and JSON files, imported from `/Users/tarikmoody/Downloads/` on 2026-08-31.
- [FDA food-allergen labeling FAQ](https://www.fda.gov/food/food-allergensgluten-free-guidance-documents-regulatory-information/frequently-asked-questions-food-allergen-labeling-guidance-industry)
- [Food Network: Spiced Hibiscus Poached Pears](https://www.foodnetwork.com/recipes/food-network-kitchen/spiced-hibiscus-poached-pears-17688213)
