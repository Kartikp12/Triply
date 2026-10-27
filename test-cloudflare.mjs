import "dotenv/config";

const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;

if (!account || !token) {
  console.error("Missing Cloudflare credentials in .env.local");
  process.exit(1);
}

const response = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/@cf/zai-org/glm-4.7-flash`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content: "You are Triply, a travel planning assistant. Do not write code.",
        },
        {
          role: "user",
          content: "Reply with exactly: Triply AI is connected.",
        },
      ],
      max_tokens: 60,
      temperature: 0.1,
    }),
  }
);

const data = await response.json();

if (!response.ok || !data.success) {
  console.error("Cloudflare AI request failed:", response.status);
  console.error(JSON.stringify(data.errors ?? data, null, 2));
  process.exit(1);
}

console.log("Cloudflare AI response:", data.result?.response ?? data.result);
