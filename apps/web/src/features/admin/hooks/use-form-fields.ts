import { useState } from "react";

export type FormErrors = Readonly<Record<string, string>>;

function omitKey(errors: FormErrors, key: string): FormErrors {
  return Object.fromEntries(
    Object.entries(errors).filter(([entryKey]) => entryKey !== key),
  );
}

export function useFormFields<V extends object>(initialValues: V) {
  const [values, setValues] = useState<V>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});

  function setValue<K extends keyof V>(
    key: K,
    value: V[K],
    errorKey: string = String(key),
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => omitKey(current, errorKey));
  }

  return { values, errors, setErrors, setValue };
}
