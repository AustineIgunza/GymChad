"""
services/food_search.py — Open Food Facts API integration

httpx is the async equivalent of the popular `requests` library.
`async with httpx.AsyncClient()` creates a connection pool that's reused
across requests — more efficient than creating a new connection each time.
"""

import httpx
from typing import Any


def _is_english(text: str) -> bool:
    """Return True if the string is mostly ASCII (Latin alphabet)."""
    if not text:
        return False
    ascii_count = sum(1 for c in text if ord(c) < 128)
    return ascii_count / len(text) >= 0.85


async def search_open_food_facts(query: str, page_size: int = 20) -> list[dict[str, Any]]:
    """
    Search Open Food Facts for foods matching the query string.
    Returns a list of food dicts with macros per 100g.

    Open Food Facts is a free, open database — no API key required.
    Docs: https://world.openfoodfacts.org/api
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(
                "https://world.openfoodfacts.org/cgi/search.pl",
                params={
                    "search_terms": query,
                    "json": 1,
                    "page_size": page_size * 3,  # fetch more so we have enough after filtering
                    "lc": "en",                   # language: English
                    "fields": "product_name,brands,nutriments,serving_size,image_thumb_url,lang",
                    "sort_by": "unique_scans_n",  # most scanned = most popular / reliable
                },
            )
            response.raise_for_status()
        except httpx.TimeoutException:
            return []
        except httpx.HTTPError:
            return []

    results = []
    for product in response.json().get("products", []):
        nutriments = product.get("nutriments", {})

        # Only include products with complete macro data
        required_fields = ["energy-kcal_100g", "proteins_100g", "carbohydrates_100g", "fat_100g"]
        if not all(k in nutriments for k in required_fields):
            continue

        name = product.get("product_name", "").strip()
        if not name:
            continue

        # Skip non-English product names (prevents results in Arabic, Chinese, etc.)
        if not _is_english(name):
            continue

        brand = product.get("brands", "").split(",")[0].strip()  # first brand only
        display_name = f"{name} — {brand}" if brand else name

        results.append({
            "name": display_name,
            "brand": brand,
            "calories_per_100g": round(float(nutriments.get("energy-kcal_100g", 0)), 1),
            "protein_per_100g": round(float(nutriments.get("proteins_100g", 0)), 1),
            "carbs_per_100g": round(float(nutriments.get("carbohydrates_100g", 0)), 1),
            "fat_per_100g": round(float(nutriments.get("fat_100g", 0)), 1),
            "fiber_per_100g": round(float(nutriments.get("fiber_100g", 0)), 1),
            "serving_size": product.get("serving_size"),
            "image_url": product.get("image_thumb_url"),
        })

        if len(results) >= page_size:
            break

    return results
