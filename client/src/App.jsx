import { useEffect, useState } from 'react';
import { History, MapPinned, Search, MessageSquare } from 'lucide-react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';

import AppRoutes from './routes/AppRoutes.jsx';
import LiquidGlass from './components/LiquidGlass.jsx';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const isChatPage = location.pathname === '/chat';
  const isLandingPage = location.pathname === '/';

  const isAnalyzeActive = location.pathname === '/dashboard';
  const isHistoryActive = location.pathname === '/history';
  const isChatActive = location.pathname === '/chat';

  const [scrolled, setScrolled] = useState(false);
  const [provider, setProvider] = useState(() => localStorage.getItem('byok_provider') || 'mistral');

  useEffect(() => {
    if (!localStorage.getItem('byok_provider')) {
      localStorage.setItem('byok_provider', 'mistral');
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleProviderChange = () => {
      setProvider(localStorage.getItem('byok_provider') || 'mistral');
    };
    window.addEventListener('byok_provider_change', handleProviderChange);
    window.addEventListener('storage', handleProviderChange);
    return () => {
      window.removeEventListener('byok_provider_change', handleProviderChange);
      window.removeEventListener('storage', handleProviderChange);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Support Ctrl + Cmd/Super (metaKey) OR Ctrl + Alt (altKey) for robust OS/browser compatibility
      const hasModifiers = e.ctrlKey && (e.metaKey || e.altKey);
      
      if (hasModifiers) {
        const key = e.key.toLowerCase();
        const code = e.code;

        if (code === 'KeyA' || key === 'a') {
          e.preventDefault();
          navigate('/dashboard');
        } else if (code === 'KeyH' || key === 'h') {
          e.preventDefault();
          navigate('/history');
        } else if (code === 'KeyB' || key === 'b') {
          e.preventDefault();
          navigate('/chat');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // Landing page has its own isolated design — skip the app shell chrome
  if (isLandingPage) {
    return <AppRoutes />;
  }

  return (
    <div className={`app-shell ${isChatPage ? 'app-shell--chat' : ''}`}>
      {/* Floating Ambient Background Orbs */}
      <div className="bg-orbs" id="liquid-glass-scene" aria-hidden="true">
        <div className="bg-orb bg-orb--1" />
        <div className="bg-orb bg-orb--2" />
        <div className="bg-orb bg-orb--3" />
      </div>

      <header className={`topbar ${scrolled ? 'scrolled' : ''}`}>
        <LiquidGlass
          tagName="div"
          className={`topbar-inner ${scrolled ? 'scrolled' : ''}`}
          depth={scrolled ? 35 : 45}
          blur={1}
          glint={scrolled ? 30 : 40}
          tint={0.08}
          tintColor="#F8F9FA"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <NavLink to="/dashboard" id="nav-brand" className="brand" aria-label="MarketSense dashboard">
              <img src="/images/marketsense_logo.png" className="brand-logo-img" alt="MarketSense Logo" />
              <span>MarketSense</span>
            </NavLink>
          </div>

          <nav className="primary-nav mobile-nav-compact" aria-label="Primary navigation">
            <NavLink
              to="/dashboard"
              id="nav-analyze"
              className={`nav-link ${isAnalyzeActive ? 'active' : ''}`}
            >
              <span className="nav-link-title">
                <Search size={15} aria-hidden="true" />
                <span>Analyze</span>
              </span>
              <span className="nav-link-keybind" aria-label="shortcut: Command Control A">
                <kbd>⌘</kbd>
                <kbd>⌃</kbd>
                <kbd>A</kbd>
              </span>
            </NavLink>

            <NavLink
              to="/history"
              id="nav-history"
              className={`nav-link ${isHistoryActive ? 'active' : ''}`}
            >
              <span className="nav-link-title">
                <History size={15} aria-hidden="true" />
                <span>History</span>
              </span>
              <span className="nav-link-keybind" aria-label="shortcut: Command Control H">
                <kbd>⌘</kbd>
                <kbd>⌃</kbd>
                <kbd>H</kbd>
              </span>
            </NavLink>
          </nav>

          <div className="topbar-actions">
            <NavLink
              to="/chat"
              id="mobile-nav-toggle"
              className={`nav-cta-btn ${isChatActive ? 'active' : ''}`}
              aria-label="AI Chat Assistant"
            >
              <img
                src={
                  provider === 'openai' ? '/images/openai.png' :
                  provider === 'anthropic' ? '/images/anthropic-light.png' :
                  provider === 'gemini' ? '/images/gemini-color-light.png' :
                  '/images/mistral.png'
                }
                alt=""
                className="nav-logo-img"
                draggable="false"
                style={{ objectFit: 'contain' }}
              />
              <span>AI Chat</span>
            </NavLink>

            <SignedOut>
              <SignInButton mode="modal">
                <button className="nav-auth-btn">Sign In</button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </LiquidGlass>
      </header>

      <main className="main-content">
        <AppRoutes />
      </main>
    </div>
  );
}

export default App;
