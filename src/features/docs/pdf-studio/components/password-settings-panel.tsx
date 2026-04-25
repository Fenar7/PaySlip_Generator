"use client";

import type { PasswordSettings } from "@/features/docs/pdf-studio/types";
import {
  calculatePasswordStrength,
  validatePasswords,
  validateOwnerPassword,
  arePasswordsEqual,
  getPasswordStrengthDescription,
  PDF_STUDIO_PASSWORD_MAX_LENGTH,
} from "@/features/docs/pdf-studio/utils/password";
import { cn } from "@/lib/utils";
import { useState, useCallback, useMemo } from "react";

interface PasswordSettingsPanelProps {
  settings: PasswordSettings;
  onSettingsChange: (settings: PasswordSettings) => void;
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-[0.82rem] font-medium text-[var(--foreground)]">{label}</p>
        {hint ? (
          <p className="mt-0.5 text-[0.75rem] leading-5 text-[var(--muted-foreground)]">{hint}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
          checked 
            ? "bg-[var(--accent)]" 
            : "bg-[var(--border-soft)]"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

function PasswordInput({
  label,
  hint,
  value,
  placeholder,
  onChange,
  showStrength = false,
  error,
}: {
  label: string;
  hint?: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  showStrength?: boolean;
  error?: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  
  const strengthValidation = useMemo(() => {
    if (!showStrength || !value) return null;
    return calculatePasswordStrength(value);
  }, [value, showStrength]);

  return (
    <div className="space-y-2">
      <div>
        <p className="text-[0.82rem] font-medium text-[var(--foreground)]">{label}</p>
        {hint ? (
          <p className="mt-0.5 text-[0.75rem] leading-5 text-[var(--muted-foreground)]">{hint}</p>
        ) : null}
      </div>
      
      <div className={cn(
        "flex items-center gap-2 rounded-[1rem] border px-4 bg-white shadow-[0_10px_24px_rgba(34,34,34,0.035)] transition-colors",
        error 
          ? "border-red-400 focus-within:border-red-500" 
          : "border-[var(--border-soft)] focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_4px_var(--accent-soft)]"
      )}>
        <input
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 py-3 text-[0.88rem] text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          title={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 11-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>
      </div>

      {error && (
        <p className="text-[0.75rem] text-red-600">{error}</p>
      )}

      {/* Password Strength Indicator */}
      {showStrength && value && strengthValidation && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[0.75rem] text-[var(--muted-foreground)]">Password strength</span>
            <span className={cn(
              "text-[0.75rem] font-medium",
              strengthValidation.strength === 'weak' && "text-red-600",
              strengthValidation.strength === 'fair' && "text-yellow-600",
              strengthValidation.strength === 'good' && "text-green-500",
              strengthValidation.strength === 'strong' && "text-green-600"
            )}>
              {strengthValidation.strength.charAt(0).toUpperCase() + strengthValidation.strength.slice(1)}
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-300 ease-out",
                strengthValidation.strength === 'weak' && "bg-red-500",
                strengthValidation.strength === 'fair' && "bg-yellow-500",
                strengthValidation.strength === 'good' && "bg-green-400",
                strengthValidation.strength === 'strong' && "bg-green-600"
              )}
              style={{ 
                width: `${Math.max(10, (strengthValidation.score / 18) * 100)}%` 
              }}
            />
          </div>
          <p className="text-[0.7rem] text-[var(--muted-foreground)]">
            {getPasswordStrengthDescription(strengthValidation.strength)}
          </p>
        </div>
      )}
    </div>
  );
}

function Checkbox({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <div className="relative flex items-center justify-center mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <div className={cn(
          "h-5 w-5 rounded border-2 transition-all",
          checked 
            ? "bg-[var(--accent)] border-[var(--accent)]" 
            : "bg-white border-[var(--border-soft)] hover:border-[var(--border-strong)]"
        )}>
          {checked && (
            <svg className="h-3 w-3 text-white absolute top-0.5 left-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </div>
      <div className="flex-1">
        <p className="text-[0.82rem] font-medium text-[var(--foreground)]">{label}</p>
        {hint ? (
          <p className="mt-0.5 text-[0.75rem] leading-5 text-[var(--muted-foreground)]">{hint}</p>
        ) : null}
      </div>
    </label>
  );
}

function CollapsibleSection({
  title,
  children,
  defaultExpanded = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-[0.82rem] font-medium text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
      >
        <svg
          className={cn(
            "h-4 w-4 transition-transform",
            expanded ? "rotate-90" : "rotate-0"
          )}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        {title}
      </button>
      {expanded && (
        <div className="ml-6 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

export function PasswordSettingsPanel({ settings, onSettingsChange }: PasswordSettingsPanelProps) {
  // Memoize validation to avoid recalculating on every render
  const passwordValidation = useMemo(() => {
    if (!settings.enabled || !settings.userPassword) return null;
    return validatePasswords(settings.userPassword, settings.confirmPassword);
  }, [settings.enabled, settings.userPassword, settings.confirmPassword]);

  const handleEnabledChange = useCallback((enabled: boolean) => {
    onSettingsChange({
      ...settings,
      enabled,
    });
  }, [settings, onSettingsChange]);

  const handleUserPasswordChange = useCallback((userPassword: string) => {
    onSettingsChange({
      ...settings,
      userPassword,
    });
  }, [settings, onSettingsChange]);

  const handleConfirmPasswordChange = useCallback((confirmPassword: string) => {
    onSettingsChange({
      ...settings,
      confirmPassword,
    });
  }, [settings, onSettingsChange]);

  const handleOwnerPasswordChange = useCallback((ownerPassword: string) => {
    onSettingsChange({
      ...settings,
      ownerPassword,
    });
  }, [settings, onSettingsChange]);

  const handlePermissionChange = useCallback((permission: keyof PasswordSettings['permissions'], checked: boolean) => {
    onSettingsChange({
      ...settings,
      permissions: {
        ...settings.permissions,
        [permission]: checked,
      },
    });
  }, [settings, onSettingsChange]);

  // Validation errors
  const passwordMismatchError = settings.enabled && settings.userPassword && settings.confirmPassword &&
    !arePasswordsEqual(settings.userPassword, settings.confirmPassword) ? "Passwords do not match" : undefined;

  const confirmPasswordError = settings.enabled && settings.userPassword && !settings.confirmPassword ?
    "Please confirm your password" : passwordMismatchError;

  const ownerValidation = useMemo(() => {
    if (!settings.enabled) return null;
    return validateOwnerPassword(settings.ownerPassword ?? "");
  }, [settings.enabled, settings.ownerPassword]);

  const ownerPasswordError = ownerValidation && !ownerValidation.isValid
    ? ownerValidation.errors[0]
    : undefined;

  return (
    <div className="space-y-6">
      {/* Enable Password Protection Toggle */}
      <Toggle
        label="Password Protection"
        hint="Secure your PDF with password protection and permission controls."
        checked={settings.enabled}
        onChange={handleEnabledChange}
      />

      {/* Password Fields - only show when enabled */}
      {settings.enabled && (
        <div className="space-y-4 rounded-[1.3rem] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.7)] p-4 shadow-[0_10px_24px_rgba(34,34,34,0.03)]">
          
          {/* User Password */}
          <PasswordInput
            label="Password"
            hint={`Enter a strong password to protect your PDF. Maximum ${PDF_STUDIO_PASSWORD_MAX_LENGTH} characters.`}
            value={settings.userPassword}
            placeholder="Enter password..."
            onChange={handleUserPasswordChange}
            showStrength={true}
          />

          {/* Confirm Password */}
          <PasswordInput
            label="Confirm Password"
            hint="Re-enter your password to confirm."
            value={settings.confirmPassword}
            placeholder="Confirm password..."
            onChange={handleConfirmPasswordChange}
            error={confirmPasswordError}
          />

          {/* Advanced Section - Owner Password */}
          <CollapsibleSection title="Advanced" defaultExpanded={false}>
            <PasswordInput
              label="Owner Password (Optional)"
              hint={`Administrative password with full permissions. Leave empty to use the same password. Maximum ${PDF_STUDIO_PASSWORD_MAX_LENGTH} characters.`}
              value={settings.ownerPassword || ''}
              placeholder="Enter owner password..."
              onChange={handleOwnerPasswordChange}
              error={ownerPasswordError}
            />
          </CollapsibleSection>

          {/* Permissions */}
          <div className="space-y-3">
            <div>
              <p className="text-[0.82rem] font-medium text-[var(--foreground)]">Permissions</p>
              <p className="mt-0.5 text-[0.75rem] leading-5 text-[var(--muted-foreground)]">
                Control what users can do with the protected PDF.
              </p>
            </div>
            
            <div className="space-y-3">
              <Checkbox
                label="Allow Printing"
                hint="Users can print the PDF document."
                checked={settings.permissions.printing}
                onChange={(checked) => handlePermissionChange('printing', checked)}
              />
              
              <Checkbox
                label="Allow Copying"
                hint="Users can copy text and images from the PDF."
                checked={settings.permissions.copying}
                onChange={(checked) => handlePermissionChange('copying', checked)}
              />
              
              <Checkbox
                label="Allow Modifying"
                hint="Users can edit and modify the PDF content."
                checked={settings.permissions.modifying}
                onChange={(checked) => handlePermissionChange('modifying', checked)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Validation Summary */}
      {settings.enabled && passwordValidation && passwordValidation.errors.length > 0 && (
        <div className="rounded-[1rem] border border-red-200 bg-red-50 p-3">
          <div className="flex items-start gap-2">
            <svg className="h-5 w-5 text-red-600 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div className="flex-1">
              <p className="text-[0.8rem] font-medium text-red-800">Password validation errors:</p>
              <ul className="mt-1 text-[0.75rem] text-red-700 space-y-1">
                {passwordValidation.errors.map((error, index) => (
                  <li key={index} className="flex items-start gap-1">
                    <span className="text-red-600 mt-0.5">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}