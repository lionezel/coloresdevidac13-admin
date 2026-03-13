import { useState } from "react";
import {
    Box,
    Button,
    TextField,
    Typography,
    Alert,
    Paper
} from "@mui/material";
import { signInWithEmailAndPassword } from "firebase/auth";

import { useNavigate } from "react-router-dom";
import { auth } from "../firebase/config";
import { useAuth } from "../hooks/useAuth";
import { useEffect } from "react";

export const LoginPage = () => {
    const navigate = useNavigate();

    const { user } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (user) {
            navigate("/");
        }
    }, [user, navigate]);

    const handleLogin = async () => {
        setError("");

        if (!email || !password) {
            setError("Todos los campos son obligatorios");
            return;
        }

        try {
            setLoading(true);
            await signInWithEmailAndPassword(auth, email, password);
            // La redirección ahora se maneja en el useEffect cuando 'user' se actualiza
        } catch (err) {
            setError("Usuario o contraseña incorrectos");
            setLoading(false);
        }
    };

    return (
        <Box
            minHeight="100vh"
            display="flex"
            alignItems="center"
            justifyContent="center"
            bgcolor="#f4f6f8"
        >
            <Paper elevation={4} sx={{ p: 4, width: 360 }}>
                <Typography variant="h5" fontWeight={600} textAlign="center" mb={3}>
                    Admin Login
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <TextField
                    label="Correo"
                    type="email"
                    fullWidth
                    margin="normal"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                />

                <TextField
                    label="Contraseña"
                    type="password"
                    fullWidth
                    margin="normal"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />

                <Button
                    fullWidth
                    variant="contained"
                    sx={{ mt: 2 }}
                    disabled={loading}
                    onClick={handleLogin}
                >
                    {loading ? "Ingresando..." : "Ingresar"}
                </Button>
            </Paper>
        </Box>
    );
};
