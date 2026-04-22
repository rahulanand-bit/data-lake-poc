-- RBAC metadata schema for analytics backend
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  default_role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL,
  role_name TEXT NOT NULL,
  PRIMARY KEY (user_id, role_name)
);

CREATE TABLE IF NOT EXISTS row_scopes (
  id SERIAL PRIMARY KEY,
  scope_type TEXT NOT NULL,
  scope_value TEXT NOT NULL,
  UNIQUE(scope_type, scope_value)
);

CREATE TABLE IF NOT EXISTS role_scopes (
  role_name TEXT NOT NULL,
  row_scope_id INT NOT NULL REFERENCES row_scopes(id),
  PRIMARY KEY (role_name, row_scope_id)
);

CREATE TABLE IF NOT EXISTS tool_permissions (
  role_name TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  allow BOOLEAN NOT NULL,
  PRIMARY KEY (role_name, tool_name)
);

CREATE TABLE IF NOT EXISTS field_permissions (
  role_name TEXT NOT NULL,
  field_kind TEXT NOT NULL,
  field_name TEXT NOT NULL,
  allow BOOLEAN NOT NULL,
  PRIMARY KEY (role_name, field_kind, field_name)
);

CREATE TABLE IF NOT EXISTS policy_audit (
  id BIGSERIAL PRIMARY KEY,
  request_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role_name TEXT NOT NULL,
  decision TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO roles(name, description) VALUES
('admin', 'Full analytics access'),
('analyst_srv1', 'Access restricted to srv1 data'),
('analyst_srv2', 'Access restricted to srv2 data')
ON CONFLICT (name) DO NOTHING;

INSERT INTO users(id, email, default_role) VALUES
('u_admin', 'admin@mbs.local', 'admin'),
('u_analyst1', 'analyst1@mbs.local', 'analyst_srv1'),
('u_analyst2', 'analyst2@mbs.local', 'analyst_srv2')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_roles(user_id, role_name) VALUES
('u_admin', 'admin'),
('u_analyst1', 'analyst_srv1'),
('u_analyst2', 'analyst_srv2')
ON CONFLICT DO NOTHING;

INSERT INTO row_scopes(scope_type, scope_value) VALUES
('source_server_id', 'srv1'),
('source_server_id', 'srv2'),
('source_server_id', 'srv3')
ON CONFLICT DO NOTHING;

INSERT INTO role_scopes(role_name, row_scope_id)
SELECT 'analyst_srv1', id FROM row_scopes WHERE scope_type='source_server_id' AND scope_value='srv1'
ON CONFLICT DO NOTHING;

INSERT INTO role_scopes(role_name, row_scope_id)
SELECT 'analyst_srv2', id FROM row_scopes WHERE scope_type='source_server_id' AND scope_value='srv2'
ON CONFLICT DO NOTHING;

INSERT INTO tool_permissions(role_name, tool_name, allow)
SELECT r.name, t.tool_name, true
FROM roles r
CROSS JOIN (VALUES ('overview_tool'), ('trends_tool'), ('segmentation_tool'), ('drilldown_tool')) t(tool_name)
ON CONFLICT (role_name, tool_name) DO NOTHING;

INSERT INTO field_permissions(role_name, field_kind, field_name, allow) VALUES
('analyst_srv1', 'dimension', 'customer_name', false),
('analyst_srv2', 'dimension', 'customer_name', false)
ON CONFLICT (role_name, field_kind, field_name) DO NOTHING;
