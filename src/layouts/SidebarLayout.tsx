import { Box, Toolbar, AppBar, IconButton, Typography, useTheme, useMediaQuery, Avatar, Chip, Stack } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { Outlet } from "react-router-dom";
import { useState } from "react";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../hooks/useAuth";

const drawerWidth = 240;

const roleLabels: Record<string, string> = {
  admin: "Admin",
  cajero: "Cajero",
  mesero: "Mesero",
  mesera: "Mesera",
  cocinero: "Cocinero",
};

const roleColors: Record<string, string> = {
  admin: "#6366f1",
  cajero: "#0891b2",
  mesero: "#059669",
  mesera: "#059669",
  cocinero: "#d97706",
};

export default function SidebarLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const { userDoc } = useAuth();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const handleDrawerToggle = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setDesktopOpen(!desktopOpen);
    }
  };

  const userName: string = userDoc?.name || userDoc?.email || "Usuario";
  const userRole: string = userDoc?.role || "";
  const avatarLetter = userName.charAt(0).toUpperCase();
  const avatarColor = roleColors[userRole] || "#64748b";

  return (
    <Box sx={{ display: "flex" }}>
      {/* 🔹 AppBar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: 1201,
          borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
          backgroundColor: "#fff",
          color: "#000"
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between" }}>
          {/* Izquierda: menú + título */}
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" fontWeight={700} noWrap>
              Panel Administrativo
            </Typography>
          </Stack>

          {/* Derecha: info del usuario */}
          {userDoc && (
            <Stack direction="row" alignItems="center" spacing={1.5}>
              {/* Rol (oculto en pantallas muy pequeñas) */}
              {userRole && (
                <Chip
                  label={roleLabels[userRole] ?? userRole}
                  size="small"
                  sx={{
                    display: { xs: "none", sm: "flex" },
                    bgcolor: avatarColor + "18",
                    color: avatarColor,
                    fontWeight: 800,
                    fontSize: "0.72rem",
                    border: `1px solid ${avatarColor}40`,
                  }}
                />
              )}

              {/* Nombre (oculto en móvil) */}
              <Typography
                variant="body2"
                fontWeight={700}
                color="text.secondary"
                sx={{ display: { xs: "none", md: "block" }, maxWidth: 160 }}
                noWrap
              >
                {userName}
              </Typography>

              {/* Avatar */}
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  bgcolor: avatarColor,
                  fontSize: "0.9rem",
                  fontWeight: 900,
                  border: `2px solid ${avatarColor}30`,
                }}
              >
                {avatarLetter}
              </Avatar>
            </Stack>
          )}
        </Toolbar>
      </AppBar>

      {/* 🔹 Sidebar */}
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        desktopOpen={desktopOpen}
      />

      {/* 🔹 Contenido */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1.5, sm: 2, md: 3 },
          width: { xs: "100%", md: `calc(100% - ${drawerWidth}px)` },
          minHeight: "100vh",
          backgroundColor: "#f8fafc",
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
