ADD JAR 'file:///opt/flink/connectors/flink-sql-connector-sqlserver-cdc-3.2.1.jar';
ADD JAR 'file:///opt/flink/connectors/mssql-jdbc-13.4.0.jre11.jar';
CREATE TABLE src_orders_cdc (
    order_id INT,
    customer_name STRING,
    amount DECIMAL(12, 2),
    status STRING,
    updated_at TIMESTAMP(3),
    PRIMARY KEY (order_id) NOT ENFORCED
) WITH (
    'connector' = 'sqlserver-cdc',
    'hostname' = 'host.docker.internal',
    'port' = '1433',
    'username' = 'sa',
    'password' = 'Sql1234',
    'database-name' = 'mbs_poc',
    'table-name' = 'dbo.orders',
    'scan.startup.mode' = 'initial',
    'debezium.snapshot.mode' = 'initial'
);
CREATE TABLE dbg_print (
    order_id INT,
    customer_name STRING,
    amount DECIMAL(12, 2),
    status STRING,
    updated_at TIMESTAMP(3)
) WITH ('connector'='print');
INSERT INTO dbg_print SELECT order_id, customer_name, amount, status, updated_at FROM src_orders_cdc;
