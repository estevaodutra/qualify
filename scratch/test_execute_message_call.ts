import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;

async function main() {
  const url = `${supabaseUrl}/functions/v1/execute-message`;

  const body = {
    campaignId: "5dadf41d-b66f-4471-8864-8657fbd24e9c",
    sequenceId: "9e07eb1a-ec0c-4db3-b03f-630ae635e716",
    triggerContext: {
      leadId: "99b5072f-1f7b-44c5-b4a0-d061ed7f107f",
      companyId: "dcb34e9a-1510-4137-aecd-cec0c6d548c4",
      sendPrivate: true,
      respondentJid: "5512982402981@s.whatsapp.net",
      respondentName: "Estevão",
      respondentPhone: "5512982402981"
    }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify(body)
  });

  const resText = await res.text();
  console.log("Execute message response:", res.status, resText);
}

main().catch(console.error);
