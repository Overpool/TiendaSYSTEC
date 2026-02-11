
import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Navbar } from './components/Layout/Navbar';
import { AdminSidebar } from './components/Layout/AdminSidebar';
import { Store } from './pages/Store';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Admin/Dashboard';
import { Inventory } from './pages/Admin/Inventory';
import { POS } from './pages/Admin/POS';
import { SalesHistory } from './pages/Admin/SalesHistory';
import { Purchases } from './pages/Admin/Purchases';
import { useStore } from './store/useStore';
import { Users } from './pages/Admin/Users';
import { Reports } from './pages/Admin/Reports';
import { Cart } from './pages/Cart';
import { Footer } from './components/Layout/Footer';
import { ScrollToTop } from './components/ScrollToTop';

// Layouts
const StoreLayout = () => (
  <div className="min-h-screen bg-[#EDF1F5] flex flex-col justify-between">
    <div>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
    <Footer />
  </div>
);



const AdminLayout = () => {
  const { currentUser } = useStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'employee')) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between sticky top-0 z-30">
        <h1 className="text-xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
          AdminPanel
        </h1>
        <button onClick={() => setIsSidebarOpen(true)} className="text-slate-300 hover:text-white">
          <Menu size={24} />
        </button>
      </div>

      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto h-[calc(100vh-64px)] md:h-screen">
        <Outlet />
      </main>
    </div>
  );
};


function App() {
  // const { loadInitialData } = useStore();

  // useEffect(() => {
  //   loadInitialData();
  // }, []);
  console.log("APP RENDERIZANDO")

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Public Store Routes */}
        <Route path="/" element={<StoreLayout />}>
          <Route index element={<Store />} />
          <Route path="cart" element={<Cart />} />
        </Route>

        <Route path="/login" element={<Login />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="pos" element={<POS />} />
          <Route path="purchases" element={<Purchases />} />
          <Route path="sales" element={<SalesHistory />} />
          <Route path="users" element={<Users />} />
          <Route path="users" element={<Users />} />
          <Route path="reports" element={<Reports />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
