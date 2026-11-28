"use client";

import { Eye, EyeOff, Wand2 } from "lucide-react";
import { useState } from "react";

import { Button, IconButton, Input } from "@/components/ui";

export const PASSWORD_MIN_LENGTH = 12;

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
const GENERATED_LENGTH = 16;

function randomPassword(): string {
  const limit = 256 - (256 % ALPHABET.length);
  let result = "";
  while (result.length < GENERATED_LENGTH) {
    for (const byte of crypto.getRandomValues(new Uint8Array(32))) {
      if (byte < limit && result.length < GENERATED_LENGTH) {
        result += ALPHABET[byte % ALPHABET.length];
      }
    }
  }
  return result;
}

export function PasswordInput({
  id,
  value,
  autoComplete = "new-password",
  generate = false,
  invalid = false,
  onChange,
}: {
  id: string;
  value: string;
  autoComplete?: "new-password" | "current-password";
  generate?: boolean;
  invalid?: boolean;
  onChange: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        maxLength={200}
        value={value}
        aria-invalid={invalid}
        onChange={(event) => onChange(event.target.value)}
      />
      <IconButton
        label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? (
          <EyeOff aria-hidden className="size-4" />
        ) : (
          <Eye aria-hidden className="size-4" />
        )}
      </IconButton>
      {generate ? (
        <Button
          variant="secondary"
          size="sm"
          className="shrink-0"
          leadingIcon={<Wand2 aria-hidden className="size-4" />}
          onClick={() => {
            onChange(randomPassword());
            setVisible(true);
          }}
        >
          Tạo ngẫu nhiên
        </Button>
      ) : null}
    </div>
  );
}
