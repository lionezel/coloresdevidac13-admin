import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  useMediaQuery,
  useTheme,
  Avatar,
  Box,
  Tooltip,
} from "@mui/material";
import ViewCarouselIcon from "@mui/icons-material/ViewCarousel";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import CategoryIcon from "@mui/icons-material/Category";
import InventoryIcon from "@mui/icons-material/Inventory";
import ReceiptIcon from "@mui/icons-material/Receipt";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import DashboardIcon from "@mui/icons-material/Dashboard";
import GroupIcon from "@mui/icons-material/Group";
import DiscountIcon from '@mui/icons-material/Discount';
import DeliveryDiningIcon from '@mui/icons-material/DeliveryDining';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import { Link, useLocation, useParams } from "react-router-dom";
import { GlobalColor } from "../global/GlobalColor";
import { useRestaurants } from "../hooks/useRestaurants";
import { useAuth } from "../hooks/useAuth";

const drawerWidth = 240;

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
  desktopOpen?: boolean;
}

export default function Sidebar({ mobileOpen, onClose, desktopOpen = true }: SidebarProps) {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const { restaurants } = useRestaurants();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { userDoc } = useAuth();

  const userRole = userDoc?.role;
  const isCajero = userRole === "cajero";
  const hasAdminRights = userDoc?.isAdmin === true || userRole === "admin";

  // 🔥 Restaurante actual según la URL
  const currentRestaurant = restaurants?.find(
    (r: any) => r.id === restaurantId
  );

  const restaurantLogo = currentRestaurant?.image;
  const restaurantName = currentRestaurant?.name ?? "Restaurante";

  const menuItems = [
    {
      text: "Inicio",
      path: "/",
      isLogo: true,
    },
    {
      text: "Dashboard",
      icon: <DashboardIcon />,
      path: `/${restaurantId}/dashboard`,
    },
    {
      text: "Products",
      icon: <InventoryIcon />,
      path: `/${restaurantId}/products`,
    },
    {
      text: "Categories",
      icon: <CategoryIcon />,
      path: `/${restaurantId}/categories`,
    },
    {
      text: "Caja / Facturación",
      icon: <PointOfSaleIcon />,
      path: `/${restaurantId}/billing`,
    },
    {
      text: "Adiciones",
      icon: <AddCircleIcon />,
      path: `/${restaurantId}/additions`,
    },
    {
      text: "Clientes de Crédito",
      icon: <ReceiptIcon />,
      path: `/${restaurantId}/credit-customers`,
    },
  ];

  const filteredMenuItems = menuItems.filter((item) => {
    if (item.isLogo) return true;
    if (hasAdminRights) return true;
    if (isCajero) {
      return (
        item.path === `/${restaurantId}/billing` ||
        item.path === `/${restaurantId}/credit-customers`
      );
    }
    return false;
  });

  const drawerContent = (
    <>
      <Toolbar />

      <List>
        {filteredMenuItems.map((item) => (
          <ListItemButton
            key={item.text}
            component={Link}
            to={item.path}
            selected={location.pathname === item.path}
            onClick={isMobile ? onClose : undefined}
            sx={{
              borderRadius: 2,
              mx: 1,
              my: 0.5,
              justifyContent: item.isLogo ? "center" : "flex-start",
              "&.Mui-selected": {
                backgroundColor: GlobalColor,
                color: "white",
              },
              "&:hover": {
                backgroundColor: GlobalColor,
                color: "white",
              },
            }}
          >
            {item.isLogo ? (
              <Tooltip title={restaurantName}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    width: "100%",
                    py: 1,
                  }}
                >
                  <Avatar
                    src={restaurantLogo}
                    alt={restaurantName}
                    sx={{
                      width: 64,
                      height: 64,
                      border: `2px solid ${GlobalColor}`,
                      bgcolor: "#fff",
                    }}
                  >
                    {!restaurantLogo && <RestaurantIcon />}
                  </Avatar>
                </Box>
              </Tooltip>
            ) : (
              <>
                <ListItemIcon sx={{ color: "inherit" }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </>
            )}
          </ListItemButton>
        ))}
      </List>
    </>
  );

  return (
    <>
      {/* MOBILE */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={onClose}
          ModalProps={{ keepMounted: true }}
          sx={{
            "& .MuiDrawer-paper": {
              width: drawerWidth,
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* DESKTOP */}
      {!isMobile && (
        <Drawer
          variant="persistent"
          open={desktopOpen}
          sx={{
            width: desktopOpen ? drawerWidth : 0,
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
              backgroundColor: "#fff",
              borderRight: "1px solid rgba(0, 0, 0, 0.08)",
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}
    </>
  );
}
