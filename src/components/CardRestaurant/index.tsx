import {
  Button,
  Card,
  CardContent,
  IconButton,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import { Box, Grid } from "@mui/system";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

import { Restaurant } from "../../interfaces/Restaurant";
import { GlobalColor } from "../../global/GlobalColor";
import { useAuth } from "../../hooks/useAuth";
import RestaurantDialog, {
  RestaurantForm,
} from "../RestaurantDialog";

interface Props {
  restaurants: Restaurant[];
  deleteRestaurant: (id: string) => Promise<void>;
  createRestaurant: (
    name: string,
    description: string,
    image: string
  ) => Promise<void>;
  updateRestaurant: (
    id: string,
    name: string,
    description: string,
    image: string
  ) => Promise<void>;
}

export const RestaurantCard = ({
  restaurants,
  deleteRestaurant,
  createRestaurant,
  updateRestaurant,
}: Props) => {
  const navigate = useNavigate();
  const { userDoc } = useAuth();
  const userRole = userDoc?.role;
  const isCajero = userRole === "cajero";
  const hasAdminRights = userDoc?.isAdmin === true || userRole === "admin";

  const handleCardClick = (restId: string) => {
    if (isCajero) {
      navigate(`/${restId}/billing`);
    } else {
      navigate(`/${restId}/dashboard`);
    }
  };

  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [editing, setEditing] = useState<Restaurant | null>(null);

  const handleOpen = () => setOpen(true);

  const handleClose = () => {
    setOpen(false);
    setEditing(null);
  };

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    restaurant: Restaurant
  ) => {
    setAnchorEl(event.currentTarget);
    setSelected(restaurant);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelected(null);
  };

  const handleEdit = () => {
    if (selected) {
      setEditing(selected);
      setOpen(true);
    }
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (selected) {
      const ok = window.confirm(
        `¿Eliminar "${selected.name}"?`
      );
      if (ok) await deleteRestaurant(selected.id);
    }
    handleMenuClose();
  };

  const handleSubmit = async (values: RestaurantForm) => {
    if (editing) {
      await updateRestaurant(
        editing.id,
        values.name,
        values.description || "",
        values.image || ""
      );
    } else {
      await createRestaurant(
        values.name,
        values.description || "",
        values.image || ""
      );
    }
    handleClose();
  };

  return (
    <Box>
      <Typography
        variant="h4"
        sx={{ mb: 3, fontWeight: "bold" }}
      >
        Restaurantes 🍽️
      </Typography>

      {hasAdminRights && (
        <Button
          variant="contained"
          sx={{ mb: 4, backgroundColor: GlobalColor }}
          onClick={handleOpen}
        >
          Crear nuevo restaurante
        </Button>
      )}

      <RestaurantDialog
        open={open}
        onClose={handleClose}
        initial={{
          name: editing?.name || "",
          description: editing?.description || "",
          image: editing?.image || "",
        }}
        onSubmit={handleSubmit}
      />

      <Grid container spacing={3}>
        {restaurants.map((rest) => (
          <Grid>
            <Card
              sx={{
                height: 320,
                position: "relative",
                cursor: "pointer",
              }}
            >
              {hasAdminRights && (
                <IconButton
                  sx={{ position: "absolute", top: 8, right: 8 }}
                  onClick={(e) => handleMenuOpen(e, rest)}
                >
                  <MoreVertIcon />
                </IconButton>
              )}

              <CardContent
                onClick={() =>
                  handleCardClick(rest.id)
                }
              >
                {rest.image ? (
                  <img
                    src={rest.image}
                    alt={rest.name}
                    style={{
                      width: "100%",
                      height: 150,
                      objectFit: "cover",
                      borderRadius: 8,
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      height: 150,
                      borderRadius: 2,
                      backgroundColor: GlobalColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "2rem",
                      fontWeight: "bold",
                    }}
                  >
                    {rest.name[0]?.toUpperCase()}
                  </Box>
                )}

                <Typography variant="h6" mt={1}>
                  {rest.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {rest.description || "Sin descripción"}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>Editar</MenuItem>
        <MenuItem onClick={handleDelete}>Eliminar</MenuItem>
      </Menu>
    </Box>
  );
};
