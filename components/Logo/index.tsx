import Image from 'next/image'

interface LogoProps {
  size: number
}

const Logo: React.FC<LogoProps> = ({ size }) => {
  return <Image src="/logo.svg" alt="logo" width={238 * size} height={85 * size} />
}

export default Logo
