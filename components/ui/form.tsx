"use client"

import * as React from "react"
import type { UseFormReturn } from "react-hook-form"
import { cn } from "@/lib/utils"

interface FormProps<TFormValues> extends Omit<React.HTMLAttributes<HTMLFormElement>, "onSubmit"> {
  form: UseFormReturn<TFormValues>
  onSubmit?: (values: TFormValues) => void
}

const Form = <TFormValues extends Record<string, unknown>>({
  form,
  onSubmit,
  children,
  className,
  ...props
}: FormProps<TFormValues>) => {
  return (
    <form onSubmit={form.handleSubmit(onSubmit || (() => {}))} className={cn("space-y-8", className)} {...props}>
      {children}
    </form>
  )
}

const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn("space-y-2", className)} {...props} />
  },
)
FormItem.displayName = "FormItem"

const FormLabel = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          className,
        )}
        {...props}
      />
    )
  },
)
FormLabel.displayName = "FormLabel"

const FormControl = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn("relative", className)} {...props} />
  },
)
FormControl.displayName = "FormControl"

const FormMessage = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <p ref={ref} className={cn("text-sm font-medium text-destructive", className)} {...props}>
        {children}
      </p>
    )
  },
)
FormMessage.displayName = "FormMessage"

interface FormFieldContextValue<TFieldValues> {
  name: string
  control: UseFormReturn<TFieldValues>["control"]
}

const FormFieldContext = React.createContext<FormFieldContextValue<any>>({} as FormFieldContextValue<any>)

const FormField = <TFieldValues extends Record<string, unknown>>({
  name,
  control,
  render,
}: {
  name: string
  control: UseFormReturn<TFieldValues>["control"]
  render: (props: { field: any }) => React.ReactNode
}) => {
  const fieldContext = React.useMemo(
    () => ({
      name,
      control,
    }),
    [name, control],
  )

  return (
    <FormFieldContext.Provider value={fieldContext}>{render({ field: { name, control } })}</FormFieldContext.Provider>
  )
}

export { Form, FormItem, FormLabel, FormControl, FormMessage, FormField }

