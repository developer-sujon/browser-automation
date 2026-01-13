import sql from "@/database/client";
import { FilesRepository } from "@/modules/automation/repositories/files.repository";

async function main() {
  try {
    const filesRepo = new FilesRepository();
    // Count items using the repository method
    const count = await filesRepo.countPending();

    // Print only the number so shell script can capture it
    // Force no color output to avoid ANSI codes
    process.stdout.write(count.toString() + "\n");

    process.exit(0);
  } catch (error) {
    console.error("Error counting files:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
