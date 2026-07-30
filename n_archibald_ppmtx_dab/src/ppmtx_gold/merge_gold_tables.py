# Databricks notebook source
# MAGIC %md
# MAGIC # Gold Layer — Merge Silver to Gold
# MAGIC Populates Gold tables from Silver using YAML-driven column mappings.
# MAGIC Dimensions merged first (SCD Type 1), then facts (FK dependency order).

# COMMAND ----------

# MAGIC %pip install pyyaml>=6.0
# MAGIC %restart_python

# COMMAND ----------

import yaml
import os
from pathlib import Path
from pyspark.sql import functions as F
from pyspark.sql.functions import col, lit, md5, concat_ws, row_number, current_timestamp
from pyspark.sql.window import Window
from functools import reduce

# COMMAND ----------

dbutils.widgets.text("catalog", "subject_maintenanceengineering", "Catalog")
dbutils.widgets.text("schema", "an_maintenanceengineering_ods", "Schema")
dbutils.widgets.text("silver_catalog", "subject_maintenanceengineering_test", "Silver Catalog")
dbutils.widgets.text("silver_schema", "an_maintenanceengineering_ods", "Silver Schema")

catalog = dbutils.widgets.get("catalog")
schema = dbutils.widgets.get("schema")
silver_catalog = dbutils.widgets.get("silver_catalog")
silver_schema = dbutils.widgets.get("silver_schema")

