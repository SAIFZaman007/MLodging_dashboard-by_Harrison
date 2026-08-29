import { useState } from "react";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, SelectInput, TextInput, Toggle } from "@/components/ui/Field";
import { ROLE_DESCRIPTIONS, type User, type UserPayload, type UserRole } from "@/api/types";

interface Props {
  user: User | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: UserPayload) => void;
}

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: "admin", label: `Admin — ${ROLE_DESCRIPTIONS.admin}` },
  { value: "manager", label: `Manager — ${ROLE_DESCRIPTIONS.manager}` },
  { value: "staff", label: `Staff — ${ROLE_DESCRIPTIONS.staff}` },
  { value: "moderator", label: `Moderator — ${ROLE_DESCRIPTIONS.moderator}` },
];

const MIN_PASSWORD = 10;

export function UserFormModal({ user, saving, onClose, onSubmit }: Props) {
  const isEdit = user !== null;
  const [email, setEmail] = useState(user?.email ?? "");
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [role, setRole] = useState<UserRole>(user?.role ?? "staff");
  const [isActive, setIsActive] = useState(user?.is_active ?? true);
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    const next: Record<string, string> = {};
    if (!fullName.trim()) next.full_name = "Name is required";
    if (!email.trim()) next.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "Enter a valid email";
    if (!isEdit && password.length < MIN_PASSWORD)
      next.password = `At least ${MIN_PASSWORD} characters`;

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const payload: UserPayload = {
      email: email.trim().toLowerCase(),
      full_name: fullName.trim(),
      role,
    };
    if (isEdit) payload.is_active = isActive;
    else payload.password = password;

    onSubmit(payload);
  };

  return (
    <Modal
      open
      size="sm"
      title={isEdit ? "Edit operator" : "Invite operator"}
      description={
        isEdit
          ? "Password changes are a separate, deliberate action."
          : "Accounts are provisioned here — there is no public sign-up."
      }
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving}>
            {isEdit ? "Save changes" : "Create account"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Full name" error={errors.full_name} required>
          <TextInput
            value={fullName}
            invalid={Boolean(errors.full_name)}
            onChange={(e) => setFullName(e.target.value)}
          />
        </Field>

        <Field label="Email" error={errors.email} required>
          <TextInput
            type="email"
            value={email}
            invalid={Boolean(errors.email)}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
          />
        </Field>

        <Field label="Role" required hint={ROLE_DESCRIPTIONS[role]}>
          <SelectInput
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            options={ROLE_OPTIONS}
          />
        </Field>

        {!isEdit && (
          <Field
            label="Temporary password"
            error={errors.password}
            required
            hint={`Minimum ${MIN_PASSWORD} characters. Share it over a secure channel.`}
          >
            <TextInput
              type="text"
              value={password}
              invalid={Boolean(errors.password)}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
        )}

        {isEdit && (
          <Toggle
            checked={isActive}
            onChange={setIsActive}
            label="Active"
            description="Inactive accounts cannot sign in"
          />
        )}
      </div>
    </Modal>
  );
}