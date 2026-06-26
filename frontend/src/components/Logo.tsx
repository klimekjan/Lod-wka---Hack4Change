interface LogoProps {
  size?: number
  className?: string
  withText?: boolean
}

export default function Logo({ size = 32, className = '' }: LogoProps) {
  return (
    <img
      src="/logo.png"
      alt="Eat Me App"
      style={{ height: size, width: 'auto' }}
      className={className}
    />
  )
}
