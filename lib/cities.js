
import { City, Country, State } from "country-state-city";

let cachedCities = null;

function getCitiesDatabase() {
  if (cachedCities) return cachedCities;

  const countries = new Map(
    Country.getAllCountries().map((country) => [
      country.isoCode,
      country.name,
    ])
  );

  const states = new Map(
    State.getAllStates().map((state) => [
      `${state.countryCode}-${state.isoCode}`,
      state.name,
    ])
  );

  cachedCities = City.getAllCities().map((city) => {
    const stateName = states.get(
      `${city.countryCode}-${city.stateCode}`
    );

    const countryName = countries.get(city.countryCode);

    return {
      name: city.name,
      state: stateName || "",
      country: countryName || city.countryCode,
      countryCode: city.countryCode,
      stateCode: city.stateCode,
      label: [
        city.name,
        stateName,
        countryName || city.countryCode,
      ]
        .filter(Boolean)
        .join(", "),
    };
  });

  return cachedCities;
}

export function searchCities(query, limit = 8) {
  const normalizedQuery = String(query || "")
    .trim()
    .toLocaleLowerCase();

  if (normalizedQuery.length < 2) return [];

  const cities = getCitiesDatabase();

  const startsWith = [];
  const contains = [];

  for (const city of cities) {
    const name = city.name.toLocaleLowerCase();
    const label = city.label.toLocaleLowerCase();

    if (name.startsWith(normalizedQuery)) {
      startsWith.push(city);
    } else if (label.includes(normalizedQuery)) {
      contains.push(city);
    }

    if (startsWith.length >= limit) break;
  }

  const remaining = Math.max(0, limit - startsWith.length);

  for (const city of contains) {
    if (startsWith.length + contains.length >= limit) break;
  }

  const results = [...startsWith];

  for (const city of contains) {
    if (results.length >= limit) break;

    if (
      !results.some(
        (item) =>
          item.name === city.name &&
          item.countryCode === city.countryCode &&
          item.stateCode === city.stateCode
      )
    ) {
      results.push(city);
    }
  }

  return results.slice(0, limit);
}
