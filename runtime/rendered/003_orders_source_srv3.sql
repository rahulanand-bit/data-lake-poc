-- Source: SQL Server CDC table for orders (srv3)
CREATE TABLE IF NOT EXISTS src_orders_cdc_srv3 (
    order_id INT,
    customer_name STRING,
    amount DECIMAL(12, 2),
    status STRING,
    updated_at TIMESTAMP(3),
    PRIMARY KEY (order_id) NOT ENFORCED
) WITH (
    'connector' = 'sqlserver-cdc',
    'hostname' = 'sqlsrv3',
    'port' = '1433',
    'username' = 'sa',
    'password' = 'Sql1234!',
    'database-name' = 'mbs_poc',
    'table-name' = 'dbo.orders',
    'scan.startup.mode' = 'initial',
    'debezium.snapshot.mode' = 'initial',
    'debezium.database.encrypt' = 'false',
    'debezium.database.trustServerCertificate' = 'true'
);
