import fortyguardLogo from '@/components/ui/images/fortyguard_logo_footer.png'

const PoweredBy = () => {
  return (
    <div><div className="flex items-center justify-center gap-2 py-8">
        <span className="text-sm text-gray-500">Powered by</span>
        <a href="https://www.fortyguard.com/" target="_blank" rel="noopener noreferrer">
          <img
            src={fortyguardLogo}
            alt="FortyGuard"
            className="h-6 object-contain cursor-pointer hover:opacity-80 transition-opacity"
          />
        </a>
      </div></div>
  )
}

export default PoweredBy