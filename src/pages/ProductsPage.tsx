import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  Typography,
  Button,
  Stack,
  Avatar,
  Card,
  CardContent,
  Box,
  IconButton,
  Collapse,
  Chip,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { GridColDef, GridRowParams } from "@mui/x-data-grid";
import { PremiumDataGrid } from "../components/PremiumDataGrid";

import { useCollection } from "../hooks/useCollection";
import ProductDialog from "../components/ProductDialog";
import { Product } from "../interfaces/product";
import { useAuth } from "../hooks/useAuth";

export default function ProductsPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const {
    data: products,
    createItem,
    updateItem,
    deleteItem,
  } = useCollection<Product>(restaurantId ?? "", "products");

  const { data: categories = [] } = useCollection<{ id: string; name: string }>(
    restaurantId ?? "",
    "category"
  );

  const { canCreate, canEdit, canDelete } = useAuth();

  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<Product | null>(null);

  /* ------------------ FILTER STATE ------------------ */
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showCategories, setShowCategories] = useState(true);

  const filteredProducts = products.filter((p) => {
    const matchesName = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || p.category === selectedCategory;
    return matchesName && matchesCategory;
  });
  // NOTE: selectedCategory stores the category NAME (not id),
  // because ProductDialog saves value={c.name} in its MenuItem.

  /* ------------------ DESKTOP COLUMNS ------------------ */
  const columns: GridColDef[] = [
    {
      field: "image",
      headerName: "Imagen",
      width: 100,
      renderCell: (params) => {
        const variant = params.row.variants?.[0];
        return (
          <Avatar
            src={variant?.image}
            variant="rounded"
            sx={{ width: 56, height: 56 }}
          />
        );
      },
    },
    { field: "name", headerName: "Nombre", flex: 1 },
    { field: "category", headerName: "Categoría", flex: 1 },
    {
      field: "price",
      headerName: "Desde",
      flex: 1,
      valueGetter: (_, row) =>
        Math.min(...row.variants.map((v: any) => v.price)),
    },
    {
      field: "actions",
      headerName: "Acciones",
      width: 160,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            disabled={!canEdit}
            onClick={() => {
              setCurrent(params.row as Product);
              setOpen(true);
            }}
          >
            Editar
          </Button>
          <Button
            size="small"
            color="error"
            disabled={!canDelete}
            onClick={() => {
                if(window.confirm("¿Seguro que desea eliminar?")) deleteItem(params.row.id)
            }}
          >
            Eliminar
          </Button>
        </Stack>
      ),
    },
  ];

  /* ------------------ HEADER ------------------ */
  const Header = (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={2}
      justifyContent="space-between"
      mb={2}
    >
      <Typography variant="h5">📦 Productos</Typography>

      {canCreate && (
        <Button
            variant="contained"
            fullWidth={isMobile}
            onClick={() => {
            setCurrent(null);
            setOpen(true);
            }}
        >
            Agregar producto
        </Button>
      )}
    </Stack>
  );

  /* ------------------ FILTER BAR ------------------ */
  const activeLabel =
    selectedCategory === "all"
      ? "Todas"
      : selectedCategory;

  const FilterBar = (
    <Box mb={2}>
      {/* Search input */}
      <Box
        component="input"
        placeholder="🔍  Buscar producto..."
        value={search}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setSearch(e.target.value)
        }
        sx={{
          width: "100%",
          mb: 1.5,
          p: "10px 14px",
          fontSize: "0.95rem",
          borderRadius: "10px",
          border: "1.5px solid",
          borderColor: "divider",
          outline: "none",
          bgcolor: "background.paper",
          color: "text.primary",
          transition: "border-color 0.2s",
          "&:focus": {
            borderColor: "primary.main",
            boxShadow: "0 0 0 3px rgba(99,102,241,0.12)",
          },
        }}
      />

      {/* Toggle button */}
      <Stack direction="row" alignItems="center" spacing={1} mb={showCategories ? 1 : 0}>
        <Box
          component="button"
          onClick={() => setShowCategories((v) => !v)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            px: 2,
            py: 0.75,
            borderRadius: "20px",
            border: "1.5px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.82rem",
            color: "text.secondary",
            transition: "all 0.18s ease",
            "&:hover": { borderColor: "primary.main", color: "primary.main" },
          }}
        >
          🏷️ Categorías
          {selectedCategory !== "all" && (
            <Chip
              label={activeLabel}
              size="small"
              color="primary"
              sx={{ height: 18, fontSize: "0.7rem", fontWeight: 700, ml: 0.5 }}
            />
          )}
          <ExpandMoreIcon
            sx={{
              fontSize: 18,
              ml: 0.25,
              transition: "transform 0.25s ease",
              transform: showCategories ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </Box>

        {selectedCategory !== "all" && (
          <Box
            component="button"
            onClick={() => setSelectedCategory("all")}
            sx={{
              px: 1.5,
              py: 0.5,
              borderRadius: "20px",
              border: "1.5px solid",
              borderColor: "error.light",
              bgcolor: "transparent",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.78rem",
              color: "error.main",
              transition: "all 0.18s ease",
              "&:hover": { bgcolor: "error.main", color: "#fff" },
            }}
          >
            ✕ Limpiar
          </Box>
        )}
      </Stack>

      {/* Collapsible chips */}
      <Collapse in={showCategories} timeout={250}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap pb={0.5}>
          {[{ id: "all", name: "Todas" }, ...categories].map((cat) => {
            // Compare by name because products store category as name, not id
            const filterValue = cat.id === "all" ? "all" : cat.name;
            const active = selectedCategory === filterValue;
            return (
              <Box
                key={cat.id}
                component="button"
                onClick={() => setSelectedCategory(cat.id === "all" ? "all" : cat.name)}
                sx={{
                  px: 2,
                  py: 0.75,
                  borderRadius: "20px",
                  border: "1.5px solid",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.83rem",
                  transition: "all 0.18s ease",
                  borderColor: active ? "primary.main" : "divider",
                  bgcolor: active ? "primary.main" : "background.paper",
                  color: active ? "#fff" : "text.secondary",
                  "&:hover": {
                    borderColor: "primary.main",
                    color: active ? "#fff" : "primary.main",
                  },
                }}
              >
                {cat.name}
              </Box>
            );
          })}
        </Stack>
      </Collapse>
    </Box>
  );

  /* ------------------ MOBILE CARDS ------------------ */
  const MobileList = (
    <Stack spacing={2}>
      {filteredProducts.map((product) => {
        const variant = product.variants?.[0];
        return (
          <Card key={product.id} sx={{ borderRadius: 3 }}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar
                  src={variant?.image}
                  variant="rounded"
                  sx={{ width: 64, height: 64 }}
                />

                <Box flex={1}>
                  <Typography fontWeight={600}>{product.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {product.category}
                  </Typography>
                  <Typography variant="body2">
                    Desde: $
                    {Math.min(...product.variants.map((v: any) => v.price))}
                  </Typography>
                </Box>

                <Stack>
                  {canEdit && (
                    <IconButton
                        onClick={() => {
                        setCurrent(product);
                        setOpen(true);
                        }}
                    >
                        <EditIcon />
                    </IconButton>
                  )}

                  {canDelete && (
                    <IconButton
                        color="error"
                        onClick={() => {
                            if(window.confirm("¿Seguro que desea eliminar?")) deleteItem(product.id!)
                        }}
                    >
                        <DeleteIcon />
                    </IconButton>
                  )}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        );
      })}

      {filteredProducts.length === 0 && (
        <Box
          sx={{
            textAlign: "center",
            py: 6,
            color: "text.secondary",
            fontStyle: "italic",
          }}
        >
          No se encontraron productos.
        </Box>
      )}
    </Stack>
  );

  return (
    <>
      {Header}
      {FilterBar}

      {/* DESKTOP */}
      {!isMobile && (
        <Box sx={{ height: 520 }}>
          <PremiumDataGrid
            rows={filteredProducts}
            columns={columns}
            getRowId={(row) => row.id!}
            onRowDoubleClick={(p: GridRowParams) => {
              setCurrent(p.row as Product);
              setOpen(true);
            }}
          />
        </Box>
      )}

      {/* MOBILE */}
      {isMobile && MobileList}

      <ProductDialog
        key={current?.id ?? "new"}
        open={open}
        onClose={() => setOpen(false)}
        categories={categories}
        initial={
          current ?? {
            name: "",
            category: "",
            description: "",
            active: true,
            variants: [
              {
                id: crypto.randomUUID(),
                label: "25ml",
                price: 0,
                stock: 0,
                image: "",
              },
            ],
          }
        }
        onSubmit={async (values) => {
          if (current?.id) await updateItem(current.id, values);
          else await createItem(values);
          setOpen(false);
        }}
      />
    </>
  );
}
