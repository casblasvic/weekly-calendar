interface LoadingIndicatorProps {
  message?: string
  size?: "sm" | "md" | "lg"
  color?: string
}

export function LoadingIndicator({
  message = "Cargando...",
  size = "md",
  color = "purple-600",
}: LoadingIndicatorProps) {
  // Determinar el tamaño del spinner
  const spinnerSize = {
    sm: "w-8 h-8 border-2",
    md: "w-12 h-12 border-3",
    lg: "w-16 h-16 border-4",
  }[size]

  // Determinar el tamaño del texto
  const textSize = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  }[size]

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div
          className={`${spinnerSize} border-${color} border-t-transparent rounded-full animate-spin mx-auto mb-4`}
          aria-hidden="true"
        ></div>
        <p className={`${textSize} text-gray-600`} aria-live="polite">
          {message}
        </p>
      </div>
    </div>
  )
}

