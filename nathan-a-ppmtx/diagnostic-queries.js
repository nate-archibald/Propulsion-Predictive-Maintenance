#!/usr/bin/env node
import { lakebase } from "@databricks/appkit";

const S = "an_maintenanceengineering_ods";

async function runDiagnostics() {
  console.log("\n========== DIAGNOSTIC QUERIES ==========\n");

  // 1. List all tables in the schema
  console.log("1. LISTING ALL TABLES IN SCHEMA:", S);
  try {
    const result = await lakebase.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name`,
      [S]
    );
    console.log("   Tables found:", result.rows.length);
    result.rows.forEach((r) => console.log(`   - ${r.table_name}`));
  } catch (err) {
    console.error("   ERROR:", err.message);
  }

  // 2. Columns in inventory_control table
  console.log("\n2. COLUMNS IN INVENTORY_CONTROL TABLE:");
  try {
    const result = await lakebase.query(
      `SELECT column_name, data_type FROM information_schema.columns 
       WHERE table_schema = $1 AND table_name LIKE '%inventory_control%' 
       ORDER BY table_name, ordinal_position`,
      [S]
    );
    console.log("   Columns found:", result.rows.length);
    result.rows.forEach((r) => console.log(`   - ${r.column_name}: ${r.data_type}`));
  } catch (err) {
    console.error("   ERROR:", err.message);
  }

  // 3. Columns in inventory_snapshot table
  console.log("\n3. COLUMNS IN INVENTORY_SNAPSHOT TABLE:");
  try {
    const result = await lakebase.query(
      `SELECT column_name, data_type FROM information_schema.columns 
       WHERE table_schema = $1 AND table_name LIKE '%inventory_snapshot%' 
       ORDER BY table_name, ordinal_position`,
      [S]
    );
    console.log("   Columns found:", result.rows.length);
    result.rows.forEach((r) => console.log(`   - ${r.column_name}: ${r.data_type}`));
  } catch (err) {
    console.error("   ERROR:", err.message);
  }

  // 4. Columns in teardown table
  console.log("\n4. COLUMNS IN TEARDOWN TABLE:");
  try {
    const result = await lakebase.query(
      `SELECT column_name, data_type FROM information_schema.columns 
       WHERE table_schema = $1 AND table_name LIKE '%teardown%' 
       ORDER BY table_name, ordinal_position`,
      [S]
    );
    console.log("   Columns found:", result.rows.length);
    result.rows.forEach((r) => console.log(`   - ${r.column_name}: ${r.data_type}`));
  } catch (err) {
    console.error("   ERROR:", err.message);
  }

  // 5. Distinct control values in inventory_control
  console.log("\n5. DISTINCT CONTROL VALUES IN INVENTORY_CONTROL:");
  try {
    const result = await lakebase.query(
      `SELECT DISTINCT control FROM ${S}.qx_ppmtx_synced_gold_fact_inventory_control LIMIT 50`
    );
    console.log("   Control values found:", result.rows.length);
    result.rows.forEach((r) => console.log(`   - ${r.control}`));
  } catch (err) {
    console.error("   ERROR:", err.message);
  }

  // 6. Sample 5 rows from inventory_snapshot
  console.log("\n6. SAMPLE 5 ROWS FROM INVENTORY_SNAPSHOT (with installed_ac IS NOT NULL):");
  try {
    const result = await lakebase.query(
      `SELECT sn, installed_ac, installed_position FROM ${S}.qx_ppmtx_synced_gold_fact_inventory_snapshot 
       WHERE installed_ac IS NOT NULL LIMIT 5`
    );
    console.log("   Rows found:", result.rows.length);
    result.rows.forEach((r, i) => 
      console.log(`   Row ${i + 1}: sn=${r.sn}, installed_ac=${r.installed_ac}, installed_position=${r.installed_position}`)
    );
  } catch (err) {
    console.error("   ERROR:", err.message);
  }

  // 7. Engine part numbers
  console.log("\n7. ENGINE PART NUMBERS (looking for CF34*):");
  try {
    const result = await lakebase.query(
      `SELECT DISTINCT pn, pn_description FROM ${S}.qx_ppmtx_synced_gold_dim_part 
       WHERE pn ILIKE '%CF34%' OR pn_description ILIKE '%CF34%'`
    );
    console.log("   Engine part numbers found:", result.rows.length);
    result.rows.forEach((r) => console.log(`   - ${r.pn}: ${r.pn_description}`));
  } catch (err) {
    console.error("   ERROR:", err.message);
  }

  // 8. Check if TSN control exists
  console.log("\n8. CHECKING IF TSN CONTROL TYPE EXISTS:");
  try {
    const result = await lakebase.query(
      `SELECT COUNT(*) as count FROM ${S}.qx_ppmtx_synced_gold_fact_inventory_control WHERE control = 'TSN'`
    );
    console.log(`   TSN rows found: ${result.rows[0].count}`);
  } catch (err) {
    console.error("   ERROR:", err.message);
  }

  console.log("\n========== END DIAGNOSTICS ==========\n");
  process.exit(0);
}

runDiagnostics().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
