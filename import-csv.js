const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const envPath = path.join(__dirname, ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
envContent.split("\n").forEach(line => {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function splitCSV(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuotes = !inQuotes; continue; }
    if (c === ',' && !inQuotes) { result.push(current.trim()); current = ""; continue; }
    current += c;
  }
  result.push(current.trim());
  return result;
}

async function main() {
  const filePath = path.join(__dirname, "data", "База_квартир_База_клиентов_Аренда.csv");
  const text = fs.readFileSync(filePath, "utf8");
  const lines = text.trim().split("\n");
  
  const clients = [];
  let current = {};

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSV(lines[i]);
    if (cols.length < 10) continue;
    
    const col9 = cols[8] || "";
    const col10 = cols[9] || "";
    const col20 = cols[19] || "";
    const col21 = cols[20] || "";
    const col22 = cols[21] || "";

    // Горизонтальный формат (первый клиент)
    if (col10 && !col10.includes("клиента") && col10 !== "Имя клиента" && !col9.includes(":")) {
      if (current.name) { clients.push({ ...current }); current = {}; }
      current = {
        date: cols[8] || "",
        name: col10,
        rooms: cols[10] || "",
        district: cols[11] || "",
        amount_raw: cols[12] || "",
        furniture: cols[13] || "",
        rental_period: cols[14] || "",
        phone: cols[15] || "",
        who_lives: cols[16] || "",
        people_count: cols[17] || "",
        notes: cols[18] || "",
        completed: col20 === "TRUE" ? "Завершено" : "В процессе",
        broker: col21 || "",
      };
    }

    // Вертикальный формат
    if (col9.includes("Имя:")) {
      if (current.name) { clients.push({ ...current }); current = {}; }
      current.name = col10;
    }
    if (col9.includes("Кол-во комнат") && !col9.includes(":")) current.rooms = col10;
    if (col9.includes("Район:")) current.district = col10;
    if (col9.includes("Сумма:")) current.amount_raw = col10;
    if (col9 === "Мебель") current.furniture = col10;
    if (col9.includes("Срок аренды")) current.rental_period = col10;
    if (col9 === "Телефон") current.phone = col10;
    if (col9.includes("Кто будет жить")) current.who_lives = col10;
    if (col9.includes("Сколько человек")) current.people_count = col10;
  }
  
  if (current.name) clients.push(current);

  const cleaned = clients.map(c => ({
    date: c.date || new Date().toLocaleDateString("ru-RU"),
    name: c.name || "Без имени",
    rooms: String(c.rooms || "").replace(/[^0-9]/g, "") || "",
    district: String(c.district || "").replace(/[:]/g, "").trim(),
    amount: parseInt(String(c.amount_raw || "0").replace(/[^0-9]/g, "")) || 0,
    furniture: c.furniture === "полностью" || c.furniture === "Полностью" ? "Полная" : (c.furniture || ""),
    rental_period: c.rental_period || "",
    phone: c.phone || "",
    who_lives: c.who_lives || "",
    people_count: parseInt(String(c.people_count || "1").replace(/[^0-9]/g, "")) || 1,
    notes: c.notes || "",
    completed: c.completed || "В процессе",
    broker: c.broker || "",
  }));

  console.log(`Parsed ${cleaned.length} clients`);
  console.log("First 3:", JSON.stringify(cleaned.slice(0, 3), null, 2));

  // Import in batches
  const batchSize = 100;
  let imported = 0;
  
  for (let i = 0; i < cleaned.length; i += batchSize) {
    const batch = cleaned.slice(i, i + batchSize);
    const { error } = await supabase.from("clients_arenda").insert(batch);
    if (error) {
      console.log(`Error batch ${i}: ${error.message}`);
    } else {
      imported += batch.length;
      console.log(`OK ${imported}/${cleaned.length}`);
    }
  }

  console.log(`Done! ${imported} clients imported`);
}

main().catch(e => console.error(e));
