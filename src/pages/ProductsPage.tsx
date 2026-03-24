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
  useTheme,
  useMediaQuery,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
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

  /* ------------------ MOBILE CARDS ------------------ */
  const MobileList = (
    <Stack spacing={2}>
      {products.map((product) => {
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
    </Stack>
  );

  return (
    <>
      {Header}

      {/* DESKTOP */}
      {!isMobile && (
        <Box sx={{ height: 520 }}>
          <PremiumDataGrid
            rows={products}
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
