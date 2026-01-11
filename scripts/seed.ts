import sql from "../src/database/client";

async function seed() {
  console.log("Seeding 1000 records...");

  const records = [];
  for (let i = 0; i < 100000; i++) {
    records.push({
      id: crypto.randomUUID(),
      first_name: `User${i}`,
      last_name: `Test`,
      email: `user${i}@example.com`,
      phone: `+123456789${i.toString().padStart(4, "0")}`,
      message: `This is a test message for user ${i}`,
      status: "created",
      attempts: 0,
      created_at: new Date(), // Ensure it matches today's date for the query
    });
  }

  // Batch insert in chunks of 100 to avoid query size limits
  const chunkSize = 100;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    await sql`
      INSERT INTO files ${sql(
        chunk,
        "id",
        "first_name",
        "last_name",
        "email",
        "phone",
        "message",
        "status",
        "attempts",
        "created_at"
      )}
    `;
    console.log(
      `Inserted ${Math.min(i + chunkSize, records.length)} / ${records.length}`
    );
  }

  console.log("Seeding complete!");
  process.exit(0);
}

// seed().catch((err) => {
//   console.error("Seeding failed:", err);
//   process.exit(1);
// });
