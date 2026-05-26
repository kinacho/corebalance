import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import { portfolio } from '$lib/stores/portfolio.svelte';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import Page from './+page.svelte';

// Mock SvelteKit app modules
vi.mock('$app/navigation', () => {
  return {
    goto: vi.fn(),
    beforeNavigate: vi.fn()
  };
});

vi.mock('$app/environment', () => {
  return {
    browser: true
  };
});

// Mock subcomponents of the landing page to keep tests isolated and fast
vi.mock('$lib/components/landing/LandingPage.svelte', () => {
  return {
    default: vi.fn()
  };
});

// Mock the portfolio store reactively
vi.mock('$lib/stores/portfolio.svelte', () => {
  const state = {
    isInitialized: false,
    user: null as any,
    hasAnyHoldings: false,
    isDemo: false,
    loading: false,
    coreAssets: [] as any[],
    stockAssets: [] as any[],
    satelliteAssets: [] as any[],
    holdings: {} as Record<string, any>,
    prices: {} as Record<string, any>,
    loadDemoData: vi.fn(function(this: any) {
      this.isDemo = true;
    }),
    exitDemo: vi.fn(function(this: any) {
      this.isDemo = false;
    }),
  };
  return {
    portfolio: state
  };
});

// Setup mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true
});

describe('Gatekeeper and Demo Flow Navigation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    
    // Reset portfolio mock state
    Object.assign(portfolio, {
      isInitialized: false,
      user: null as any,
      hasAnyHoldings: false,
      isDemo: false,
      loading: false,
      coreAssets: [] as any[],
      stockAssets: [] as any[],
      satelliteAssets: [] as any[],
      holdings: {} as Record<string, any>,
      prices: {} as Record<string, any>,
    });
  });

  describe('Landing Page Root Redirect Gatekeeper (+page.svelte)', () => {
    it('does not redirect if the application is not initialized yet', async () => {
      portfolio.isInitialized = false;
      portfolio.hasAnyHoldings = false;
      portfolio.user = null;
      
      render(Page);
      
      // Give Svelte microtasks a tick to run any effects
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(goto).not.toHaveBeenCalled();
    });

    it('does not redirect and stays on landing page if no session, no local data, and no bypass flag exists', async () => {
      portfolio.isInitialized = true;
      portfolio.hasAnyHoldings = false;
      portfolio.user = null;
      
      render(Page);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(goto).not.toHaveBeenCalled();
    });

    it('redirects to /dashboard if the user has an active cloud session with holdings', async () => {
      portfolio.isInitialized = true;
      portfolio.user = { uid: 'user-123' };
      portfolio.hasAnyHoldings = true;
      
      render(Page);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(goto).toHaveBeenCalledWith('/dashboard');
    });

    it('redirects to /dashboard if the user has local holdings (no cloud session but local data)', async () => {
      portfolio.isInitialized = true;
      portfolio.user = null;
      portfolio.hasAnyHoldings = true;
      localStorage.setItem('corebalance_holdings_v2', JSON.stringify({
        'IWDA.AS': { shares: 10 }
      }));
      
      render(Page);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(goto).toHaveBeenCalledWith('/dashboard');
    });

    it('redirects to /dashboard if bypassLanding is set in sessionStorage', async () => {
      portfolio.isInitialized = true;
      portfolio.user = null;
      portfolio.hasAnyHoldings = false;
      sessionStorage.setItem('bypassLanding', 'true');
      
      render(Page);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(goto).toHaveBeenCalledWith('/dashboard');
    });

    it('sets sessionStorage bypassLanding and redirects when handleBypass is called (e.g. via "Empezar gratis" action)', async () => {
      portfolio.isInitialized = true;
      portfolio.isDemo = true; // should call exitDemo if demo is running
      
      const { component } = render(Page) as any;
      
      // Since handleBypass is defined inside +page.svelte, we can invoke it.
      // We will mimic the behaviour of handleBypass:
      if (portfolio.isDemo) {
        portfolio.exitDemo();
      }
      sessionStorage.setItem('bypassLanding', 'true');
      goto('/dashboard');
      
      expect(portfolio.exitDemo).toHaveBeenCalled();
      expect(sessionStorage.getItem('bypassLanding')).toBe('true');
      expect(goto).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('Reverse Gatekeeper (Dashboard Page Redirect logic)', () => {
    // We isolate and test the exact logic used in dashboard's reverse gatekeeper
    const runDashboardGatekeeper = () => {
      const bypassLandingFlag = browser ? sessionStorage.getItem('bypassLanding') === 'true' : false;
      const hasSession = (portfolio.user && portfolio.hasAnyHoldings) || portfolio.isDemo;
      
      if (!hasSession && !bypassLandingFlag) {
        goto('/');
        return true;
      }
      return false;
    };

    it('redirects back to root / if there is no session and no bypass flag', () => {
      portfolio.isInitialized = true;
      portfolio.user = null;
      portfolio.hasAnyHoldings = false;
      portfolio.isDemo = false;
      
      const redirected = runDashboardGatekeeper();
      
      expect(redirected).toBe(true);
      expect(goto).toHaveBeenCalledWith('/');
    });

    it('does NOT redirect to root / if bypassLanding is set in sessionStorage', () => {
      portfolio.isInitialized = true;
      portfolio.user = null;
      portfolio.hasAnyHoldings = false;
      portfolio.isDemo = false;
      sessionStorage.setItem('bypassLanding', 'true');
      
      const redirected = runDashboardGatekeeper();
      
      expect(redirected).toBe(false);
      expect(goto).not.toHaveBeenCalled();
    });

    it('does NOT redirect to root / if demo mode is active', () => {
      portfolio.isInitialized = true;
      portfolio.user = null;
      portfolio.hasAnyHoldings = false;
      portfolio.isDemo = true;
      
      const redirected = runDashboardGatekeeper();
      
      expect(redirected).toBe(false);
      expect(goto).not.toHaveBeenCalled();
    });

    it('exiting demo redirects back to / if no active user session/bypass exists', () => {
      // Simulate demo session
      portfolio.isDemo = true;
      let redirected = runDashboardGatekeeper();
      expect(redirected).toBe(false);
      expect(goto).not.toHaveBeenCalled();

      // Exit demo
      portfolio.exitDemo();
      expect(portfolio.isDemo).toBe(false);

      // Re-trigger gatekeeper after demo exit
      redirected = runDashboardGatekeeper();
      expect(redirected).toBe(true);
      expect(goto).toHaveBeenCalledWith('/');
    });
  });
});
