import { useState } from "react";
import {
  Typography,
  Button,
  Stack,
  Avatar,
  Box,
  Card,
  CardContent,
  useTheme,
  useMediaQuery,
  Chip,
} from "@mui/material";
import { GridColDef, GridRowParams } from "@mui/x-data-grid";
import { PremiumDataGrid } from "../components/PremiumDataGrid";
import { useCollection } from "../hooks/useCollection";
import UserDialog from "../components/UserDialog";
import { useParams } from "react-router-dom";
import { Timestamp, doc, updateDoc, setDoc } from "firebase/firestore";
import { Users } from "../interfaces/Users";
import { createAuthUser } from "../firebase/user";
import { db, functions } from "../firebase/config";
import { httpsCallable } from "firebase/functions";

export default function UsersPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const { data, createItem, updateItem, setItem, deleteItem } =
    useCollection<Users>(restaurantId!, "users");

  const formatDate = (date?: Timestamp) => {
    if (!date) return "-";
    return new Date(date.seconds * 1000).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<Partial<Users> | null>(null);

  const columns: GridColDef[] = [
    {
      field: "perfil",
      headerName: "Perfil",
      width: 80,
      renderCell: (params) => (
        <Avatar
          src={params.value as string}
          variant="rounded"
          sx={{ width: 40, height: 40 }}
        />
      ),
    },
    { field: "name", headerName: "Nombre", flex: 1.5 },
    { field: "email", headerName: "Email", flex: 2 },
    { 
      field: "role", 
      headerName: "Rol", 
      flex: 1,
      renderCell: (p) => (
        <Chip 
          label={(p.value as string)?.toUpperCase() || "SIN ROL"} 
          color={p.value === "admin" ? "primary" : "default"}
          size="small"
          variant="outlined"
        />
      )
    },
    { 
        field: "createdAt", 
        headerName: "Registro", 
        flex: 1,
        valueGetter: (params) => formatDate(params as unknown as Timestamp)
    },
    {
      field: "actions",
      headerName: "Acciones",
      width: 160,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setCurrent(params.row as Users);
              setOpen(true);
            }}
          >
            Editar
          </Button>
          <Button
            size="small"
            color="error"
            variant="outlined"
            onClick={() => {
                const row = params.row as Users;
                if (window.confirm("¿Estás seguro de eliminar este usuario?")) {
                    deleteItem(row.uid!);
                }
            }}
          >
            Eliminar
          </Button>
        </Stack>
      ),
    },
  ];

  return (
    <Box p={isMobile ? 1 : 3}>
      {/* HEADER */}
      <Stack
        direction={isMobile ? "column" : "row"}
        justifyContent="space-between"
        alignItems={isMobile ? "stretch" : "center"}
        spacing={2}
        mb={3}
      >
        <Typography variant="h4" fontWeight={700}>👥 Usuarios</Typography>
        <Button
          variant="contained"
          startIcon={<span>➕</span>}
          fullWidth={isMobile}
          onClick={() => {
            setCurrent(null);
            setOpen(true);
          }}
          sx={{ borderRadius: 2, px: 4, py: 1 }}
        >
          Agregar usuario
        </Button>
      </Stack>

      {/* DESKTOP TABLE */}
      {!isMobile && (
        <Box sx={{ height: 600, width: "100%" }}>
          <PremiumDataGrid
            rows={data}
            columns={columns}
            getRowId={(row) => row.uid || row.id}
            pageSizeOptions={[10, 20]}
            onRowDoubleClick={(p: GridRowParams) => {
              setCurrent(p.row as Users);
              setOpen(true);
            }}
          />
        </Box>
      )}

      {/* MOBILE CARDS */}
      {isMobile && (
        <Stack spacing={2}>
          {data.map((user) => (
            <Card key={user.uid || (user as any).id} variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar src={user.perfil} sx={{ width: 56, height: 56, borderRadius: 2 }} />
                  <Box flex={1}>
                    <Typography fontWeight={700}>
                      {user.name || "Sin nombre"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {user.email}
                    </Typography>
                    <Stack direction="row" spacing={1} mt={1} alignItems="center">
                        <Chip label={user.role} size="small" color="primary" variant="outlined" />
                        <Typography variant="caption" color="text.secondary">
                            {formatDate(user.createdAt)}
                        </Typography>
                    </Stack>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={1} mt={2}>
                  <Button
                    fullWidth
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setCurrent(user);
                      setOpen(true);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    size="small"
                    color="error"
                    onClick={() => {
                        if (window.confirm("¿Estás seguro de eliminar este usuario?")) {
                            deleteItem(user.uid || (user as any).id!);
                        }
                    }}
                  >
                    Eliminar
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* MODAL */}
      <UserDialog
        open={open}
        onClose={() => setOpen(false)}
        initial={current}
        onSubmit={async (values) => {
          try {
            const id = values.uid || (values as any).id;
            if (id) {
                const newPassword = (values as any).password;
                
                // Sincronizar con Firebase Auth si el correo cambió o hay nueva contraseña
                if (current?.email !== values.email || (newPassword && newPassword.length >= 6)) {
                    const updateAuth = httpsCallable(functions, "updateUserAuth");
                    await updateAuth({
                        uid: id,
                        email: values.email,
                        password: newPassword && newPassword.length >= 6 ? newPassword : undefined
                    });
                }

                // Limpiar contraseña antes de guardar en Firestore
                const { password: _, ...firestoreData } = values as any;

                // Actualizar usuario existente en ambos lugares (Firestore)
                await updateItem(id, firestoreData as any);
                const globalUserRef = doc(db, "users", id);
                await updateDoc(globalUserRef, firestoreData as any);
            } else {
                // Crear nuevo usuario en Firebase Auth primero
                const password = (values as any).password;
                if (!password || password.length < 6) {
                    alert("La contraseña debe tener al menos 6 caracteres");
                    return;
                }

                const uid = await createAuthUser(values.email!, password);
                
                // Crear documento en Firestore con el mismo UID (usamos setItem)
                const { password: _, ...firestoreData } = values as any;
                const finalData = {
                    ...firestoreData,
                    uid: uid,
                    createdAt: Timestamp.now()
                };

                // 1. Guardar en la subcolección del restaurante
                await setItem(uid, finalData);

                // 2. Sincronizar con la colección global de usuarios para el login
                const globalUserRef = doc(db, "users", uid);
                await setDoc(globalUserRef, finalData);
            }
            setOpen(false);
          } catch (error: any) {
            console.error(error);
            alert("Error al crear/actualizar usuario: " + error.message);
          }
        }}
      />
    </Box>
  );
}
