import type { RbacRepository } from "../db/rbacRepository.js";
import type { PolicyDecision, ToolInput, ToolName, UserContext } from "../types.js";

type ValidationResult = {
  cleanedInput: ToolInput;
  decision: PolicyDecision;
};

export class PolicyEngine {
  constructor(private readonly rbac: RbacRepository) {}

  async authorizeTool(user: UserContext, tool: ToolName, requestId: string): Promise<PolicyDecision> {
    const allowed = await this.rbac.canUseTool(user.role, tool);
    const decision: PolicyDecision = allowed
      ? {
          allow: true,
          reason: "Tool is allowed for this role.",
          applied_scopes: user.scopes,
          blocked_fields: [],
        }
      : {
          allow: false,
          reason: `Role ${user.role} is not allowed to use ${tool}.`,
          applied_scopes: user.scopes,
          blocked_fields: [],
        };

    await this.rbac.recordPolicyAudit({ requestId, userId: user.userId, role: user.role, decision });
    return decision;
  }

  async validateInput(user: UserContext, input: ToolInput): Promise<ValidationResult> {
    const blockedFields = await this.rbac.getBlockedFields(user.role);
    const blocked = new Set(blockedFields);

    const requestedFields = [...(input.group_by ?? []), ...(input.metrics ?? [])];
    const matchedBlocked = requestedFields.filter((field) => blocked.has(field));

    const cleanedInput: ToolInput = {
      ...input,
      limit: Math.max(1, Math.min(input.limit ?? 100, 500)),
      group_by: (input.group_by ?? []).filter((field) => !blocked.has(field)),
      metrics: (input.metrics ?? []).filter((field) => !blocked.has(field)),
    };

    const decision: PolicyDecision =
      matchedBlocked.length > 0
        ? {
            allow: false,
            reason: `Access denied to requested fields: ${matchedBlocked.join(", ")}`,
            applied_scopes: user.scopes,
            blocked_fields: matchedBlocked,
          }
        : {
            allow: true,
            reason: "Request passed field-level policy checks.",
            applied_scopes: user.scopes,
            blocked_fields: [],
          };

    return { cleanedInput, decision };
  }
}
