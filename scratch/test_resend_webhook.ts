import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const url = `${process.env.SUPABASE_URL}/functions/v1/webhook-inbound`;
  console.log(`Sending webhook test to ${url}...`);

  const payload = {
    action: "message.received",
    provider: "waha",
    instance_id: "session_01m0dheknpnws1hzhwsc3fzv6m",
    waha_api_key: "21e886a6f345262e85572ac594b82b36064bcc2f4b28ad76",
    raw_event: {
      id: "3EB096A8B20D0BAA5649AA_TEST_" + Date.now(),
      timestamp: Math.floor(Date.now() / 1000),
      type: "text",
      is_group: false,
      from_phone: "5512982402981",
      from_lid: "171296717553783@lid",
      from_name: "Estevão",
      mediaUrl: "",
      mimetype: "",
      body: "oi teste"
    }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const body = await res.json();
  console.log("Webhook response status:", res.status);
  console.log("Webhook response body:", body);
}

main().catch(console.error);
