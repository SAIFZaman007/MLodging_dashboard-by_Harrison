import { Navigate, Route, Routes } from "react-router-dom";

import { AdminLayout } from "@/components/AdminLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { Login } from "@/pages/Login";
import { Dashboard } from "@/pages/Dashboard";
import { Orders } from "@/pages/Orders";
import { CalendarPage } from "@/pages/CalendarPage";
import { Properties } from "@/pages/Properties";
import { ChannelSync } from "@/pages/ChannelSync";
import { SocialOrganics } from "@/pages/SocialOrganics";
import { Seo } from "@/pages/Seo";
import { Users } from "@/pages/Users";

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  return isAdmin ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AdminLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/channel-sync" element={<ChannelSync />} />
                <Route path="/properties" element={<Properties />} />
                <Route path="/social-organics" element={<SocialOrganics />} />
                <Route path="/seo" element={<Seo />} />
                <Route
                  path="/users"
                  element={
                    <AdminOnly>
                      <Users />
                    </AdminOnly>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AdminLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}