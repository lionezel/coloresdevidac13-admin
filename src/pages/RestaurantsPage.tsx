import { useRestaurants } from "../hooks/useRestaurants";
import { Box, Button } from "@mui/material";
import { RestaurantCard } from "../components";

import { useNavigate } from "react-router-dom";
import LogoutIcon from "@mui/icons-material/Logout";
import { useAuth } from "../hooks/useAuth";
import { auth } from "../firebase/config";
import { signOut } from "firebase/auth";

export default function RestaurantsPage() {
  const { restaurants, createRestaurant, updateRestaurant, deleteRestaurant } =
    useRestaurants();
  const navigate = useNavigate();
  const { user, userDoc, loading } = useAuth();


  console.log(auth.currentUser?.uid);
  return (
    <Box
      sx={{
        p: 4,
        minHeight: "100vh",
        backgroundColor: "#f3f4f6",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Button
          variant="outlined"
          color="error"
          startIcon={<LogoutIcon />}
          onClick={async () => {
            await signOut(auth);
            navigate("/login");
          }}
        >
          Cerrar Sesión
        </Button>
      </Box>

      <RestaurantCard
        restaurants={restaurants}
        createRestaurant={createRestaurant}
        updateRestaurant={updateRestaurant}
        deleteRestaurant={deleteRestaurant}
      />
    </Box>
  );
}
