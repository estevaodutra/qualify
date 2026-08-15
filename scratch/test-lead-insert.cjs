require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("=== TESTING LEAD INSERT ===");
  const companyId = "dcb34e9a-1510-4137-aecd-cec0c6d548c4";
  const destinationPhone = "5512983195531";
  const respondentName = "cordeiro peças refrigeraçao";
  
  const customFields = {
    "UF": "RJ",
    "nome": "cordeiro peças refrigeraçao (residencial e industrial)",
    "site": "",
    "phone": "5512983195531",
    "cidade": "Rio de Janeiro",
    "categoria": "Loja de autopeças",
    "url_google": "https://www.google.com/maps/search/?api=1&query=cordeiro%20pe%C3%A7as%20refrigera%C3%A7ao%20(residencial%20e%20industrial)&query_place_id=ChIJcfwWANR5mQARQXltCBXtihE",
    "qtd_avaliacoes": "1"
  };

  const { data: newLead, error: leadErr } = await supabase
    .from("leads")
    .insert({
      company_id: companyId,
      phone: destinationPhone,
      name: respondentName || destinationPhone,
      source: "Webhook / API",
      custom_fields: customFields
    })
    .select("id")
    .single();

  console.log("Data:", newLead);
  console.log("Error:", leadErr);
}

run().catch(console.error);
