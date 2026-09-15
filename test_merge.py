# Test merge_part_live_tso in isolation
dbutils.notebook.run("./merge_gold_tables", 0, {
    "catalog": "subject_maintenanceengineering_test",
    "schema": "an_maintenanceengineering_ods",
    "silver_catalog": "subject_maintenanceengineering_test",
    "silver_schema": "an_maintenanceengineering_ods",
    "bronze_catalog": "subject_maintenanceengineering",
    "bronze_schema": "ds_maintenanceengineering_ods"
})
