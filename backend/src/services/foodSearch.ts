import axios from "axios";
import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 3600 });

export type OpenFoodFactsItem = {
  id: string;
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
};

export async function searchOpenFoodFacts(query: string): Promise<OpenFoodFactsItem[]> {
  const key = `foodsearch:${query.trim().toLowerCase()}`;
  const cached = cache.get<OpenFoodFactsItem[]>(key);
  if (cached) return cached;

  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=20&fields=code,product_name,nutriments,serving_size`;
  const { data } = await axios.get(url);
  const parsed = (data.products ?? [])
    .map((product: any) => ({
      id: String(product.code ?? ""),
      name: String(product.product_name ?? ""),
      caloriesPer100g: Number(product.nutriments?.["energy-kcal_100g"]),
      proteinPer100g: Number(product.nutriments?.proteins_100g),
      carbsPer100g: Number(product.nutriments?.carbohydrates_100g),
      fatPer100g: Number(product.nutriments?.fat_100g),
    }))
    .filter((item: OpenFoodFactsItem) => item.name && Number.isFinite(item.caloriesPer100g) && Number.isFinite(item.proteinPer100g));

  cache.set(key, parsed);
  return parsed;
}
