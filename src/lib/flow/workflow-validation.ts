import { SUPPORTED_TRIGGERS, SUPPORTED_ACTIONS } from "./catalog";

export function validateTriggerType(trigger: string): { valid: boolean; error?: string } {
  if (!SUPPORTED_TRIGGERS.includes(trigger as never)) {
    return {
      valid: false,
      error: `"${trigger}" is not a supported trigger type. Supported: ${SUPPORTED_TRIGGERS.join(", ")}`,
    };
  }
  return { valid: true };
}

export function validateActionType(action: string): { valid: boolean; error?: string } {
  if (!SUPPORTED_ACTIONS.includes(action as never)) {
    return {
      valid: false,
      error: `"${action}" is not a supported action type. Supported: ${SUPPORTED_ACTIONS.join(", ")}`,
    };
  }
  return { valid: true };
}

export function validateWorkflowForActivation(workflow: {
  steps: { actionType: string }[];
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (workflow.steps.length === 0) {
    errors.push("Workflow must have at least one step before activation.");
  }

  for (const step of workflow.steps) {
    const result = validateActionType(step.actionType);
    if (!result.valid && result.error) {
      errors.push(result.error);
    }
  }

  return { valid: errors.length === 0, errors };
}
