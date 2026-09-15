GRANT CONNECT ON DATABASE "databricks-postgres" TO "erika.cion@horizonair.com";
GRANT USAGE ON SCHEMA an_maintenanceengineering_ods TO "erika.cion@horizonair.com";
GRANT SELECT ON ALL TABLES IN SCHEMA an_maintenanceengineering_ods TO "erika.cion@horizonair.com";
ALTER DEFAULT PRIVILEGES IN SCHEMA an_maintenanceengineering_ods GRANT SELECT ON TABLES TO "erika.cion@horizonair.com";