print(f"Gold target: {catalog}.{schema}")
print(f"Silver source: {silver_catalog}.{silver_schema}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Utilities

# COMMAND ----------

def find_yaml_base():
    """Discover YAML schema directory."""
    cwd = os.getcwd()
    search = Path(cwd)
    for _ in range(5):
        candidate = search / "gold_layer_design" / "yaml"
        if candidate.exists():
            return str(candidate)
        search = search.parent
    bundle_root = os.environ.get("BUNDLE_ROOT", "")
    if bundle_root:
        candidate = Path(bundle_root) / "gold_layer_design" / "yaml"
        if candidate.exists():
            return str(candidate)
    raise FileNotFoundError("Cannot find gold_layer_design/yaml directory.")


def load_all_yaml_schemas(yaml_base_path):
    """Load all YAML schema files."""
    schemas = {}
    base = Path(yaml_base_path)
    for yaml_file in sorted(base.rglob("*.yaml")):
        with open(yaml_file, "r") as f:
            schema_def = yaml.safe_load(f)
        schemas[schema_def["table_name"]] = schema_def
    return schemas


def get_gold_table(table_name):
    """Get full Gold table path."""
    return f"{catalog}.{schema}.{table_name}"


def get_silver_table(table_name):
    """Get full Silver table path."""
    return f"{silver_catalog}.{silver_schema}.{table_name}"


yaml_base = find_yaml_base()
schemas = load_all_yaml_schemas(yaml_base)
print(f"Loaded {len(schemas)} Gold schemas")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Dimension Merge Functions

# COMMAND ----------

def merge_dim_part():
    """Merge dim_part from Silver pn_master (SCD Type 1)."""
    source_table = get_silver_table("qx_ppmtx_pn_master")
    target_table = get_gold_table("qx_ppmtx_gold_dim_part")

    print(f"Merging: {target_table}")
    print(f"  Source: {source_table}")

    # Read and deduplicate Silver
    silver_df = (
        spark.table(source_table)
        .orderBy(col("processed_timestamp").desc())
        .dropDuplicates(["pn"])
    )

    # Map columns and generate surrogate key
    window = Window.orderBy("pn")
    gold_df = (
        silver_df
        .withColumn("dim_part_key", F.abs(F.hash(col("pn"))).cast("bigint"))
        .select(
            col("dim_part_key"),
            col("pn"),
            col("pn_description"),
            col("category"),
            col("sub_category"),
            col("expenditure"),
            col("stock_uom"),
            col("shelf_life_flag"),
            col("shelf_life_days"),
            col("tool_calibration_flag"),
            col("tool_life_days"),
            col("ri_flag"),
            col("pn_supersede"),
            col("standard_cost"),
            col("average_cost"),
            col("gl_company"),
            col("gl_expenditure"),
        )
    )

    # SCD Type 1 MERGE
    gold_df.createOrReplaceTempView("source_dim_part")
    spark.sql(f"""
        MERGE INTO {target_table} AS target
        USING source_dim_part AS source
        ON target.pn = source.pn
        WHEN MATCHED THEN UPDATE SET
            target.dim_part_key = source.dim_part_key,
            target.pn_description = source.pn_description,
            target.category = source.category,
            target.sub_category = source.sub_category,
            target.expenditure = source.expenditure,
            target.stock_uom = source.stock_uom,
            target.shelf_life_flag = source.shelf_life_flag,
            target.shelf_life_days = source.shelf_life_days,
            target.tool_calibration_flag = source.tool_calibration_flag,
            target.tool_life_days = source.tool_life_days,
            target.ri_flag = source.ri_flag,
            target.pn_supersede = source.pn_supersede,
            target.standard_cost = source.standard_cost,
            target.average_cost = source.average_cost,
            target.gl_company = source.gl_company,
            target.gl_expenditure = source.gl_expenditure
        WHEN NOT MATCHED THEN INSERT *
    """)

    count = spark.table(target_table).count()
    print(f"  ✓ dim_part: {count} rows")
    return count

# COMMAND ----------

def merge_dim_aircraft():
    """Merge dim_aircraft from Silver transaction + defect tables (SCD Type 1)."""
    target_table = get_gold_table("qx_ppmtx_gold_dim_aircraft")
    source1 = get_silver_table("qx_ppmtx_ac_pn_transaction_history")
    source2 = get_silver_table("qx_ppmtx_defect_report")

    print(f"Merging: {target_table}")

    # Get distinct aircraft from both sources
    ac_df = (
        spark.table(source1).select("ac")
        .union(spark.table(source2).select("ac"))
        .filter(col("ac").isNotNull())
        .dropDuplicates(["ac"])
    )

    # Generate Gold columns
    gold_df = (
        ac_df
        .withColumn("dim_aircraft_key", F.abs(F.hash(col("ac"))).cast("bigint"))
        .withColumn("aircraft_type", lit("E175"))
        .select("dim_aircraft_key", "ac", "aircraft_type")
    )

    # SCD Type 1 MERGE
    gold_df.createOrReplaceTempView("source_dim_aircraft")
    spark.sql(f"""
        MERGE INTO {target_table} AS target
        USING source_dim_aircraft AS source
        ON target.ac = source.ac
        WHEN MATCHED THEN UPDATE SET
            target.dim_aircraft_key = source.dim_aircraft_key,
            target.aircraft_type = source.aircraft_type
        WHEN NOT MATCHED THEN INSERT *
    """)

    count = spark.table(target_table).count()
    print(f"  ✓ dim_aircraft: {count} rows")
    return count

# COMMAND ----------

def merge_dim_station():
    """Merge dim_station from Silver transaction + inventory tables (SCD Type 1)."""
    target_table = get_gold_table("qx_ppmtx_gold_dim_station")
    source1 = get_silver_table("qx_ppmtx_ac_pn_transaction_history")
    source2 = get_silver_table("qx_ppmtx_pn_inventory_detail")

    print(f"Merging: {target_table}")

    # Get distinct stations from transaction history and inventory
    station_df = (
        spark.table(source1).select(col("station").alias("station_code"))
        .union(spark.table(source2).select(col("location").alias("station_code")))
        .filter(col("station_code").isNotNull())
        .filter(col("station_code") != "")
        .dropDuplicates(["station_code"])
    )

    # Generate Gold columns
    gold_df = (
        station_df
        .withColumn("dim_station_key", F.abs(F.hash(col("station_code"))).cast("bigint"))
        .withColumn("station_name", col("station_code"))  # Station name = code initially
        .select("dim_station_key", "station_code", "station_name")
    )

    # SCD Type 1 MERGE
    gold_df.createOrReplaceTempView("source_dim_station")
    spark.sql(f"""
        MERGE INTO {target_table} AS target
        USING source_dim_station AS source
        ON target.station_code = source.station_code
        WHEN MATCHED THEN UPDATE SET
            target.dim_station_key = source.dim_station_key,
            target.station_name = source.station_name
        WHEN NOT MATCHED THEN INSERT *
    """)

    count = spark.table(target_table).count()
    print(f"  ✓ dim_station: {count} rows")
    return count

# COMMAND ----------

def merge_dim_ata_chapter():
    """Merge dim_ata_chapter from Silver defect + transaction tables (SCD Type 1)."""
    target_table = get_gold_table("qx_ppmtx_gold_dim_ata_chapter")
    source1 = get_silver_table("qx_ppmtx_defect_report")
    source2 = get_silver_table("qx_ppmtx_ac_pn_transaction_history")

    print(f"Merging: {target_table}")

    # Get distinct chapter/section/paragraph combinations
    # Coalesce NULLs to 0 since section/paragraph are part of composite PK (NOT NULL)
    ata_df = (
        spark.table(source1).select("chapter", "section", "paragraph")
        .union(spark.table(source2).select("chapter", "section", "paragraph"))
        .filter(col("chapter").isNotNull())
        .withColumn("section", F.coalesce(col("section"), lit(0)))
        .withColumn("paragraph", F.coalesce(col("paragraph"), lit(0)))
        .dropDuplicates(["chapter", "section", "paragraph"])
    )

    # Generate Gold columns with ATA chapter descriptions
    gold_df = (
        ata_df
        .withColumn(
            "dim_ata_chapter_key",
            F.abs(F.hash(concat_ws("||", col("chapter"), col("section"), col("paragraph")))).cast("bigint")
        )
        .withColumn(
            "chapter_description",
            F.when(col("chapter") == 49, lit("Auxiliary Power Unit"))
            .when(col("chapter") == 70, lit("Standard Practices - Engine"))
            .when(col("chapter") == 71, lit("Power Plant"))
            .when(col("chapter") == 72, lit("Engine"))
            .when(col("chapter") == 73, lit("Engine Fuel and Control"))
            .when(col("chapter") == 74, lit("Ignition"))
            .when(col("chapter") == 75, lit("Air"))
            .when(col("chapter") == 76, lit("Engine Controls"))
            .when(col("chapter") == 77, lit("Engine Indicating"))
            .when(col("chapter") == 78, lit("Exhaust"))
            .when(col("chapter") == 79, lit("Oil"))
            .when(col("chapter") == 80, lit("Starting"))
            .otherwise(F.concat(lit("ATA "), col("chapter").cast("string")))
        )
        .select("dim_ata_chapter_key", "chapter", "section", "paragraph", "chapter_description")
    )

    # SCD Type 1 MERGE
    gold_df.createOrReplaceTempView("source_dim_ata_chapter")
    spark.sql(f"""
        MERGE INTO {target_table} AS target
        USING source_dim_ata_chapter AS source
        ON target.chapter = source.chapter
           AND target.section = source.section
           AND target.paragraph = source.paragraph
        WHEN MATCHED THEN UPDATE SET
            target.dim_ata_chapter_key = source.dim_ata_chapter_key,
            target.chapter_description = source.chapter_description
        WHEN NOT MATCHED THEN INSERT *
    """)

    count = spark.table(target_table).count()
    print(f"  ✓ dim_ata_chapter: {count} rows")
    return count

# COMMAND ----------

def merge_dim_date():
    """Populate dim_date with generated calendar dates."""
    target_table = get_gold_table("qx_ppmtx_gold_dim_date")

    print(f"Merging: {target_table}")

    # Check if already populated
    existing_count = spark.table(target_table).count()
    if existing_count > 0:
        print(f"  ⏭ dim_date already populated: {existing_count} rows")
        return existing_count

    # Generate date range 2015-01-01 to 2030-12-31
    date_df = spark.sql("""
        SELECT explode(sequence(DATE'2015-01-01', DATE'2030-12-31', INTERVAL 1 DAY)) AS calendar_date
    """)

    gold_df = (
        date_df
        .withColumn("dim_date_key", F.date_format(col("calendar_date"), "yyyyMMdd").cast("int"))
        .withColumn("year", F.year(col("calendar_date")))
        .withColumn("quarter", F.quarter(col("calendar_date")))
        .withColumn("month", F.month(col("calendar_date")))
        .withColumn("week_of_year", F.weekofyear(col("calendar_date")))
        .withColumn("day_of_month", F.dayofmonth(col("calendar_date")))
        .withColumn("day_name", F.date_format(col("calendar_date"), "EEEE"))
        .withColumn("month_name", F.date_format(col("calendar_date"), "MMMM"))
        .select(
            "dim_date_key", "calendar_date", "year", "quarter",
            "month", "week_of_year", "day_of_month", "day_name", "month_name"
        )
    )

    gold_df.write.mode("append").saveAsTable(target_table)

    count = spark.table(target_table).count()
    print(f"  ✓ dim_date: {count} rows")
    return count

# COMMAND ----------

# MAGIC %md
# MAGIC ## Fact Merge Functions

# COMMAND ----------

def merge_fact_component_removal():
    """Merge fact_component_removal from Silver transaction history."""
    source_table = get_silver_table("qx_ppmtx_ac_pn_transaction_history")
    target_table = get_gold_table("qx_ppmtx_gold_fact_component_removal")
    dim_part_table = get_gold_table("qx_ppmtx_gold_dim_part")
    dim_aircraft_table = get_gold_table("qx_ppmtx_gold_dim_aircraft")
    dim_station_table = get_gold_table("qx_ppmtx_gold_dim_station")
    dim_ata_table = get_gold_table("qx_ppmtx_gold_dim_ata_chapter")

    print(f"Merging: {target_table}")

    # Read and deduplicate Silver
    silver_df = (
        spark.table(source_table)
        .orderBy(col("processed_timestamp").desc())
        .dropDuplicates(["transaction", "transaction_item"])
    )

    # Load dimension lookup tables
    dim_part = spark.table(dim_part_table).select("dim_part_key", "pn")
    dim_ac = spark.table(dim_aircraft_table).select("dim_aircraft_key", "ac")
    dim_station = spark.table(dim_station_table).select("dim_station_key", "station_code")
    dim_ata = spark.table(dim_ata_table).select("dim_ata_chapter_key", "chapter", "section", "paragraph")

    # Join dimensions and build Gold columns
    gold_df = (
        silver_df
        .join(dim_part, silver_df["pn"] == dim_part["pn"], "left")
        .join(dim_ac, silver_df["ac"] == dim_ac["ac"], "left")
        .join(dim_station, silver_df["station"] == dim_station["station_code"], "left")
        .join(
            dim_ata,
            (silver_df["chapter"] == dim_ata["chapter"]) &
            (F.coalesce(silver_df["section"], lit(0)) == dim_ata["section"]) &
            (F.coalesce(silver_df["paragraph"], lit(0)) == dim_ata["paragraph"]),
            "left"
        )
        .withColumn(
            "fact_component_removal_key",
            F.abs(F.hash(concat_ws("||", silver_df["transaction"], silver_df["transaction_item"].cast("string")))).cast("bigint")
        )
        .withColumn(
            "transaction_date_key",
            F.when(
                silver_df["transaction_date"].isNotNull(),
                F.date_format(silver_df["transaction_date"].cast("date"), "yyyyMMdd").cast("int")
            )
        )
        .select(
            "fact_component_removal_key",
            col("dim_part_key"),
            col("dim_aircraft_key"),
            col("dim_station_key"),
            col("dim_ata_chapter_key"),
            col("transaction_date_key"),
            silver_df["transaction"],
            silver_df["transaction_item"],
            silver_df["transaction_type"],
            silver_df["transaction_type_control"],
            silver_df["sn"],
            silver_df["nha_pn"],
            silver_df["nha_sn"],
            silver_df["position"],
            silver_df["reason_category"],
            silver_df["schedule_category"],
            silver_df["hours_installed"],
            silver_df["minutes_installed"],
            silver_df["cycles_installed"],
            silver_df["days_installed"],
            silver_df["qty"],
            silver_df["defect_type"],
            silver_df["defect"],
            silver_df["wo"],
            silver_df["tag_no"],
            silver_df["removal_reason"],
            silver_df["status"],
        )
    )

    # MERGE
    gold_df.createOrReplaceTempView("source_fact_component_removal")
    merge_cols = [c for c in gold_df.columns if c != "fact_component_removal_key"]
    update_set = ", ".join([f"target.`{c}` = source.`{c}`" for c in merge_cols])

    spark.sql(f"""
        MERGE INTO {target_table} AS target
        USING source_fact_component_removal AS source
        ON target.transaction = source.transaction
           AND target.transaction_item = source.transaction_item
        WHEN MATCHED THEN UPDATE SET {update_set}
        WHEN NOT MATCHED THEN INSERT *
    """)

    count = spark.table(target_table).count()
    print(f"  ✓ fact_component_removal: {count} rows")
    return count

# COMMAND ----------

def merge_fact_defect():
    """Merge fact_defect from Silver defect_report."""
    source_table = get_silver_table("qx_ppmtx_defect_report")
    target_table = get_gold_table("qx_ppmtx_gold_fact_defect")
    dim_aircraft_table = get_gold_table("qx_ppmtx_gold_dim_aircraft")
    dim_ata_table = get_gold_table("qx_ppmtx_gold_dim_ata_chapter")

    print(f"Merging: {target_table}")

    # Read and deduplicate Silver
    silver_df = (
        spark.table(source_table)
        .orderBy(col("processed_timestamp").desc())
        .dropDuplicates(["defect_type", "defect", "defect_item"])
    )

    # Load dimension lookups
    dim_ac = spark.table(dim_aircraft_table).select("dim_aircraft_key", "ac")
    dim_ata = spark.table(dim_ata_table).select("dim_ata_chapter_key", "chapter", "section", "paragraph")

    # Join and build Gold columns
    gold_df = (
        silver_df
        .join(dim_ac, silver_df["ac"] == dim_ac["ac"], "left")
        .join(
            dim_ata,
            (silver_df["chapter"] == dim_ata["chapter"]) &
            (F.coalesce(silver_df["section"], lit(0)) == dim_ata["section"]) &
            (F.coalesce(silver_df["paragraph"], lit(0)) == dim_ata["paragraph"]),
            "left"
        )
        .withColumn(
            "fact_defect_key",
            F.abs(F.hash(concat_ws("||", silver_df["defect_type"], silver_df["defect"], silver_df["defect_item"].cast("string")))).cast("bigint")
        )
        .withColumn(
            "reported_date_key",
            F.when(
                silver_df["reported_date"].isNotNull(),
                F.date_format(silver_df["reported_date"].cast("date"), "yyyyMMdd").cast("int")
            )
        )
        .withColumn(
            "resolved_date_key",
            F.when(
                silver_df["resolved_date"].isNotNull(),
                F.date_format(silver_df["resolved_date"].cast("date"), "yyyyMMdd").cast("int")
            )
        )
        .select(
            "fact_defect_key",
            col("dim_aircraft_key"),
            col("dim_ata_chapter_key"),
            col("reported_date_key"),
            col("resolved_date_key"),
            silver_df["defect_type"],
            silver_df["defect"],
            silver_df["defect_item"],
            silver_df["status"],
            silver_df["defect_description"],
            silver_df["defect_category"],
            silver_df["resolution_description"],
            silver_df["resolution_category"],
            silver_df["delay"],
            silver_df["delays_hours"],
            silver_df["delay_minutes"],
            silver_df["cancellation"],
            silver_df["i_f_s_d"],
            silver_df["fuel"],
            silver_df["mel"],
            silver_df["mel_number"],
            silver_df["defer"],
            silver_df["fault_confirm"],
            silver_df["wo"],
            silver_df["flight"],
        )
    )

    # MERGE
    gold_df.createOrReplaceTempView("source_fact_defect")
    merge_cols = [c for c in gold_df.columns if c != "fact_defect_key"]
    update_set = ", ".join([f"target.`{c}` = source.`{c}`" for c in merge_cols])

    spark.sql(f"""
        MERGE INTO {target_table} AS target
        USING source_fact_defect AS source
        ON target.defect_type = source.defect_type
           AND target.defect = source.defect
           AND target.defect_item = source.defect_item
        WHEN MATCHED THEN UPDATE SET {update_set}
        WHEN NOT MATCHED THEN INSERT *
    """)

    count = spark.table(target_table).count()
    print(f"  ✓ fact_defect: {count} rows")
    return count

# COMMAND ----------

def merge_bridge_defect_part():
    """Merge bridge_defect_part from Silver defect_report_pn."""
    source_table = get_silver_table("qx_ppmtx_defect_report_pn")
    target_table = get_gold_table("qx_ppmtx_gold_bridge_defect_part")
    dim_part_table = get_gold_table("qx_ppmtx_gold_dim_part")

    print(f"Merging: {target_table}")

    # Read and deduplicate Silver
    silver_df = (
        spark.table(source_table)
        .orderBy(col("processed_timestamp").desc())
        .dropDuplicates(["defect_type", "defect", "defect_item", "item"])
    )

    # Load dimension lookup
    dim_part = spark.table(dim_part_table).select("dim_part_key", "pn")

    # Join and build Gold columns
    gold_df = (
        silver_df
        .join(dim_part, silver_df["pn"] == dim_part["pn"], "left")
        .withColumn(
            "bridge_defect_part_key",
            F.abs(F.hash(concat_ws("||",
                silver_df["defect_type"],
                silver_df["defect"],
                silver_df["defect_item"].cast("string"),
                silver_df["item"].cast("string")
            ))).cast("bigint")
        )
        .select(
            "bridge_defect_part_key",
            col("dim_part_key"),
            silver_df["defect_type"],
            silver_df["defect"],
            silver_df["defect_item"],
            silver_df["item"],
            silver_df["qty"],
            silver_df["qty_reserved"],
            silver_df["spare"],
            silver_df["ipc"],
            silver_df["reserved"],
        )
    )

    # MERGE
    gold_df.createOrReplaceTempView("source_bridge_defect_part")
    merge_cols = [c for c in gold_df.columns if c != "bridge_defect_part_key"]
    update_set = ", ".join([f"target.`{c}` = source.`{c}`" for c in merge_cols])

    spark.sql(f"""
        MERGE INTO {target_table} AS target
        USING source_bridge_defect_part AS source
        ON target.defect_type = source.defect_type
           AND target.defect = source.defect
           AND target.defect_item = source.defect_item
           AND target.item = source.item
        WHEN MATCHED THEN UPDATE SET {update_set}
        WHEN NOT MATCHED THEN INSERT *
    """)

    count = spark.table(target_table).count()
    print(f"  ✓ bridge_defect_part: {count} rows")
    return count

# COMMAND ----------

def merge_fact_inventory_transaction():
    """Merge fact_inventory_transaction from Silver inventory_history."""
    source_table = get_silver_table("qx_ppmtx_pn_inventory_history")
    target_table = get_gold_table("qx_ppmtx_gold_fact_inventory_transaction")
    dim_part_table = get_gold_table("qx_ppmtx_gold_dim_part")
    dim_aircraft_table = get_gold_table("qx_ppmtx_gold_dim_aircraft")
    dim_station_table = get_gold_table("qx_ppmtx_gold_dim_station")

    print(f"Merging: {target_table}")

    # Read and deduplicate Silver
    silver_df = (
        spark.table(source_table)
        .orderBy(col("processed_timestamp").desc())
        .dropDuplicates(["transaction_no", "batch"])
    )

    # Load dimension lookups
    dim_part = spark.table(dim_part_table).select("dim_part_key", "pn")
    dim_ac = spark.table(dim_aircraft_table).select("dim_aircraft_key", "ac")
    dim_station = spark.table(dim_station_table).select("dim_station_key", "station_code")

    # Join and build Gold columns
    gold_df = (
        silver_df
        .join(dim_part, silver_df["pn"] == dim_part["pn"], "left")
        .join(dim_ac, silver_df["ac"] == dim_ac["ac"], "left")
        .join(dim_station, silver_df["location"] == dim_station["station_code"], "left")
        .withColumn(
            "fact_inventory_transaction_key",
            F.abs(F.hash(concat_ws("||", silver_df["transaction_no"].cast("string"), silver_df["batch"].cast("string")))).cast("bigint")
        )
        .withColumn(
            "transaction_date_key",
            F.when(
                silver_df["processed_timestamp"].isNotNull(),
                F.date_format(silver_df["processed_timestamp"].cast("date"), "yyyyMMdd").cast("int")
            )
        )
        .select(
            "fact_inventory_transaction_key",
            col("dim_part_key"),
            col("dim_aircraft_key"),
            col("dim_station_key"),
            col("transaction_date_key"),
            silver_df["transaction_no"],
            silver_df["batch"],
            silver_df["transaction_type"],
            silver_df["sn"],
            silver_df["condition"],
            silver_df["qty"],
            silver_df["order_type"],
            silver_df["order_no"],
            silver_df["wo"],
        )
    )

    # MERGE
    gold_df.createOrReplaceTempView("source_fact_inv_txn")
    merge_cols = [c for c in gold_df.columns if c != "fact_inventory_transaction_key"]
    update_set = ", ".join([f"target.`{c}` = source.`{c}`" for c in merge_cols])

    spark.sql(f"""
        MERGE INTO {target_table} AS target
        USING source_fact_inv_txn AS source
        ON target.transaction_no = source.transaction_no
           AND target.batch = source.batch
        WHEN MATCHED THEN UPDATE SET {update_set}
        WHEN NOT MATCHED THEN INSERT *
    """)

    count = spark.table(target_table).count()
    print(f"  ✓ fact_inventory_transaction: {count} rows")
    return count

# COMMAND ----------

def merge_fact_inventory_snapshot():
    """Merge fact_inventory_snapshot from Silver inventory_detail (periodic snapshot)."""
    source_table = get_silver_table("qx_ppmtx_pn_inventory_detail")
    target_table = get_gold_table("qx_ppmtx_gold_fact_inventory_snapshot")
    dim_part_table = get_gold_table("qx_ppmtx_gold_dim_part")
    dim_aircraft_table = get_gold_table("qx_ppmtx_gold_dim_aircraft")
    dim_station_table = get_gold_table("qx_ppmtx_gold_dim_station")

    print(f"Merging: {target_table}")

    # Read and deduplicate Silver (one row per batch)
    silver_df = (
        spark.table(source_table)
        .orderBy(col("processed_timestamp").desc())
        .dropDuplicates(["batch"])
    )

    # Load dimension lookups
    dim_part = spark.table(dim_part_table).select("dim_part_key", "pn")
    dim_ac = spark.table(dim_aircraft_table).select("dim_aircraft_key", "ac")
    dim_station = spark.table(dim_station_table).select("dim_station_key", "station_code")

    # Join and build Gold columns
    gold_df = (
        silver_df
        .join(dim_part, silver_df["pn"] == dim_part["pn"], "left")
        .join(dim_ac, silver_df["installed_ac"] == dim_ac["ac"], "left")
        .join(dim_station, silver_df["location"] == dim_station["station_code"], "left")
        .withColumn(
            "fact_inventory_snapshot_key",
            F.abs(F.hash(silver_df["batch"].cast("string"))).cast("bigint")
        )
        .withColumn(
            "snapshot_date_key",
            F.when(
                silver_df["processed_timestamp"].isNotNull(),
                F.date_format(silver_df["processed_timestamp"].cast("date"), "yyyyMMdd").cast("int")
            )
        )
        .select(
            "fact_inventory_snapshot_key",
            col("dim_part_key"),
            col("dim_aircraft_key"),
            col("dim_station_key"),
            col("snapshot_date_key"),
            silver_df["batch"],
            silver_df["sn"],
            silver_df["nha_pn"],
            silver_df["nha_sn"],
            silver_df["condition"],
            silver_df["owner"],
            silver_df["unit_cost"],
            silver_df["currency"],
            silver_df["location"],
            silver_df["installed_ac"],
            silver_df["installed_position"],
        )
    )

    # Periodic snapshot: truncate and insert (preserves Gold table schema)
    spark.sql(f"TRUNCATE TABLE {target_table}")
    gold_df.write.mode("append").insertInto(target_table)

    count = spark.table(target_table).count()
    print(f"  ✓ fact_inventory_snapshot: {count} rows")
    return count

# COMMAND ----------

def merge_fact_inventory_control():
    """Merge fact_inventory_control from Silver inventory_control (accumulating snapshot)."""
    source_table = get_silver_table("qx_ppmtx_pn_inventory_control")
    target_table = get_gold_table("qx_ppmtx_gold_fact_inventory_control")
    dim_part_table = get_gold_table("qx_ppmtx_gold_dim_part")

    print(f"Merging: {target_table}")

    # Read and deduplicate Silver
    silver_df = (
        spark.table(source_table)
        .orderBy(col("processed_timestamp").desc())
        .dropDuplicates(["pn", "sn", "control"])
    )

    # Load dimension lookup
    dim_part = spark.table(dim_part_table).select("dim_part_key", "pn")

    # Join and build Gold columns with derived remaining measures
    gold_df = (
        silver_df
        .join(dim_part, silver_df["pn"] == dim_part["pn"], "left")
        .withColumn(
            "fact_inventory_control_key",
            F.abs(F.hash(concat_ws("||", silver_df["pn"], silver_df["sn"], silver_df["control"]))).cast("bigint")
        )
        .withColumn(
            "schedule_date_key",
            F.when(
                silver_df["schedule_date"].isNotNull(),
                F.date_format(silver_df["schedule_date"].cast("date"), "yyyyMMdd").cast("int")
            )
        )
        .withColumn(
            "reset_date_key",
            F.when(
                silver_df["reset_date"].isNotNull(),
                F.date_format(silver_df["reset_date"].cast("date"), "yyyyMMdd").cast("int")
            )
        )
        .withColumn("remaining_hours", col("schedule_hours") - col("actual_hours"))
        .withColumn("remaining_cycles", col("schedule_cycles") - col("actual_cycles"))
        .withColumn("remaining_days", col("schedule_days") - col("actual_days"))
        .select(
            "fact_inventory_control_key",
            col("dim_part_key"),
            col("schedule_date_key"),
            col("reset_date_key"),
            silver_df["pn"],
            silver_df["sn"],
            silver_df["control"],
            silver_df["schedule_hours"],
            silver_df["schedule_cycles"],
            silver_df["schedule_days"],
            silver_df["actual_hours"],
            silver_df["actual_minutes"],
            silver_df["actual_cycles"],
            silver_df["actual_days"],
            col("remaining_hours"),
            col("remaining_cycles"),
            col("remaining_days"),
        )
    )

    # MERGE (accumulating snapshot — update existing, insert new)
    gold_df.createOrReplaceTempView("source_fact_inv_control")
    merge_cols = [c for c in gold_df.columns if c != "fact_inventory_control_key"]
    update_set = ", ".join([f"target.`{c}` = source.`{c}`" for c in merge_cols])

    spark.sql(f"""
        MERGE INTO {target_table} AS target
        USING source_fact_inv_control AS source
        ON target.pn = source.pn
           AND target.sn = source.sn
           AND target.control = source.control
        WHEN MATCHED THEN UPDATE SET {update_set}
        WHEN NOT MATCHED THEN INSERT *
    """)

    count = spark.table(target_table).count()
    print(f"  ✓ fact_inventory_control: {count} rows")
    return count

# COMMAND ----------

def merge_fact_order():
    """Merge fact_order from Silver order_detail."""
    source_table = get_silver_table("qx_ppmtx_order_detail")
    target_table = get_gold_table("qx_ppmtx_gold_fact_order")
    dim_part_table = get_gold_table("qx_ppmtx_gold_dim_part")

    print(f"Merging: {target_table}")

    # Read and deduplicate Silver
    silver_df = (
        spark.table(source_table)
        .orderBy(col("processed_timestamp").desc())
        .dropDuplicates(["order_type", "order_number", "order_line"])
    )

    # Load dimension lookup
    dim_part = spark.table(dim_part_table).select("dim_part_key", "pn")

    # Join and build Gold columns
    gold_df = (
        silver_df
        .join(dim_part, silver_df["pn"] == dim_part["pn"], "left")
        .withColumn(
            "fact_order_key",
            F.abs(F.hash(concat_ws("||",
                silver_df["order_type"],
                silver_df["order_number"].cast("string"),
                silver_df["order_line"].cast("string")
            ))).cast("bigint")
        )
        .withColumn(
            "order_date_key",
            F.when(
                silver_df["processed_timestamp"].isNotNull(),
                F.date_format(silver_df["processed_timestamp"].cast("date"), "yyyyMMdd").cast("int")
            )
        )
        .select(
            "fact_order_key",
            col("dim_part_key"),
            col("order_date_key"),
            silver_df["order_type"],
            silver_df["order_number"],
            silver_df["order_line"],
            silver_df["status"],
            silver_df["sn"],
            silver_df["batch"],
            silver_df["pn_description"],
            silver_df["exchange_pn"],
            silver_df["exchange_sn"],
            silver_df["exchange_repair_cost"],
            silver_df["qty_require"],
            silver_df["qty_received"],
            silver_df["qty_available"],
            silver_df["lead_days"].alias("lead_time"),
        )
    )

    # MERGE
    gold_df.createOrReplaceTempView("source_fact_order")
    merge_cols = [c for c in gold_df.columns if c != "fact_order_key"]
    update_set = ", ".join([f"target.`{c}` = source.`{c}`" for c in merge_cols])

    spark.sql(f"""
        MERGE INTO {target_table} AS target
        USING source_fact_order AS source
        ON target.order_type = source.order_type
           AND target.order_number = source.order_number
           AND target.order_line = source.order_line
        WHEN MATCHED THEN UPDATE SET {update_set}
        WHEN NOT MATCHED THEN INSERT *
    """)

    count = spark.table(target_table).count()
    print(f"  ✓ fact_order: {count} rows")
    return count

# COMMAND ----------

def merge_fact_teardown():
    """Merge fact_teardown from Silver tear_down_report."""
    source_table = get_silver_table("qx_ppmtx_pn_tear_down_report")
    target_table = get_gold_table("qx_ppmtx_gold_fact_teardown")
    dim_part_table = get_gold_table("qx_ppmtx_gold_dim_part")
    dim_ata_table = get_gold_table("qx_ppmtx_gold_dim_ata_chapter")

    print(f"Merging: {target_table}")

    # Read and deduplicate Silver
    silver_df = (
        spark.table(source_table)
        .orderBy(col("processed_timestamp").desc())
        .dropDuplicates(["order_type", "order_number", "order_line"])
    )

    # Load dimension lookups
    dim_part = spark.table(dim_part_table).select("dim_part_key", "pn")
    dim_ata = spark.table(dim_ata_table).select("dim_ata_chapter_key", "chapter", "section", "paragraph")

    # Join and build Gold columns
    gold_df = (
        silver_df
        .join(dim_part, silver_df["pn"] == dim_part["pn"], "left")
        .join(
            dim_ata,
            (silver_df["defect_type"].isNotNull()),  # Only join if defect linkage exists
            "left"
        )
        .withColumn(
            "fact_teardown_key",
            F.abs(F.hash(concat_ws("||",
                silver_df["order_type"],
                silver_df["order_number"].cast("string"),
                silver_df["order_line"].cast("string")
            ))).cast("bigint")
        )
        .withColumn(
            "created_date_key",
            F.when(
                silver_df["created_date"].isNotNull(),
                F.date_format(silver_df["created_date"].cast("date"), "yyyyMMdd").cast("int")
            )
        )
        .select(
            "fact_teardown_key",
            col("dim_part_key"),
            lit(None).cast("bigint").alias("dim_ata_chapter_key"),
            col("created_date_key"),
            silver_df["order_type"],
            silver_df["order_number"],
            silver_df["order_line"],
            silver_df["sn"],
            silver_df["batch"],
            silver_df["fault_confirm"],
            silver_df["status"],
            silver_df["pn_description"],
            silver_df["work_done"],
            silver_df["shop_finding"],
            silver_df["defect_type"],
            silver_df["defect"],
            silver_df["defect_item"],
        )
    )

    # MERGE
    gold_df.createOrReplaceTempView("source_fact_teardown")
    merge_cols = [c for c in gold_df.columns if c != "fact_teardown_key"]
    update_set = ", ".join([f"target.`{c}` = source.`{c}`" for c in merge_cols])

    spark.sql(f"""
        MERGE INTO {target_table} AS target
        USING source_fact_teardown AS source
        ON target.order_type = source.order_type
           AND target.order_number = source.order_number
           AND target.order_line = source.order_line
        WHEN MATCHED THEN UPDATE SET {update_set}
        WHEN NOT MATCHED THEN INSERT *
    """)

    count = spark.table(target_table).count()
    print(f"  ✓ fact_teardown: {count} rows")
    return count

# COMMAND ----------

# MAGIC %md
# MAGIC ## Execute All Merges (Dependency Order)

# COMMAND ----------

print("=" * 60)
print("GOLD LAYER MERGE — Starting")
print("=" * 60)
print(f"Gold: {catalog}.{schema}")
print(f"Silver: {silver_catalog}.{silver_schema}")
print()

results = {}

# Phase 1: Dimensions (no FK dependencies)
print("--- Phase 1: Dimensions ---")
results["dim_part"] = merge_dim_part()
results["dim_aircraft"] = merge_dim_aircraft()
results["dim_station"] = merge_dim_station()
results["dim_ata_chapter"] = merge_dim_ata_chapter()
results["dim_date"] = merge_dim_date()

# Phase 2: Facts (depend on dimensions)
print("\n--- Phase 2: Facts ---")
results["fact_component_removal"] = merge_fact_component_removal()
results["fact_defect"] = merge_fact_defect()
results["fact_inventory_transaction"] = merge_fact_inventory_transaction()
results["fact_inventory_snapshot"] = merge_fact_inventory_snapshot()
results["fact_inventory_control"] = merge_fact_inventory_control()
results["fact_order"] = merge_fact_order()
results["fact_teardown"] = merge_fact_teardown()

# Phase 3: Bridges (depend on facts + dimensions)
print("\n--- Phase 3: Bridges ---")
results["bridge_defect_part"] = merge_bridge_defect_part()

# COMMAND ----------

# MAGIC %md
# MAGIC ## Final Summary

# COMMAND ----------

print("=" * 60)
print("GOLD LAYER MERGE COMPLETE")
print("=" * 60)
print(f"\n{'Table':<40} {'Rows':>10}")
print("-" * 52)
total_rows = 0
for table, count in results.items():
    print(f"{table:<40} {count:>10,}")
    total_rows += count
print("-" * 52)
print(f"{'TOTAL':<40} {total_rows:>10,}")
