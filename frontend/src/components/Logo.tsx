interface LogoProps {
  size?: number
  className?: string
  withText?: boolean
}

export default function Logo({ size = 32, className = '' }: LogoProps) {
  const padding = Math.round(size * 0.07)
  return (
    <div
      className={`inline-flex items-center justify-center rounded-full shrink-0 ${className}`}
      style={{
        background: '#FAF3E0',
        padding,
        width: size + padding * 2,
        height: size + padding * 2,
      }}
    >
      <img
        src="/logo.png"
        alt="Eat Me App"
        style={{ height: size, width: 'auto' }}
      />
    </div>
  )
}
