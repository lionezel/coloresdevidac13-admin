import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  MenuItem,
  CircularProgress,
  Typography,
  Box,
  Divider,
} from "@mui/material";
import { useEffect, useState } from "react";
import { Product, Variant } from "../interfaces/product";
import { storage } from "../firebase/config";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useCollection } from "../hooks/useCollection";
import { useParams } from "react-router-dom";
import { InventoryItem } from "../interfaces/Inventory";

interface Props {
  open: boolean;
  onClose: () => void;
  initial: Product;
  categories: { id: string; name: string }[];
  onSubmit: (values: Product) => Promise<void>;
}

export default function ProductDialog({
  open,
  onClose,
  initial,
  categories,
  onSubmit,
}: Props) {
  const [values, setValues] = useState<Product>(initial);
  const [uploading, setUploading] = useState(false);
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const { data: inventory = [] } = useCollection<InventoryItem>(restaurantId!, "inventory");

  useEffect(() => {
    // Asegurar compatibilidad: si no tiene variante aún, crear una base
    if (!initial.variants || initial.variants.length === 0) {
      setValues({
        ...initial,
        variants: [
          {
            id: crypto.randomUUID(),
            label: "Único",
            price: 0,
            stock: 0,
            initialDailyStock: 0,
            image: "",
          },
        ],
      });
    } else {
      setValues(initial);
    }
  }, [initial]);

  const handleChange = <K extends keyof Product>(
    key: K,
    value: Product[K]
  ) => {
    setValues((p) => ({ ...p, [key]: value }));
  };

  const handleVariantChange = (
    key: keyof Variant,
    value: any
  ) => {
    const updated = [...values.variants];
    updated[0] = { ...updated[0], [key]: value };
    setValues({ ...values, variants: updated });
  };

  // 🔥 SUBIR IMAGEN A FIREBASE
  const uploadImage = async (file: File) => {
    try {
      setUploading(true);

      const storageRef = ref(
        storage,
        `products/${Date.now()}_${file.name}`
      );

      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      handleVariantChange("image", url);
    } finally {
      setUploading(false);
    }
  };

  const currentVariant = values.variants?.[0] || { price: 0, stock: 0, initialDailyStock: 0, image: "" };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden' } }}>
      <DialogTitle sx={{ fontWeight: 800, fontSize: "1.25rem", pb: 2, bgcolor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
        {initial.id ? "📝 Editar Producto" : "📦 Nuevo Producto"}
      </DialogTitle>

      <DialogContent sx={{ p: 4 }}>
        <Stack spacing={4} mt={1}>
          
          {/* SECCIÓN: INFORMACIÓN GENERAL */}
          <Box>
            <Typography variant="overline" color="primary" fontWeight={800} sx={{ letterSpacing: 1.2, display: "block", mb: 2 }}>
              Información General
            </Typography>
            <Stack spacing={2.5}>
              <TextField
                label="Nombre del Producto"
                value={values.name}
                onChange={(e) => handleChange("name", e.target.value)}
                fullWidth
                variant="outlined"
              />

              <TextField
                select
                label="Categoría"
                value={values.category}
                onChange={(e) => handleChange("category", e.target.value)}
                fullWidth
              >
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.name}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Descripción"
                value={values.description}
                onChange={(e) => handleChange("description", e.target.value)}
                fullWidth
                multiline
                rows={2}
              />
            </Stack>
          </Box>

          <Divider />

          {/* SECCIÓN: PRECIO E INVENTARIO */}
          <Box>
            <Typography variant="overline" color="primary" fontWeight={800} sx={{ letterSpacing: 1.2, display: "block", mb: 2 }}>
              Precio e Inventario
            </Typography>
            <Stack spacing={2.5}>
              <TextField
                label="Precio Base ($)"
                type="number"
                value={currentVariant.price === 0 ? "" : currentVariant.price}
                onChange={(e) => handleVariantChange("price", Number(e.target.value))}
                fullWidth
              />

              <Stack direction="row" spacing={2}>
                <TextField
                  label="Stock Actual"
                  type="number"
                  value={currentVariant.stock === 0 ? "" : currentVariant.stock}
                  onChange={(e) => handleVariantChange("stock", Number(e.target.value))}
                  fullWidth
                />

                <TextField
                  label="Stock Inicial (Día)"
                  type="number"
                  value={(currentVariant.initialDailyStock ?? currentVariant.stock) === 0 ? "" : (currentVariant.initialDailyStock ?? currentVariant.stock)}
                  onChange={(e) => handleVariantChange("initialDailyStock", Number(e.target.value))}
                  fullWidth
                  helperText="Se asume al inicio"
                />
              </Stack>

              <TextField
                select
                label="Vincular a Insumo (Opcional)"
                value={currentVariant.inventoryItemId || ""}
                onChange={(e) => handleVariantChange("inventoryItemId", e.target.value)}
                fullWidth
                helperText="Si lo vinculas, cada venta descontará 1 unidad del inventario."
              >
                <MenuItem value="">-- Ninguno --</MenuItem>
                {inventory.map((item) => (
                  <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
                ))}
              </TextField>
            </Stack>
          </Box>

          <Divider />

          {/* SECCIÓN: IMAGEN */}
          <Box>
            <Typography variant="overline" color="primary" fontWeight={800} sx={{ letterSpacing: 1.2, display: "block", mb: 2 }}>
              Fotografía
            </Typography>
            <Stack direction="row" spacing={3} alignItems="center">
              
              {currentVariant.image ? (
                <Box sx={{ position: "relative" }}>
                   <img
                    src={currentVariant.image}
                    alt="preview"
                    style={{
                      width: 100,
                      height: 100,
                      objectFit: "cover",
                      borderRadius: 12,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                    }}
                  />
                </Box>
              ) : (
                <Box sx={{ width: 100, height: 100, borderRadius: 3, bgcolor: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", border: "2px dashed #cbd5e1" }}>
                  <Typography variant="caption" color="text.secondary">Sin foto</Typography>
                </Box>
              )}

              <Stack spacing={1} flex={1}>
                 <Button 
                    component="label" 
                    variant="outlined" 
                    size="large"
                    startIcon={uploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                    disabled={uploading}
                    sx={{ textTransform: "none", borderRadius: 2 }}
                 >
                   {uploading ? "Subiendo..." : "Subir Imagen"}
                   <input
                     hidden
                     type="file"
                     accept="image/*"
                     onChange={(e) => e.target.files && uploadImage(e.target.files[0])}
                   />
                 </Button>
                 <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                    Formatos: JPG, PNG. Diseño cuadrado (500x500px).
                 </Typography>
              </Stack>
            </Stack>
          </Box>

        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1, bgcolor: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
        <Button onClick={onClose} sx={{ color: "text.secondary", fontWeight: 700 }}>Cancelar</Button>
        <Button 
          variant="contained" 
          size="large"
          onClick={() => onSubmit(values)}
          sx={{ borderRadius: 2, px: 4, fontWeight: 800, boxShadow: "0 4px 14px rgba(0,0,0,0.15)" }}
        >
          Guardar Producto
        </Button>
      </DialogActions>
    </Dialog>
  );
}
