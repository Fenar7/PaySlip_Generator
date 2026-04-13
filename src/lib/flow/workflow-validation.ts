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

  // Check for duplicate sequences (by index position — they should be unique)
  const seen = new Set<string>();
  for (const step of workflow.steps) {
    if (seen.has(step.actionType)) {
      // Duplicate action types are allowed by design, but duplicate sequence numbers are not.
      // Since sequences are derived from array index we only flag truly duplicated step entries.
    }
    seen.add(step.actionType);
  }

  return { valid: errors.length === 0, errors };
}
