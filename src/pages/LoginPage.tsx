import { useState, useEffect } from "react";
import {
    Box,
    Button,
    TextField,
    Typography,
    Alert,
    Paper,
    InputAdornment,
    IconButton,
    Stack,
} from "@mui/material";
import {
    EmailOutlined,
    LockOutlined,
    Visibility,
    VisibilityOff,
    Restaurant
} from "@mui/icons-material";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase/config";
import { useAuth } from "../hooks/useAuth";

export const LoginPage = () => {
    const navigate = useNavigate();
    const { user, userDoc } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (user && userDoc) {
            const RESTAURANT_ID = "IOjtPfRh1PQ6lnxDeZdJ";
            const isAdmin = userDoc.isAdmin === true || userDoc.role === "admin" || user.uid === "THtaTpKF7mOcSS5VbJtGtkZu9z82";

            if (isAdmin) {
                navigate(`/${RESTAURANT_ID}/dashboard`);
                return;
            }

            // Buscar la primera página en la que tiene permisos
            const allowedPages: string[] = userDoc?.permissions?.allowedPages ?? [];
            if (allowedPages.length > 0) {
                navigate(`/${RESTAURANT_ID}/${allowedPages[0]}`);
                return;
            }

            // Fallback por rol si no tiene allowedPages configuradas
            const role = userDoc.role;
            if (role === "cajero") navigate(`/${RESTAURANT_ID}/billing`);
            else navigate(`/${RESTAURANT_ID}/orders`);
        }
    }, [user, userDoc, navigate]);

    const handleLogin = async () => {
        setError("");
        if (!email || !password) {
            setError("Todos los campos son obligatorios");
            return;
        }

        try {
            setLoading(true);
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err: any) {
            console.error("Login error:", err.code, err.message);
            if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
                setError("Usuario o contraseña incorrectos");
            } else if (err.code === "auth/too-many-requests") {
                setError("Demasiados intentos. Espera un momento e intenta de nuevo.");
            } else if (err.code === "auth/network-request-failed") {
                setError("Error de conexión. Revisa tu internet.");
            } else {
                setError(`Error: ${err.message}`);
            }
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: "100vh",
                bgcolor: "#fdf8f0", // Fondo crema/hueso
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                position: "relative",
                overflow: "hidden"
            }}
        >
            {/* Sección superior negra con curvas */}
            <Box
                sx={{
                    width: "100%",
                    height: "45vh",
                    bgcolor: "#000",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "0 0 50px 50px",
                    color: "#fff",
                    zIndex: 1
                }}
            >
                {/* Logo contenedor */}
                <Box
                    sx={{
                        bgcolor: "#fff",
                        p: 1.5,
                        borderRadius: "18px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mb: 2,
                        boxShadow: "0 10px 20px rgba(0,0,0,0.2)"
                    }}
                >
                    <Restaurant sx={{ color: "#a887ff", fontSize: 40 }} />
                </Box>

                <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: "-0.04em", mb: 0.5 }}>
                    Colores de Vida Admin
                </Typography>
                <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>
                    Bienvenido
                </Typography>
            </Box>

            {/* Carta de login flotante */}
            <Paper
                elevation={0}
                sx={{
                    width: { xs: "90%", sm: 420 },
                    borderRadius: "32px",
                    p: 4,
                    mt: -8, // Solapamiento
                    zIndex: 2,
                    boxShadow: "0 25px 60px -15px rgba(0,0,0,0.15)",
                }}
            >
                <Typography variant="h5" fontWeight={1000} sx={{ color: "#001a33", mb: 0.5 }}>
                    Iniciar Sesión
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 4, fontWeight: 500 }}>
                    Ingresa tus credenciales para continuar
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2, borderRadius: "12px" }}>{error}</Alert>}

                <Stack spacing={2.5}>
                    <Box>
                        <Typography variant="caption" fontWeight={800} sx={{ mb: 0.8, display: "block", color: "#64748b" }}>
                            Correo electrónico
                        </Typography>
                        <TextField
                            fullWidth
                            placeholder="admin@coloresdevida.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            variant="outlined"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <EmailOutlined sx={{ color: "#94a3b8", fontSize: "1.2rem" }} />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    bgcolor: "#f8fafc",
                                    borderRadius: "14px",
                                    "& fieldset": { border: "none" },
                                    "&:hover fieldset": { border: "none" },
                                    "&.Mui-focused fieldset": { border: "1.5px solid #a887ff" },
                                }
                            }}
                        />
                    </Box>

                    <Box>
                        <Typography variant="caption" fontWeight={800} sx={{ mb: 0.8, display: "block", color: "#64748b" }}>
                            Contraseña
                        </Typography>
                        <TextField
                            fullWidth
                            type={showPassword ? "text" : "password"}
                            placeholder="********"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <LockOutlined sx={{ color: "#94a3b8", fontSize: "1.2rem" }} />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                                            {showPassword ? <VisibilityOff sx={{ fontSize: "1.2rem" }} /> : <Visibility sx={{ fontSize: "1.2rem" }} />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    bgcolor: "#f8fafc",
                                    borderRadius: "14px",
                                    "& fieldset": { border: "none" },
                                    "&:hover fieldset": { border: "none" },
                                    "&.Mui-focused fieldset": { border: "1.5px solid #a887ff" },
                                }
                            }}
                        />
                    </Box>

                    <Button
                        fullWidth
                        variant="contained"
                        disabled={loading}
                        onClick={handleLogin}
                        sx={{
                            mt: 2,
                            bgcolor: "#000",
                            color: "#fff",
                            py: 1.8,
                            borderRadius: "14px",
                            fontWeight: 800,
                            fontSize: "1rem",
                            textTransform: "none",
                            "&:hover": { bgcolor: "#333" },
                            boxShadow: "0 10px 20px rgba(0,0,0,0.1)"
                        }}
                    >
                        {loading ? "Ingresando..." : "Entrar"}
                    </Button>
                </Stack>
            </Paper>

            {/* Footer */}
            <Typography variant="caption" sx={{ mt: 4, color: "rgba(0,0,0,0.2)", cursor: "default", fontWeight: 500 }}>
                ¿Problemas para ingresar? Contacta al administrador
            </Typography>
        </Box>
    );
};
