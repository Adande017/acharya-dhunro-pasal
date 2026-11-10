import { useState } from 'react'
import { AuthPage } from './components/auth-page'
import { ShopPage } from './components/shop-page'

export default function App() {
  const [showShop, setShowShop] = useState(false)

  return showShop ? (
    <ShopPage
      onAccount={() => {
        setShowShop(false)
        window.scrollTo(0, 0)
      }}
    />
  ) : (
    <AuthPage onContinue={() => setShowShop(true)} />
  )
}
