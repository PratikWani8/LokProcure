import React, { useState, useEffect, useCallback } from 'react';
import Login from './components/Login';

// Government Portal Components
import GovSidebar from './components/government/GovSidebar';
import Dashboard from './components/Dashboard';
import GovOrders from './components/government/GovOrders';
import GovActiveBids from './components/government/GovActiveBids';
import GovNegotiations from './components/government/GovNegotiations';
import PurchaseRequestForm from './components/PurchaseRequestForm';
import VendorComparison from './components/VendorComparison';
import ApprovalQueue from './components/ApprovalQueue';
import PurchaseOrders from './components/PurchaseOrders';

// Vendor Portal Components
import VendorSidebar from './components/vendor/VendorSidebar';
import VendorDashboard from './components/vendor/VendorDashboard';
import VendorActiveOrders from './components/vendor/VendorActiveOrders';
import VendorMyBids from './components/vendor/VendorMyBids';
import VendorNegotiations from './components/vendor/VendorNegotiations';
import VendorAwardedOrders from './components/vendor/VendorAwardedOrders';

import { authAPI, approvalsAPI, vendorPortalAPI } from './api';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPrId, setSelectedPrId] = useState(null);
  const [orderToBid, setOrderToBid] = useState(null);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [vendorBidsCount, setVendorBidsCount] = useState(0);
  const [toast, setToast] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  const isVendor = user?.role === 'Vendor';

  const VENDOR_TABS = ['vendor_dashboard', 'vendor_active_orders', 'vendor_my_bids', 'vendor_negotiations', 'vendor_awarded_orders'];
  const GOV_TABS = ['dashboard', 'orders', 'new_pr', 'purchase_requests', 'active_bids', 'vendor_comparison', 'negotiations', 'approval_queue', 'purchase_orders'];

  const effectiveTab = isVendor
    ? (VENDOR_TABS.includes(activeTab) ? activeTab : 'vendor_dashboard')
    : (GOV_TABS.includes(activeTab) ? activeTab : 'dashboard');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const fetchBadgeCounts = useCallback(async () => {
    if (!token || !user) return;
    try {
      if (user.role === 'Vendor') {
        const bids = await vendorPortalAPI.getMyBids();
        setVendorBidsCount(Array.isArray(bids) ? bids.length : 0);
      } else {
        const queue = await approvalsAPI.getQueue('Pending');
        setPendingApprovalsCount(Array.isArray(queue) ? queue.length : 0);
      }
    } catch (err) {
      // Ignore background badge fetch errors
    }
  }, [token, user]);

  // Initial Auth Check
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsedUser);
        setActiveTab(parsedUser.role === 'Vendor' ? 'vendor_dashboard' : 'dashboard');
      } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setAuthChecking(false);
  }, []);

  // Listen for unauthorized events
  useEffect(() => {
    const handleUnauth = () => {
      setUser(null);
      setToken(null);
      showToast('Session expired. Please sign in again.', 'error');
    };
    window.addEventListener('auth:unauthorized', handleUnauth);
    return () => window.removeEventListener('auth:unauthorized', handleUnauth);
  }, []);

  // Refresh counts on tab or auth change
  useEffect(() => {
    if (token && user) {
      fetchBadgeCounts();
    }
  }, [token, user, activeTab, fetchBadgeCounts]);

  const handleLoginSuccess = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    const defaultTab = userData.role === 'Vendor' ? 'vendor_dashboard' : 'dashboard';
    setActiveTab(defaultTab);
    showToast(`Welcome back, ${userData.full_name} (${userData.role})`, 'success');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    setActiveTab('dashboard');
    showToast('Signed out of LokProcure ERP', 'success');
  };

  const handleSwitchPersona = async (email, password) => {
    try {
      const data = await authAPI.login(email, password);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      setToken(data.access_token);
      const targetTab = data.user.role === 'Vendor' ? 'vendor_dashboard' : 'dashboard';
      setActiveTab(targetTab);
      showToast(`Switched persona to ${data.user.full_name} (${data.user.role})`, 'success');
    } catch (err) {
      showToast('Failed to switch persona', 'error');
    }
  };

  const handlePrCreated = (prId) => {
    setSelectedPrId(prId);
    setActiveTab('vendor_comparison');
    showToast(`PR-${prId.toString().padStart(4, '0')} Created & RFQ Broadcast!`, 'success');
    fetchBadgeCounts();
  };

  const handlePoGenerated = (po) => {
    showToast(`PO ${po.po_number} successfully authorized and PDF compiled!`, 'success');
    fetchBadgeCounts();
  };

  if (authChecking) {
    return (
      <div className="min-h-screen w-full bg-[#f5f4f0] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex min-h-screen bg-[#f5f4f0] text-slate-900 antialiased font-sans relative selection:bg-blue-600 selection:text-white">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className={`px-3.5 py-2.5 rounded-lg shadow-lg border flex items-center gap-2 text-xs font-medium ${
            toast.type === 'error'
              ? 'bg-[#fbfbfa] border-rose-200 text-rose-800 shadow-rose-500/5'
              : 'bg-[#fbfbfa] border-[#e8e6df] text-slate-800 shadow-slate-500/10'
          }`}>
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* PORTAL SEPARATION BY ROLE (Section 1) */}
      {isVendor ? (
        /* VENDOR PORTAL LAYOUT */
        <>
          <VendorSidebar
            activeTab={effectiveTab}
            setActiveTab={setActiveTab}
            user={user}
            onLogout={handleLogout}
            onSwitchPersona={handleSwitchPersona}
            bidsCount={vendorBidsCount}
          />

          <main className="flex-1 min-w-0 overflow-y-auto h-screen">
            {effectiveTab === 'vendor_dashboard' && (
              <VendorDashboard
                user={user}
                onNavigateToTab={setActiveTab}
                onSelectOrderToBid={(order) => {
                  setOrderToBid(order);
                  setActiveTab('vendor_active_orders');
                }}
              />
            )}

            {effectiveTab === 'vendor_active_orders' && (
              <VendorActiveOrders
                onNavigateToMyBids={() => setActiveTab('vendor_my_bids')}
                orderToBidInitially={orderToBid}
              />
            )}

            {effectiveTab === 'vendor_my_bids' && (
              <VendorMyBids
                onNavigateToNegotiation={(prId) => {
                  setSelectedPrId(prId);
                  setActiveTab('vendor_negotiations');
                }}
                onNavigateToMarketplace={() => setActiveTab('vendor_active_orders')}
              />
            )}

            {effectiveTab === 'vendor_negotiations' && (
              <VendorNegotiations
                user={user}
                initialSessionId={null}
              />
            )}

            {effectiveTab === 'vendor_awarded_orders' && (
              <VendorAwardedOrders
                onNavigateToMarketplace={() => setActiveTab('vendor_active_orders')}
              />
            )}
          </main>
        </>
      ) : (
        /* GOVERNMENT PORTAL LAYOUT */
        <>
          <GovSidebar
            activeTab={effectiveTab}
            setActiveTab={setActiveTab}
            user={user}
            onLogout={handleLogout}
            onSwitchPersona={handleSwitchPersona}
            pendingCount={pendingApprovalsCount}
          />

          <main className="flex-1 min-w-0 overflow-y-auto h-screen">
            {effectiveTab === 'dashboard' && (
              <Dashboard
                onNavigateToTab={setActiveTab}
                onSelectPrForComparison={(id) => {
                  setSelectedPrId(id);
                  setActiveTab('vendor_comparison');
                }}
                onTriggerNewPr={() => setActiveTab('new_pr')}
              />
            )}

            {effectiveTab === 'orders' && (
              <GovOrders
                onSelectPrForBids={(id) => {
                  setSelectedPrId(id);
                  setActiveTab('active_bids');
                }}
                onSelectPrForComparison={(id) => {
                  setSelectedPrId(id);
                  setActiveTab('vendor_comparison');
                }}
                onTriggerNewPr={() => setActiveTab('new_pr')}
              />
            )}

            {(effectiveTab === 'new_pr' || effectiveTab === 'purchase_requests') && (
              <PurchaseRequestForm onPrCreated={handlePrCreated} />
            )}

            {effectiveTab === 'active_bids' && (
              <GovActiveBids
                initialPrId={selectedPrId}
                onNavigateToComparison={(id) => {
                  setSelectedPrId(id);
                  setActiveTab('vendor_comparison');
                }}
                onOpenNegotiation={(id) => {
                  setSelectedPrId(id);
                  setActiveTab('negotiations');
                }}
              />
            )}

            {effectiveTab === 'vendor_comparison' && (
              <VendorComparison
                selectedPrId={selectedPrId}
                onSelectPr={setSelectedPrId}
                onNavigateToTab={setActiveTab}
                onPoGenerated={handlePoGenerated}
              />
            )}

            {effectiveTab === 'negotiations' && (
              <GovNegotiations
                user={user}
                initialPrId={selectedPrId}
                onNavigateToTab={setActiveTab}
              />
            )}

            {effectiveTab === 'approval_queue' && (
              <ApprovalQueue
                user={user}
                onNavigateToTab={setActiveTab}
                onSelectPrForComparison={(id) => {
                  setSelectedPrId(id);
                  setActiveTab('vendor_comparison');
                }}
                onPoGenerated={handlePoGenerated}
              />
            )}

            {effectiveTab === 'purchase_orders' && (
              <PurchaseOrders onNavigateToTab={setActiveTab} />
            )}
          </main>
        </>
      )}
    </div>
  );
}
