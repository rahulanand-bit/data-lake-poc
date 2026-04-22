export class RbacRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async resolveUserContext(userId, requestedRole) {
        const userRes = await this.db.query("SELECT id, default_role FROM users WHERE id = $1 AND status = 'active'", [userId]);
        if (userRes.rowCount === 0) {
            throw new Error(`Unknown or inactive user: ${userId}`);
        }
        const defaultRole = userRes.rows[0].default_role;
        const role = requestedRole ?? defaultRole;
        const roleRes = await this.db.query("SELECT 1 FROM user_roles WHERE user_id = $1 AND role_name = $2", [userId, role]);
        if (roleRes.rowCount === 0) {
            throw new Error(`Role ${role} is not assigned to user ${userId}`);
        }
        const scopeRes = await this.db.query(`SELECT rs.scope_value
       FROM role_scopes rsc
       JOIN row_scopes rs ON rs.id = rsc.row_scope_id
       WHERE rsc.role_name = $1 AND rs.scope_type = 'source_server_id'`, [role]);
        const scopes = scopeRes.rows.map((r) => r.scope_value);
        return { userId, role, scopes };
    }
    async canUseTool(role, tool) {
        const res = await this.db.query("SELECT allow FROM tool_permissions WHERE role_name = $1 AND tool_name = $2", [role, tool]);
        if (res.rowCount === 0)
            return false;
        return Boolean(res.rows[0].allow);
    }
    async getBlockedFields(role) {
        const res = await this.db.query("SELECT field_name FROM field_permissions WHERE role_name = $1 AND allow = false", [role]);
        return res.rows.map((r) => r.field_name);
    }
    async recordPolicyAudit(input) {
        await this.db.query("INSERT INTO policy_audit(request_id, user_id, role_name, decision, reason) VALUES($1, $2, $3, $4, $5)", [input.requestId, input.userId, input.role, input.decision.allow ? "ALLOW" : "DENY", input.decision.reason]);
    }
}
