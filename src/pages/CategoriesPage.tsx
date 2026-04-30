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
  Chip,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { GridColDef, GridRowParams } from "@mui/x-data-grid";
import { PremiumDataGrid } from "../components/PremiumDataGrid";
import { useCollection } from "../hooks/useCollection";
import CategoryDialog from "../components/CategoryDialog";

export type Category = {
  id?: string;
  name: string;
  description?: string;
  banner?: string;
  type?: "food" | "drink";
};

const emptyCategory: Category = {
  name: "",
  description: "",
  banner: "",
  type: "food",
};

export default function CategoriesPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const { data, createItem, updateItem, deleteItem } =
    useCollection<Category>(restaurantId!, "category");

  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<Category | null>(null);

  const handleEdit = (cat: Category) => {
    setCurrent(cat);
    setOpen(true);
  };

  const handleNew = () => {
    setCurrent(null);
    setOpen(true);
  };

  const columns: GridColDef[] = [
    {
      field: "banner",
      headerName: "Banner",
      width: 130,
      renderCell: (params) => (
        <Avatar
          src={params.value}
          variant="rounded"
          sx={{ width: 90, height: 55, borderRadius: 2 }}
        />
      ),
    },
    {
      field: "name",
      headerName: "Nombre",
      flex: 2,
      renderCell: (p) => (
        <Typography fontWeight={700}>{p.value}</Typography>
      ),
    },
    { field: "description", headerName: "Descripción", flex: 2 },
    {
      field: "type",
      headerName: "Tipo",
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value === "drink" ? "🥤 Bebida" : "🍽️ Comida"}
          size="small"
          color={params.value === "drink" ? "info" : "success"}
          variant="outlined"
          sx={{ fontWeight: 700, fontSize: "0.75rem" }}
        />
      ),
    },
    {
      field: "actions",
      headerName: "Acciones",
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5}>
          <IconButton size="small" onClick={() => handleEdit(params.row)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => deleteItem(params.row.id)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      ),
    },
  ];

  return (
    <>
      {/* HEADER */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        mb={3}
      >
        <Box>
          <Typography
            variant="h4"
            fontWeight={900}
            sx={{ letterSpacing: "-0.03em" }}
          >
            📂 Categorías
          </Typography>
          <Typography color="text.secondary" variant="body1">
            Organiza el menú en secciones.
          </Typography>
        </Box>

        <Button
          variant="contained"
          size="large"
          startIcon={<AddIcon />}
          onClick={handleNew}
          sx={{ borderRadius: 2.5, fontWeight: 800, px: 3 }}
        >
          Nueva Categoría
        </Button>
      </Stack>

      {/* DESKTOP: Data Grid */}
      {!isMobile && (
        <Box sx={{ height: 520 }}>
          <PremiumDataGrid
            rows={data}
            columns={columns}
            getRowId={(row) => row.id!}
            onRowDoubleClick={(p: GridRowParams) =>
              handleEdit(p.row as Category)
            }
          />
        </Box>
      )}

      {/* MOBILE: Cards */}
      {isMobile && (
        <Stack spacing={2}>
          {data.map((cat) => (
            <Card
              key={cat.id}
              elevation={0}
              sx={{
                borderRadius: 4,
                border: "1px solid #e2e8f0",
                transition: "all 0.2s ease",
                "&:hover": { boxShadow: "0 8px 24px rgba(0,0,0,0.08)" },
              }}
            >
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar
                    src={cat.banner}
                    variant="rounded"
                    sx={{ width: 72, height: 72, borderRadius: 3, flexShrink: 0 }}
                  />
                  <Box flex={1} minWidth={0}>
                    <Typography fontWeight={800} noWrap>
                      {cat.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      noWrap
                    >
                      {cat.description}
                    </Typography>
                    <Chip
                      label={cat.type === "drink" ? "🥤 Bebida" : "🍽️ Comida"}
                      size="small"
                      color={cat.type === "drink" ? "info" : "success"}
                      variant="outlined"
                      sx={{ mt: 0.5, fontWeight: 700, fontSize: "0.7rem" }}
                    />
                  </Box>
                  <Stack spacing={0.5} flexShrink={0}>
                    <IconButton size="small" onClick={() => handleEdit(cat)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => deleteItem(cat.id!)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* DIALOG */}
      <CategoryDialog
        open={open}
        onClose={() => setOpen(false)}
        initial={current ?? emptyCategory}
        onSubmit={async (values) => {
          if (current?.id) await updateItem(current.id, values);
          else await createItem(values);
          setOpen(false);
        }}
      />
    </>
  );
}
