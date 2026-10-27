
import { searchCities } from "../../lib/cities";

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  const query = String(req.query.q || "").trim();

  if (query.length < 2) {
    return res.status(200).json({ cities: [] });
  }

  if (query.length > 100) {
    return res.status(400).json({
      error: "Search query is too long.",
    });
  }

  try {
    const cities = searchCities(query, 8);

    return res.status(200).json({ cities });
  } catch (error) {
    console.error("City search failed:", error);

    return res.status(500).json({
      error: "Unable to load city suggestions.",
    });
  }
}
