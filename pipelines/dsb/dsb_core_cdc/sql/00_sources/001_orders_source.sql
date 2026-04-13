-- Source: SQL Server CDC table for orders
CREATE TABLE IF NOT EXISTS src_orders_cdc (
    order_id INT,
    customer_name STRING,
    amount DECIMAL(12, 2),
    status STRING,
    updated_at TIMESTAMP(3),
    PRIMARY KEY (order_id) NOT ENFORCED
) WITH (
    'connector' = 'sqlserver-cdc',
    'hostname' = '{{SQLSERVER_HOST}}',
    'port' = '{{SQLSERVER_PORT}}',
    'username' = '{{SQLSERVER_USERNAME}}',
    'password' = '{{SQLSERVER_PASSWORD}}',
    'database-name' = '{{SQLSERVER_DATABASE}}',
    'table-name' = '{{SQLSERVER_SCHEMA}}.orders',
    'scan.startup.mode' = 'initial',
    'debezium.snapshot.mode' = 'initial',
    'debezium.database.encrypt' = 'false',
    'debezium.database.trustServerCertificate' = 'true'
);
