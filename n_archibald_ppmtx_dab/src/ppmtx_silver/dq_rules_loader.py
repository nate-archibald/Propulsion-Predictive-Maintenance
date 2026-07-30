"""
DQ Rules Loader - Pure Python module for loading data quality rules from Delta table.
Provides cached rule lookups for DLT expectations framework.

NOTE: This is a pure Python module (NO notebook header). It is imported by DLT notebooks.
"""

_rules_cache = None


def _load_rules(catalog, silver_schema, rules_table="qx_ppmtx_dq_rules"):
    """Load all active DQ rules from the Delta table into a cached DataFrame."""
    global _rules_cache
    if _rules_cache is None:
        from pyspark.sql import SparkSession
        spark = SparkSession.builder.getOrCreate()
        _rules_cache = spark.sql(
            f"SELECT table_name, rule_name, constraint_sql, severity "
            f"FROM {catalog}.{silver_schema}.{rules_table} "
            f"WHERE is_active = true"
        ).toPandas()
    return _rules_cache


def get_critical_rules_for_table(table_name, catalog="subject_maintenanceengineering_test", silver_schema="an_maintenanceengineering_ods"):
    """
    Get critical DQ rules (drop violations) for a given table.
    Returns dict of {rule_name: constraint_sql} for use with @dlt.expect_all_or_drop().
    """
    df = _load_rules(catalog, silver_schema)
    filtered = df[(df["table_name"] == table_name) & (df["severity"] == "CRITICAL")]
    return dict(zip(filtered["rule_name"], filtered["constraint_sql"]))


def get_warning_rules_for_table(table_name, catalog="subject_maintenanceengineering_test", silver_schema="an_maintenanceengineering_ods"):
    """
    Get warning DQ rules (log but keep) for a given table.
    Returns dict of {rule_name: constraint_sql} for use with @dlt.expect_all().
    """
    df = _load_rules(catalog, silver_schema)
    filtered = df[(df["table_name"] == table_name) & (df["severity"] == "WARNING")]
    return dict(zip(filtered["rule_name"], filtered["constraint_sql"]))


def get_quarantine_condition(table_name, catalog="subject_maintenanceengineering_test", silver_schema="an_maintenanceengineering_ods"):
    """
    Get combined quarantine condition (all critical rules negated) for a given table.
    Returns SQL expression that is TRUE when a record should be quarantined.
    """
    df = _load_rules(catalog, silver_schema)
    filtered = df[(df["table_name"] == table_name) & (df["severity"] == "CRITICAL")]
    if filtered.empty:
        return "FALSE"
    conditions = [f"NOT ({sql})" for sql in filtered["constraint_sql"]]
    return " OR ".join(conditions)
