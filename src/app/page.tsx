'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import OrderEntry from '@/components/tabs/OrderEntry';
import OrderHistory from '@/components/tabs/OrderHistory';
import CustomerManagement from '@/components/tabs/CustomerManagement';
import InventoryManagement from '@/components/tabs/InventoryManagement';
import BackupRestore from '@/components/tabs/BackupRestore';
import OperatingSettings from '@/components/tabs/OperatingSettings';

export default function SalesManagementSystem() {
  const [activeTab, setActiveTab] = useState('order-entry');
  const [editingOrder, setEditingOrder] = useState<any>(null);

  const handleEditOrder = (order: any) => {
    setEditingOrder(order);
    setActiveTab('order-entry');
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Fixed Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {/* Dynamic header background effect */}
        <div className="h-40 bg-gradient-to-b from-[#EEF6FF] to-transparent absolute top-0 left-0 right-0 pointer-events-none opacity-50" />
        
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className={activeTab === 'order-entry' ? 'block' : 'hidden'}>
            <OrderEntry initialOrder={editingOrder} onClear={() => setEditingOrder(null)} />
          </div>
          <div className={activeTab === 'order-history' ? 'block' : 'hidden'}>
            <OrderHistory 
              isActive={activeTab === 'order-history'} 
              onEdit={handleEditOrder}
            />
          </div>
          <div className={activeTab === 'customer-management' ? 'block' : 'hidden'}>
            <CustomerManagement isActive={activeTab === 'customer-management'} />
          </div>
          <div className={activeTab === 'inventory' ? 'block' : 'hidden'}>
            <InventoryManagement isActive={activeTab === 'inventory'} />
          </div>
          <div className={activeTab === 'backup' ? 'block' : 'hidden'}>
            <BackupRestore />
          </div>
          <div className={activeTab === 'operating-settings' ? 'block' : 'hidden'}>
            <OperatingSettings isActive={activeTab === 'operating-settings'} />
          </div>
        </div>

        {/* Global Footer */}
        <footer className="p-8 mt-auto text-center border-t border-slate-100 bg-white/50 backdrop-blur-sm">
          <p className="text-[12px] font-light text-slate-300 uppercase tracking-widest flex items-center justify-center gap-2">
            © 2026 SCUBABLE DIVING GEAR SALES MANAGEMENT SYSTEM <span className="w-1 h-1 rounded-full bg-slate-200" /> V2.0 PREMIUM
          </p>
        </footer>
      </main>
    </div>
  );
}
