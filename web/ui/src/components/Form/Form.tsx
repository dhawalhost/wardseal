import * as React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "../../lib/utils";

/* ─────────────────────────────────────────────────────────────
 * Field context
 * FormField generates stable ids and shares error/required state so
 * Label, Input, SelectTrigger, FormDescription and FormMessage wire
 * htmlFor / aria-describedby / aria-invalid automatically.
 * Every consumer still works standalone when no FormField is present.
 * ───────────────────────────────────────────────────────────── */

interface FormFieldContextValue {
  id: string;
  descriptionId: string;
  messageId: string;
  error?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  hasDescription: boolean;
  registerDescription: () => () => void;
}

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null);

/** Field state for custom controls. Returns null outside a FormField. */
function useFormField() {
  return React.useContext(FormFieldContext);
}

interface ControlAriaProps {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: React.AriaAttributes["aria-invalid"];
  required?: boolean;
  disabled?: boolean;
}

/**
 * ARIA/id props a control inside a FormField should apply. Caller-supplied
 * values win. `ownMessageId` is for controls that render their own error.
 */
function useFormControlProps(props: ControlAriaProps, ownMessageId?: string): ControlAriaProps {
  const field = useFormField();
  const invalid =
    props["aria-invalid"] ?? (field?.error || ownMessageId ? true : undefined);
  const describedBy =
    [
      props["aria-describedby"],
      field?.hasDescription ? field.descriptionId : undefined,
      field?.error ? field.messageId : undefined,
      ownMessageId,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  return {
    id: props.id ?? field?.id,
    "aria-describedby": describedBy,
    "aria-invalid": invalid,
    required: props.required ?? field?.required,
    disabled: props.disabled ?? field?.disabled,
  };
}

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Control id. Generated when omitted. */
  controlId?: string;
  /** Error message. Marks the control aria-invalid and is rendered by <FormMessage />. */
  error?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
}

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ className, controlId, error, required, disabled, ...props }, ref) => {
    const generated = React.useId();
    const id = controlId ?? `field-${generated.replace(/:/g, "")}`;
    const [descriptionCount, setDescriptionCount] = React.useState(0);

    const registerDescription = React.useCallback(() => {
      setDescriptionCount((n) => n + 1);
      return () => setDescriptionCount((n) => n - 1);
    }, []);

    const value = React.useMemo<FormFieldContextValue>(
      () => ({
        id,
        descriptionId: `${id}-description`,
        messageId: `${id}-message`,
        error,
        required,
        disabled,
        hasDescription: descriptionCount > 0,
        registerDescription,
      }),
      [id, error, required, disabled, descriptionCount, registerDescription]
    );

    return (
      <FormFieldContext.Provider value={value}>
        <div
          ref={ref}
          className={cn("group/field flex w-full flex-col gap-1.5", className)}
          data-invalid={error ? "" : undefined}
          data-disabled={disabled ? "" : undefined}
          {...props}
        />
      </FormFieldContext.Provider>
    );
  }
);
FormField.displayName = "FormField";

/** Helper text below a control. Linked via aria-describedby inside a FormField. */
const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, id, ...props }, ref) => {
  const field = useFormField();
  const register = field?.registerDescription;
  React.useEffect(() => register?.(), [register]);

  return (
    <p
      ref={ref}
      id={id ?? field?.descriptionId}
      className={cn("text-xs text-on-surface-subtle", className)}
      {...props}
    />
  );
});
FormDescription.displayName = "FormDescription";

/**
 * Inline error. Renders FormField `error` (or children). Icon + text so the
 * state is not conveyed by colour alone (WCAG 1.4.1).
 */
const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, id, children, ...props }, ref) => {
  const field = useFormField();
  const body = children ?? field?.error;
  if (!body) return null;

  return (
    <p
      ref={ref}
      id={id ?? field?.messageId}
      className={cn(
        "flex items-start gap-1.5 text-xs font-medium text-error-subtle-foreground",
        className
      )}
      {...props}
    >
      <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{body}</span>
    </p>
  );
});
FormMessage.displayName = "FormMessage";

const FormGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-4 w-full", className)} {...props} />
  )
);
FormGroup.displayName = "FormGroup";

export interface FormSectionProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Heading element for the title. Pick the level that fits the page outline. */
  titleAs?: "h2" | "h3" | "h4" | "h5" | "h6";
}

/** A named group of fields (role="group", labelled by its title). */
const FormSection = React.forwardRef<HTMLDivElement, FormSectionProps>(
  ({ className, title, description, titleAs: Heading = "h4", children, ...props }, ref) => {
    const base = React.useId().replace(/:/g, "");
    const titleId = `section-${base}-title`;
    const descriptionId = description ? `section-${base}-description` : undefined;

    return (
      <div
        ref={ref}
        role="group"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={cn(
          "space-y-4 border-b border-border pb-6 mb-6 last:border-0 last:pb-0 last:mb-0",
          className
        )}
        {...props}
      >
        <div className="space-y-1">
          <Heading id={titleId} className="text-sm font-semibold leading-tight text-on-surface">
            {title}
          </Heading>
          {description && (
            <p id={descriptionId} className="text-sm text-on-surface-subtle">
              {description}
            </p>
          )}
        </div>
        <div className="pt-2">{children}</div>
      </div>
    );
  }
);
FormSection.displayName = "FormSection";

export {
  FormField,
  FormDescription,
  FormMessage,
  FormGroup,
  FormSection,
  useFormField,
  useFormControlProps,
};
