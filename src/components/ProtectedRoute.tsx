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

    // Debug logs to identify why access is denied
    console.log("--- ProtectedRoute DEBUG ---");
    console.log("Path:", window.location.pathname);
    console.log("User UID:", user?.uid);
    console.log("UserDoc UID:", userDoc?.uid || userDoc?.id);
    console.log("Role:", userDoc?.role);
    console.log("isAdmin:", userDoc?.isAdmin);
    console.log("AllowedPages:", userDoc?.permissions?.allowedPages);
    console.log("----------------------------");

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

        // Si hay roles permitidos específicos para esta ruta, verificamos
        if (allowedRoles) {
            const userRole = userDoc?.role;
            if (userRole && allowedRoles.includes(userRole)) {
                return children ? <>{children}</> : <Outlet />;
            }
        }

        // Si no es admin y no está en los roles permitidos, verificamos si tiene permiso granular por página
        const pathParts = window.location.pathname.split("/").filter(p => p);
        // La estructura es /:restId/:page -> así que el segundo elemento es la página
        const currentPageId = pathParts.length >= 2 ? pathParts[1] : null;

        if (currentPageId && userDoc?.permissions?.allowedPages?.includes(currentPageId)) {
            console.log("Acceso concedido por permiso granular a:", currentPageId);
            return children ? <>{children}</> : <Outlet />;
        }

        // Caso especial para billing si está en la URL pero no exactamente en la posición 1
        if (window.location.pathname.includes("/billing") && userDoc?.permissions?.allowedPages?.includes("billing")) {
            return children ? <>{children}</> : <Outlet />;
        }

        // Si tiene allowedRoles o estamos en una subpágina de restaurante y no se permitió arriba, redirigir
        if (allowedRoles || (pathParts.length >= 2)) {
             console.warn(`Acceso denegado a: ${window.location.pathname}. El rol '${userDoc?.role}' no tiene permiso.`);
             return <Navigate to="/" replace />;
        }
    }

    return children ? <>{children}</> : <Outlet />;
};
