import * as React from "react";
import { cn } from "@/lib/utils";
import { formatPhoneNumber, extractPhoneDigits } from "@/lib/validation";

interface PhoneInputProps extends Omit<React.ComponentProps<"input">, "onChange" | "value"> {
  value: string;
  onChange: (value: string) => void;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      // If user cleared input, reset
      if (!raw || raw === '+') {
        onChange('');
        return;
      }
      const formatted = formatPhoneNumber(raw);
      onChange(formatted);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Auto-populate +7 on focus if empty
      if (!value) {
        onChange('+7');
      }
      props.onFocus?.(e);
    };

    return (
      <input
        type="tel"
        inputMode="numeric"
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        placeholder="+7 (___) ___-__-__"
        maxLength={18}
        {...props}
      />
    );
  },
);
PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
