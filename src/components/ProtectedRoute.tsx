import { ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Box, CircularProgress } from "@mui/material";

interface ProtectedRouteProps {
    allowedRoles?: string[];
    children?: ReactNode;
    requireAuth?: boolean;
}

export const ProtectedRoute = ({
    allowedRoles,
    children,
    requireAuth = true,
}: ProtectedRouteProps) => {
    const { user, userDoc, loading } = useAuth();

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
                <CircularProgress />
            </Box>
        );
    }

    // Si requiere autenticación y no hay usuario
    if (requireAuth && !user) {
        return <Navigate to="/login" replace />;
    }

    // Si requiere autenticación, hay usuario y ciertas rutas están restringidas por rol
    if (requireAuth && user && allowedRoles) {
        // Admin puede acceder a todo (verificamos isAdmin o role === "admin")
        const hasAdminRights = userDoc?.isAdmin === true || userDoc?.role === "admin";
        const userRole = userDoc?.role;

        if (hasAdminRights) {
            return children ? <>{children}</> : <Outlet />;
        }

        if (userRole && allowedRoles.includes(userRole)) {
            return children ? <>{children}</> : <Outlet />;
        }

        // El rol no está permitido para esta ruta
        return <Navigate to="/" replace />;
    }

    return children ? <>{children}</> : <Outlet />;
};
