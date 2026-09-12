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

    // Si requiere autenticación, hay usuario y ciertas rutas están restringidas por rol o permiso
    if (requireAuth && user) {
        const hasAdminRights = userDoc?.isAdmin === true || userDoc?.role === "admin" || user?.uid === "THtaTpKF7mOcSS5VbJtGtkZu9z82";
        
        if (hasAdminRights) {
            return children ? <>{children}</> : <Outlet />;
        }

        // Permitir siempre el acceso a la selección de restaurante (ruta raíz)
        if (window.location.pathname === "/" || window.location.pathname === "") {
             return children ? <>{children}</> : <Outlet />;
        }

        // Solo verificar permisos si esta ruta tiene allowedRoles definidos explícitamente
        if (allowedRoles) {
            const userRole = userDoc?.role;

            // Verificar por rol
            if (userRole && allowedRoles.includes(userRole)) {
                return children ? <>{children}</> : <Outlet />;
            }

            // Verificar por permiso granular (allowedPages en el userDoc)
            const pathParts = window.location.pathname.split("/").filter(p => p);
            const currentPageId = pathParts.length >= 2 ? pathParts[1] : null;
            if (currentPageId && userDoc?.permissions?.allowedPages?.includes(currentPageId)) {
                return children ? <>{children}</> : <Outlet />;
            }

            // Acceso denegado — redirigir a la primera página permitida
            console.warn(`Acceso denegado a: ${window.location.pathname}. El rol '${userDoc?.role}' no tiene permiso.`);

            const RESTAURANT_ID = "IOjtPfRh1PQ6lnxDeZdJ";

            if (userDoc?.permissions?.allowedPages?.length > 0) {
                const firstPage = userDoc.permissions.allowedPages[0];
                return <Navigate to={`/${RESTAURANT_ID}/${firstPage}`} replace />;
            }

            const role = userDoc?.role;
            if (role === "cajero") return <Navigate to={`/${RESTAURANT_ID}/billing`} replace />;
            if (role === "mesero" || role === "mesera") return <Navigate to={`/${RESTAURANT_ID}/orders`} replace />;
            if (role === "cocinero") return <Navigate to={`/${RESTAURANT_ID}/orders`} replace />;

            return <Navigate to="/login" replace />;
        }
    }

    return children ? <>{children}</> : <Outlet />;
};
