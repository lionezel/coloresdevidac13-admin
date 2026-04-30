import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Box,
  Typography,
  Divider,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import { useEffect, useState } from "react";
import { storage } from "../firebase/config";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { Category } from "../pages/CategoriesPage";

interface Props {
  open: boolean;
  onClose: () => void;
  initial: Category;
  onSubmit: (values: Category) => Promise<void>;
}

const empty: Category = {
  name: "",
  description: "",
  banner: "",
  type: "food",
};

export default function CategoryDialog({ open, onClose, initial, onSubmit }: Props) {
  const [values, setValues] = useState<Category>(empty);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setValues(initial ?? empty);
  }, [initial]);

  const handleChange = <K extends keyof Category>(key: K, value: Category[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const uploadImage = async (file: File) => {
    try {
      setUploading(true);
      const storageRef = ref(storage, `categories/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      handleChange("banner", url);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: 4, overflow: "hidden" } }}
    >
      <DialogTitle
        sx={{
          fontWeight: 800,
          fontSize: "1.25rem",
          pb: 2,
          bgcolor: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        {initial.id ? "✏️ Editar Categoría" : "📂 Nueva Categoría"}
      </DialogTitle>

      <DialogContent sx={{ p: 4 }}>
        <Stack spacing={4} mt={1}>

          {/* SECCIÓN: INFORMACIÓN GENERAL */}
          <Box>
            <Typography
              variant="overline"
              color="primary"
              fontWeight={800}
              sx={{ letterSpacing: 1.2, display: "block", mb: 2 }}
            >
              Información General
            </Typography>
            <Stack spacing={2.5}>
              <TextField
                label="Nombre de la Categoría"
                value={values.name}
                onChange={(e) => handleChange("name", e.target.value)}
                fullWidth
                variant="outlined"
              />
              <TextField
                label="Descripción"
                value={values.description ?? ""}
                onChange={(e) => handleChange("description", e.target.value)}
                fullWidth
                multiline
                rows={2}
              />
            </Stack>
          </Box>

          <Divider />

          {/* SECCIÓN: TIPO */}
          <Box>
            <Typography
              variant="overline"
              color="primary"
              fontWeight={800}
              sx={{ letterSpacing: 1.2, display: "block", mb: 2 }}
            >
              Tipo de Categoría
            </Typography>
            <ToggleButtonGroup
              value={values.type ?? "food"}
              exclusive
              onChange={(_, val) => {
                if (val !== null) handleChange("type", val);
              }}
              fullWidth
              sx={{ gap: 1.5 }}
            >
              <ToggleButton
                value="food"
                sx={{
                  flex: 1,
                  borderRadius: "12px !important",
                  fontWeight: 800,
                  fontSize: "0.95rem",
                  border: "1.5px solid",
                  borderColor: values.type !== "drink" ? "success.main" : "divider",
                  color: values.type !== "drink" ? "success.dark" : "text.secondary",
                  bgcolor: values.type !== "drink" ? "#f0fdf4" : "transparent",
                  py: 1.5,
                  "&.Mui-selected": {
                    bgcolor: "#dcfce7",
                    borderColor: "success.main",
                    color: "success.dark",
                    "&:hover": { bgcolor: "#bbf7d0" },
                  },
                }}
              >
                🍽️  Comida
              </ToggleButton>
              <ToggleButton
                value="drink"
                sx={{
                  flex: 1,
                  borderRadius: "12px !important",
                  fontWeight: 800,
                  fontSize: "0.95rem",
                  border: "1.5px solid",
                  borderColor: values.type === "drink" ? "info.main" : "divider",
                  color: values.type === "drink" ? "info.dark" : "text.secondary",
                  bgcolor: values.type === "drink" ? "#eff6ff" : "transparent",
                  py: 1.5,
                  "&.Mui-selected": {
                    bgcolor: "#dbeafe",
                    borderColor: "info.main",
                    color: "info.dark",
                    "&:hover": { bgcolor: "#bfdbfe" },
                  },
                }}
              >
                🥤  Bebida
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Divider />
          <Box>
            <Typography
              variant="overline"
              color="primary"
              fontWeight={800}
              sx={{ letterSpacing: 1.2, display: "block", mb: 2 }}
            >
              Apariencia
            </Typography>
            <Stack spacing={2.5}>
              {/* Banner */}
              <Stack direction="row" spacing={3} alignItems="center">
                {values.banner ? (
                  <Box
                    component="img"
                    src={values.banner}
                    alt="banner preview"
                    sx={{
                      width: 110,
                      height: 70,
                      objectFit: "cover",
                      borderRadius: 2,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: 110,
                      height: 70,
                      borderRadius: 2,
                      bgcolor: "#f1f5f9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "2px dashed #cbd5e1",
                      flexShrink: 0,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      Sin imagen
                    </Typography>
                  </Box>
                )}

                <Stack spacing={1} flex={1}>
                  <Button
                    component="label"
                    variant="outlined"
                    size="large"
                    startIcon={
                      uploading ? <CircularProgress size={20} /> : <CloudUploadIcon />
                    }
                    disabled={uploading}
                    sx={{ textTransform: "none", borderRadius: 2 }}
                  >
                    {uploading ? "Subiendo..." : "Subir imagen"}
                    <input
                      hidden
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        e.target.files && uploadImage(e.target.files[0])
                      }
                    />
                  </Button>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block" }}
                  >
                    Formatos: JPG, PNG. Proporción 16:9 recomendada.
                  </Typography>
                </Stack>
              </Stack>
            </Stack>
          </Box>

        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          p: 3,
          pt: 1,
          bgcolor: "#f8fafc",
          borderTop: "1px solid #e2e8f0",
        }}
      >
        <Button onClick={onClose} sx={{ color: "text.secondary", fontWeight: 700 }}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={() => onSubmit(values)}
          sx={{
            borderRadius: 2,
            px: 4,
            fontWeight: 800,
            boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
          }}
        >
          Guardar Categoría
        </Button>
      </DialogActions>
    </Dialog>
  );
}
