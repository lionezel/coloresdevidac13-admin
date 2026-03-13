import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
  Chip,
  Divider,
  TextField,
} from "@mui/material";
import {
  AttachMoney,
  ShoppingBag,
  People,
  Receipt,
} from "@mui/icons-material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { useCollection } from "../hooks/useCollection";
import { useAnalytics, Period } from "../hooks/useAnalytics";
import { formatCOP } from "../components/format";

/* =========================
   KPI CARD
========================= */
const Metric = ({
  title,
  value,
  icon,
  color,
  subtitle,
}: {
  title: string;
  value: any;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}) => (
  <Card
    sx={{
      borderRadius: 4,
      height: "100%",
      transition: "0.3s",
      "&:hover": {
        transform: "translateY(-4px)",
        boxShadow: 6,
      },
    }}
  >
    <CardContent>
      <Stack direction="row" justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            {title}
          </Typography>

          <Typography variant="h5" fontWeight={700}>
            {value}
          </Typography>

          {subtitle && (
            <Chip
              size="small"
              label={subtitle}
              color="success"
              sx={{ mt: 1 }}
            />
          )}
        </Box>

        <Avatar
          sx={{
            bgcolor: `${color}20`,
            color,
            width: 48,
            height: 48,
          }}
        >
          {icon}
        </Avatar>
      </Stack>
    </CardContent>
  </Card>
);

/* =========================
   DASHBOARD
========================= */
export default function Dashboard() {
  const { restaurantId } = useParams();

  const { data: orders = [] } = useCollection<any>(
    restaurantId ?? "",
    "orderssuccess"
  );

  const [period, setPeriod] = useState<Period>("month");
  const [customDate, setCustomDate] = useState<Date | undefined>(new Date());
  const analytics = useAnalytics(orders, period, customDate);

  if (!restaurantId) {
    return (
      <Box p={3}>
        <Typography color="error">
          No se encontró el restaurante
        </Typography>
      </Box>
    );
  }

  return (
    <Box p={{ xs: 2, md: 4 }} bgcolor="#f4f6fb" minHeight="100vh">
      {/* HEADER */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "center" }}
        spacing={2}
        mb={4}
      >
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Analytics
          </Typography>
          <Typography color="text.secondary">
            Resumen de rendimiento del restaurante
          </Typography>
        </Box>

        <Stack direction="row" spacing={2} alignItems="center">
          {period === "custom" && (
            <TextField
              type="date"
              size="small"
              value={
                customDate
                  ? `${customDate.getFullYear()}-${String(customDate.getMonth() + 1).padStart(2, "0")}-${String(customDate.getDate()).padStart(2, "0")}`
                  : ""
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  // val comes as YYYY-MM-DD
                  const [y, m, d] = val.split('-');
                  setCustomDate(new Date(Number(y), Number(m) - 1, Number(d)));
                  // Use a timeout to ensure state batches cleanly or force next tick
                  setTimeout(() => setPeriod("custom"), 0);
                } else {
                  setCustomDate(undefined);
                }
              }}
              sx={{ bgcolor: "#fff", borderRadius: 2 }}
            />
          )}

          <ToggleButtonGroup
            value={period}
            exclusive
            onChange={(_, value) => {
              if (value) {
                setPeriod(value);
              }
            }}
            sx={{
              bgcolor: "#fff",
              borderRadius: 3,
            }}
          >
            <ToggleButton value="day">Hoy</ToggleButton>
            <ToggleButton value="week">Semana</ToggleButton>
            <ToggleButton value="month">Mes</ToggleButton>
            <ToggleButton value="year">Año</ToggleButton>
            <ToggleButton value="custom">Fecha</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      {/* KPIs */}
      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12, sm: 6, lg: 6 }}>
          <Metric
            title="Ingresos"
            value={formatCOP(analytics.revenue)}
            subtitle={`+${analytics.growth.toFixed(1)}%`}
            icon={<AttachMoney />}
            color="#2e7d32"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, lg: 6 }}>
          <Metric
            title="Órdenes"
            value={analytics.orders}
            icon={<ShoppingBag />}
            color="#1565c0"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, lg: 6 }}>
          <Metric
            title="Usuarios"
            value={analytics.users}
            icon={<People />}
            color="#6a1b9a"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, lg: 6 }}>
          <Metric
            title="Ticket promedio"
            value={formatCOP(analytics.ticketAvg)}
            icon={<Receipt />}
            color="#ef6c00"
          />
        </Grid>
      </Grid>

      {/* CHARTS */}
      <Grid container spacing={3}>
        {/* REVENUE CHART */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent>
              <Typography fontWeight={800} mb={2}>
                Evolución de Ingresos
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.revenueChart}>
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(val) => `$${(val / 1000)}k`} tick={{ fontSize: 12 }} width={60} />
                  <Tooltip formatter={(value: number) => formatCOP(value)} />
                  <Line dataKey="total" stroke="#2e7d32" strokeWidth={4} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* ORDER STATUS */}
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <Card sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent>
              <Typography fontWeight={800} mb={2}>
                Estado de Órdenes
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Entregadas", value: analytics.delivered },
                      { name: "Canceladas", value: analytics.cancelled },
                    ]}
                    dataKey="value"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                  >
                    <Cell fill="#2e7d32" />
                    <Cell fill="#e53935" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* PAYMENT METHODS & ORDER TYPES */}
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <Card sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent>
              <Typography fontWeight={800} mb={2}>
                Métodos de Pago
              </Typography>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={analytics.paymentMethods}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    fill="#1565c0"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {analytics.paymentMethods.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#1565c0', '#42a5f5', '#90caf9', '#0d47a1'][index % 4]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <Card sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent>
              <Typography fontWeight={800} mb={2}>
                Tipos de Orden
              </Typography>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={analytics.orderTypes}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    fill="#ef6c00"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {analytics.orderTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#ef6c00', '#ffb74d', '#ffe0b2', '#e65100'][index % 4]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* PEAK HOURS */}
        <Grid size={{ xs: 12, md: 12, lg: 4 }}>
          <Card sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent>
              <Typography fontWeight={800} mb={2}>
                Horas Pico (Pedidos)
              </Typography>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={analytics.peakHours}>
                  <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="orders" fill="#6a1b9a" radius={[6, 6, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* TOP PRODUCTS: QTY vs REVENUE */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent>
              <Typography fontWeight={800} mb={2}>
                Top 5 Productos (Por Cantidad)
              </Typography>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={analytics.topProducts} layout="vertical" margin={{ left: 40 }}>
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="qty" fill="#1565c0" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent>
              <Typography fontWeight={800} mb={2}>
                Top 5 Productos (Por Ganancia)
              </Typography>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={analytics.topProductsByRevenue} layout="vertical" margin={{ left: 40 }}>
                  <XAxis type="number" tickFormatter={(val) => `$${(val / 1000)}k`} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip cursor={{ fill: 'transparent' }} formatter={(value: number) => formatCOP(value)} />
                  <Bar dataKey="revenue" fill="#2e7d32" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

      </Grid>
    </Box>
  );
}
